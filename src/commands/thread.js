/**
 * DAVID V1 — /thread — إدارة معلومات الغروب وإعداداته
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 (thread.js) & adapted for DAVID engine
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");

const THREAD_SETTINGS_FILE = path.join(process.cwd(), "database", "data", "threadSettings.json");

function loadSettings() {
  try { if (fs.existsSync(THREAD_SETTINGS_FILE)) return JSON.parse(fs.readFileSync(THREAD_SETTINGS_FILE, "utf8")); } catch (_) {}
  return {};
}
function saveSettings(data) {
  fs.ensureDirSync(path.dirname(THREAD_SETTINGS_FILE));
  fs.writeFileSync(THREAD_SETTINGS_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  config: {
    name: "thread",
    aliases: ["gc", "group", "غروب"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 5,
    role: 2,
    category: "management",
    description: "إدارة إعدادات الغروب (ترحيب / وداع / رتبة)",
    guide: {
      en: "{pn} info — معلومات الغروب\n{pn} welcome on/off [رسالة] — رسالة الترحيب\n{pn} leave on/off [رسالة] — رسالة الوداع\n{pn} approve on/off — وضع الموافقة"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID } = event;
    const sub = (args[0] || "info").toLowerCase();

    const settings = loadSettings();
    if (!settings[threadID]) settings[threadID] = {};

    // ── معلومات الغروب ────────────────────────────────────────────────
    if (sub === "info" || sub === "معلومات") {
      try {
        const info    = await new Promise((res, rej) =>
          api.getThreadInfo(threadID, (e, d) => e ? rej(e) : res(d))
        );
        const ts     = settings[threadID] || {};
        const name   = info?.threadName || "بدون اسم";
        const members = (info?.participantIDs || []).length;
        const admins  = (info?.adminIDs || []).length;

        return message.reply(
          `╔════════════════════════════════╗\n` +
          `║  📋  معلومات الغروب            ║\n` +
          `╠════════════════════════════════╣\n` +
          `║  📛 ${name.slice(0, 22)}\n` +
          `║  🆔 ${threadID}\n` +
          `║  👥 الأعضاء : ${members}\n` +
          `║  👑 الأدمن  : ${admins}\n` +
          `╠════════════════════════════════╣\n` +
          `║  ✉️  الترحيب: ${ts.welcomeOn ? "✅" : "❌"}\n` +
          `║  👋 الوداع  : ${ts.leaveOn   ? "✅" : "❌"}\n` +
          `╚════════════════════════════════╝`
        );
      } catch (e) {
        return message.reply(`❌ ${e.message}`);
      }
    }

    // ── رسالة الترحيب ─────────────────────────────────────────────────
    if (sub === "welcome" || sub === "ترحيب") {
      const toggle = (args[1] || "").toLowerCase();
      if (toggle === "on" || toggle === "تشغيل") {
        settings[threadID].welcomeOn  = true;
        settings[threadID].welcomeMsg = args.slice(2).join(" ") || "مرحباً بك {name} في {groupName}! 🎉";
        saveSettings(settings);
        return message.reply(`✅ تم تفعيل رسالة الترحيب:\n"${settings[threadID].welcomeMsg}"`);
      }
      if (toggle === "off" || toggle === "إيقاف") {
        settings[threadID].welcomeOn = false;
        saveSettings(settings);
        return message.reply("✅ تم إيقاف رسالة الترحيب.");
      }
      return message.reply(
        `الترحيب: ${settings[threadID].welcomeOn ? "✅ مفعّل" : "❌ معطّل"}\n` +
        `الرسالة: ${settings[threadID].welcomeMsg || "(افتراضية)"}\n\n` +
        `/thread welcome on [رسالة]\n/thread welcome off`
      );
    }

    // ── رسالة الوداع ──────────────────────────────────────────────────
    if (sub === "leave" || sub === "وداع") {
      const toggle = (args[1] || "").toLowerCase();
      if (toggle === "on" || toggle === "تشغيل") {
        settings[threadID].leaveOn  = true;
        settings[threadID].leaveMsg = args.slice(2).join(" ") || "وداعاً {name}! 👋";
        saveSettings(settings);
        return message.reply(`✅ تم تفعيل رسالة الوداع:\n"${settings[threadID].leaveMsg}"`);
      }
      if (toggle === "off" || toggle === "إيقاف") {
        settings[threadID].leaveOn = false;
        saveSettings(settings);
        return message.reply("✅ تم إيقاف رسالة الوداع.");
      }
      return message.reply(
        `الوداع: ${settings[threadID].leaveOn ? "✅ مفعّل" : "❌ معطّل"}\n` +
        `الرسالة: ${settings[threadID].leaveMsg || "(افتراضية)"}\n\n` +
        `/thread leave on [رسالة]\n/thread leave off`
      );
    }

    return message.reply(
      "╔══════════════════════════════╗\n" +
      "║  📋  أوامر إدارة الغروب     ║\n" +
      "╠══════════════════════════════╣\n" +
      "║  /thread info    — معلومات  ║\n" +
      "║  /thread welcome — الترحيب  ║\n" +
      "║  /thread leave   — الوداع   ║\n" +
      "╚══════════════════════════════╝"
    );
  },

  // أحداث الانضمام والمغادرة
  onEvent: async function ({ api, event }) {
    const { threadID, logMessageType, logMessageData } = event;
    const settings = loadSettings();
    const ts       = settings[threadID];
    if (!ts) return;

    if (logMessageType === "log:subscribe" && ts.welcomeOn) {
      const addedIDs = logMessageData?.addedParticipants?.map(p => p.userFbId) || [];
      for (const uid of addedIDs) {
        const msg = (ts.welcomeMsg || "مرحباً بك {name}!")
          .replace("{name}", uid)
          .replace("{groupName}", threadID);
        try { await new Promise(r => setTimeout(r, 1000)); api.sendMessage(msg, threadID); } catch (_) {}
      }
    }

    if (logMessageType === "log:unsubscribe" && ts.leaveOn) {
      const leftID = logMessageData?.leftParticipantFbId;
      if (!leftID) return;
      const msg = (ts.leaveMsg || "وداعاً {name}! 👋").replace("{name}", leftID);
      try { await new Promise(r => setTimeout(r, 500)); api.sendMessage(msg, threadID); } catch (_) {}
    }
  }
};

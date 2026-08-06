/**
 * DAVID V1 — /warn — نظام التحذيرات
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");

const WARN_FILE = path.join(process.cwd(), "database", "data", "warns.json");
const MAX_WARNS = 3;

function loadWarns() {
  try { if (fs.existsSync(WARN_FILE)) return JSON.parse(fs.readFileSync(WARN_FILE, "utf8")); } catch (_) {}
  return {};
}
function saveWarns(data) {
  fs.ensureDirSync(path.dirname(WARN_FILE));
  fs.writeFileSync(WARN_FILE, JSON.stringify(data, null, 2));
}
function getKey(tid, uid) { return `${tid}:${uid}`; }

module.exports = {
  config: {
    name: "warn",
    aliases: ["تحذير", "warning"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 5,
    role: 2,
    category: "management",
    description: `تحذير الأعضاء — عند ${MAX_WARNS} تحذيرات يُطرد تلقائياً`,
    guide: {
      en: "{pn} @tag [سبب] — تحذير\n{pn} list — القائمة\n{pn} reset @tag — إعادة تعيين\n{pn} info @tag — معلومات"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, mentions, messageReply, senderID } = event;
    const sub = (args[0] || "").toLowerCase();

    const warns = loadWarns();

    // ── قائمة التحذيرات ──────────────────────────────────────────────────
    if (sub === "list" || sub === "قائمة") {
      const threadWarns = Object.entries(warns).filter(([k]) => k.startsWith(threadID + ":"));
      if (!threadWarns.length) return message.reply("📋 لا يوجد تحذيرات في هذا الغروب.");
      const lines = ["╔══════════════════════════╗", "║  ⚠️  قائمة التحذيرات    ║", "╠══════════════════════════╣"];
      for (const [key, data] of threadWarns) {
        const uid = key.split(":")[1];
        lines.push(`║  🆔 ${uid}: ${data.count}/${MAX_WARNS} تحذيرات`);
      }
      lines.push("╚══════════════════════════╝");
      return message.reply(lines.join("\n"));
    }

    // ── إعادة تعيين ────────────────────────────────────────────────────────
    if (sub === "reset" || sub === "تعيين") {
      const tagIDs = Object.keys(mentions || {});
      const rid = tagIDs[0] || messageReply?.senderID;
      if (!rid) return message.reply("❌ حدد الشخص بـ @tag أو رد على رسالته.");
      const key = getKey(threadID, rid);
      delete warns[key];
      saveWarns(warns);
      return message.reply(`✅ تم إعادة تعيين تحذيرات ${rid}`);
    }

    // ── معلومات شخص ────────────────────────────────────────────────────────
    if (sub === "info" || sub === "معلومات") {
      const tagIDs = Object.keys(mentions || {});
      const rid = tagIDs[0] || messageReply?.senderID || senderID;
      const key  = getKey(threadID, rid);
      const data = warns[key];
      if (!data) return message.reply(`ℹ️ ${rid}: لا يوجد تحذيرات.`);
      const lines = ["╔══════════════════════════╗", `║  ⚠️  تحذيرات: ${rid}`, "╠══════════════════════════╣"];
      for (const [i, w] of (data.history || []).entries())
        lines.push(`║  ${i + 1}. ${w.reason} — ${w.date}`);
      lines.push(`╠══════════════════════════╣`);
      lines.push(`║  الإجمالي: ${data.count}/${MAX_WARNS}`);
      lines.push("╚══════════════════════════╝");
      return message.reply(lines.join("\n"));
    }

    // ── تحذير شخص ─────────────────────────────────────────────────────────
    const tagIDs = Object.keys(mentions || {});
    const targetID = tagIDs[0] || messageReply?.senderID;
    if (!targetID) {
      return message.reply(
        "╔══════════════════════════════╗\n" +
        "║  ⚠️  نظام التحذيرات         ║\n" +
        "╠══════════════════════════════╣\n" +
        `║  ${MAX_WARNS} تحذيرات = طرد تلقائي\n` +
        "╠══════════════════════════════╣\n" +
        "║  /warn @شخص [سبب]           ║\n" +
        "║  /warn list — القائمة       ║\n" +
        "║  /warn reset @شخص           ║\n" +
        "║  /warn info @شخص            ║\n" +
        "╚══════════════════════════════╝"
      );
    }

    // حذف الاسم المُذكَر من args
    const reason = args.filter(a => !a.startsWith("@")).slice(sub === "warn" ? 1 : 0).join(" ") || "لا يوجد سبب";

    const key  = getKey(threadID, targetID);
    if (!warns[key]) warns[key] = { count: 0, history: [] };
    warns[key].count++;
    warns[key].history.push({
      reason,
      date: new Date().toLocaleDateString("ar-EG"),
      by: senderID,
    });
    saveWarns(warns);

    const count = warns[key].count;

    if (count >= MAX_WARNS) {
      await message.reply(
        `╔══════════════════════════════╗\n` +
        `║  🚨 وصل للحد الأقصى!        ║\n` +
        `╠══════════════════════════════╣\n` +
        `║  🆔 ${targetID}\n` +
        `║  تحذير ${count}/${MAX_WARNS} — يُطرد الآن\n` +
        `╚══════════════════════════════╝`
      );
      try {
        await new Promise((res, rej) =>
          api.removeUserFromGroup(String(targetID), threadID, (e) => e ? rej(e) : res())
        );
        delete warns[key];
        saveWarns(warns);
      } catch (_) {
        message.reply("⚠️ فشل الطرد التلقائي — تأكد من أن البوت أدمن.");
      }
    } else {
      return message.reply(
        `╔══════════════════════════════╗\n` +
        `║  ⚠️  تحذير ${count}/${MAX_WARNS}          ║\n` +
        `╠══════════════════════════════╣\n` +
        `║  🆔 ${targetID}\n` +
        `║  📝 السبب: ${reason}\n` +
        (count >= MAX_WARNS - 1
          ? `║  🚨 تحذير أخير قبل الطرد!\n`
          : `║  ${MAX_WARNS - count} تحذيرات متبقية للطرد\n`) +
        `╚══════════════════════════════╝`
      );
    }
  }
};

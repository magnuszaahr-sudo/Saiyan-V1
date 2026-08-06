/**
 * DAVID V1 — /addadmin — إضافة أدمن للبوت
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");

const LEVELS_FILE  = path.join(process.cwd(), "database", "data", "adminLevels.json");
const CONFIG_FILE  = path.join(process.cwd(), "config.json");

function loadLevels() {
  try {
    if (fs.existsSync(LEVELS_FILE)) return JSON.parse(fs.readFileSync(LEVELS_FILE, "utf8"));
  } catch (_) {}
  return {};
}

function saveLevels(data) {
  fs.ensureDirSync(path.dirname(LEVELS_FILE));
  fs.writeFileSync(LEVELS_FILE, JSON.stringify(data, null, 2));
}

function isTopAdmin(id) {
  const sid    = String(id);
  const levels = loadLevels();
  if (levels[sid] !== undefined) return levels[sid] === 3;
  const cfg    = global.GoatBot?.config || {};
  const supers = [cfg.ownerID, ...(cfg.superAdminBot || [])].filter(Boolean).map(String);
  return supers.includes(sid);
}

function extractID(text) {
  const m1 = text.match(/(?:facebook\.com|fb\.com)\/profile\.php\?id=(\d+)/i);
  if (m1) return m1[1];
  const m2 = text.match(/(?:facebook\.com|fb\.com)\/(\d+)/i);
  if (m2) return m2[1];
  if (/^\d{5,20}$/.test(text.trim())) return text.trim();
  return null;
}

module.exports = {
  config: {
    name: "addadmin",
    aliases: ["addmod", "إضافة-أدمن", "أدمن"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 5,
    role: 3,
    category: "management",
    description: "إضافة أو تعديل أدمن بوت بمستوى معين (1-3)",
    guide: {
      en: "{pn} [1-3] @tag\n{pn} [1-3] [ID]\n{pn} [1-3] — رد على رسالة\n{pn} list — قائمة الأدمن\n{pn} remove [ID] — إزالة أدمن"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const { senderID, threadID, mentions, messageReply } = event;

    if (!isTopAdmin(senderID))
      return message.reply("⛔ هذا الأمر لمالك البوت (المستوى 3) فقط.");

    const sub = (args[0] || "").toLowerCase();

    // ── قائمة الأدمن ──────────────────────────────────────────────────────
    if (sub === "list" || sub === "قائمة") {
      const levels = loadLevels();
      const cfg    = global.GoatBot?.config || {};
      const supers = [cfg.ownerID, ...(cfg.superAdminBot || [])].filter(Boolean).map(String);
      if (!Object.keys(levels).length && !supers.length)
        return message.reply("📋 لا يوجد أدمن مسجّل.");

      const lines = ["╔══════════════════════════╗", "║  👑  قائمة الأدمن       ║", "╠══════════════════════════╣"];
      const emoji = { 3: "🥇", 2: "🥈", 1: "🥉" };
      for (const [id, lvl] of Object.entries(levels))
        lines.push(`║  ${emoji[lvl] || "•"} Lv${lvl} — ${id}`);
      for (const id of supers)
        if (!levels[id]) lines.push(`║  👑 Owner — ${id}`);
      lines.push("╚══════════════════════════╝");
      return message.reply(lines.join("\n"));
    }

    // ── إزالة أدمن ────────────────────────────────────────────────────────
    if (sub === "remove" || sub === "إزالة") {
      const rid = args[1] ? extractID(args[1]) : (messageReply?.senderID || Object.keys(mentions || {})[0]);
      if (!rid) return message.reply("❌ حدد ID الشخص المراد إزالته.");
      const levels = loadLevels();
      if (!levels[String(rid)]) return message.reply(`⚠️ المعرف ${rid} ليس أدمناً.`);
      delete levels[String(rid)];
      saveLevels(levels);
      // تحديث config
      try {
        const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
        cfg.adminBot = (cfg.adminBot || []).filter(id => String(id) !== String(rid));
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
        if (global.GoatBot?.config) global.GoatBot.config.adminBot = cfg.adminBot;
      } catch (_) {}
      return message.reply(`✅ تم إزالة الأدمن: ${rid}`);
    }

    // ── إضافة / تعديل ─────────────────────────────────────────────────────
    const level = parseInt(sub);
    if (isNaN(level) || level < 1 || level > 3) {
      return message.reply(
        "╔══════════════════════════════╗\n" +
        "║  👮  إضافة أدمن للبوت       ║\n" +
        "╠══════════════════════════════╣\n" +
        "║  /addadmin 2 @شخص           ║\n" +
        "║  /addadmin 1 [ID]            ║\n" +
        "║  /addadmin 3 — رد على رسالة ║\n" +
        "║  /addadmin list              ║\n" +
        "║  /addadmin remove [ID]       ║\n" +
        "╠══════════════════════════════╣\n" +
        "║  🥉 Lv1 جونيور              ║\n" +
        "║  🥈 Lv2 أدمن عادي           ║\n" +
        "║  🥇 Lv3 أدمن كبير           ║\n" +
        "╚══════════════════════════════╝"
      );
    }

    let targetID = null;
    const taggedIDs = Object.keys(mentions || {});
    if (taggedIDs.length) targetID = taggedIDs[0];
    else if (args[1])     targetID = extractID(args[1]);
    else if (messageReply) targetID = messageReply.senderID;

    if (!targetID) return message.reply("❌ حدد الشخص: رد على رسالته، أو @mention، أو ضع ID.");
    if (String(targetID) === String(senderID))
      return message.reply("❌ لا يمكنك إضافة نفسك.");

    const levels   = loadLevels();
    const oldLevel = levels[String(targetID)];
    levels[String(targetID)] = level;
    saveLevels(levels);

    // تحديث config.json
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      if (!cfg.adminBot) cfg.adminBot = [];
      if (!cfg.adminBot.map(String).includes(String(targetID))) cfg.adminBot.push(targetID);
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
      if (global.GoatBot?.config) global.GoatBot.config.adminBot = cfg.adminBot;
    } catch (_) {}

    const emoji  = { 3: "🥇", 2: "🥈", 1: "🥉" };
    const labels = { 3: "أدمن كبير", 2: "أدمن عادي", 1: "جونيور" };

    return message.reply(
      `╔══════════════════════════════╗\n` +
      `║  ✅ ${oldLevel ? "تم تحديث الأدمن" : "تم إضافة أدمن جديد"}\n` +
      `╠══════════════════════════════╣\n` +
      `║  🆔 ID    : ${targetID}\n` +
      (oldLevel ? `║  📊 المستوى: Lv${oldLevel} → Lv${level} ${emoji[level]}\n` : `║  📊 المستوى: ${emoji[level]} Lv${level} (${labels[level]})\n`) +
      `╚══════════════════════════════╝`
    );
  }
};

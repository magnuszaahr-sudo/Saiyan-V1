/**
 * DAVID V1 — /ban — حظر مستخدم من استخدام البوت
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");

const BAN_FILE = path.join(process.cwd(), "database", "data", "banned.json");

function loadBans() {
  try { if (fs.existsSync(BAN_FILE)) return JSON.parse(fs.readFileSync(BAN_FILE, "utf8")); } catch (_) {}
  return {};
}
function saveBans(data) {
  fs.ensureDirSync(path.dirname(BAN_FILE));
  fs.writeFileSync(BAN_FILE, JSON.stringify(data, null, 2));
}

// تحميل القائمة مرة واحدة عند بدء التشغيل
if (!global._davidBans) global._davidBans = loadBans();

module.exports = {
  config: {
    name: "ban",
    aliases: ["block", "حظر"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 3,
    role: 3,
    category: "management",
    description: "حظر / رفع حظر مستخدم من استخدام البوت",
    guide: { en: "{pn} @tag [سبب] — حظر\n{pn} unban @tag — رفع الحظر\n{pn} list — القائمة" }
  },

  onStart: async function ({ event, args, message }) {
    const { mentions, messageReply, senderID } = event;
    const sub = (args[0] || "").toLowerCase();

    const bans = global._davidBans;

    // ── قائمة المحظورين ────────────────────────────────────────────────
    if (sub === "list" || sub === "قائمة") {
      const entries = Object.entries(bans);
      if (!entries.length) return message.reply("📋 لا يوجد مستخدمون محظورون.");
      const lines = ["╔══════════════════════════╗", "║  🚫  قائمة المحظورين   ║", "╠══════════════════════════╣"];
      for (const [uid, data] of entries)
        lines.push(`║  🆔 ${uid}\n║     📝 ${data.reason || "لا سبب"}`);
      lines.push("╚══════════════════════════╝");
      return message.reply(lines.join("\n"));
    }

    // ── رفع الحظر ────────────────────────────────────────────────────
    if (sub === "unban" || sub === "رفع") {
      const tagIDs = Object.keys(mentions || {});
      const rid    = tagIDs[0] || messageReply?.senderID || args[1];
      if (!rid) return message.reply("❌ حدد الشخص.");
      if (!bans[String(rid)]) return message.reply(`ℹ️ ${rid} غير محظور.`);
      delete bans[String(rid)];
      saveBans(bans);
      return message.reply(`✅ تم رفع حظر ${rid}`);
    }

    // ── حظر ───────────────────────────────────────────────────────────
    const tagIDs   = Object.keys(mentions || {});
    const targetID = tagIDs[0] || messageReply?.senderID;
    if (!targetID) {
      return message.reply(
        "╔══════════════════════════════╗\n" +
        "║  🚫  حظر مستخدم              ║\n" +
        "╠══════════════════════════════╣\n" +
        "║  /ban @شخص [سبب]            ║\n" +
        "║  /ban unban @شخص            ║\n" +
        "║  /ban list — المحظورون       ║\n" +
        "╚══════════════════════════════╝"
      );
    }
    if (String(targetID) === String(senderID)) return message.reply("❌ لا يمكنك حظر نفسك.");

    const reason = args.slice(1).join(" ") || "لا سبب";
    bans[String(targetID)] = { reason, date: new Date().toLocaleDateString("ar-EG"), by: senderID };
    saveBans(bans);

    return message.reply(
      `╔══════════════════════════════╗\n` +
      `║  ✅ تم الحظر                 ║\n` +
      `╠══════════════════════════════╣\n` +
      `║  🆔 ${targetID}\n` +
      `║  📝 السبب: ${reason}\n` +
      `╚══════════════════════════════╝`
    );
  }
};

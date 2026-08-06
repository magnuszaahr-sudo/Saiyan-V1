/**
 * DAVID V1 — /unsend — حذف رسالة البوت
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 */
"use strict";

module.exports = {
  config: {
    name: "unsend",
    aliases: ["del", "حذف-رسالة", "delete"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 3,
    role: 2,
    category: "utility",
    description: "حذف رسالة البوت (بالرد عليها)",
    guide: { en: "رد على رسالة البوت بـ {pn}" }
  },

  onStart: async function ({ api, event, message }) {
    const { messageReply } = event;

    if (!messageReply) {
      return message.reply(
        "╔══════════════════════════╗\n" +
        "║  🗑️  حذف رسالة          ║\n" +
        "╠══════════════════════════╣\n" +
        "║  رد على رسالة البوت     ║\n" +
        "║  بهذا الأمر لحذفها      ║\n" +
        "╚══════════════════════════╝"
      );
    }

    const botID = String(api.getCurrentUserID?.() || global.GoatBot?.botID || "");
    if (botID && String(messageReply.senderID) !== botID)
      return message.reply("⛔ يمكن حذف رسائل البوت فقط.");

    try {
      await new Promise((res, rej) =>
        api.unsendMessage(messageReply.messageID, (e) => e ? rej(e) : res())
      );
    } catch (e) {
      message.reply(`❌ فشل الحذف: ${e.message}`);
    }
  }
};

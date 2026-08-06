/**
 * DAVID V1 — /groupname — تغيير اسم الغروب
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 */
"use strict";

module.exports = {
  config: {
    name: "groupname",
    aliases: ["setname", "اسم-الغروب", "اسم"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 5,
    role: 2,
    category: "management",
    description: "تغيير اسم الغروب",
    guide: { en: "{pn} [الاسم الجديد]" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID } = event;
    const newName = args.join(" ").trim();

    if (!newName) {
      return message.reply(
        "╔══════════════════════════╗\n" +
        "║  ✏️  تغيير اسم الغروب  ║\n" +
        "╠══════════════════════════╣\n" +
        "║  /groupname [الاسم]     ║\n" +
        "╚══════════════════════════╝"
      );
    }

    message.react("⏳", event.messageID);

    try {
      await new Promise((res, rej) =>
        api.setTitle(newName, threadID, (e) => e ? rej(e) : res())
      );
      message.react("✅", event.messageID);
      return message.reply(
        `╔══════════════════════════╗\n` +
        `║  ✅ تم تغيير الاسم      ║\n` +
        `╠══════════════════════════╣\n` +
        `║  ${newName}\n` +
        `╚══════════════════════════╝`
      );
    } catch (e) {
      message.react("❌", event.messageID);
      return message.reply(
        "╔══════════════════════════╗\n" +
        "║  ❌ فشل تغيير الاسم     ║\n" +
        "╠══════════════════════════╣\n" +
        "║  تأكد من أن البوت أدمن ║\n" +
        "╚══════════════════════════╝"
      );
    }
  }
};

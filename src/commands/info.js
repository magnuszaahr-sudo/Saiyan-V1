/**
 * DAVID V1 — /info — معلومات عن شخص أو الغروب
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 (boxinfo/user) & adapted for DAVID engine
 */
"use strict";

module.exports = {
  config: {
    name: "info",
    aliases: ["boxinfo", "threadinfo", "معلومات-الغروب"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 5,
    role: 0,
    category: "utility",
    description: "معلومات عن الغروب أو شخص معين",
    guide: { en: "{pn} — معلومات الغروب\n{pn} @tag — معلومات شخص" }
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, senderID, mentions, messageReply } = event;

    const tagIDs = Object.keys(mentions || {});
    const targetUser = tagIDs[0] || messageReply?.senderID;

    if (targetUser) {
      // معلومات شخص
      return message.reply(
        `╔══════════════════════════╗\n` +
        `║  👤  معلومات المستخدم   ║\n` +
        `╠══════════════════════════╣\n` +
        `║  🆔 ID : ${targetUser}\n` +
        `║  💬 الغروب : ${threadID}\n` +
        `╚══════════════════════════╝`
      );
    }

    // معلومات الغروب
    message.react("⏳", event.messageID);

    try {
      const info = await new Promise((res, rej) =>
        api.getThreadInfo(threadID, (e, d) => e ? rej(e) : res(d))
      );

      const name     = info?.threadName || "محادثة خاصة";
      const members  = (info?.participantIDs || []).length;
      const admins   = (info?.adminIDs || []).length;
      const isGroup  = info?.isGroup ? "نعم" : "لا";
      const approval = info?.approvalMode ? "مفعّل" : "معطّل";

      message.react("✅", event.messageID);
      return message.reply(
        `╔═══════════════════════════════╗\n` +
        `║  📋  معلومات الغروب           ║\n` +
        `╠═══════════════════════════════╣\n` +
        `║  📛 الاسم    : ${name.slice(0, 20)}\n` +
        `║  🆔 ID       : ${threadID}\n` +
        `║  👥 الأعضاء  : ${members}\n` +
        `║  👑 الأدمن   : ${admins}\n` +
        `║  🔒 موافقة   : ${approval}\n` +
        `║  🤝 غروب؟   : ${isGroup}\n` +
        `╚═══════════════════════════════╝`
      );
    } catch (e) {
      message.react("❌", event.messageID);
      message.reply(`❌ فشل: ${e.message}`);
    }
  }
};

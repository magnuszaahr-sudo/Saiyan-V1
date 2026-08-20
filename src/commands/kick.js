/**
 * DAVID V1 — /kick — طرد عضو من الغروب
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 */
"use strict";

module.exports = {
  config: {
    name: "kick",
    aliases: ["remove", "اك"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 5,
    role: 2,
    category: "management",
    description: "طرد عضو من الغروب",
    guide: { en: "{pn} @tag — أو رد على رسالة الشخص بالأمر" }
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, mentions, messageReply } = event;

    let targets = Object.keys(mentions || {});
    if (!targets.length && messageReply) targets = [messageReply.senderID];

    if (!targets.length) {
      return message.reply(
        "╔═══════════════════════════╗\n" +
        "║  👢  طرد عضو من الغروب  ║\n" +
        "╠═══════════════════════════╣\n" +
        "║  الاستخدام:               ║\n" +
        "║  • /kick @شخص            ║\n" +
        "║  • رد على رسالته بـ /kick ║\n" +
        "╚═══════════════════════════╝"
      );
    }

    const botID = String(api.getCurrentUserID?.() || global.GoatBot?.botID || "");
    const botAdmin = String(event.senderID);

    let done = 0, fail = 0;
    for (const uid of targets) {
      if (String(uid) === botID) { fail++; continue; }
      if (String(uid) === botAdmin) { fail++; continue; }
      try {
        await new Promise((res, rej) =>
          api.removeUserFromGroup(String(uid), threadID, (e) => e ? rej(e) : res())
        );
        done++;
      } catch (_) { fail++; }
    }

    if (done > 0) {
      return message.reply(
        `╔═══════════════════════════╗\n` +
        `║  ✅ تم طرد ${done} عضو بنجاح\n` +
        (fail ? `║  ⚠️ فشل طرد ${fail} (لا يوجد إذن)\n` : "") +
        `╚═══════════════════════════╝`
      );
    } else {
      return message.reply(
        "╔═══════════════════════════╗\n" +
        "║  ❌ فشل الطرد             ║\n" +
        "╠═══════════════════════════╣\n" +
        "║  تأكد من أن البوت أدمن   ║\n" +
        "╚═══════════════════════════╝"
      );
    }
  }
};

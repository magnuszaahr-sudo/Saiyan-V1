/**
 * DAVID V1 — /uid — معرفة ID الفيسبوك
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 */
"use strict";

module.exports = {
  config: {
    name: "uid",
    aliases: ["id", "userid", "معرف"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 3,
    role: 0,
    category: "utility",
    description: "الحصول على معرف Facebook لشخص ما",
    guide: { en: "{pn} — معرفك / رد على رسالة شخص / @tag" }
  },

  onStart: async function ({ api, event, message }) {
    const { senderID, mentions, messageReply, threadID } = event;

    let targetID = senderID;
    let label    = "معرفك";

    const taggedIDs = Object.keys(mentions || {});
    if (taggedIDs.length) {
      targetID = taggedIDs[0];
      label    = mentions[targetID] || "الشخص المُذكَر";
    } else if (messageReply) {
      targetID = messageReply.senderID;
      label    = "الشخص الذي رددت عليه";
    }

    const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━";
    return message.reply(
      `${LINE}\n` +
      `  🆔  معرف فيسبوك\n` +
      `${LINE}\n\n` +
      `  👤 ${label}\n` +
      `  🔢 ID : ${targetID}\n` +
      `  💬 الغروب : ${threadID}\n\n` +
      `${LINE}`
    );
  }
};

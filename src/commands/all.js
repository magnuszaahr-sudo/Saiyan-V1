/**
 * DAVID V1 — /all — تاق لجميع أعضاء الغروب
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 */
"use strict";

module.exports = {
  config: {
    name: "all",
    aliases: ["tagall", "everyone", "الكل", "تاق"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 10,
    role: 1,
    category: "management",
    description: "تاق جميع أعضاء الغروب",
    guide: { en: "{pn} [رسالة اختيارية]" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, participantIDs } = event;

    if (!participantIDs || !participantIDs.length) {
      return message.reply("❌ تعذّر جلب قائمة الأعضاء.");
    }

    const botID     = String(global.GoatBot?.botID || api.getCurrentUserID?.() || "");
    const members   = participantIDs.filter(id => String(id) !== botID);
    const customMsg = args.join(" ").trim();

    // نبني جسم الرسالة: إذا وُجدت رسالة مخصصة نستخدمها، وإلا نكتب @all بعدد الأعضاء
    // نخصص حرفاً واحداً لكل عضو (الأساس كما في WHITE)
    let body    = customMsg || "👥 @all";
    const mentions = [];

    for (let i = 0; i < members.length; i++) {
      const uid = members[i];
      // نضيف المنشن عند آخر حرف من الجسم + نضيف مسافة
      const fromIndex = body.length;
      body += " @";
      mentions.push({ id: uid, tag: "@", fromIndex });
    }

    try {
      await new Promise((resolve, reject) => {
        api.sendMessage({ body, mentions }, threadID, (err) => err ? reject(err) : resolve());
      });
    } catch (err) {
      message.reply(`❌ فشل التاق: ${err.message?.slice(0, 60)}`);
    }
  }
};

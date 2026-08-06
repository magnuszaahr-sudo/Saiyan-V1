"use strict";

module.exports = {
  config: {
    name: "unsend",
    aliases: ["حذف", "del"],
    version: "1.0",
    author: "DJAMEL",
    countDown: 3,
    role: 2,
    category: "utility",
    description: "حذف آخر رسالة للبوت أو الرسالة المُرد عليها",
    guide: { en: "{pn} — رد على رسالة البوت لحذفها" }
  },

  onStart: async function ({ api, event, message }) {
    // إذا رد على رسالة — احذف تلك الرسالة
    if (event.messageReply) {
      const targetID = event.messageReply.messageID;
      const targetSender = String(event.messageReply.senderID || "");
      const botID = String(global.GoatBot?.botID || api.getCurrentUserID?.() || "");

      // احذف فقط رسائل البوت
      if (targetSender !== botID)
        return message.reply("⛔ يمكنني حذف رسائل البوت فقط.");

      try {
        await api.unsendMessage(targetID);
        // احذف رسالة الأمر نفسها بعد ثانية
        setTimeout(() => {
          try { api.unsendMessage(event.messageID); } catch (_) {}
        }, 1000);
      } catch (e) {
        return message.reply("❌ فشل الحذف: " + (e.message || e));
      }
      return;
    }

    // بدون رد — ابحث عن آخر رسالة للبوت في هذا الغروب
    const botID = String(global.GoatBot?.botID || api.getCurrentUserID?.() || "");
    if (!global._lastBotMsg) global._lastBotMsg = {};

    const last = global._lastBotMsg[String(event.threadID)];
    if (!last) return message.reply("❌ لا توجد رسالة سابقة للحذف.\nاستخدم الأمر بالرد على رسالة البوت.");

    try {
      await api.unsendMessage(last);
      delete global._lastBotMsg[String(event.threadID)];
      setTimeout(() => {
        try { api.unsendMessage(event.messageID); } catch (_) {}
      }, 1000);
    } catch (e) {
      return message.reply("❌ فشل الحذف: " + (e.message || e));
    }
  }
};

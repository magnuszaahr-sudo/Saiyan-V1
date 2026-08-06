/**
 * DAVID V1 — /greet — رسالة ترحيبية
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 */
"use strict";

module.exports = {
  config: {
    name: "greet",
    aliases: ["hello", "hi", "مرحبا", "هلا", "سلام"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 5,
    role: 0,
    category: "utility",
    description: "رسالة ترحيبية تعرّف بالبوت وأوامره",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ api, event, message }) {
    const { senderID } = event;
    const prefix = global.GoatBot?.config?.prefix || "/";
    const botName = global.GoatBot?.config?.botName || "DAVID V1";

    let name = "صديقي";
    try {
      const info = await new Promise((res, rej) =>
        api.getUserInfo(senderID, (err, d) => err ? rej(err) : res(d))
      );
      name = info[senderID]?.name || name;
    } catch (_) {}

    const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

    return message.reply(
      `${LINE}\n` +
      `  👋 مرحباً ${name}!\n` +
      `${LINE}\n\n` +
      `  🤖 أنا ${botName}\n` +
      `  ⚡ بوت ماسنجر ذكي بـ 30+ أمر\n` +
      `  🛡️ محمي بـ 20 طبقة حماية\n\n` +
      `${LINE}\n` +
      `  📦 أوامر مفيدة:\n\n` +
      `  ${prefix}help        — كل الأوامر\n` +
      `  ${prefix}ping        — حالة البوت\n` +
      `  ${prefix}ai [سؤال]  — دردشة AI\n` +
      `  ${prefix}song [اسم] — تحميل موسيقى\n` +
      `  ${prefix}video [بحث]— تحميل فيديو\n` +
      `  ${prefix}weather [مدينة] — الطقس\n` +
      `  ${prefix}balance     — رصيدك\n` +
      `  ${prefix}daily       — مكافأة يومية\n` +
      `  ${prefix}uid         — معرفك\n\n` +
      `${LINE}\n` +
      `  🔑 Prefix: ${prefix}  •  © 2025 DJAMEL\n` +
      `${LINE}`
    );
  }
};

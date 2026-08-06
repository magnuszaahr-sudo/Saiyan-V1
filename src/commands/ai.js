/**
 * DAVID V1 — /ai — دردشة مع الذكاء الاصطناعي
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 (youai/gpt) & adapted for DAVID engine
 * Uses free You.ai API (no key needed)
 */
"use strict";
const axios = require("axios");

module.exports = {
  config: {
    name: "ai",
    aliases: ["gpt", "youai", "chat", "ذكاء", "بوت"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 5,
    role: 0,
    category: "ai",
    description: "دردشة مع الذكاء الاصطناعي (You AI)",
    guide: { en: "{pn} [سؤالك]\nمثال: {pn} ما هو الفرق بين Python وJavaScript" }
  },

  onStart: async function ({ args, event, message }) {
    const { messageID } = event;
    const input = args.join(" ").trim();

    if (!input) {
      return message.reply(
        "╔═══════════════════════════╗\n" +
        "║  🤖  دردشة AI             ║\n" +
        "╠═══════════════════════════╣\n" +
        "║  /ai [سؤالك]              ║\n" +
        "║  مثال: /ai ما هي Python  ║\n" +
        "╚═══════════════════════════╝"
      );
    }

    message.react("⏳", messageID);

    try {
      const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/you?chat=${encodeURIComponent(input)}`;
      const res    = await axios.get(apiUrl, { timeout: 30000 });
      const data   = res.data;

      if (!data || !data.response) throw new Error("لا يوجد رد من الخادم");

      const related = data.relatedSearch?.length
        ? "\n\n💡 بحث مقترح:\n" + data.relatedSearch.slice(0, 3).map(r => `• ${r}`).join("\n")
        : "";

      const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━";
      message.react("✅", messageID);
      return message.reply(
        `${LINE}\n` +
        `  🤖 DAVID AI\n` +
        `${LINE}\n\n` +
        `${data.response}` +
        `${related}\n\n` +
        `${LINE}`
      );
    } catch (err) {
      message.react("❌", messageID);
      return message.reply(`❌ فشل الاتصال بـ AI: ${err.message?.slice(0, 60)}`);
    }
  }
};

/**
 * DAVID V1 — /ping — قياس زمن استجابة البوت
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 */
"use strict";

module.exports = {
  config: {
    name: "ping",
    aliases: ["pong", "latency", "استجابة"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 3,
    role: 0,
    category: "utility",
    description: "يقيس زمن استجابة البوت وحالة النظام",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ message }) {
    const start = Date.now();
    await message.reply("🏸 جارٍ القياس...");
    const elapsed = Date.now() - start;

    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);
    const uptimeStr = `${h}س ${m}د ${s}ث`;

    const mem    = process.memoryUsage();
    const memMB  = Math.round(mem.rss / 1024 / 1024);
    const cmds   = global.GoatBot?.commands?.size || 0;

    const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━";
    return message.reply(
      `${LINE}\n` +
      `  🏸  P I N G  —  D A V I D  V 1\n` +
      `${LINE}\n\n` +
      `  ⚡ الاستجابة : ${elapsed} مللي ث\n` +
      `  🕐 التشغيل  : ${uptimeStr}\n` +
      `  💾 الذاكرة  : ${memMB} MB\n` +
      `  📦 الأوامر  : ${cmds}\n` +
      `  ✅ الحالة   : يعمل بشكل طبيعي\n\n` +
      `${LINE}`
    );
  }
};

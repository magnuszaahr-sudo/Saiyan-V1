أمر "botinfo" — معلومات Saiyan

/**
 * SAIYAN — /botinfo
 * Copyright © 2026 MAGNUS
 * عرض معلومات البوت وحالته
 */
"use strict";

const os = require("os");

function formatMemory(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatUptime(ms) {
  const total = Math.floor(ms / 1000);

  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const parts = [];

  if (days) parts.push(`${days} يوم`);
  if (hours) parts.push(`${hours} ساعة`);
  if (minutes) parts.push(`${minutes} دقيقة`);
  if (seconds || !parts.length) parts.push(`${seconds} ثانية`);

  return parts.join(" و ");
}

module.exports = {
  config: {
    name: "botinfo",
    aliases: ["معلومات", "معلومات_البوت", "saiyan"],
    version: "1.0",
    author: "MAGNUS",
    countDown: 5,
    role: 0,
    category: "info",

    description: "عرض معلومات وحالة Saiyan",

    guide: {
      en: "{pn} — عرض معلومات البوت"
    }
  },

  onStart: async function({ api, event, message }) {
    const botID =
      global.GoatBot?.botID ||
      api.getCurrentUserID?.() ||
      "غير معروف";

    const prefix =
      global.GoatBot?.config?.prefix ||
      "/";

    const startTime =
      global.GoatBot?.startTime ||
      Date.now();

    const uptime =
      Date.now() - startTime;

    const commands =
      global.GoatBot?.commands?.size || 0;

    const memory =
      process.memoryUsage();

    const systemMemory =
      os.totalmem();

    const freeMemory =
      os.freemem();

    const usedSystemMemory =
      systemMemory - freeMemory;

    const text = [
      "╭───────〔 SAIYAN 〕───────╮",
      "",
      "   SYSTEM INFORMATION",
      "",
      `• الحالة      : ONLINE`,
      `• الإصدار     : 2.0.0`,
      `• المطور      : MAGNUS`,
      `• المعرّف     : ${botID}`,
      `• Prefix      : ${prefix}`,
      "",
      "   PERFORMANCE",
      "",
      `• التشغيل     : ${formatUptime(uptime)}`,
      `• الأوامر      : ${commands}`,
      `• ذاكرة البوت : ${formatMemory(memory.heapUsed)}`,
      `• ذاكرة النظام : ${formatMemory(usedSystemMemory)} / ${formatMemory(systemMemory)}`,
      "",
      "   STATUS",
      "",
      "• المحرك      : ACTIVE",
      "• الاتصال     : STABLE",
      "• الحماية     : ENABLED",
      "",
      "╰──────────────────────────╯",
      "        SAIYAN V2 • MAGNUS"
    ].join("\n");

    return message.reply(text);
  }
};

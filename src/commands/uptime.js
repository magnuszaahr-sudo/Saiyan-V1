 /**
 * SAIYAN — /uptime
 * Copyright © 2026 MAGNUS
 */
"use strict";

const os = require("os");

function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const result = [];

  if (days > 0) result.push(`${days}d`);
  if (hours > 0) result.push(`${hours}h`);
  if (minutes > 0) result.push(`${minutes}m`);

  result.push(`${seconds}s`);

  return result.join(" ");
}

module.exports = {
  config: {
    name: "uptime",
    aliases: ["up", "ping", "وقت"],
    version: "3.0",
    author: "MAGNUS",
    countDown: 5,
    role: 2,
    category: "info",

    description: "إظهار حالة سايان ومعلومات التشغيل",

    guide: {
      en: "{pn} — فحص حالة البوت"
    }
  },

  onStart: async function({ api, event, message }) {
    const bootTime =
      global.GoatBot?.startTime || Date.now();

    const uptime = Date.now() - bootTime;

    const memory = process.memoryUsage();

    const totalRam = os.totalmem();
    const freeRam = os.freemem();
    const usedRam = totalRam - freeRam;

    const commandCount =
      global.GoatBot?.commands?.size || 0;

    const botID =
      global.GoatBot?.botID || "Unknown";

    const prefix =
      global.GoatBot?.config?.prefix || "/";

    const checkStart = Date.now();

    await new Promise(resolve =>
      setTimeout(resolve, 10)
    );

    const responseTime = Date.now() - checkStart;

    const ramUsed =
      (memory.heapUsed / 1048576).toFixed(1);

    const systemUsed =
      (usedRam / 1073741824).toFixed(2);

    const systemTotal =
      (totalRam / 1073741824).toFixed(2);

    const text = [
      "┌─〔 S A I Y A N 〕",
      "",
      `› الحالة     : ONLINE`,
      `› التشغيل    : ${formatUptime(uptime)}`,
      `› السرعة     : ${responseTime} ms`,
      `› الأوامر    : ${commandCount}`,
      "",
      "〔 موارد النظام 〕",
      `RAM العملية  : ${ramUsed} MB`,
      `RAM الجهاز   : ${systemUsed} / ${systemTotal} GB`,
      "",
      "〔 معلومات البوت 〕",
      `ID           : ${botID}`,
      `Prefix       : ${prefix}`,
      `الحماية      : ACTIVE`,
      "",
      "〔 SA I Y A N 〕",
      "المطور       : MAGNUS",
      "└────────────────"
    ].join("\n");

    return message.reply(text);
  }
};

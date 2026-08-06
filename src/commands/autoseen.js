/**
 * DAVID V1 — /autoseen — رؤية الرسائل تلقائياً
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");

const DATA_FILE = path.join(process.cwd(), "database", "data", "autoseen.json");

function loadData() {
  try { if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch (_) {}
  return { enabled: false };
}
function saveData(d) {
  fs.ensureDirSync(path.dirname(DATA_FILE));
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}

module.exports = {
  config: {
    name: "autoseen",
    aliases: ["seen", "markseen", "شاهد"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 5,
    role: 2,
    category: "system",
    description: "تفعيل رؤية الرسائل تلقائياً في جميع المحادثات",
    guide: { en: "{pn} on|off|status" }
  },

  onStart: async function ({ args, message }) {
    const data = loadData();
    const sub  = (args[0] || "status").toLowerCase();

    if (sub === "on" || sub === "تفعيل") {
      data.enabled = true;
      saveData(data);
      return message.reply("✅ تم تفعيل رؤية الرسائل التلقائية.");
    }
    if (sub === "off" || sub === "إيقاف") {
      data.enabled = false;
      saveData(data);
      return message.reply("❌ تم إيقاف رؤية الرسائل التلقائية.");
    }

    return message.reply(
      `╔══════════════════════════╗\n` +
      `║  👁️  رؤية تلقائية        ║\n` +
      `╠══════════════════════════╣\n` +
      `║  الحالة: ${data.enabled ? "✅ مفعّل" : "❌ متوقف"}\n` +
      `╠══════════════════════════╣\n` +
      `║  /autoseen on|off        ║\n` +
      `╚══════════════════════════╝`
    );
  },

  // مراقبة الرسائل وتطبيق seen تلقائياً
  onEvent: async function ({ api, event }) {
    try {
      if (event.type !== "message" && event.type !== "message_reply") return;
      const data = loadData();
      if (!data.enabled) return;
      if (String(event.senderID) === String(global.GoatBot?.botID)) return;
      api.markAsRead(event.threadID, () => {});
    } catch (_) {}
  }
};

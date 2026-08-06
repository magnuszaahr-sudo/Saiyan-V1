/**
 * DAVID V1 — /getstate — الحصول على AppState الحالي
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 (getfbstate) & adapted for DAVID engine
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");
const os   = require("os");

const TMP_DIR = path.join(os.tmpdir(), "david_state");

module.exports = {
  config: {
    name: "getstate",
    aliases: ["getfbstate", "getcookie", "appstate", "state"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 10,
    role: 3,
    category: "owner",
    description: "الحصول على AppState الحالي للبوت (للمالك فقط)",
    guide: {
      en: "{pn}             — AppState JSON\n" +
          "{pn} cookie / c  — صيغة cookies\n" +
          "{pn} string / s  — صيغة نصية"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const { senderID, threadID, messageID } = event;

    fs.ensureDirSync(TMP_DIR);

    let fbstate, fileName;
    const mode = (args[0] || "").toLowerCase();

    try {
      const appState = api.getAppState();

      if (["cookie", "cookies", "c"].includes(mode)) {
        fbstate  = JSON.stringify(appState.map(e => ({ name: e.key, value: e.value })), null, 2);
        fileName = "cookies.json";
      } else if (["string", "str", "s"].includes(mode)) {
        fbstate  = appState.map(e => `${e.key}=${e.value}`).join("; ");
        fileName = "cookiesString.txt";
      } else {
        fbstate  = JSON.stringify(appState, null, 2);
        fileName = "appState.json";
      }
    } catch (err) {
      return message.reply(`❌ تعذّر قراءة AppState: ${err.message}`);
    }

    const filePath = path.join(TMP_DIR, fileName);
    fs.writeFileSync(filePath, fbstate);

    try {
      // إرسال للمحادثة الخاصة إذا كان الأمر من غروب
      const target = senderID === threadID ? threadID : senderID;

      await new Promise((resolve, reject) => {
        api.sendMessage(
          {
            body: `🔑 DAVID V1 — AppState\n📄 الصيغة: ${fileName}\n📅 ${new Date().toLocaleString("ar-DZ")}`,
            attachment: fs.createReadStream(filePath)
          },
          target,
          (err) => {
            try { fs.unlinkSync(filePath); } catch (_) {}
            err ? reject(err) : resolve();
          }
        );
      });

      if (senderID !== threadID) {
        message.reply("✅ تم إرسال AppState إلى محادثتك الخاصة مع البوت.");
      }
    } catch (err) {
      try { fs.unlinkSync(filePath); } catch (_) {}
      message.reply(`❌ فشل الإرسال: ${err.message}`);
    }
  }
};

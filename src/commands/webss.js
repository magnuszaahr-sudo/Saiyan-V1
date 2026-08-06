/**
 * DAVID V1 — /webss — لقطة شاشة موقع
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 */
"use strict";
const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const os    = require("os");

const CACHE_DIR = path.join(os.tmpdir(), "david_webss");

function cleanFile(f) {
  try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
}

module.exports = {
  config: {
    name: "webss",
    aliases: ["screenshot", "ss", "snap"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 10,
    role: 0,
    category: "utility",
    description: "التقاط لقطة شاشة لأي موقع",
    guide: { en: "{pn} [رابط الموقع]\nمثال: {pn} https://google.com" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const rawUrl = args[0];

    if (!rawUrl) {
      return message.reply(
        "╔═══════════════════════════╗\n" +
        "║  📸  لقطة شاشة موقع      ║\n" +
        "╠═══════════════════════════╣\n" +
        "║  /webss [رابط]            ║\n" +
        "║  مثال: /webss google.com  ║\n" +
        "╚═══════════════════════════╝"
      );
    }

    const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    message.react("⏳", messageID);
    message.reply(`📸 جاري التقاط لقطة شاشة...\n🌐 ${url}`);

    fs.ensureDirSync(CACHE_DIR);
    const tmpFile = path.join(CACHE_DIR, `ss_${Date.now()}.jpg`);

    try {
      // استخدام popcat API
      const res = await axios.get(
        `https://api.popcat.xyz/v2/screenshot?url=${encodeURIComponent(url)}`,
        { responseType: "arraybuffer", timeout: 30000 }
      );

      fs.writeFileSync(tmpFile, Buffer.from(res.data));

      message.react("✅", messageID);
      await new Promise((resolve, reject) => {
        api.sendMessage(
          { body: `📸 لقطة شاشة: ${url}`, attachment: fs.createReadStream(tmpFile) },
          threadID,
          (err) => { cleanFile(tmpFile); err ? reject(err) : resolve(); }
        );
      });
    } catch (err) {
      cleanFile(tmpFile);
      message.react("❌", messageID);

      // جرب API بديل
      try {
        const res2 = await axios.get(
          `https://image.thum.io/get/width/1200/crop/800/${encodeURIComponent(url)}`,
          { responseType: "arraybuffer", timeout: 30000 }
        );
        const tmpFile2 = path.join(CACHE_DIR, `ss2_${Date.now()}.jpg`);
        fs.writeFileSync(tmpFile2, Buffer.from(res2.data));
        message.react("✅", messageID);
        api.sendMessage(
          { body: `📸 لقطة شاشة: ${url}`, attachment: fs.createReadStream(tmpFile2) },
          threadID,
          () => cleanFile(tmpFile2)
        );
      } catch (_) {
        message.reply(`❌ فشل التقاط الشاشة: رابط غير صالح أو محجوب\n🌐 ${url}`);
      }
    }
  }
};

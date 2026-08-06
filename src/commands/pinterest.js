/**
 * DAVID V1 — /pinterest — بحث صور Pinterest
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 */
"use strict";
const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const os    = require("os");

const CACHE_DIR = path.join(os.tmpdir(), "david_pin");

module.exports = {
  config: {
    name: "pinterest",
    aliases: ["pin", "pint", "pintest"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 5,
    role: 0,
    category: "image",
    description: "البحث عن صور من Pinterest",
    guide: { en: "{pn} [كلمة البحث]\nمثال: {pn} Naruto" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const query = args.join(" ");
    if (!query) {
      return message.reply(
        "╔═══════════════════════════╗\n" +
        "║  🖼️  Pinterest             ║\n" +
        "╠═══════════════════════════╣\n" +
        "║  /pin [كلمة البحث]        ║\n" +
        "║  مثال: /pin anime girl    ║\n" +
        "╚═══════════════════════════╝"
      );
    }

    message.react("⏳", messageID);
    fs.ensureDirSync(CACHE_DIR);

    const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/pinterest?search=${encodeURIComponent(query)}&count=15`;

    let imageList = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await axios.get(apiUrl, { timeout: 15000 });
        const data = res.data?.data;
        if (Array.isArray(data) && data.length > 0) { imageList = data; break; }
      } catch (_) {
        if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }

    if (!imageList || imageList.length === 0) {
      message.react("❌", messageID);
      return message.reply(`❌ لم يتم العثور على نتائج لـ "${query}"`);
    }

    // إزالة التكرار وترتيب حسب الجودة
    imageList = [...new Set(imageList)].sort((a, b) => {
      const rank = u => u.includes("originals") ? 0 : u.includes("736x") ? 1 : 2;
      return rank(a) - rank(b);
    });

    const saved = [];
    const attachments = [];
    const MAX = 5;

    for (let i = 0; i < imageList.length && attachments.length < MAX; i++) {
      try {
        const res = await axios.get(imageList[i], {
          responseType: "arraybuffer",
          timeout: 20000,
          headers: { Referer: "https://www.pinterest.com/" }
        });
        const filePath = path.join(CACHE_DIR, `pin_${Date.now()}_${i}.jpg`);
        fs.writeFileSync(filePath, Buffer.from(res.data));
        saved.push(filePath);
        attachments.push(fs.createReadStream(filePath));
      } catch (_) {}
    }

    if (!attachments.length) {
      message.react("❌", messageID);
      return message.reply("❌ فشل تحميل الصور من Pinterest");
    }

    message.react("✅", messageID);
    api.sendMessage(
      { body: `🖼️ Pinterest — "${query}"\n📸 ${attachments.length} صور`, attachment: attachments },
      threadID,
      () => saved.forEach(f => { try { fs.unlinkSync(f); } catch (_) {} }),
      messageID
    );
  }
};

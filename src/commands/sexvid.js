/**
 * DAVID V1 — /sexvid — فيديو للكبار (18+)
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 * Role: 2 (Bot Admin only — للمجموعات المرخصة فقط)
 */
"use strict";
const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const os    = require("os");

const CACHE_DIR = path.join(os.tmpdir(), "david_sex");
const MAX_MB    = 25;

// روابط الفيديوهات (Google Drive direct download)
const LINKS = [
  "https://drive.google.com/uc?export=download&id=1-gJdG8bxmZLyOC7-6E4A5Hm95Q9gWIPO",
  "https://drive.google.com/uc?export=download&id=1-ryNR8j529EZyTCuMur9wmkFz4ahlv-f",
  "https://drive.google.com/uc?export=download&id=1-vHh7XBtPOS3s42q-s8s30Bzsx2u6czu",
  "https://drive.google.com/uc?export=download&id=11IUd-PDHozLmh_RtvSf0S-f3G6wut1ZT",
  "https://drive.google.com/uc?export=download&id=12YCqZovJ8sVZZZTDLu8dv8NAwsMGfqiB",
  "https://drive.google.com/uc?export=download&id=13utWruipZ_3fR0QSMtGMnFjGt3bthnbf",
  "https://drive.google.com/uc?export=download&id=14GYNaYL-pkEh3UH0oIUXVamru5h830DY",
  "https://drive.google.com/uc?export=download&id=161O9_EbCQJ8nHTT7VeE7BWtHvEjHAT4k",
  "https://drive.google.com/uc?export=download&id=170YWB4jpMfR5GpmPb_Lymh6OmrmWDE0x",
  "https://drive.google.com/uc?export=download&id=17nvXNBpMWVmuWLK-kkLzkbrbpW43rD4r",
  "https://drive.google.com/uc?export=download&id=17w7sehThOv6IRrcsLboi7Zk6zZvfBHr5",
  "https://drive.google.com/uc?export=download&id=18Dyc1vkysNhHSGi5OYpa6AzD5rk3_vkf",
  "https://drive.google.com/uc?export=download&id=19GcLpOzFYypYFu1FboQyVjWxC9Jh3JC5",
  "https://drive.google.com/uc?export=download&id=1AjrBOBRWKpKjLOYV1oof2mVZBzx0ebgD",
  "https://drive.google.com/uc?export=download&id=1BPOEwIt7lGv66w5pUTDU937q4i5ym5S_",
  "https://drive.google.com/uc?export=download&id=1C-VxCoO5gMKCq2rg7PxjlitK4bOg7pt2",
  "https://drive.google.com/uc?export=download&id=1DrhAOOeYIHlTWJU5e26OMjO0R5nueyf7",
  "https://drive.google.com/uc?export=download&id=1EcBmrdqYfQbwSPr2kiKY2QV_6CXLJJj6",
  "https://drive.google.com/uc?export=download&id=1F5Xc5Qff4RGyUuHzuqPfmOn2EZKQIn7P",
  "https://drive.google.com/uc?export=download&id=1Frf4GUg26Abw2lJdQ_RHycNhDMZXfMm2",
];

// تتبع ما تم إرساله لتجنب التكرار
let sentIndexes = [];

function pickRandom() {
  if (sentIndexes.length >= LINKS.length) sentIndexes = [];
  let idx;
  do { idx = Math.floor(Math.random() * LINKS.length); }
  while (sentIndexes.includes(idx));
  sentIndexes.push(idx);
  return { link: LINKS[idx], idx };
}

function cleanFile(f) {
  try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
}

module.exports = {
  config: {
    name: "sexvid",
    aliases: ["sex", "18+", "adult"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 30,
    role: 2,
    category: "18+",
    description: "إرسال فيديو للكبار عشوائي (للمجموعات المرخصة فقط)",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, messageID } = event;

    message.react("⏳", messageID);
    fs.ensureDirSync(CACHE_DIR);

    const { link } = pickRandom();
    const tmpFile  = path.join(CACHE_DIR, `sex_${Date.now()}.mp4`);

    try {
      const res = await axios.get(link, {
        responseType: "stream",
        timeout: 60000,
        headers: { "User-Agent": "Mozilla/5.0" },
        maxRedirects: 10
      });

      let size = 0;
      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(tmpFile);
        res.data.on("data", chunk => {
          size += chunk.length;
          if (size > MAX_MB * 1024 * 1024) {
            writer.destroy();
            res.data.destroy();
            cleanFile(tmpFile);
            reject(new Error(`الحجم أكبر من ${MAX_MB}MB`));
          }
        });
        res.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      message.react("✅", messageID);
      await new Promise((res2, rej) => {
        api.sendMessage(
          { body: "🔞 فيديو 18+\n⚠️ للمجموعات المرخصة فقط", attachment: fs.createReadStream(tmpFile) },
          threadID,
          (err) => { cleanFile(tmpFile); err ? rej(err) : res2(); }
        );
      });

    } catch (err) {
      cleanFile(tmpFile);
      message.react("❌", messageID);
      message.reply(`❌ فشل التحميل: ${err.message?.slice(0, 60) || "خطأ غير معروف"}`);
    }
  }
};

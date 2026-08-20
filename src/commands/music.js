/**
 * DAVID V1 — /music — البحث عن الأغاني وتحميلها MP3
 * GoatBot v2 command
 * تم التحديث لتجنب خطأ 429 وسيرفرات يوتيوب المحظورة
 */
"use strict";

const fs = require("fs-extra");
const os = require("os");
const path = require("path");
const axios = require("axios");

const TMP_DIR = path.join(os.tmpdir(), "david_music");
const MAX_MB = 25; // حد فيسبوك التقريبي للمرفقات

fs.ensureDirSync(TMP_DIR);

function cleanFile(file) {
  try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch (_) {}
}

module.exports = {
  config: {
    name: "music",
    aliases: ["موسيقى", "اغنية", "sing"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 5,
    role: 0,
    category: "media",
    description: "البحث عن الأغاني والموسيقى وتحميلها بصيغة MP3 برابط مباشر",
    guide: { en: "{pn} [اسم الأغنية أو الفنان]\nمثال: {pn} hope xxxtentacion" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const query = args.join(" ").trim();

    if (!query) {
      return message.reply(
        "🎧 أمر الموسيقى\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "الاستخدام: /music [اسم الأغنية]\n" +
        "مثال: /music hope xxxtentacion"
      );
    }

    let searchingID = null;
    try { message.react("⏳", messageID); } catch (_) {}

    try {
      const sent = await new Promise(res =>
        api.sendMessage("🔍 جاري البحث عن الصوت وتحميله...", threadID, (e, info) => res(info || null))
      );
      searchingID = sent && sent.messageID;
    } catch (_) {}

    const unsend = () => {
      if (!searchingID) return;
      try { api.unsendMessage(searchingID); } catch (_) {}
    };

    let tmpFile = null;
    try {
      // 1. البحث عن الأغنية عبر API الموسيقى المباشر
      const searchRes = await axios.get(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`, { timeout: 15000 });
      const song = searchRes.data?.data?.results?.[0];

      if (!song) {
        unsend();
        try { message.react("❌", messageID); } catch (_) {}
        return message.reply(`❌ لم يتم العثور على أي نتائج للبحث عن: "${query}"`);
      }

      // 2. اختيار رابط التحميل المباشر لأعلى جودة
      const downloadUrls = song.downloadUrl || [];
      const downloadUrl = downloadUrls[downloadUrls.length - 1]?.url || downloadUrls[0]?.url;

      if (!downloadUrl) {
        throw new Error("تعذر الحصول على رابط التحميل المباشر.");
      }

      tmpFile = path.join(TMP_DIR, `music_${Date.now()}.mp3`);

      // 3. تحميل الملف الصوتي إلى السيرفر
      const response = await axios({
        method: "get",
        url: downloadUrl,
        responseType: "stream",
        timeout: 45000
      });

      const writer = fs.createWriteStream(tmpFile);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      const stat = fs.statSync(tmpFile);
      const sizeMB = stat.size / (1024 * 1024);

      if (!stat.size) throw new Error("الملف الناتج فارغ");
      if (sizeMB > MAX_MB) throw new Error("TOO_BIG");

      // تنسيق المدة الزمنية
      const durationSec = song.duration || 0;
      const min = Math.floor(durationSec / 60);
      const sec = (durationSec % 60).toString().padStart(2, '0');

      const caption =
        `🎵 **${song.name || "مقطع صوتي"}**\n` +
        `👤 الفنان: ${song.primaryArtists || "غير معروف"}\n` +
        `⏱️ المدة: ${min}:${sec}\n` +
        `📦 الحجم: ${sizeMB.toFixed(2)} MB\n\n` +
        `👑 DAVID V1`;

      // 4. إرسال الصوت داخل الشات
      await new Promise((resolve, reject) => {
        api.sendMessage(
          { body: caption, attachment: fs.createReadStream(tmpFile) },
          threadID,
          err => { cleanFile(tmpFile); tmpFile = null; err ? reject(err) : resolve(); },
          messageID
        );
      });

      unsend();
      try { message.react("✅", messageID); } catch (_) {}

    } catch (err) {
      cleanFile(tmpFile);
      unsend();
      try { message.react("❌", messageID); } catch (_) {}
      
      const m = String(err && err.message || err);
      if (m === "TOO_BIG") {
        return message.reply(`❌ حجم الأغنية أكبر من ${MAX_MB} MB، وفيسبوك لا يسمح بإرسالها.`);
      }
      return message.reply("❌ تعذّر تحميل الصوت حالياً، حاول مجدداً لاحقاً.");
    }
  }
};

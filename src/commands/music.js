/**
 * DAVID V1 — /music — تحميل الأغاني من يوتيوب باستخدام الكوكيز الموثقة
 * GoatBot v2 command
 */
"use strict";

const fs = require("fs-extra");
const os = require("os");
const path = require("path");
const ytdl = require("@distube/ytdl-core");
const ytSearch = require("yt-search");

const TMP_DIR = path.join(os.tmpdir(), "david_music");
const COOKIES_PATH = path.join(__dirname, "cookies.txt");
const MAX_MB = 25;

fs.ensureDirSync(TMP_DIR);

function cleanFile(file) {
  try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch (_) {}
}

function getYtdlAgent() {
  try {
    if (fs.existsSync(COOKIES_PATH)) {
      const cookiesArr = ytdl.utils.parseCookieFile ? ytdl.utils.parseCookieFile(COOKIES_PATH) : [];
      return ytdl.createAgent(cookiesArr);
    }
  } catch (err) {
    console.error("خطأ في قراءة ملف cookies.txt:", err.message);
  }
  return undefined;
}

module.exports = {
  config: {
    name: "music",
    aliases: ["موسيقى", "اغنية", "sing"],
    version: "9.0",
    author: "DJAMEL",
    countDown: 5,
    role: 0,
    category: "media",
    description: "البحث عن الأغاني والموسيقى وتحميلها بصيغة MP3 من يوتيوب",
    guide: { en: "{pn} [اسم الأغنية]\nمثال: {pn} hope xxxtentacion" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const query = args.join(" ").trim();

    if (!query) {
      return message.reply("🎧 اكتب اسم الأغنية بعد الأمر.\nمثال: /music hope xxxtentacion");
    }

    let searchingID = null;
    try { message.react("⏳", messageID); } catch (_) {}

    try {
      const sent = await new Promise(res =>
        api.sendMessage("🔍 جاري البحث في يوتيوب وتحميل الصوت...", threadID, (e, info) => res(info || null))
      );
      searchingID = sent && sent.messageID;
    } catch (_) {}

    const unsend = () => {
      if (!searchingID) return;
      try { api.unsendMessage(searchingID); } catch (_) {}
    };

    let tmpFile = null;
    try {
      // 1. البحث المباشر في يوتيوب
      const searchResults = await ytSearch(query);
      const video = searchResults?.videos?.[0];

      if (!video) {
        unsend();
        try { message.react("❌", messageID); } catch (_) {}
        return message.reply(`❌ لم أجد أي نتيجة في يوتيوب لـ: "${query}"`);
      }

      // 2. إعداد مشغل التنزيل باستخدام كوكيز يوتيوب الموثوقة
      const agent = getYtdlAgent();
      tmpFile = path.join(TMP_DIR, `music_${Date.now()}.mp3`);

      const downloadOptions = {
        quality: "highestaudio",
        filter: "audioonly",
        highWaterMark: 1 << 25
      };

      if (agent) {
        downloadOptions.agent = agent;
      }

      const stream = ytdl(video.url, downloadOptions);
      const writer = fs.createWriteStream(tmpFile);

      let size = 0;
      stream.on("data", chunk => {
        size += chunk.length;
        if (size > MAX_MB * 1024 * 1024) {
          stream.destroy();
          writer.destroy();
          cleanFile(tmpFile);
        }
      });

      stream.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
        stream.on("error", reject);
      });

      const stat = fs.statSync(tmpFile);
      const sizeMB = stat.size / (1024 * 1024);

      if (!stat.size) throw new Error("الملف الناتج فارغ");
      if (sizeMB > MAX_MB) throw new Error("TOO_BIG");

      const caption =
        `🎵 **${video.title}**\n` +
        `👤 القناة: ${video.author?.name || "غير معروف"}\n` +
        `⏱️ المدة: ${video.timestamp}\n` +
        `📦 الحجم: ${sizeMB.toFixed(2)} MB\n\n` +
        `👑 DAVID V1`;

      // 3. إرسال الصوت
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
        return message.reply(`❌ حجم الأغنية أكبر من ${MAX_MB} MB.`);
      }
      return message.reply(`❌ تعذر تحميل الصوت.\nالسبب: ${m.slice(0, 100)}`);
    }
  }
};

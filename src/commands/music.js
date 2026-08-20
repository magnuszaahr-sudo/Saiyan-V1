/**
 * DAVID V1 — /music — البحث عن الأغاني وتحميلها MP3 من يوتيوب
 * GoatBot v2 command
 */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const ytSearch = require("yt-search");
const ytdl = require("@distube/ytdl-core");

const TMP_DIR = path.join(os.tmpdir(), "david_music");
const MAX_MB = 25; // حد فيسبوك التقريبي للمرفقات

function ensureTmp() {
  try { fs.mkdirSync(TMP_DIR, { recursive: true }); } catch (_) {}
}

function cleanFile(file) {
  try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch (_) {}
}

function hasFFmpeg() {
  return new Promise(resolve => {
    try {
      const p = spawn(process.env.FFMPEG_PATH || "ffmpeg", ["-version"]);
      p.on("error", () => resolve(false));
      p.on("close", code => resolve(code === 0));
    } catch (_) { resolve(false); }
  });
}

/** تحميل الصوت وتحويله MP3 بأعلى جودة متاحة */
function downloadMp3(videoUrl, outputFile) {
  return new Promise((resolve, reject) => {
    let settled = false, ffmpegClosed = false, writerFinished = false, size = 0;
    let stderr = "";

    const input = ytdl(videoUrl, {
      quality: "highestaudio",
      filter: "audioonly",
      highWaterMark: 1 << 25,
      requestOptions: {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
        }
      }
    });

    const ffmpeg = spawn(process.env.FFMPEG_PATH || "ffmpeg", [
      "-hide_banner", "-loglevel", "error",
      "-i", "pipe:0",
      "-vn", "-acodec", "libmp3lame", "-b:a", "320k", "-ar", "44100",
      "-f", "mp3", "pipe:1"
    ], { stdio: ["pipe", "pipe", "pipe"] });

    const writer = fs.createWriteStream(outputFile);

    const fail = err => {
      if (settled) return;
      settled = true;
      try { input.destroy(); } catch (_) {}
      try { ffmpeg.kill("SIGKILL"); } catch (_) {}
      try { writer.destroy(); } catch (_) {}
      cleanFile(outputFile);
      reject(err instanceof Error ? err : new Error(String(err)));
    };
    const finish = () => {
      if (!settled && ffmpegClosed && writerFinished) { settled = true; resolve(); }
    };

    input.on("error", fail);
    ffmpeg.on("error", fail);
    ffmpeg.stderr.on("data", c => { stderr += c.toString(); });
    ffmpeg.stdout.on("data", c => {
      size += c.length;
      if (size > MAX_MB * 1024 * 1024) fail(new Error("TOO_BIG"));
    });
    writer.on("error", fail);
    writer.on("finish", () => { writerFinished = true; finish(); });
    ffmpeg.on("close", code => {
      if (settled) return;
      if (code !== 0) return fail(new Error(stderr.trim() || "فشل تحويل الصوت"));
      ffmpegClosed = true; finish();
    });

    input.pipe(ffmpeg.stdin);
    ffmpeg.stdout.pipe(writer);
  });
}

/** بديل بدون ffmpeg: تنزيل مسار الصوت كما هو (m4a) */
function downloadRawAudio(videoUrl, outputFile) {
  return new Promise((resolve, reject) => {
    let size = 0, settled = false;
    const stream = ytdl(videoUrl, { quality: "highestaudio", filter: "audioonly", highWaterMark: 1 << 25 });
    const writer = fs.createWriteStream(outputFile);
    const fail = err => {
      if (settled) return;
      settled = true;
      try { stream.destroy(); } catch (_) {}
      try { writer.destroy(); } catch (_) {}
      cleanFile(outputFile);
      reject(err instanceof Error ? err : new Error(String(err)));
    };
    stream.on("error", fail);
    writer.on("error", fail);
    stream.on("data", c => {
      size += c.length;
      if (size > MAX_MB * 1024 * 1024) fail(new Error("TOO_BIG"));
    });
    writer.on("finish", () => { if (!settled) { settled = true; resolve(); } });
    stream.pipe(writer);
  });
}

function humanError(err) {
  const m = String(err && err.message || err);
  if (m === "TOO_BIG") return `❌ حجم الأغنية أكبر من ${MAX_MB} ميغابايت، وفيسبوك لا يسمح بإرسالها.\n💡 جرّب نسخة أقصر من الأغنية.`;
  if (/private video/i.test(m)) return "❌ هذا المقطع خاص (Private) ولا يمكن تحميله.";
  if (/age|sign in to confirm|consent/i.test(m)) return "❌ المقطع محمي بقيود عمرية أو يتطلب تسجيل دخول.";
  if (/unavailable|not available|410|404/i.test(m)) return "❌ المقطع غير متاح أو محذوف أو محجوب في هذا البلد.";
  if (/copyright|blocked/i.test(m)) return "❌ المقطع محمي بحقوق نشر ولا يمكن تحميله.";
  if (/ENOSPC/i.test(m)) return "❌ لا توجد مساحة كافية على السيرفر.";
  if (/ffmpeg|ENOENT/i.test(m)) return "❌ أداة معالجة الصوت غير متوفرة على السيرفر.";
  if (/timed? ?out|ETIMEDOUT|ECONNRESET|socket/i.test(m)) return "❌ انقطع الاتصال أثناء التحميل، أعد المحاولة.";
  return `❌ تعذّر تحميل الصوت.\n📄 السبب: ${m.slice(0, 120)}`;
}

module.exports = {
  config: {
    name: "music",
    aliases: ["موسيقى", "اغنية", "sing"],
    version: "1.0",
    author: "DJAMEL",
    countDown: 10,
    role: 0,
    category: "media",
    description: "البحث عن الأغاني والموسيقى وتحميلها بصيغة MP3 من يوتيوب",
    guide: { en: "{pn} [اسم الأغنية أو الفنان أو رابط يوتيوب]" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const query = args.join(" ").trim();

    if (!query) {
      return message.reply(
        "🎧 أمر الموسيقى\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "الاستخدام: /music [اسم الأغنية]\n" +
        "مثال: /music hope xxxtentacion\n" +
        `الحد الأقصى للحجم: ${MAX_MB} MB`
      );
    }

    let searchingID = null;
    try { message.react("⏳", messageID); } catch (_) {}

    try {
      const sent = await new Promise(res =>
        api.sendMessage("🔍 جاري البحث عن الصوت...", threadID, (e, info) => res(info || null))
      );
      searchingID = sent && sent.messageID;
    } catch (_) {}

    const unsend = () => {
      if (!searchingID) return;
      try { api.unsendMessage(searchingID); } catch (_) {}
    };

    let tmpFile = null;
    try {
      ensureTmp();

      const isUrl = /youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts/i.test(query);
      let videoUrl, info = null;

      if (isUrl) {
        videoUrl = query;
        try {
          const id = ytdl.getVideoID(query);
          const r = await ytSearch({ videoId: id });
          if (r) info = { title: r.title, timestamp: r.timestamp, author: { name: r.author && r.author.name } };
        } catch (_) {}
      } else {
        const results = await ytSearch(query);
        const videos = (results && results.videos) || [];
        if (!videos.length) {
          unsend();
          try { message.react("❌", messageID); } catch (_) {}
          return message.reply(`❌ لا توجد أي نتائج للبحث عن: "${query}"\n💡 جرّب كتابة اسم الأغنية مع اسم الفنان.`);
        }
        info = videos[0];
        videoUrl = `https://www.youtube.com/watch?v=${info.videoId}`;
      }

      const useFFmpeg = await hasFFmpeg();
      tmpFile = path.join(TMP_DIR, `music_${Date.now()}${useFFmpeg ? ".mp3" : ".m4a"}`);

      if (useFFmpeg) await downloadMp3(videoUrl, tmpFile);
      else await downloadRawAudio(videoUrl, tmpFile);

      const stat = fs.statSync(tmpFile);
      const sizeMB = stat.size / (1024 * 1024);
      if (!stat.size) throw new Error("الملف الناتج فارغ");
      if (sizeMB > MAX_MB) throw new Error("TOO_BIG");

      const caption =
        `🎵 ${(info && info.title) || "مقطع صوتي"}\n` +
        `⏱️ ${(info && info.timestamp) || "غير معروف"}\n` +
        `👤 ${(info && info.author && info.author.name) || "غير معروف"}\n` +
        `📦 ${sizeMB.toFixed(2)} MB`;

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
      return message.reply(humanError(err));
    }
  }
};

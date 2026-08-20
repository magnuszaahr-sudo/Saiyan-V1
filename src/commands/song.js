/**
 * DAVID V1 — /song — تحميل أغاني من يوتيوب
 * Copyright © 2025 DJAMEL
 * Uses direct YouTube audio extraction with ytdl-core + ffmpeg
 */
"use strict";
const fs       = require("fs-extra");
const path     = require("path");
const ytSearch = require("yt-search");
const os       = require("os");
const { spawn } = require("child_process");
const ytdl     = require("@distube/ytdl-core");

const TMP_DIR    = path.join(os.tmpdir(), "david_song");
const MAX_MB     = 25;

function cleanFile(f) {
  try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
}

function downloadAudio(videoUrl, outputFile) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let ffmpegClosed = false;
    let writerFinished = false;
    let size = 0;
    const input = ytdl(videoUrl, {
      quality: "highestaudio",
      filter: "audioonly",
      highWaterMark: 1 << 25,
    });
    const ffmpeg = spawn(process.env.FFMPEG_PATH || "ffmpeg", [
      "-hide_banner", "-loglevel", "error",
      "-i", "pipe:0",
      "-vn", "-acodec", "libmp3lame", "-b:a", "128k",
      "-f", "mp3", "pipe:1",
    ], { stdio: ["pipe", "pipe", "pipe"] });
    const writer = fs.createWriteStream(outputFile);
    let stderr = "";

    const fail = error => {
      if (settled) return;
      settled = true;
      input.destroy();
      ffmpeg.kill("SIGKILL");
      writer.destroy();
      cleanFile(outputFile);
      reject(error instanceof Error ? error : new Error(String(error)));
    };
    const finish = () => {
      if (!settled && ffmpegClosed && writerFinished) {
        settled = true;
        resolve();
      }
    };

    input.on("error", fail);
    ffmpeg.on("error", fail);
    ffmpeg.stderr.on("data", chunk => { stderr += chunk.toString(); });
    ffmpeg.stdout.on("data", chunk => {
      size += chunk.length;
      if (size > MAX_MB * 1024 * 1024) {
        fail(new Error(`الملف أكبر من ${MAX_MB} MB`));
      }
    });
    writer.on("error", fail);
    writer.on("finish", () => {
      writerFinished = true;
      finish();
    });
    ffmpeg.on("close", code => {
      if (settled) return;
      if (code !== 0) return fail(new Error(stderr.trim() || "فشل تحويل الصوت"));
      ffmpegClosed = true;
      finish();
    });

    input.pipe(ffmpeg.stdin);
    ffmpeg.stdout.pipe(writer);
  });
}

module.exports = {
  config: {
    name: "song",
    aliases: ["mp3", "أغنية"],
    version: "3.0",
    author: "DJAMEL",
    countDown: 10,
    role: 0,
    category: "media",
    description: "تحميل أغنية من يوتيوب كملف صوتي MP3",
    guide: { en: "{pn} [اسم الأغنية أو الفنان أو رابط يوتيوب]" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const input = args.join(" ").trim();

    if (!input) {
      return message.reply(
        "╔═══════════════════════════════╗\n" +
        "║  🎵  تحميل أغنية             ║\n" +
        "╠═══════════════════════════════╣\n" +
        "║  /song [اسم الأغنية]          ║\n" +
        "║  /song [رابط يوتيوب]          ║\n" +
        "╠═══════════════════════════════╣\n" +
        "║  الحد الأقصى: 25 MB           ║\n" +
        "╚═══════════════════════════════╝"
      );
    }

    message.react("⏳", messageID);
    fs.ensureDirSync(TMP_DIR);

    let videoUrl  = null;
    let videoInfo = null;

    try {
      const isYTUrl = /youtube\.com\/watch|youtu\.be|youtube\.com\/shorts/i.test(input);
      if (isYTUrl) {
        videoUrl = input;
      } else {
        const results = await ytSearch(input);
        if (!results?.videos?.length) {
          message.react("❌", messageID);
          return message.reply(`❌ لا توجد نتائج لـ "${input}"`);
        }
        const best = results.videos[0];
        videoUrl  = `https://www.youtube.com/watch?v=${best.videoId}`;
        videoInfo = best;
      }

      const tmpFile = path.join(TMP_DIR, `song_${Date.now()}.mp3`);
      await downloadAudio(videoUrl, tmpFile);

      const sizeMB = (fs.statSync(tmpFile).size / (1024 * 1024)).toFixed(2);

      let caption = `🎵 ${videoInfo?.title || "أغنية"}\n📦 ${sizeMB} MB`;
      if (videoInfo) {
        caption += `\n📺 القناة: ${videoInfo.author?.name || ""}\n⏱ المدة: ${videoInfo.timestamp}`;
      }

      await new Promise((res, rej) => {
        api.sendMessage(
          { body: caption, attachment: fs.createReadStream(tmpFile) },
          threadID,
          (err) => { cleanFile(tmpFile); err ? rej(err) : res(); }
        );
      });

      message.react("✅", messageID);
    } catch (err) {
      message.react("❌", messageID);
      message.reply(
        `╔═══════════════════════════╗\n` +
        `║  ❌ فشل التحميل           ║\n` +
        `╠═══════════════════════════╣\n` +
        `║  ${String(err.message).slice(0, 40)}\n` +
        `╚═══════════════════════════╝`
      );
    }
  }
};

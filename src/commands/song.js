/**
 * DAVID V1 — /song — تحميل أغاني من يوتيوب
 * Copyright © 2025 DJAMEL
 * Uses cobalt.tools API for download
 */
"use strict";
const axios    = require("axios");
const fs       = require("fs-extra");
const path     = require("path");
const ytSearch = require("yt-search");
const os       = require("os");

const TMP_DIR    = path.join(os.tmpdir(), "david_song");
const COBALT_API = "https://co.wuk.sh/api/json";
const MAX_MB     = 25;

function cleanFile(f) {
  try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
}

module.exports = {
  config: {
    name: "song",
    aliases: ["mp3", "music", "اغنية", "أغنية", "موسيقى"],
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

      // تحميل صوت فقط عبر Cobalt
      const cobaltRes = await axios.post(COBALT_API,
        { url: videoUrl, isAudioOnly: true, aFormat: "mp3", filenamePattern: "basic" },
        {
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          timeout: 20000,
        }
      );

      const { status, url: dlUrl } = cobaltRes.data || {};
      if (status !== "stream" && status !== "redirect")
        throw new Error(cobaltRes.data?.text || "فشل استرجاع رابط التحميل");

      const tmpFile = path.join(TMP_DIR, `song_${Date.now()}.mp3`);
      const fileRes = await axios.get(dlUrl, {
        responseType: "stream",
        timeout: 90000,
        maxContentLength: MAX_MB * 1024 * 1024 + 1,
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      await new Promise((res, rej) => {
        let size = 0;
        const writer = fs.createWriteStream(tmpFile);
        fileRes.data.on("data", chunk => {
          size += chunk.length;
          if (size > MAX_MB * 1024 * 1024) {
            writer.destroy(); fileRes.data.destroy();
            cleanFile(tmpFile);
            rej(new Error(`الملف أكبر من ${MAX_MB} MB`));
          }
        });
        fileRes.data.pipe(writer);
        writer.on("finish", res);
        writer.on("error", rej);
      });

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

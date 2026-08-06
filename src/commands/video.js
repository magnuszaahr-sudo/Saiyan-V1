/**
 * DAVID V1 — /video — تحميل فيديو من يوتيوب
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 * Uses yt-search for lookup + cobalt.tools API for download
 */
"use strict";
const fs       = require("fs-extra");
const path     = require("path");
const axios    = require("axios");
const ytSearch = require("yt-search");
const os       = require("os");

const TMP_DIR       = path.join(os.tmpdir(), "david_video");
const MAX_MB        = 25;
const COBALT_API    = "https://co.wuk.sh/api/json";

function formatViews(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function isYouTubeUrl(text) {
  return /youtube\.com\/watch|youtu\.be|youtube\.com\/shorts/i.test(text);
}

function cleanFile(f) {
  try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
}

module.exports = {
  config: {
    name: "video",
    aliases: ["vid", "يوتيوب", "yt", "فيديو"],
    version: "3.0",
    author: "DJAMEL",
    countDown: 10,
    role: 0,
    category: "media",
    description: "بحث وتحميل فيديو من يوتيوب",
    guide: { en: "{pn} [رابط يوتيوب أو اسم الفيديو]" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const input = args.join(" ").trim();

    if (!input) {
      return message.reply(
        "╔═══════════════════════════════╗\n" +
        "║  🎬  تحميل فيديو يوتيوب      ║\n" +
        "╠═══════════════════════════════╣\n" +
        "║  /video [رابط يوتيوب]         ║\n" +
        "║  /video [اسم الفيديو]         ║\n" +
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
      // ── إيجاد رابط الفيديو ────────────────────────────────────────────
      if (isYouTubeUrl(input)) {
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

      // ── تحميل عبر Cobalt API ───────────────────────────────────────────
      const cobaltRes = await axios.post(COBALT_API,
        { url: videoUrl, vQuality: "360", filenamePattern: "basic", isNoTTWatermark: false },
        {
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          timeout: 20000,
        }
      );

      const { status, url: dlUrl, filename } = cobaltRes.data || {};
      if (status !== "stream" && status !== "redirect") {
        throw new Error(cobaltRes.data?.text || "فشل استرجاع رابط التحميل");
      }

      // ── تنزيل الملف ───────────────────────────────────────────────────
      const tmpFile = path.join(TMP_DIR, `vid_${Date.now()}.mp4`);
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
            writer.destroy();
            fileRes.data.destroy();
            cleanFile(tmpFile);
            rej(new Error(`الفيديو أكبر من ${MAX_MB} MB`));
          }
        });
        fileRes.data.pipe(writer);
        writer.on("finish", res);
        writer.on("error", rej);
      });

      const sizeMB = (fs.statSync(tmpFile).size / (1024 * 1024)).toFixed(2);

      let caption = `🎬 ${videoInfo?.title || filename || "فيديو"}\n📦 ${sizeMB} MB`;
      if (videoInfo) {
        caption +=
          `\n📺 القناة: ${videoInfo.author?.name || ""}\n` +
          `⏱ المدة: ${videoInfo.timestamp}\n` +
          `👁 المشاهدات: ${formatViews(videoInfo.views)}`;
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
      cleanFile(path.join(TMP_DIR, `vid_${Date.now()}.mp4`));
      message.react("❌", messageID);
      message.reply(
        `╔═══════════════════════════╗\n` +
        `║  ❌ فشل التحميل           ║\n` +
        `╠═══════════════════════════╣\n` +
        `║  ${String(err.message || err).slice(0, 40)}\n` +
        `╚═══════════════════════════╝`
      );
    }
  }
};

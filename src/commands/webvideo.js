/**
 * DAVID V1 — /webvideo — تحميل فيديوهات من مواقع متعددة
 * Copyright © 2025 DJAMEL — All rights reserved
 * Role: 2 (Bot Admin فقط)
 *
 * المواقع المدعومة: xnxx | xvideos | pornhub | xhamster | redtube | youporn
 *
 * الاستخدام:
 *   /webvideo                      → قائمة المواقع المدعومة
 *   /webvideo [موقع]               → البوت يسألك عن البحث
 *   /webvideo [موقع] [كلمة بحث]    → بحث مباشر وقائمة النتائج
 *   رد على قائمة النتائج برقم      → تحميل وإرسال الفيديو
 *
 * مثال:
 *   /webvideo xnxx
 *   /webvideo xvideos teen
 *   /webvideo pornhub milf
 */
"use strict";

const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const os    = require("os");

const TMP_DIR = path.join(os.tmpdir(), "david_webvid");
const MAX_MB  = 24;   // حد الحجم للإرسال كمرفق
const UA      = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

fs.ensureDirSync(TMP_DIR);

// ─── قائمة المواقع ────────────────────────────────────────────────────────────
const SUPPORTED_SITES = {
  xnxx:     { label: "XNXX",     emoji: "🔴" },
  xvideos:  { label: "XVideos",  emoji: "🟠" },
  pornhub:  { label: "PornHub",  emoji: "🟡" },
  xhamster: { label: "xHamster", emoji: "🔵" },
  redtube:  { label: "RedTube",  emoji: "🟢" },
  youporn:  { label: "YouPorn",  emoji: "🟣" },
};

// ─── مساعدات ─────────────────────────────────────────────────────────────────
function cleanFile(f) { try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {} }
function fmtViews(n) {
  if (!n) return "?";
  n = parseInt(n);
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}
function fmtDur(sec) {
  if (!sec) return "?";
  sec = parseInt(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${m}:${String(s).padStart(2,"0")}`;
}

// ─── محركات البحث ────────────────────────────────────────────────────────────

/** XNXX — scrape HTML */
async function searchXnxx(query) {
  const url  = `https://www.xnxx.com/search/${encodeURIComponent(query.replace(/ /g, "+"))}/1/`;
  const html = await axios.get(url, { timeout: 20000, headers: { "User-Agent": UA } }).then(r => r.data);

  const items  = [];
  // أداة استخراج بسيطة: ابحث عن كل video-xxx ثم استخرج العنوان والمدة
  const blockRe = /class="mozaique">([\s\S]*?)(?=<div class="mozaique"|$)/;
  // نقرأ الـ entries من الـ thumb blocks
  const thumbRe = /thumb-block[\s\S]*?<a href="(\/video[^"]+)"[\s\S]*?class="title"[^>]*>([^<]{3,200})<[\s\S]*?runtime"[^>]*>([^<]*)</g;
  let m;
  while ((m = thumbRe.exec(html)) !== null && items.length < 8) {
    const href  = "https://www.xnxx.com" + m[1];
    const title = m[2].replace(/\s+/g, " ").trim();
    const dur   = m[3].trim();
    if (title.length > 2) items.push({ title, url: href, duration: dur, views: "?" });
  }

  // fallback: نمط أوسع
  if (!items.length) {
    const re2 = /"nthumb-block"[\s\S]*?<a href="(\/video-[^"]+)"[\s\S]*?<strong>([^<]{3,150})<\/strong[\s\S]*?class="metadata"[^>]*>([^<]*)/g;
    while ((m = re2.exec(html)) !== null && items.length < 8) {
      const href  = "https://www.xnxx.com" + m[1];
      const title = m[2].replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
      items.push({ title, url: href, duration: m[3].trim(), views: "?" });
    }
  }
  return items;
}

/** XVIDEOS — scrape HTML */
async function searchXvideos(query) {
  const url  = `https://www.xvideos.com/?k=${encodeURIComponent(query)}&p=0`;
  const html = await axios.get(url, { timeout: 20000, headers: { "User-Agent": UA } }).then(r => r.data);

  const items = [];
  // XVideos stores video data in JSON-like attributes
  const re = /data-id="(\d+)"[^>]*>[\s\S]*?<a href="(\/video\d+[^"]*)"[^>]*title="([^"]{3,200})"[\s\S]*?duration"[^>]*>([^<]*)/g;
  let m;
  while ((m = re.exec(html)) !== null && items.length < 8) {
    const href  = "https://www.xvideos.com" + m[2];
    const title = m[3].replace(/&amp;/g,"&").trim();
    const dur   = m[4].trim();
    if (title.length > 2) items.push({ title, url: href, duration: dur, views: "?" });
  }

  // Fallback with simpler pattern
  if (!items.length) {
    const re2 = /<a href="(\/video\d+\/[^"]+)"[^>]*class="thumb-block[^"]*"[\s\S]*?title="([^"]{3,150})"/g;
    while ((m = re2.exec(html)) !== null && items.length < 8) {
      const href  = "https://www.xvideos.com" + m[1];
      const title = m[2].replace(/&amp;/g,"&").trim();
      if (title.length > 2) items.push({ title, url: href, duration: "?", views: "?" });
    }
  }
  return items;
}

/** PORNHUB — Webmasters JSON API */
async function searchPornhub(query) {
  const url = `https://www.pornhub.com/webmasters/search?search=${encodeURIComponent(query)}&ordering=mostviewed&period=weekly&page=1`;
  const res = await axios.get(url, { timeout: 20000, headers: { "User-Agent": UA } });
  const vids = res.data?.videos || [];
  return vids.slice(0, 8).map(v => ({
    title:    v.title || "بلا عنوان",
    url:      v.url  || "",
    duration: fmtDur(v.duration),
    views:    fmtViews(v.views),
  })).filter(v => v.url);
}

/** XHAMSTER — scrape HTML */
async function searchXhamster(query) {
  const url  = `https://xhamster.com/search/${encodeURIComponent(query)}`;
  const html = await axios.get(url, { timeout: 20000, headers: { "User-Agent": UA, "Accept-Language": "en-US" } }).then(r => r.data);

  const items = [];
  const re = /href="(https:\/\/xhamster\.com\/videos\/[^"]{5,100})"[^>]*title="([^"]{3,200})"[\s\S]*?duration"[^>]*>\s*([^<]*)/g;
  let m;
  while ((m = re.exec(html)) !== null && items.length < 8) {
    items.push({ title: m[2].replace(/&amp;/g,"&").trim(), url: m[1], duration: m[3].trim(), views: "?" });
  }
  return items;
}

/** REDTUBE — Official JSON API */
async function searchRedtube(query) {
  const url = `https://api.redtube.com/?data=redtube.Videos.searchVideos&search=${encodeURIComponent(query)}&output=json&count=8&thumbsize=medium`;
  const res = await axios.get(url, { timeout: 20000, headers: { "User-Agent": UA } });
  const vids = res.data?.videos || [];
  return vids.slice(0, 8).map(v => ({
    title:    v.video?.title    || "بلا عنوان",
    url:      v.video?.url      || "",
    duration: fmtDur(v.video?.duration),
    views:    fmtViews(v.video?.views),
    thumb:    v.video?.thumb    || "",
  })).filter(v => v.url);
}

/** YOUPORN — scrape HTML */
async function searchYouporn(query) {
  const url  = `https://www.youporn.com/search/?query=${encodeURIComponent(query)}`;
  const html = await axios.get(url, { timeout: 20000, headers: { "User-Agent": UA } }).then(r => r.data);

  const items = [];
  const re = /href="(\/watch\/\d+\/[^"]{3,100})"[^>]*>[\s\S]*?class="video-title"[^>]*>([^<]{3,200})<[\s\S]*?duration"[^>]*>([^<]*)/g;
  let m;
  while ((m = re.exec(html)) !== null && items.length < 8) {
    items.push({ title: m[2].replace(/&amp;/g,"&").trim(), url: "https://www.youporn.com" + m[1], duration: m[3].trim(), views: "?" });
  }
  return items;
}

// ─── جدول المواقع → دوال البحث ───────────────────────────────────────────────
const SCRAPERS = {
  xnxx:     searchXnxx,
  xvideos:  searchXvideos,
  pornhub:  searchPornhub,
  xhamster: searchXhamster,
  redtube:  searchRedtube,
  youporn:  searchYouporn,
};

// ─── استخراج رابط الفيديو المباشر من صفحة الفيديو ────────────────────────────

async function extractVideoUrl(site, pageUrl) {
  const html = await axios.get(pageUrl, {
    timeout: 25000,
    headers: { "User-Agent": UA, "Referer": pageUrl },
    maxRedirects: 5,
  }).then(r => r.data).catch(() => null);

  if (!html) return null;

  const patterns = [
    // xnxx
    /html5player\.setVideoUrlHigh\('([^']+)'\)/,
    /html5player\.setVideoUrlLow\('([^']+)'\)/,
    /html5player\.setVideoUrlMed\('([^']+)'\)/,
    // xvideos
    /"url_high"\s*:\s*"([^"]+)"/,
    /"url_low"\s*:\s*"([^"]+)"/,
    // xhamster
    /"high"\s*:\s*"([^"]+\.mp4[^"]*)"/,
    /"medium"\s*:\s*"([^"]+\.mp4[^"]*)"/,
    // redtube / youporn
    /"videoUrl"\s*:\s*"([^"]+)"/,
    /source\s+src="([^"]+\.mp4[^"]*)"/,
    // generic mp4 pattern
    /https:\/\/[^\s"'<>]+\.mp4(?:\?[^\s"'<>]*)?/,
  ];

  for (const pat of patterns) {
    const m = html.match(pat);
    if (m) {
      const u = (m[1] || m[0]).replace(/\\\/\//g, "//").replace(/\\\//g, "/").replace(/\\u002F/g, "/");
      if (u.includes(".mp4") || u.includes("/hls/") || u.includes("cdn")) return u;
    }
  }
  return null;
}

// ─── تحميل وإرسال الفيديو ────────────────────────────────────────────────────

async function downloadAndSend(api, event, message, videoUrl, title, site) {
  const tmpFile = path.join(TMP_DIR, `wv_${Date.now()}.mp4`);

  try {
    message.react("⬇️", event.messageID);
    const sendMsg = await message.reply(`⬇️ جاري تحميل الفيديو...\n📝 ${title.slice(0, 60)}`);

    const res = await axios.get(videoUrl, {
      responseType: "stream",
      timeout: 120000,
      headers: { "User-Agent": UA, "Referer": `https://www.${site}.com/` },
      maxRedirects: 10,
    });

    // تحقق من الحجم من الـ headers
    const contentLength = parseInt(res.headers["content-length"] || "0");
    if (contentLength > MAX_MB * 1024 * 1024) {
      try { api.unsendMessage(sendMsg.messageID); } catch (_) {}
      message.react("🔗", event.messageID);
      return message.reply(
        `╔════════════════════════════╗\n` +
        `║  🔗 رابط الفيديو            ║\n` +
        `╠════════════════════════════╣\n` +
        `║  📝 ${title.slice(0, 50)}\n` +
        `║  📦 حجم كبير (>${MAX_MB}MB)\n` +
        `╠════════════════════════════╣\n` +
        `║  🌐 ${videoUrl.slice(0, 60)}\n` +
        `╚════════════════════════════╝`
      );
    }

    // تحميل الملف
    let downloadedBytes = 0;
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(tmpFile);
      res.data.on("data", chunk => {
        downloadedBytes += chunk.length;
        if (downloadedBytes > MAX_MB * 1024 * 1024) {
          writer.destroy();
          res.data.destroy();
          reject(new Error(`حجم كبير (>${MAX_MB}MB)`));
        }
      });
      res.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    const sizeMB = (fs.statSync(tmpFile).size / (1024 * 1024)).toFixed(2);

    try { api.unsendMessage(sendMsg.messageID); } catch (_) {}
    message.react("✅", event.messageID);

    await new Promise((resolve, reject) => {
      api.sendMessage(
        {
          body: `🎬 ${title.slice(0, 80)}\n📦 ${sizeMB} MB  ·  🌐 ${SUPPORTED_SITES[site]?.label || site}\n👑 DAVID V1`,
          attachment: fs.createReadStream(tmpFile),
        },
        event.threadID,
        (err) => { cleanFile(tmpFile); err ? reject(err) : resolve(); }
      );
    });

  } catch (err) {
    cleanFile(tmpFile);
    message.react("❌", event.messageID);
    // إذا فشل التحميل أرسل الرابط
    message.reply(
      `╔════════════════════════════╗\n` +
      `║  🔗 فشل التحميل — الرابط   ║\n` +
      `╠════════════════════════════╣\n` +
      `║  📝 ${title.slice(0, 50)}\n` +
      `║  ❌ ${String(err.message).slice(0, 50)}\n` +
      `╠════════════════════════════╣\n` +
      `║  🌐 ${videoUrl.slice(0, 60)}\n` +
      `╚════════════════════════════╝`
    );
  }
}

// ─── بناء رسالة القائمة ───────────────────────────────────────────────────────
function buildResultsList(results, site, query) {
  const siteInfo = SUPPORTED_SITES[site];
  const LINE     = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
  let body = `${LINE}\n`;
  body    += `  ${siteInfo?.emoji || "🎬"} ${siteInfo?.label || site} — "${query}"\n`;
  body    += `${LINE}\n\n`;

  results.forEach((v, i) => {
    body += `${i + 1}️⃣ ${v.title.slice(0, 65)}\n`;
    body += `   ⏱ ${v.duration}  👁 ${v.views}\n\n`;
  });

  body += `${LINE}\n`;
  body += `📥 ردّ بالرقم (1-${results.length}) لتحميل الفيديو`;
  return body;
}

// ─── تنفيذ البحث وعرض النتائج ────────────────────────────────────────────────
async function doSearch(api, event, message, site, query) {
  const searching = await message.reply(
    `🔍 جاري البحث في ${SUPPORTED_SITES[site]?.label || site}...\n🔎 "${query}"`
  );

  try {
    const scraper = SCRAPERS[site];
    const results = await scraper(query);

    try { api.unsendMessage(searching.messageID); } catch (_) {}

    if (!results || !results.length) {
      message.react("❌", event.messageID);
      return message.reply(
        `❌ لا توجد نتائج في ${SUPPORTED_SITES[site]?.label || site} لـ "${query}"\n` +
        `جرب كلمات مختلفة أو موقعاً آخر.`
      );
    }

    message.react("✅", event.messageID);
    const listMsg = await message.reply(buildResultsList(results, site, query));

    // تسجيل onReply لانتظار اختيار المستخدم
    const replyKey = `wv_${listMsg.messageID}`;
    global.GoatBot.onReply.set(replyKey, {
      messageID: listMsg.messageID,
      author:    event.senderID,
      ts:        Date.now(),
      callback:  async ({ api: a, event: re, message: rm }) => {
        global.GoatBot.onReply.delete(replyKey);

        const choice = parseInt((re.body || "").trim()) - 1;
        if (isNaN(choice) || choice < 0 || choice >= results.length) {
          return rm.reply(
            `⚠️ رقم غير صحيح.\nاختر بين 1 و ${results.length}`
          );
        }

        const selected = results[choice];
        rm.react("🔍", re.messageID);

        // استخراج رابط الفيديو المباشر
        const fetchingMsg = await rm.reply(
          `🔍 جاري استخراج رابط الفيديو...\n📝 ${selected.title.slice(0, 60)}`
        );

        const directUrl = await extractVideoUrl(site, selected.url);
        try { a.unsendMessage(fetchingMsg.messageID); } catch (_) {}

        if (!directUrl) {
          rm.react("❌", re.messageID);
          return rm.reply(
            `╔════════════════════════════╗\n` +
            `║  ❌ تعذّر استخراج الرابط   ║\n` +
            `╠════════════════════════════╣\n` +
            `║  📝 ${selected.title.slice(0, 50)}\n` +
            `║  🌐 ${selected.url}\n` +
            `╚════════════════════════════╝`
          );
        }

        await downloadAndSend(a, re, rm, directUrl, selected.title, site);
      }
    });

  } catch (err) {
    try { api.unsendMessage(searching.messageID); } catch (_) {}
    message.react("❌", event.messageID);
    message.reply(`❌ خطأ في البحث: ${String(err.message).slice(0, 80)}`);
  }
}

// ─── Module ───────────────────────────────────────────────────────────────────
module.exports = {
  config: {
    name: "webvideo",
    aliases: ["pornvideo", "pvideo", "wvideo", "adultvideo", "xvideo"],
    version: "1.0",
    author: "DJAMEL",
    countDown: 20,
    role: 2,
    category: "18+",
    description: "بحث وتحميل فيديوهات من مواقع متعددة (للمشرفين فقط)",
    guide: {
      en: "{pn} [موقع] [بحث?]\n" +
          "المواقع: xnxx | xvideos | pornhub | xhamster | redtube | youporn\n" +
          "مثال: {pn} xnxx\n" +
          "مثال: {pn} pornhub milf\n" +
          "ثم ردّ بالرقم لتحميل الفيديو"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const { senderID, messageID } = event;

    // بدون أي مدخلات — عرض المواقع المدعومة
    if (!args.length) {
      const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
      let body = `${LINE}\n  🎬 WebVideo — مواقع الفيديو\n${LINE}\n\n`;
      for (const [key, s] of Object.entries(SUPPORTED_SITES)) {
        body += `  ${s.emoji} ${key.padEnd(10)} — ${s.label}\n`;
      }
      body += `\n${LINE}\n`;
      body += `  📌 الاستخدام:\n`;
      body += `  /webvideo [موقع] [بحث?]\n`;
      body += `  مثال: /webvideo xnxx\n`;
      body += `  مثال: /webvideo pornhub milf\n`;
      body += `${LINE}`;
      return message.reply(body);
    }

    // تحديد الموقع
    const rawSite = args[0].toLowerCase().replace(/[^a-z]/g, "");
    const site    = Object.keys(SCRAPERS).find(s => rawSite.includes(s) || s.includes(rawSite));

    if (!site) {
      return message.reply(
        `❌ الموقع "${args[0]}" غير مدعوم.\n\n` +
        `المواقع المدعومة:\n` +
        Object.entries(SUPPORTED_SITES).map(([k, s]) => `  ${s.emoji} ${k}`).join("\n") +
        `\n\nمثال: /webvideo xnxx teen`
      );
    }

    const query = args.slice(1).join(" ").trim();

    // لا يوجد بحث — اسأل عن الموقع المستهدف
    if (!query) {
      const siteInfo = SUPPORTED_SITES[site];
      const askMsg   = await message.reply(
        `╔════════════════════════════╗\n` +
        `║  ${siteInfo.emoji} ${siteInfo.label.padEnd(22)}║\n` +
        `╠════════════════════════════╣\n` +
        `║  🔍 ما الذي تريد البحث عنه؟║\n` +
        `║  ردّ على هذه الرسالة بكلمة ║\n` +
        `║  البحث أو التصنيف          ║\n` +
        `╚════════════════════════════╝`
      );
      message.react("❓", messageID);

      // انتظار رد المستخدم بكلمة البحث
      const replyKey = `wv_ask_${askMsg.messageID}`;
      global.GoatBot.onReply.set(replyKey, {
        messageID: askMsg.messageID,
        author:    senderID,
        ts:        Date.now(),
        callback:  async ({ api: a, event: re, message: rm }) => {
          global.GoatBot.onReply.delete(replyKey);
          const q = (re.body || "").trim();
          if (!q || q.length < 2) return rm.reply("⚠️ كلمة البحث قصيرة جداً.");
          await doSearch(a, re, rm, site, q);
        }
      });
      return;
    }

    // بحث مباشر
    message.react("🔍", messageID);
    await doSearch(api, event, message, site, query);
  }
};

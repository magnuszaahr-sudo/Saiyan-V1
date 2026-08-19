/**
 * DAVID V1 — /manga — بحث المانغا وقراءة الفصول عبر MangaDex API
 * Copyright © 2025 DJAMEL
 * التنقل بين الصفحات عبر الردود: التالي / السابق / رقم الصفحة
 */
"use strict";
const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const os    = require("os");

const TMP  = path.join(os.tmpdir(), "david_manga");
const API  = "https://api.mangadex.org";
const UA   = { "User-Agent": "DAVID-V1/1.0 (Messenger Bot)" };
const PER_PAGE = 5;   // عدد صور الصفحات المرسلة في كل دفعة
const LINE = "━━━━━━━━━━━━━━━━";

fs.ensureDirSync(TMP);

const t = (attr) =>
  attr?.title?.en ||
  attr?.title?.ja ||
  (attr?.title ? Object.values(attr.title)[0] : null) ||
  "بلا عنوان";

async function searchManga(query) {
  const res = await axios.get(`${API}/manga`, {
    params: { title: query, limit: 6, "contentRating[]": ["safe", "suggestive"], "order[relevance]": "desc" },
    headers: UA,
    timeout: 20000
  });
  return res.data?.data || [];
}

async function getChapters(mangaId) {
  const res = await axios.get(`${API}/manga/${mangaId}/feed`, {
    params: {
      limit: 96,
      "translatedLanguage[]": ["ar", "en"],
      "order[chapter]": "asc",
      "contentRating[]": ["safe", "suggestive"],
      "includes[]": ["scanlation_group"]
    },
    headers: UA,
    timeout: 20000
  });
  const seen = new Set();
  return (res.data?.data || []).filter((c) => {
    const a = c.attributes || {};
    // تجاهل الفصول الخارجية (بدون صور مستضافة على MangaDex)
    if (a.externalUrl || !a.pages) return false;
    const key = `${c.attributes?.chapter || c.id}_${c.attributes?.translatedLanguage}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function getPages(chapterId) {
  const res = await axios.get(`${API}/at-home/server/${chapterId}`, { headers: UA, timeout: 20000 });
  const base = res.data?.baseUrl;
  const hash = res.data?.chapter?.hash;
  const data = res.data?.chapter?.data || [];
  if (!base || !hash || !data.length) throw new Error("لا توجد صفحات لهذا الفصل");
  return data.map((f) => `${base}/data/${hash}/${f}`);
}

module.exports = {
  config: {
    name: "manga",
    aliases: ["mangadex", "مانغا", "مانجا"],
    version: "1.0",
    author: "DJAMEL",
    countDown: 10,
    role: 0,
    category: "media",
    description: "البحث عن مانغا وقراءة فصولها وصفحاتها من MangaDex",
    guide: { en: "{pn} [اسم المانغا]\nمثال: {pn} one piece" }
  },

  onStart: async function ({ api, event, args, message }) {
    const query = args.join(" ").trim();
    if (!query)
      return message.reply(
        `📚 M A N G A\n${LINE}\n/manga [اسم المانغا]\nمثال: /manga jujutsu kaisen`
      );

    message.react("🔍", event.messageID);
    const wait = await message.reply(`🔍 جاري البحث عن "${query}" في MangaDex…`);

    try {
      const list = await searchManga(query);
      api.unsendMessage(wait.messageID).catch(() => {});
      if (!list.length) {
        message.react("❌", event.messageID);
        return message.reply(`❌ لم أجد أي مانغا باسم "${query}"`);
      }

      let body = `📚 نتائج MangaDex: "${query}"\n${LINE}\n`;
      list.forEach((m, i) => {
        const a = m.attributes || {};
        body += `${i + 1}️⃣ ${t(a)}\n   📅 ${a.year || "؟"}  ·  📖 ${a.status || "؟"}\n\n`;
      });
      body += `${LINE}\n📥 ردّ بالرقم (1-${list.length}) لعرض الفصول`;

      const listMsg = await message.reply(body);
      message.react("✅", event.messageID);
      this._setReply(listMsg.messageID, event.senderID, async (ctx) => {
        const idx = parseInt(String(ctx.event.body || "").trim()) - 1;
        if (isNaN(idx) || idx < 0 || idx >= list.length)
          return ctx.message.reply("❌ رقم غير صالح.");
        await this._showChapters(ctx, list[idx]);
      });
    } catch (e) {
      api.unsendMessage(wait.messageID).catch(() => {});
      message.react("❌", event.messageID);
      message.reply("❌ خطأ: " + e.message);
    }
  },

  // تسجيل رد جديد في خريطة onReply
  _setReply: function (messageID, author, callback) {
    global.GoatBot.onReply.set(`manga_${messageID}`, {
      messageID,
      author,
      ts: Date.now(),
      callback: async (ctx) => {
        global.GoatBot.onReply.delete(`manga_${messageID}`);
        try {
          await callback(ctx);
        } catch (e) {
          ctx.message.reply("❌ خطأ: " + e.message);
        }
      }
    });
  },

  _showChapters: async function ({ api, event, message }, manga) {
    const title = t(manga.attributes);
    const wait  = await message.reply(`📖 جاري جلب فصول "${title}"…`);
    const chapters = await getChapters(manga.id);
    api.unsendMessage(wait.messageID).catch(() => {});

    if (!chapters.length)
      return message.reply(
        `❌ لا توجد فصول قابلة للقراءة داخل MangaDex لـ "${title}"\n` +
        `🔗 اقرأها هنا: https://mangadex.org/title/${manga.id}`
      );

    const show = chapters.slice(0, 20);
    let body = `📖 ${title}\n${LINE}\n`;
    show.forEach((c, i) => {
      const a = c.attributes || {};
      body += `${i + 1}. الفصل ${a.chapter || "?"}${a.title ? " — " + String(a.title).slice(0, 30) : ""} [${a.translatedLanguage}]\n`;
    });
    body += `${LINE}\n📥 ردّ بالرقم (1-${show.length}) لقراءة الفصل`;
    if (chapters.length > show.length) body += `\n(إجمالي الفصول: ${chapters.length})`;

    const msg = await message.reply(body);
    this._setReply(msg.messageID, event.senderID, async (ctx) => {
      const idx = parseInt(String(ctx.event.body || "").trim()) - 1;
      if (isNaN(idx) || idx < 0 || idx >= show.length)
        return ctx.message.reply("❌ رقم غير صالح.");
      await this._sendPages(ctx, title, show[idx], 0);
    });
  },

  _sendPages: async function ({ api, event, message }, title, chapter, offset) {
    const wait  = await message.reply("🖼️ جاري تحميل الصفحات…");
    const pages = chapter.__pages || (chapter.__pages = await getPages(chapter.id));
    const slice = pages.slice(offset, offset + PER_PAGE);
    const files = [];
    const streams = [];

    for (let i = 0; i < slice.length; i++) {
      try {
        const res = await axios.get(slice[i], {
          responseType: "arraybuffer",
          timeout: 45000,
          headers: UA
        });
        const p = path.join(TMP, `mg_${Date.now()}_${offset + i}.jpg`);
        fs.writeFileSync(p, Buffer.from(res.data));
        files.push(p);
        streams.push(fs.createReadStream(p));
      } catch (_) {}
    }

    api.unsendMessage(wait.messageID).catch(() => {});
    if (!streams.length) return message.reply("❌ فشل تحميل صفحات هذا الفصل.");

    const last  = offset + slice.length;
    const chNum = chapter.attributes?.chapter || "?";
    let body =
      `📚 ${title}\n📖 الفصل ${chNum}\n🖼️ الصفحات ${offset + 1}-${last} من ${pages.length}\n${LINE}\n`;
    const opts = [];
    if (last < pages.length) opts.push('"التالي" أو "next"');
    if (offset > 0) opts.push('"السابق" أو "back"');
    body += opts.length
      ? `📥 ردّ بـ ${opts.join(" · ")}\nأو ردّ برقم صفحة (1-${pages.length})`
      : "✅ نهاية الفصل";
    body += `\n👑 DAVID V1`;

    const sent = await new Promise((resolve) =>
      api.sendMessage({ body, attachment: streams }, event.threadID, (err, info) => {
        files.forEach((f) => { try { fs.unlinkSync(f); } catch (_) {} });
        resolve(err ? null : info);
      })
    );
    if (!sent) return;

    this._setReply(sent.messageID, event.senderID, async (ctx) => {
      const txt = String(ctx.event.body || "").trim().toLowerCase();
      let next = null;
      if (["التالي", "next", "n", "+"].includes(txt)) next = last < pages.length ? last : null;
      else if (["السابق", "back", "prev", "b", "-"].includes(txt))
        next = offset > 0 ? Math.max(0, offset - PER_PAGE) : null;
      else if (/^\d+$/.test(txt)) {
        const n = parseInt(txt);
        if (n >= 1 && n <= pages.length) next = n - 1;
      }
      if (next === null) return ctx.message.reply("❌ اختيار غير صالح.");
      await this._sendPages(ctx, title, chapter, next);
    });
  }
};

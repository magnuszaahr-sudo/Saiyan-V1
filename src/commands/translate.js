/**
 * DAVID V1 — /translate — ترجمة النصوص
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 * Uses MyMemory free translation API (no key needed)
 */
"use strict";
const axios = require("axios");

const LANG_MAP = {
  ar: "العربية", en: "الإنجليزية", fr: "الفرنسية",
  es: "الإسبانية", de: "الألمانية", tr: "التركية",
  zh: "الصينية",  ja: "اليابانية", ru: "الروسية",
  pt: "البرتغالية", it: "الإيطالية", ko: "الكورية",
};

module.exports = {
  config: {
    name: "translate",
    aliases: ["trans", "ترجمة", "ترجم"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 5,
    role: 0,
    category: "utility",
    description: "ترجمة النصوص إلى أي لغة",
    guide: {
      en: "{pn} [نص] -> [كود اللغة]\n{pn} hello -> ar\n{pn} مرحبا -> en\nأو رد على رسالة بـ {pn} -> ar"
    }
  },

  onStart: async function ({ event, args, message }) {
    let text = "";
    let targetLang = "ar";

    // رد على رسالة
    if (event.messageReply && args.join(" ").includes("->")) {
      text       = event.messageReply.body || "";
      targetLang = (args.join(" ").split("->")[1] || "ar").trim().toLowerCase();
    } else if (event.messageReply && !args.length) {
      text       = event.messageReply.body || "";
      targetLang = "ar";
    } else {
      const full = args.join(" ");
      const idx  = full.lastIndexOf("->");
      if (idx !== -1) {
        text       = full.slice(0, idx).trim();
        targetLang = full.slice(idx + 2).trim().toLowerCase();
      } else {
        text       = full.trim();
        targetLang = "ar";
      }
    }

    if (!text) {
      return message.reply(
        "╔══════════════════════════════════╗\n" +
        "║  🌐  أمر الترجمة               ║\n" +
        "╠══════════════════════════════════╣\n" +
        "║  /translate hello -> ar          ║\n" +
        "║  /translate مرحبا -> en          ║\n" +
        "║  رد على رسالة + /trans -> fr     ║\n" +
        "╠══════════════════════════════════╣\n" +
        "║  أكواد: ar en fr es de tr zh ja  ║\n" +
        "╚══════════════════════════════════╝"
      );
    }

    message.react("⏳", event.messageID);

    try {
      const url  = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${targetLang}`;
      const res  = await axios.get(url, { timeout: 10000 });
      const data = res.data?.responseData;
      if (!data?.translatedText) throw new Error("لا توجد نتيجة");

      const srcLang  = data.detectedLanguage?.language || "auto";
      const srcLabel = LANG_MAP[srcLang]  || srcLang;
      const tgtLabel = LANG_MAP[targetLang] || targetLang;

      message.react("✅", event.messageID);
      return message.reply(
        `╔═══════════════════════════╗\n` +
        `║  🌐  الترجمة              ║\n` +
        `╠═══════════════════════════╣\n` +
        `║  ${srcLabel} → ${tgtLabel}\n` +
        `╠═══════════════════════════╣\n` +
        `${data.translatedText}\n` +
        `╚═══════════════════════════╝`
      );
    } catch (e) {
      message.react("❌", event.messageID);
      return message.reply(`❌ فشل الترجمة: ${e.message}`);
    }
  }
};

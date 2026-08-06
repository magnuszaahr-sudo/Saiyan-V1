/**
 * DAVID V1 — /weather — الطقس
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine (text-only, no canvas)
 */
"use strict";
const axios = require("axios");

const WEATHER_KEY = "d7e795ae6a0d44aaa8abb1a0a7ac19e4";

const WEATHER_ICONS = {
  "01d": "☀️", "01n": "🌙",
  "02d": "⛅", "02n": "⛅",
  "03d": "☁️", "03n": "☁️",
  "04d": "🌥️", "04n": "🌥️",
  "09d": "🌧️", "09n": "🌧️",
  "10d": "🌦️", "10n": "🌦️",
  "11d": "⛈️", "11n": "⛈️",
  "13d": "❄️", "13n": "❄️",
  "50d": "🌫️", "50n": "🌫️",
};

function icon(code) { return WEATHER_ICONS[code] || "🌡️"; }
function deg2ar(deg) {
  const dirs = ["شمال","شمال شرق","شرق","جنوب شرق","جنوب","جنوب غرب","غرب","شمال غرب"];
  return dirs[Math.round(deg / 45) % 8];
}

module.exports = {
  config: {
    name: "weather",
    aliases: ["طقس", "الطقس", "clima", "meteo"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 5,
    role: 0,
    category: "utility",
    description: "عرض حالة الطقس الحالية لأي مدينة",
    guide: { en: "{pn} [المدينة]\nمثال: {pn} الجزائر" }
  },

  onStart: async function ({ args, event, message }) {
    const { messageID } = event;
    const location = args.join(" ").trim();

    if (!location) {
      return message.reply(
        "╔═══════════════════════════╗\n" +
        "║  🌤️  حالة الطقس           ║\n" +
        "╠═══════════════════════════╣\n" +
        "║  /weather [المدينة]       ║\n" +
        "║  مثال: /weather الجزائر  ║\n" +
        "╚═══════════════════════════╝"
      );
    }

    message.react("⏳", messageID);

    try {
      const url     = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${WEATHER_KEY}&units=metric&lang=ar`;
      const res     = await axios.get(url, { timeout: 10000 });
      const d       = res.data;

      const name      = d.name;
      const country   = d.sys?.country || "";
      const desc      = d.weather?.[0]?.description || "";
      const ic        = icon(d.weather?.[0]?.icon || "");
      const temp      = Math.round(d.main?.temp ?? 0);
      const feels     = Math.round(d.main?.feels_like ?? 0);
      const min       = Math.round(d.main?.temp_min ?? 0);
      const max       = Math.round(d.main?.temp_max ?? 0);
      const humidity  = d.main?.humidity ?? 0;
      const pressure  = d.main?.pressure ?? 0;
      const windSpeed = Math.round((d.wind?.speed ?? 0) * 3.6);
      const windDir   = deg2ar(d.wind?.deg ?? 0);
      const clouds    = d.clouds?.all ?? 0;
      const visibility= d.visibility ? (d.visibility / 1000).toFixed(1) + " km" : "—";
      const sunrise   = new Date(d.sys?.sunrise * 1000).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" });
      const sunset    = new Date(d.sys?.sunset  * 1000).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" });

      const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

      message.react("✅", messageID);
      return message.reply(
        `${LINE}\n` +
        `  ${ic} الطقس — ${name}, ${country}\n` +
        `${LINE}\n\n` +
        `  📝 الحالة     : ${desc}\n` +
        `  🌡 الحرارة    : ${temp}°C (يبدو ${feels}°C)\n` +
        `  🔽 أدنى       : ${min}°C   🔼 أقصى: ${max}°C\n` +
        `  💧 الرطوبة    : ${humidity}%\n` +
        `  💨 الرياح     : ${windSpeed} km/h — ${windDir}\n` +
        `  ☁️ الغيوم     : ${clouds}%\n` +
        `  👁️ الرؤية     : ${visibility}\n` +
        `  📊 الضغط      : ${pressure} hPa\n` +
        `  🌅 الشروق     : ${sunrise}\n` +
        `  🌇 الغروب     : ${sunset}\n\n` +
        `${LINE}`
      );
    } catch (err) {
      message.react("❌", messageID);
      const status = err.response?.status;
      if (status === 404) return message.reply(`❌ لم يتم العثور على المدينة: "${location}"`);
      return message.reply(`❌ خطأ: ${err.message?.slice(0, 60)}`);
    }
  }
};

/**
 * DAVID V1 — /angel v5 — رسائل تلقائية مع نظام مراقبة ذكي
 * Copyright © 2025 DJAMEL
 * ✦ يتوقف مؤقتاً بعد 3 رسائل متتالية بدون رد بشري
 * ✦ يستأنف عند أول رسالة بشرية
 * ✦ يبدأ عدّاد الخروج بعد التوقف، ويغادر بعد 16 دقيقة من الصمت
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");

const DATA = path.join(process.cwd(), "database/data/angelData.json");
const SILENCE_MS = 16 * 60 * 1000;

function load()   { try { if (fs.existsSync(DATA)) return JSON.parse(fs.readFileSync(DATA, "utf8")); } catch (_) {} return {}; }
function save(d)  { fs.ensureDirSync(path.dirname(DATA)); fs.writeFileSync(DATA, JSON.stringify(d, null, 2)); }
function rand(a, b) { return a + Math.random() * (b - a); }

// ── Global state ──────────────────────────────────────────────────────────────
if (!global.GoatBot) global.GoatBot = {};
if (!global.GoatBot.angelIntervals) global.GoatBot.angelIntervals = {};
if (!global.GoatBot.angelSilenceTimers) global.GoatBot.angelSilenceTimers = {};
if (!global._angelState)            global._angelState = {};
// _angelState[tid] = { consecutive, paused, pausedAt, lastHumanTs, lastHumanMessageID, leaving }

// ── Human-message listener (registered once) ──────────────────────────────────
if (!global._msgListeners)            global._msgListeners = [];
if (!global._angelListenerRegistered) {
  global._angelListenerRegistered = true;
  global._msgListeners.push(({ threadID, messageID }) => {
    const st = global._angelState[threadID];
    if (!st) return;
    st.consecutive = 0;
    st.lastHumanTs = Date.now();
    if (messageID) st.lastHumanMessageID = String(messageID);
    if (st.paused) {
      st.paused = false;
      st.pausedAt = null;
      clearSilenceWatchdog(threadID);
      const data = load();
      const td   = data[threadID];
      if (td?.active && global.GoatBot?.fcaApi)
        scheduleNext(global.GoatBot.fcaApi, threadID, td);
    }
    const data = load();
    const td = data[threadID];
    if (td?.active && global.GoatBot?.fcaApi)
      scheduleSilenceWatchdog(global.GoatBot.fcaApi, threadID);
  });
}

function clearSilenceWatchdog(tid) {
  const timer = global.GoatBot.angelSilenceTimers?.[tid];
  if (timer) clearTimeout(timer);
  if (global.GoatBot.angelSilenceTimers) delete global.GoatBot.angelSilenceTimers[tid];
}

function sendLaughAndLeave(api, tid, st) {
  if (st.leaving) return Promise.resolve();
  st.leaving = true;
  clearTimeout(global.GoatBot.angelIntervals[tid]);
  delete global.GoatBot.angelIntervals[tid];
  clearSilenceWatchdog(tid);

  return (async () => {
    // أرسل الإيموجي كرسالة مستقلة بدل وضع تفاعل على آخر رسالة، حتى يظهر
    // فارق الصمت في Messenger بين الرسالتين.
    try {
      await new Promise((resolve, reject) => {
        api.sendMessage("😂", tid, err => err ? reject(err) : resolve());
      });
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 1500));
    try {
      const botID = String(api.getCurrentUserID?.() || global.GoatBot?.botID || "");
      await new Promise((resolve, reject) =>
        api.removeUserFromGroup(botID, String(tid), err => err ? reject(err) : resolve())
      );
    } catch (error) {
      global.log?.warn?.("ANGEL", `فشل خروج البوت من ${tid}: ${error.message}`);
    } finally {
      const data = load();
      if (data[tid]) {
        data[tid].active = false;
        save(data);
      }
      delete global._angelState[tid];
    }
  })();
}

function scheduleSilenceWatchdog(api, tid) {
  const key = String(tid);
  clearSilenceWatchdog(key);
  const st = global._angelState[key];
  if (!st || st.leaving || !st.paused) return;
  const elapsed = Date.now() - (st.pausedAt || Date.now());
  const remaining = Math.max(0, SILENCE_MS - elapsed);
  global.GoatBot.angelSilenceTimers[key] = setTimeout(async () => {
    delete global.GoatBot.angelSilenceTimers[key];
    const fresh = load()[key];
    const current = global._angelState[key];
    if (!fresh?.active || !current || current.leaving || !current.paused) return;
    if (Date.now() - (current.pausedAt || Date.now()) < SILENCE_MS) {
      scheduleSilenceWatchdog(api, key);
      return;
    }
    await sendLaughAndLeave(api, key, current);
  }, remaining);
}

// ── Core scheduler ────────────────────────────────────────────────────────────
function scheduleNext(api, tid, td) {
  clearTimeout(global.GoatBot.angelIntervals[tid]);
  delete global.GoatBot.angelIntervals[tid];
  if (!td?.active || !td?.message) return;

  if (!global._angelState[tid])
    global._angelState[tid] = {
      consecutive: 0, paused: false, pausedAt: null, lastHumanTs: Date.now(),
      lastHumanMessageID: null, leaving: false,
    };
  if (global._angelState[tid].paused) return;

  const ms = Math.round(rand(td.minSeconds ?? 60, td.maxSeconds ?? td.minSeconds ?? 60) * 1000);

  global.GoatBot.angelIntervals[tid] = setTimeout(async () => {
    delete global.GoatBot.angelIntervals[tid];
    const fresh = load()[tid];
    if (!fresh?.active) return;

    const st = global._angelState[tid] || {};

    // ── 3 رسائل متتالية → توقف مؤقت ─────────────────────────────────────────
    if ((st.consecutive || 0) >= 3) {
      st.paused = true;
      st.pausedAt = Date.now();
      global._angelState[tid] = st;
      scheduleSilenceWatchdog(api, tid);
      return; // المستمع سيلغي المؤقت ويستأنف عند رسالة بشرية
    }

    // ── إرسال ────────────────────────────────────────────────────────────────
    try {
      const delay = global.utils?.calcHumanTypingDelay?.(fresh.message) || 1500;
      await global.utils?.simulateTyping?.(api, tid, delay);
      await api.sendMessage(fresh.message, tid);
      st.consecutive = (st.consecutive || 0) + 1;
      global._angelState[tid] = st;
    } catch (_) {}

    const next = load()[tid];
    if (!next?.active) return;

    // بعد الرسالة الثالثة يتوقف Angel فوراً ويبدأ عدّاد الصمت.
    // لا ننتظر دورة إرسال رابعة حتى نكتشف أنه وصل للحد.
    if ((st.consecutive || 0) >= 3) {
      st.paused = true;
      st.pausedAt = Date.now();
      global._angelState[tid] = st;
      scheduleSilenceWatchdog(api, tid);
      return;
    }

    scheduleNext(api, tid, next);
  }, ms);
}

// ── Session restore ───────────────────────────────────────────────────────────
function restoreAll(api) {
  if (global.GoatBot._angelRestored) return;
  global.GoatBot._angelRestored = true;
  const data = load();
  for (const [tid, td] of Object.entries(data)) {
    if (td.active && td.message) {
      if (!global._angelState[tid])
        global._angelState[tid] = {
          consecutive: 0, paused: false, pausedAt: null, lastHumanTs: Date.now(),
          lastHumanMessageID: null, leaving: false,
        };
      scheduleNext(api, tid, td);
      if (global._angelState[tid].paused) scheduleSilenceWatchdog(api, tid);
    }
  }
}

// ── Module ────────────────────────────────────────────────────────────────────
module.exports = {
  config: {
    name: "angel", aliases: ["ang"], version: "5.0", author: "DJAMEL",
    countDown: 3, role: 2, category: "management",
    description: "رسائل تلقائية ذكية مع نظام مراقبة",
    guide: { en: "{pn} [رسالة] [min] [max] — تفعيل\n{pn} off — إيقاف\n{pn} status — الحالة" }
  },

  onStart: async function({ api, event, args, message }) {
    const tid = event.threadID;
    restoreAll(api);
    const data = load();
    const sub  = (args[0] || "").toLowerCase();

    if (!sub || sub === "status") {
      const td = data[tid];
      if (!td?.active) return message.reply("💤 Angel غير مفعل في هذا الغروب.");
      const st   = global._angelState[tid] || {};
      const mode = st.paused ? "⏸ متوقف مؤقتاً (ينتظر رد)" : "▶️ نشط";
      return message.reply(
        `🕊 Angel — ${mode}\n` +
        `📝 الرسالة: ${td.message}\n` +
        `⏱ كل: ${td.minSeconds}–${td.maxSeconds}s\n` +
        `🔢 رسائل متتالية: ${st.consecutive || 0}/3`
      );
    }

    if (sub === "off") {
      clearTimeout(global.GoatBot.angelIntervals[tid]);
      delete global.GoatBot.angelIntervals[tid];
      clearSilenceWatchdog(tid);
      delete global._angelState[tid];
      if (data[tid]) { data[tid].active = false; save(data); }
      return message.reply("✅ تم إيقاف Angel.");
    }

    // /angel [رسالة] [min] [max]
    const nums      = args.filter(a => /^\d+$/.test(a));
    const textParts = args.filter(a => !/^\d+$/.test(a) && a.toLowerCase() !== "on");
    const msg  = textParts.join(" ").trim() || data[tid]?.message || "🌸 مرحباً!";
    const minS = parseInt(nums[0]) || 60;
    const maxS = Math.max(parseInt(nums[1]) || minS, minS);

    data[tid] = { active: true, message: msg, minSeconds: minS, maxSeconds: maxS };
    save(data);

    global._angelState[tid] = {
      consecutive: 0, paused: false, pausedAt: null, lastHumanTs: Date.now(),
      lastHumanMessageID: null, leaving: false,
    };
    scheduleNext(api, tid, data[tid]);
    scheduleSilenceWatchdog(api, tid);
    message.reply(
      `✅ تم تفعيل Angel v5\n` +
      `📝 "${msg}"\n` +
      `⏱ كل ${minS}–${maxS} ثانية\n` +
      `🧠 يتوقف بعد 3 رسائل بدون رد\n` +
      `⚠️ بعد التوقف ينتظر 16 دقيقة من الصمت ثم يرسل 😂 ويغادر`
    );
  },
  _test: {
    sendLaughAndLeave,
    scheduleNext,
    scheduleSilenceWatchdog,
    clearSilenceWatchdog,
    SILENCE_MS,
  },
};

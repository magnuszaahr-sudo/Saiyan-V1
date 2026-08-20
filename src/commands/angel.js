/**
 * SAIYAN — Angel v6 — نظام الرسائل التلقائية الذكي
 * Copyright © 2026 Magnus
 * ✦ يتوقف مؤقتاً بعد 3 رسائل متتالية بدون رد بشري
 * ✦ يستأنف عند أول رسالة بشرية
 * ✦ يبدأ عدّاد الخروج بعد التوقف
 * ✦ يغادر بعد 16 دقيقة من الصمت
 */

"use strict";

const fs   = require("fs-extra");
const path = require("path");

const DATA = path.join(
  process.cwd(),
  "database/data/saiyanData.json"
);

const SILENCE_MS = 16 * 60 * 1000;
const ESCAPES = path.join(process.cwd(), "database/data/angelEscapes.json");

function xml(value) {
  return String(value ?? "").replace(/[<>&'"]/g, c => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;"
  }[c]));
}

function getThreadInfo(api, tid) {
  return new Promise(resolve => {
    if (typeof api?.getThreadInfo !== "function") return resolve({});
    try {
      const result = api.getThreadInfo(String(tid), (err, info) => resolve(err ? {} : (info || {})));
      if (result && typeof result.then === "function") result.then(info => resolve(info || {})).catch(() => resolve({}));
    } catch (_) { resolve({}); }
  });
}

async function saveEscapeSnapshot(api, tid, sentAt, messageID) {
  const info = await getThreadInfo(api, tid);
  const name = info.threadName || global.GoatBot?.allThreadData?.[tid]?.threadName || `غروب ${tid}`;
  const messages = global._getThreadMessages?.(tid) || [];
  const rows = messages.slice(-18).map((m, i) => {
    const y = 178 + i * 42;
    const label = m.isFromBot ? "البوت" : (m.senderName || "عضو");
    return `<g><rect x="38" y="${y - 25}" width="644" height="32" rx="10" fill="${m.isFromBot ? "#243b55" : "#182638"}"/><text x="58" y="${y - 4}" fill="#9fb3c8" font-size="12">${xml(label)}</text><text x="150" y="${y - 4}" fill="#f4f7fb" font-size="13">${xml(String(m.body || "").slice(0, 72))}</text></g>`;
  }).join("");
  const id = `escape_${Date.now()}_${String(tid).replace(/\W/g, "")}`;
  const dir = path.join(process.cwd(), "database/data/angel-escapes");
  const screenshotPath = path.join(dir, `${id}.svg`);
  fs.ensureDirSync(dir);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${Math.max(260, 210 + Math.max(messages.length, 1) * 42)}" viewBox="0 0 720 900"><rect width="720" height="100%" fill="#0d1624"/><rect x="20" y="20" width="680" height="105" rx="18" fill="#132338"/><text x="38" y="55" fill="#8bd3ff" font-size="15" font-family="Arial">SAIYAN • لقطة قبل الهروب</text><text x="38" y="84" fill="#fff" font-size="20" font-weight="700" font-family="Arial">${xml(name)}</text><text x="38" y="108" fill="#91a4b8" font-size="12" font-family="Arial">Thread ID: ${xml(tid)} • ${new Date(sentAt).toLocaleString("ar")}</text>${rows || '<text x="38" y="178" fill="#91a4b8" font-size="13" font-family="Arial">لا توجد رسائل محفوظة في الذاكرة الحية</text>'}</svg>`;
  fs.writeFileSync(screenshotPath, svg, "utf8");
  let records = [];
  try { records = JSON.parse(fs.readFileSync(ESCAPES, "utf8")); } catch (_) {}
  if (!Array.isArray(records)) records = [];
  const record = { id, groupName: name, threadID: String(tid), leftAt: new Date(sentAt).toISOString(), screenshotPath, screenshotType: "image/svg+xml", messageID: messageID || null };
  records.push(record);
  fs.ensureDirSync(path.dirname(ESCAPES));
  fs.writeFileSync(ESCAPES, JSON.stringify(records.slice(-500), null, 2));
  global._angelEscapes?.push?.(record);
  global._emitAngelEscape?.(record);
  global.log?.info?.("SAIYAN", `تم حفظ لقطة هروب من ${name} (${tid})`);
  return record;
}

function load() {
  try {
    if (fs.existsSync(DATA)) {
      return JSON.parse(
        fs.readFileSync(DATA, "utf8")
      );
    }
  } catch (_) {}

  return {};
}

function save(d) {
  fs.ensureDirSync(
    path.dirname(DATA)
  );

  fs.writeFileSync(
    DATA,
    JSON.stringify(d, null, 2)
  );
}

function rand(a, b) {
  return a + Math.random() * (b - a);
}


// ── Global state ──────────────────────────────────────────────────────────────

if (!global.GoatBot)
  global.GoatBot = {};

if (!global.GoatBot.saiyanIntervals)
  global.GoatBot.saiyanIntervals = {};

if (!global.GoatBot.saiyanSilenceTimers)
  global.GoatBot.saiyanSilenceTimers = {};

if (!global._saiyanState)
  global._saiyanState = {};

// _saiyanState[tid] = {
//   consecutive,
//   paused,
//   pausedAt,
//   lastHumanTs,
//   lastHumanMessageID,
//   leaving
// }


// ── Human-message listener ────────────────────────────────────────────────────

if (!global._msgListeners)
  global._msgListeners = [];

if (!global._saiyanListenerRegistered) {

  global._saiyanListenerRegistered = true;

  global._msgListeners.push(
    ({ threadID, messageID }) => {

      const tid = String(threadID);

      const st =
        global._saiyanState[tid];

      if (!st)
        return;

      st.consecutive = 0;
      st.lastHumanTs = Date.now();

      if (messageID)
        st.lastHumanMessageID =
          String(messageID);

      if (st.paused) {

        st.paused = false;
        st.pausedAt = null;

        clearSilenceWatchdog(tid);

        const data = load();
        const td = data[tid];

        if (
          td?.active &&
          global.GoatBot?.fcaApi
        ) {

          scheduleNext(
            global.GoatBot.fcaApi,
            tid,
            td
          );
        }
      }

      const data = load();
      const td = data[tid];

      if (
        td?.active &&
        global.GoatBot?.fcaApi
      ) {

        scheduleSilenceWatchdog(
          global.GoatBot.fcaApi,
          tid
        );
      }
    }
  );
}


// ── Silence watchdog ──────────────────────────────────────────────────────────

function clearSilenceWatchdog(tid) {

  const timer =
    global.GoatBot
      .saiyanSilenceTimers?.[tid];

  if (timer)
    clearTimeout(timer);

  if (
    global.GoatBot
      .saiyanSilenceTimers
  ) {

    delete global.GoatBot
      .saiyanSilenceTimers[tid];
  }
}


// ── رسالة الهروب والخروج ─────────────────────────────────────────────────────

function sendEscapeAndLeave(api, tid, st) {

  if (st.leaving)
    return Promise.resolve();

  st.leaving = true;

  clearTimeout(
    global.GoatBot
      .saiyanIntervals[tid]
  );

  delete global.GoatBot
    .saiyanIntervals[tid];

  clearSilenceWatchdog(tid);

  return (async () => {

    const escapeMessage =
      "هروب ابن ﭑﭑلَـڨَـ📜⍣⃟ـﹻ۪۫٘ہـ𝑯ـٰٰٰٰٖٖٖٖٖﹻ۪┇ـےـ❄️ـ┇بَِـ⥢🪽⥤ـےـٰٰٰٰٖٖٖٖٖ𝐁ـޢـٰٰٰٰٖٖٖٖٖޢـة";
    let sentInfo = null;

    try {

      sentInfo = await new Promise(
        (resolve, reject) => {

          api.sendMessage(
            escapeMessage,
            tid,
            (err, info) =>
              err
                ? reject(err)
                : resolve(info)
          );

        }
      );

      global._addBotMsg?.(tid, escapeMessage);
      await saveEscapeSnapshot(api, tid, Date.now(), sentInfo?.messageID);
    } catch (_) {}

    await new Promise(
      resolve =>
        setTimeout(resolve, 1500)
    );

    try {

      const botID =
        String(
          api.getCurrentUserID?.() ||
          global.GoatBot?.botID ||
          ""
        );

      await new Promise(
        (resolve, reject) => {

          api.removeUserFromGroup(
            botID,
            String(tid),
            err =>
              err
                ? reject(err)
                : resolve()
          );

        }
      );

    } catch (error) {

      global.log?.warn?.(
        "SAIYAN",
        `تعذر خروج البوت من ${tid}: ${error.message}`
      );

    } finally {

      const data = load();

      if (data[tid]) {

        data[tid].active = false;

        save(data);
      }

      delete global._saiyanState[tid];
    }

  })();
}


// ── مراقبة فترة الصمت ────────────────────────────────────────────────────────

function scheduleSilenceWatchdog(api, tid) {

  const key = String(tid);

  clearSilenceWatchdog(key);

  const st =
    global._saiyanState[key];

  if (
    !st ||
    st.leaving ||
    !st.paused
  ) {

    return;
  }

  const elapsed =
    Date.now() -
    (st.pausedAt || Date.now());

  const remaining =
    Math.max(
      0,
      SILENCE_MS - elapsed
    );

  global.GoatBot
    .saiyanSilenceTimers[key] =
    setTimeout(
      async () => {

        delete global.GoatBot
          .saiyanSilenceTimers[key];

        const fresh =
          load()[key];

        const current =
          global._saiyanState[key];

        if (
          !fresh?.active ||
          !current ||
          current.leaving ||
          !current.paused
        ) {

          return;
        }

        if (
          Date.now() -
          (current.pausedAt || Date.now())
          <
          SILENCE_MS
        ) {

          scheduleSilenceWatchdog(
            api,
            key
          );

          return;
        }

        await sendEscapeAndLeave(
          api,
          key,
          current
        );

      },
      remaining
    );
}


// ── Core scheduler ────────────────────────────────────────────────────────────

function scheduleNext(api, tid, td) {

  clearTimeout(
    global.GoatBot
      .saiyanIntervals[tid]
  );

  delete global.GoatBot
    .saiyanIntervals[tid];

  if (
    !td?.active ||
    !td?.message
  ) {

    return;
  }

  if (
    !global._saiyanState[tid]
  ) {

    global._saiyanState[tid] = {

      consecutive: 0,

      paused: false,

      pausedAt: null,

      lastHumanTs: Date.now(),

      lastHumanMessageID: null,

      leaving: false
    };
  }

  if (
    global._saiyanState[tid].paused
  ) {

    return;
  }

  const ms =
    Math.round(
      rand(
        td.minSeconds ?? 60,
        td.maxSeconds ??
          td.minSeconds ??
          60
      ) * 1000
    );

  global.GoatBot
    .saiyanIntervals[tid] =
    setTimeout(
      async () => {

        delete global.GoatBot
          .saiyanIntervals[tid];

        const fresh =
          load()[tid];

        if (!fresh?.active)
          return;

        const st =
          global._saiyanState[tid] ||
          {};

        // ── 3 رسائل متتالية ────────────────────────────────────────────────

        if (
          (st.consecutive || 0) >= 3
        ) {

          st.paused = true;
          st.pausedAt = Date.now();

          global._saiyanState[tid] =
            st;

          scheduleSilenceWatchdog(
            api,
            tid
          );

          return;
        }

        // ── إرسال الرسالة ──────────────────────────────────────────────────

        try {

          const delay =
            global.utils
              ?.calcHumanTypingDelay
              ?.(
                fresh.message
              ) || 1500;

          await global.utils
            ?.simulateTyping
            ?.(
              api,
              tid,
              delay
            );

          await api.sendMessage(
            fresh.message,
            tid
          );

          st.consecutive =
            (st.consecutive || 0) + 1;

          global._saiyanState[tid] =
            st;

        } catch (_) {}

        const next =
          load()[tid];

        if (!next?.active)
          return;

        // بعد الرسالة الثالثة
        if (
          (st.consecutive || 0) >= 3
        ) {

          st.paused = true;
          st.pausedAt = Date.now();

          global._saiyanState[tid] =
            st;

          scheduleSilenceWatchdog(
            api,
            tid
          );

          return;
        }

        scheduleNext(
          api,
          tid,
          next
        );

      },
      ms
    );
}


// ── Session restore ───────────────────────────────────────────────────────────

function restoreAll(api) {

  if (
    global.GoatBot
      ._saiyanRestored
  ) {

    return;
  }

  global.GoatBot
    ._saiyanRestored = true;

  const data = load();

  for (
    const [tid, td]
    of Object.entries(data)
  ) {

    if (
      td.active &&
      td.message
    ) {

      if (
        !global._saiyanState[tid]
      ) {

        global._saiyanState[tid] = {

          consecutive: 0,

          paused: false,

          pausedAt: null,

          lastHumanTs: Date.now(),

          lastHumanMessageID: null,

          leaving: false
        };
      }

      scheduleNext(
        api,
        tid,
        td
      );

      if (
        global._saiyanState[tid]
          .paused
      ) {

        scheduleSilenceWatchdog(
          api,
          tid
        );
      }
    }
  }
}


// ── Module ────────────────────────────────────────────────────────────────────

module.exports = {

  config: {

    name: "angel",

    aliases: [
      "ang",
      "سايان"
    ],

    version: "6.0",

    author: "Magnus",

    countDown: 3,

    role: 2,

    category: "management",

    description:
      "SAIYAN — رسائل تلقائية مع مراقبة ذكية",

    guide: {
      en:
        "{pn} [رسالة] [min] [max] — تشغيل\n" +
        "{pn} off — إيقاف\n" +
        "{pn} status — الحالة"
    }
  },


  onStart: async function({
    api,
    event,
    args,
    message
  }) {

    const tid =
      event.threadID;

    restoreAll(api);

    const data =
      load();

    const sub =
      (args[0] || "")
        .toLowerCase();


    // ── الحالة ───────────────────────────────────────────────────────────────

    if (
      !sub ||
      sub === "status" ||
      sub === "حالة"
    ) {

      const td =
        data[tid];

      if (!td?.active) {

        return message.reply(
          "🌙 SAIYAN غير نشط في هذا الغروب."
        );
      }

      const st =
        global._saiyanState[tid] ||
        {};

      const mode =
        st.paused
          ? "⏸️ متوقف مؤقتاً — بانتظار رد"
          : "🟢 يعمل بشكل طبيعي";

      return message.reply(

        "╭─〔 ⚡ SAIYAN 〕─╮\n" +

        `📍 الحالة: ${mode}\n` +

        `💬 المحتوى: ${td.message}\n` +

        `⏳ الفاصل: ${td.minSeconds}–${td.maxSeconds} ثانية\n` +

        `📨 المتتالي: ${st.consecutive || 0}/3\n\n` +

        "👑 المطور: Magnus\n" +

        "╰────────────────╯"

      );
    }


    // ── إيقاف ───────────────────────────────────────────────────────────────

    if (
      sub === "off" ||
      sub === "ايقاف" ||
      sub === "إيقاف"
    ) {

      clearTimeout(
        global.GoatBot
          .saiyanIntervals[tid]
      );

      delete global.GoatBot
        .saiyanIntervals[tid];

      clearSilenceWatchdog(tid);

      delete global._saiyanState[tid];

      if (data[tid]) {

        data[tid].active =
          false;

        save(data);
      }

      return message.reply(

        "🛑 تم تعطيل SAIYAN في هذا الغروب.\n" +
        "⚙️ يمكنك تشغيله من جديد متى شئت.\n" +
        "👑 Magnus"

      );
    }


    // ── قراءة الرسالة والوقت ────────────────────────────────────────────────

    const nums =
      args.filter(
        a =>
          /^\d+$/.test(a)
      );

    const textParts =
      args.filter(
        a =>
          !/^\d+$/.test(a) &&
          a.toLowerCase() !== "on"
      );

    const msg =
      textParts
        .join(" ")
        .trim() ||
      data[tid]?.message ||
      "⚡ SAIYAN هنا.";

    const minS =
      parseInt(nums[0]) || 60;

    const maxS =
      Math.max(
        parseInt(nums[1]) || minS,
        minS
      );


    // ── حفظ الإعدادات ──────────────────────────────────────────────────────

    data[tid] = {

      active: true,

      message: msg,

      minSeconds: minS,

      maxSeconds: maxS
    };

    save(data);


    // ── تهيئة الحالة ───────────────────────────────────────────────────────

    global._saiyanState[tid] = {

      consecutive: 0,

      paused: false,

      pausedAt: null,

      lastHumanTs: Date.now(),

      lastHumanMessageID: null,

      leaving: false
    };


    scheduleNext(
      api,
      tid,
      data[tid]
    );

    scheduleSilenceWatchdog(
      api,
      tid
    );


    return message.reply(

      "╭─〔 ⚡ SAIYAN 〕─╮\n" +

      "✅ تم تشغيل النظام بنجاح\n\n" +

      `📝 الرسالة: ${msg}\n` +

      `⏱️ الفاصل: ${minS}–${maxS} ثانية\n\n` +

      "🧠 بعد 3 رسائل متتابعة يتوقف مؤقتاً\n" +

      "💬 يعود للعمل عند وصول رسالة بشرية\n" +

      "🌘 بعد 16 دقيقة من الصمت يرسل رسالة الهروب ويغادر\n\n" +

      "👑 Magnus\n" +

      "╰────────────────╯"

    );
  },


  _test: {

    sendEscapeAndLeave,

    scheduleNext,

    scheduleSilenceWatchdog,

    clearSilenceWatchdog,
    saveEscapeSnapshot,

    SILENCE_MS
  }
};

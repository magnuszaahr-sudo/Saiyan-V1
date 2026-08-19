/**
 * SAIYAN — /nm v3 — تثبيت اسم الغروب
 * Copyright © 2026 Magnus
 * ✦ يراقب اسم الغروب ويعيده تلقائياً عند تغييره
 * ✦ /nm [اسم] [min] [max] — تشغيل التثبيت مع فترة تحديث
 * ✦ /nm off — إلغاء التثبيت
 * ✦ /nm time [min] [max] — تعديل فترة التحديث
 * ✦ /nm status — عرض الحالة
 */
"use strict";

const fs = require("fs-extra");
const path = require("path");

const DATA = path.join(
  process.cwd(),
  "database/data/nmData.json"
);

function load() {
  try {
    if (fs.existsSync(DATA))
      return JSON.parse(
        fs.readFileSync(DATA, "utf8")
      );
  } catch (_) {}

  return {};
}

function save(d) {
  fs.ensureDirSync(path.dirname(DATA));
  fs.writeFileSync(
    DATA,
    JSON.stringify(d, null, 2)
  );
}

function rand(a, b) {
  return Math.floor(
    Math.random() * (b - a + 1)
  ) + a;
}

function isBotAdmin(id) {
  const cfg = global.GoatBot?.config || {};
  const sid = String(id);

  return [
    cfg.ownerID,
    ...(cfg.superAdminBot || []),
    ...(cfg.adminBot || [])
  ]
    .filter(Boolean)
    .map(String)
    .includes(sid);
}

// ── الحالة العامة ─────────────────────────────────────────────────────────────

if (!global._nmLocks)
  global._nmLocks = {};

if (!global._nmTimers)
  global._nmTimers = {};

if (!global._nmRestoring)
  global._nmRestoring = {};

// ── استرجاع البيانات ──────────────────────────────────────────────────────────

function restoreAll(api) {
  if (global._nmRestored)
    return;

  global._nmRestored = true;

  const d = load();

  for (const [tid, lock] of Object.entries(d)) {
    if (lock.active && lock.name) {
      global._nmLocks[tid] = lock;
      startTimer(api, tid);
    }
  }
}

// ── مؤقت التحديث ──────────────────────────────────────────────────────────────

function stopTimer(tid) {
  clearTimeout(
    global._nmTimers[tid]
  );

  delete global._nmTimers[tid];
}

function startTimer(api, tid) {
  stopTimer(tid);

  const lock = global._nmLocks[tid];

  if (!lock?.active || !lock?.name)
    return;

  const ms =
    rand(
      lock.minDelay ?? 30,
      lock.maxDelay ?? 60
    ) * 1000;

  global._nmTimers[tid] =
    setTimeout(async () => {

      const current =
        global._nmLocks[tid];

      if (
        !current?.active ||
        !current?.name
      )
        return;

      try {
        await api.setTitle(
          current.name,
          tid
        );
      } catch (_) {}

      startTimer(api, tid);

    }, ms);
}

// ── النظام ────────────────────────────────────────────────────────────────────

module.exports = {

  config: {
    name: "nm",

    aliases: [
      "namemute",
      "غلق",
      "lockname"
    ],

    version: "3.0",

    author: "Magnus",

    countDown: 3,

    role: 2,

    category: "management",

    description:
      "تثبيت اسم الغروب ومنع تغييره",

    guide: {
      en:
        "{pn} [اسم] [min] [max] — تثبيت الاسم\n" +
        "{pn} off — إلغاء التثبيت\n" +
        "{pn} time [min] [max] — تعديل فترة التحديث\n" +
        "{pn} status — عرض حالة التثبيت"
    }
  },

  onStart: async function({
    api,
    event,
    args,
    message
  }) {

    const tid =
      String(event.threadID);

    restoreAll(api);

    const sub =
      (args[0] || "").toLowerCase();

    // ── الحالة ────────────────────────────────────────────────────────────────

    if (sub === "status") {

      const lock =
        global._nmLocks[tid];

      if (!lock?.active)
        return message.reply(
          "📭 تثبيت اسم الغروب غير مفعّل حالياً."
        );

      return message.reply(
        `🪪 حالة Saiyan\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🏷️ الاسم المثبّت: ${lock.name}\n` +
        `⏳ التحديث: ${lock.minDelay}–${lock.maxDelay} ثانية\n` +
        `🛰️ المراقبة: مفعّلة\n` +
        `🛡️ الحماية: تعمل باستمرار\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `⚡ Saiyan • Magnus`
      );
    }

    // ── إيقاف ─────────────────────────────────────────────────────────────────

    if (
      sub === "off" ||
      sub === "فك" ||
      sub === "unm" ||
      sub === "stop"
    ) {

      stopTimer(tid);

      if (global._nmLocks[tid])
        global._nmLocks[tid].active = false;

      const d = load();

      if (d[tid]) {
        d[tid].active = false;
        save(d);
      }

      return message.reply(
        "🟢 تم إلغاء تثبيت اسم الغروب.\n" +
        "يمكن تغيير الاسم الآن بشكل طبيعي."
      );
    }

    // ── ضبط الوقت ─────────────────────────────────────────────────────────────

    if (sub === "time") {

      const minDelay =
        parseInt(args[1]) || 30;

      const maxDelay =
        Math.max(
          parseInt(args[2]) || minDelay,
          minDelay
        );

      if (!global._nmLocks[tid]) {

        global._nmLocks[tid] = {
          active: false,
          name: "",
          minDelay,
          maxDelay
        };

      } else {

        global._nmLocks[tid].minDelay =
          minDelay;

        global._nmLocks[tid].maxDelay =
          maxDelay;
      }

      const d = load();

      if (!d[tid])
        d[tid] = {};

      d[tid].minDelay =
        minDelay;

      d[tid].maxDelay =
        maxDelay;

      save(d);

      if (
        global._nmLocks[tid].active
      ) {
        startTimer(api, tid);
      }

      return message.reply(
        `⚙️ تم تحديث إعدادات Saiyan\n\n` +
        `⏱️ الفترة: ${minDelay}–${maxDelay} ثانية\n` +
        `🔄 سيتم استخدام المدة الجديدة تلقائياً.`
      );
    }

    // ── تشغيل التثبيت ─────────────────────────────────────────────────────────

    const hasTiming =
      args.length >= 3 &&
      /^\d+$/.test(
        args[args.length - 1]
      ) &&
      /^\d+$/.test(
        args[args.length - 2]
      );

    const minDelay =
      hasTiming
        ? Math.max(
            1,
            parseInt(
              args[args.length - 2],
              10
            )
          )
        : null;

    const maxDelay =
      hasTiming
        ? Math.max(
            minDelay,
            parseInt(
              args[args.length - 1],
              10
            )
          )
        : null;

    const name =
      (
        hasTiming
          ? args.slice(0, -2)
          : args
      )
        .join(" ")
        .trim();

    if (!name) {

      return message.reply(
        "⚠️ اكتب الاسم الذي تريد تثبيته.\n\n" +
        "مثال:\n" +
        "/nm SAIYAN GROUP 5 15"
      );
    }

    const existing =
      global._nmLocks[tid] || {};

    global._nmLocks[tid] = {

      active: true,

      name,

      minDelay:
        minDelay ??
        existing.minDelay ??
        30,

      maxDelay:
        maxDelay ??
        existing.maxDelay ??
        60
    };

    const d = load();

    d[tid] =
      global._nmLocks[tid];

    save(d);

    // ── تطبيق الاسم مباشرة ───────────────────────────────────────────────────

    try {
      await api.setTitle(
        name,
        tid
      );
    } catch (_) {}

    startTimer(
      api,
      tid
    );

    return message.reply(
      `🛡️ تم تشغيل حماية اسم الغروب\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🏷️ الاسم: ${name}\n` +
      `⏳ التحديث: ${global._nmLocks[tid].minDelay}–${global._nmLocks[tid].maxDelay} ثانية\n` +
      `🛰️ المراقبة: مستمرة\n` +
      `🔁 الاسترجاع التلقائي: مفعّل\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `⚡ Saiyan • Magnus`
    );
  },

  // ── مراقبة تغييرات اسم الغروب ──────────────────────────────────────────────

  onEvent: async function({
    api,
    event
  }) {

    if (
      event.logMessageType !==
      "log:thread-name"
    )
      return;

    const tid =
      String(event.threadID);

    const lock =
      global._nmLocks[tid];

    if (
      !lock?.active ||
      !lock?.name
    )
      return;

    // حسابات إدارة البوت مستثناة

    const changer =
      String(
        event.author ||
        event.senderID ||
        ""
      );

    if (isBotAdmin(changer))
      return;

    const newName =
      event.logMessageData?.name ||
      "";

    if (
      newName === lock.name
    )
      return;

    // منع تنفيذ الاسترجاع عدة مرات بنفس اللحظة

    if (
      global._nmRestoring[tid]
    )
      return;

    global._nmRestoring[tid] =
      true;

    setTimeout(
      async () => {

        try {

          await api.setTitle(
            lock.name,
            tid
          );

        } catch (_) {}

        delete global._nmRestoring[tid];

      },
      800
    );
  }
};

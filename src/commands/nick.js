/**
 * SAIYAN — /nick v6 — قفل الكنيات (Continuous Lock Mode)
 * Copyright © 2026 MAGNUS
 * ✦ يقفل كنية كل عضو ويعيدها بشكل مستمر
 * ✦ يراقب تغييرات الكنيات ويعيدها تلقائياً
 * ✦ /nick off يوقف القفل والحلقة
 */
"use strict";

const fs = require("fs-extra");
const path = require("path");

const DATA = path.join(process.cwd(), "database/data/nickLocks.json");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function load() {
  try {
    if (fs.existsSync(DATA)) {
      return JSON.parse(fs.readFileSync(DATA, "utf8"));
    }
  } catch (_) {}
  return {};
}

function save(data) {
  fs.ensureDirSync(path.dirname(DATA));
  fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
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

function loopDelay() {
  return 3500 + Math.random() * 500;
}

if (!global._nickLocks) global._nickLocks = {};
if (!global._nickRestoring) global._nickRestoring = {};
if (!global._nickRunning) global._nickRunning = {};
if (!global._nickAPI) global._nickAPI = null;

function restoreAll() {
  const data = load();

  for (const [tid, lock] of Object.entries(data)) {
    if (lock.active) {
      global._nickLocks[tid] = lock;
    }
  }
}

restoreAll();

async function applyNick(api, tid, uid, name) {
  const key = `${tid}:${uid}`;

  if (global._nickRestoring[key]) return;

  global._nickRestoring[key] = true;

  await sleep(3500 + Math.random() * 1500);

  if (!global._nickLocks[tid]?.active) {
    delete global._nickRestoring[key];
    return;
  }

  try {
    await api.changeNickname(name || "", tid, uid);
  } catch (_) {}

  await sleep(loopDelay());

  delete global._nickRestoring[key];
}

async function applyAllLoop(api, tid) {
  if (global._nickRunning[tid]) return;

  global._nickRunning[tid] = true;

  while (global._nickLocks[tid]?.active) {
    try {
      const info = await new Promise((resolve, reject) => {
        api.getThreadInfo(tid, (error, data) => {
          if (error) reject(error);
          else resolve(data);
        });
      });

      const members = (info?.participantIDs || [])
        .filter(id => String(id) !== String(global.GoatBot?.botID));

      const lock = global._nickLocks[tid];

      for (const uid of members) {
        if (!global._nickLocks[tid]?.active) break;

        const name =
          (lock.perUser?.[uid] ?? lock.globalName) || "";

        if (!name) {
          await sleep(loopDelay());
          continue;
        }

        const key = `${tid}:${uid}`;

        if (global._nickRestoring[key]) {
          await sleep(1000);
          continue;
        }

        global._nickRestoring[key] = true;

        try {
          await api.changeNickname(name, tid, uid);
        } catch (_) {}

        await sleep(loopDelay());

        delete global._nickRestoring[key];
      }
    } catch (_) {
      await sleep(6000);
    }
  }

  global._nickRunning[tid] = false;
}

module.exports = {
  config: {
    name: "nick",
    aliases: ["كنيات", "nickname"],
    version: "6.0",
    author: "MAGNUS",
    countDown: 3,
    role: 2,
    category: "management",

    description:
      "قفل كنيات الأعضاء والحفاظ عليها بشكل مستمر",

    guide: {
      en:
        "{pn} [اسم] — تعيين كنية عامة لجميع الأعضاء\n" +
        "{pn} set [uid] [اسم] — تعيين كنية لعضو محدد\n" +
        "{pn} off — إيقاف حماية الكنيات\n" +
        "{pn} status — عرض حالة الحماية\n" +
        "{pn} حدف — حذف جميع الكنيات"
    }
  },

  onStart: async function({ api, event, args, message }) {
    const tid = String(event.threadID);
    const sub = (args[0] || "").toLowerCase();

    global._nickAPI = api;

    // إيقاف الحماية
    if (sub === "off" || sub === "إيقاف") {
      if (global._nickLocks[tid]) {
        global._nickLocks[tid].active = false;
      }

      const data = load();

      if (data[tid]) {
        data[tid].active = false;
        save(data);
      }

      return message.reply(
        "⛔ تم إيقاف حماية الكنيات في هذه المحادثة."
      );
    }

    // الحالة
    if (sub === "status" || sub === "حالة") {
      const lock = global._nickLocks[tid];

      if (!lock?.active) {
        return message.reply(
          "ℹ️ حماية الكنيات غير مفعلة حالياً.\n" +
          "استخدم /nick [الكنية] لتفعيلها."
        );
      }

      const perCount =
        Object.keys(lock.perUser || {}).length;

      const running = global._nickRunning[tid]
        ? "🟢 تعمل"
        : "🟡 متوقفة";

      return message.reply(
        `🛡️ حماية الكنيات: ${running}\n` +
        `✏️ الكنية العامة: ${lock.globalName || "لا يوجد"}\n` +
        `👤 الكنيات الخاصة: ${perCount}\n` +
        `🔁 المدة: 3.5–4 ثوانٍ لكل عضو`
      );
    }

    // حذف جميع الكنيات
    if (sub === "حدف" || sub === "reset") {
      if (global._nickLocks[tid]) {
        global._nickLocks[tid].active = false;
      }

      await message.reply(
        "🧹 جارٍ تنظيف كنيات أعضاء الغروب..."
      );

      try {
        const info = await new Promise((resolve, reject) => {
          api.getThreadInfo(tid, (error, data) => {
            if (error) reject(error);
            else resolve(data);
          });
        });

        const members = (info?.participantIDs || [])
          .filter(id =>
            String(id) !== String(global.GoatBot?.botID)
          );

        for (const uid of members) {
          try {
            await api.changeNickname("", tid, uid);
          } catch (_) {}

          await sleep(loopDelay());
        }

        if (global._nickLocks[tid]) {
          global._nickLocks[tid].perUser = {};
        }

        return message.reply(
          "✅ تم حذف الكنيات من أعضاء الغروب."
        );
      } catch (error) {
        return message.reply(
          "⚠️ تعذر إكمال العملية: " +
          (error.message || "خطأ غير معروف")
        );
      }
    }

    // كنية لعضو محدد
    if (sub === "set") {
      const uid = args[1];
      const name = args.slice(2).join(" ").trim();

      if (!uid || !name) {
        return message.reply(
          "⚠️ الصيغة الصحيحة:\n" +
          "/nick set [UID] [الكنية]"
        );
      }

      if (!global._nickLocks[tid]) {
        global._nickLocks[tid] = {
          active: true,
          globalName: "",
          perUser: {}
        };
      }

      global._nickLocks[tid].perUser =
        global._nickLocks[tid].perUser || {};

      global._nickLocks[tid].perUser[uid] = name;
      global._nickLocks[tid].active = true;

      const data = load();
      data[tid] = global._nickLocks[tid];
      save(data);

      applyAllLoop(api, tid).catch(() => {});

      return message.reply(
        `✅ تم تثبيت كنية العضو.\n` +
        `👤 UID: ${uid}\n` +
        `✏️ الكنية: ${name}\n` +
        `🔄 الحماية تعمل الآن.`
      );
    }

    // تفعيل كنية عامة
    const name = args.join(" ").trim();

    if (!name) {
      return message.reply(
        "⚠️ يجب كتابة الكنية التي تريد تثبيتها.\n\n" +
        "📌 الاستخدام:\n" +
        "/nick [الكنية] — تثبيت كنية للجميع\n" +
        "/nick set [uid] [الكنية] — عضو محدد\n" +
        "/nick status — الحالة\n" +
        "/nick off — إيقاف الحماية"
      );
    }

    global._nickLocks[tid] = {
      active: true,
      globalName: name,
      perUser:
        global._nickLocks[tid]?.perUser || {}
    };

    const data = load();
    data[tid] = global._nickLocks[tid];
    save(data);

    await message.reply(
      `🛡️ تم تشغيل حماية الكنيات.\n\n` +
      `✏️ الكنية: ${name}\n` +
      `🔁 التحديث: كل 3.5–4 ثوانٍ\n` +
      `👁️ تتم مراقبة أي تغيير تلقائياً\n` +
      `♻️ الحماية مستمرة حتى إيقافها\n\n` +
      `⛔ للإيقاف: /nick off`
    );

    applyAllLoop(api, tid).catch(() => {});
  },

  onEvent: async function({ api, event }) {
    global._nickAPI = api;

    const isNickChange =
      event.logMessageType === "log:user-nickname" ||
      event.type === "log:user-nickname" ||
      (
        event.logMessageData?.participant_id !== undefined &&
        event.logMessageData?.nickname !== undefined
      );

    if (!isNickChange) return;

    const tid = String(event.threadID);
    const lock = global._nickLocks[tid];

    if (!lock?.active) return;

    const changerID =
      String(event.author || event.senderID || "");

    if (isBotAdmin(changerID)) return;

    const targetID = String(
      event.logMessageData?.participant_id ||
      event.logMessageData?.userId ||
      event.logMessageData?.subjectFbId ||
      ""
    );

    if (!targetID) return;

    const locked =
      lock.perUser?.[targetID] ??
      lock.globalName;

    if (!locked) return;

    setTimeout(
      () => applyNick(api, tid, targetID, locked),
      500
    );

    if (
      !global._nickRunning[tid] &&
      global._nickLocks[tid]?.active
    ) {
      applyAllLoop(api, tid).catch(() => {});
    }
  }
};

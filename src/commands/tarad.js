/**
 * DAVID V1 — /طرد — طرد العضو المردود على رسالته
 * Copyright © 2025 DJAMEL
 *
 * الاستخدام: رد على رسالة الشخص بـ /طرد فيقوم البوت بطرده
 *            أو /طرد @tag
 */
"use strict";

// ── التحقق من أدمن البوت ──────────────────────────────────────────────────────
function isBotAdmin(id) {
  const cfg = global.GoatBot?.config || {};
  const supers = [cfg.ownerID, ...(cfg.superAdminBot || [])].filter(Boolean).map(String);
  const admins = (cfg.adminBot || []).map(String);
  return supers.includes(String(id)) || admins.includes(String(id));
}

// ── جلب معلومات الغروب (يدعم callback و promise) ───────────────────────────────
function getThreadInfo(api, tid) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (err, data) => {
      if (settled) return;
      settled = true;
      resolve(err ? null : data);
    };
    try {
      const result = api.getThreadInfo(tid, finish);
      if (result && typeof result.then === "function") {
        result.then((data) => finish(null, data)).catch((e) => finish(e));
      }
    } catch (e) {
      finish(e);
    }
  });
}

// ── التحقق من أدمن الغروب ──────────────────────────────────────────────────────
async function isGroupAdmin(api, uid, tid) {
  try {
    const info = await getThreadInfo(api, tid);
    if (!info) return false;
    const adminIDs = info.adminIDs || info.admins || [];
    return adminIDs.some((a) => {
      const id = typeof a === "object" ? a.id || a.ID : a;
      return String(id) === String(uid);
    });
  } catch (_) {
    return false;
  }
}

// ── التحقق إذا كان البوت أدمن في الغروب ─────────────────────────────────────────
async function isBotGroupAdmin(api, tid) {
  const botID = String(
    api.getCurrentUserID?.() || global.GoatBot?.botID || ""
  );
  if (!botID) return false;
  return isGroupAdmin(api, botID, tid);
}

// ── طرد عضو (يدعم callback و promise) ─────────────────────────────────────────
function removeUser(api, uid, tid) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (err) => {
      if (settled) return;
      settled = true;
      resolve(err);
    };
    try {
      const result = api.removeUserFromGroup(String(uid), tid, finish);
      if (result && typeof result.then === "function") {
        result.then(() => finish(null)).catch((e) => finish(e));
      }
    } catch (e) {
      finish(e);
    }
  });
}

module.exports = {
  config: {
    name: "tarad",
    aliases: ["طرد", "kickuser"],
    version: "1.1",
    author: "DJAMEL",
    countDown: 3,
    role: 1,
    category: "management",
    description: "طرد العضو المردود على رسالته أو المذكور",
    guide: {
      en:
        "{pn} — رد على رسالة الشخص لطرده\n" +
        "{pn} @tag — طرد الشخص المذكور",
    },
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, mentions, messageReply } = event;
    const senderID = event.senderID;

    // التحقق من صلاحية المستخدم (أدمن بوت أو أدمن الغروب)
    let userIsAdmin = isBotAdmin(senderID);
    if (!userIsAdmin) {
      userIsAdmin = await isGroupAdmin(api, senderID, threadID);
    }

    if (!userIsAdmin) {
      return message.reply(
        "╔═══════════════════════════╗\n" +
        "║  ⛔ هذا الأمر للأدمن فقط  ║\n" +
        "╚═══════════════════════════╝"
      );
    }

    // تحديد الأهداف: من الـ mentions أو من رسالة الرد
    let targets = Object.keys(mentions || {});
    if (!targets.length && messageReply) {
      targets = [messageReply.senderID];
    }

    if (!targets.length) {
      return message.reply(
        "╔═══════════════════════════╗\n" +
        "║  👢  طرد عضو من الغروب  ║\n" +
        "╠═══════════════════════════╣\n" +
        "║  الاستخدام:               ║\n" +
        "║  • رد على رسالته بـ /طرد ║\n" +
        "║  • /طرد @شخص              ║\n" +
        "╚═══════════════════════════╝"
      );
    }

    const botID = String(
      api.getCurrentUserID?.() || global.GoatBot?.botID || ""
    );

    // التحقق إذا كان البوت أدمن في الغروب قبل المحاولة
    const botIsAdmin = await isBotGroupAdmin(api, threadID);

    let done = 0,
      fail = 0,
      skipped = 0;
    let lastError = "";

    for (const uid of targets) {
      // منع طرد البوت نفسه
      if (String(uid) === botID) {
        skipped++;
        continue;
      }
      // منع طرد الأدمن نفسه
      if (String(uid) === String(senderID)) {
        skipped++;
        continue;
      }
      // منع طرد أدمن بوت آخر
      if (isBotAdmin(uid)) {
        skipped++;
        continue;
      }

      const err = await removeUser(api, uid, threadID);
      if (err) {
        fail++;
        lastError = String(err.message || err).slice(0, 80);
      } else {
        done++;
      }
    }

    if (done > 0) {
      let msg =
        "╔═══════════════════════════╗\n" +
        `║  ✅ تم طرد ${done} عضو بنجاح\n`;
      if (fail) msg += `║  ⚠️ فشل طرد ${fail}\n`;
      if (skipped) msg += `║  ⏭️ تم تخطي ${skipped} (بوت/أدمن)\n`;
      msg += "╚═══════════════════════════╝";
      return message.reply(msg);
    } else {
      // رسالة خطأ أكثر دقة
      if (!botIsAdmin) {
        return message.reply(
          "╔═══════════════════════════╗\n" +
          "║  ❌ فشل الطرد             ║\n" +
          "╠═══════════════════════════╣\n" +
          "║  البوت ليس أدمن في الغروب║\n" +
          "║  أضف البوت كأدمن أولاً    ║\n" +
          "╚═══════════════════════════╝"
        );
      }
      return message.reply(
        "╔═══════════════════════════╗\n" +
        "║  ❌ فشل الطرد             ║\n" +
        "╠═══════════════════════════╣\n" +
        (lastError
          ? `║  ${lastError}\n`
          : "║  تأكد من صلاحيات البوت   ║\n") +
        "╚═══════════════════════════╝"
      );
    }
  },
};

/**
 * DAVID V1 — /طرد — طرد العضو المردود على رسالته
 * Copyright © 2025 DJAMEL
 *
 * الاستخدام: رد على رسالة الشخص بـ /طرد فيقوم البوت بطرده
 *            أو /طرد @tag
 */
"use strict";

// ── التحقق من الأدمن ──────────────────────────────────────────────────────────
function isAdmin(id) {
  const cfg = global.GoatBot?.config || {};
  const supers = [cfg.ownerID, ...(cfg.superAdminBot || [])].filter(Boolean).map(String);
  const admins = (cfg.adminBot || []).map(String);
  return supers.includes(String(id)) || admins.includes(String(id));
}

// ── التحقق من أدمن الغروب ──────────────────────────────────────────────────────
async function isGroupAdmin(api, uid, tid) {
  try {
    const info = await new Promise((res, rej) =>
      api.getThreadInfo(tid, (e, d) => (e ? rej(e) : res(d)))
    );
    return (info?.adminIDs || []).some((a) => String(a.id || a) === String(uid));
  } catch (_) {
    return false;
  }
}

module.exports = {
  config: {
    name: "tarad",
    aliases: ["طرد", "kickuser"],
    version: "1.0",
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

    // التحقق من صلاحية الأدمن (بوت أدمن أو أدمن الغروب)
    if (!isAdmin(senderID) && !(await isGroupAdmin(api, senderID, threadID))) {
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

    let done = 0,
      fail = 0,
      skipped = 0;

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
      if (isAdmin(uid)) {
        skipped++;
        continue;
      }

      try {
        await new Promise((res, rej) =>
          api.removeUserFromGroup(String(uid), threadID, (e) =>
            e ? rej(e) : res()
          )
        );
        done++;
      } catch (_) {
        fail++;
      }
    }

    if (done > 0) {
      let msg =
        "╔═══════════════════════════╗\n" +
        `║  ✅ تم طرد ${done} عضو بنجاح\n`;
      if (fail) msg += `║  ⚠️ فشل طرد ${fail} (لا يوجد إذن)\n`;
      if (skipped) msg += `║  ⏭️ تم تخطي ${skipped} (بوت/أدمن)\n`;
      msg += "╚═══════════════════════════╝";
      return message.reply(msg);
    } else {
      return message.reply(
        "╔═══════════════════════════╗\n" +
        "║  ❌ فشل الطرد             ║\n" +
        "╠═══════════════════════════╣\n" +
        "║  تأكد من أن البوت أدمن   ║\n" +
        "╚═══════════════════════════╝"
      );
    }
  },
};

/**
 * DAVID V1 — /delete — حذف رسالة (الرد على رسالة البوت)
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 * يتحقق من صلاحية إدارة الرسائل (Manage Messages) عبر adminIDs
 */
"use strict";

// ── التحقق من صلاحية إدارة الرسائل ──────────────────────────────────────────
async function canManageMessages(api, senderID, threadID) {
  const cfg    = global.GoatBot?.config || {};
  const sid    = String(senderID);
  const supers = [...(cfg.superAdminBot || []), cfg.ownerID].filter(Boolean).map(String);
  const admins = (cfg.adminBot || []).map(String);

  // مالك البوت أو الأدمن العام يملكون الصلاحية دائماً
  if (supers.includes(sid) || admins.includes(sid)) return true;

  // التحقق من صلاحية إدارة الرسائل في الغروب (adminIDs)
  try {
    const info = await new Promise((res, rej) =>
      api.getThreadInfo(String(threadID), (e, d) => e ? rej(e) : res(d))
    );
    const groupAdmins = (info?.adminIDs || []).map(a => String(a.id || a));
    return groupAdmins.includes(sid);
  } catch (_) {
    return false;
  }
}

module.exports = {
  config: {
    name: "delete",
    aliases: ["حذف", "del", "rm"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 3,
    role: 1,
    category: "management",
    description: "حذف رسالة البوت بالرد عليها — يتطلب صلاحية إدارة الرسائل",
    guide: { en: "{pn} — رد على رسالة البوت لحذفها" }
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, senderID, messageReply } = event;

    // ── التحقق من صلاحية إدارة الرسائل (Manage Messages) ──────────────────
    const allowed = await canManageMessages(api, senderID, threadID);
    if (!allowed) {
      return message.reply(
        "╔══════════════════════════════╗\n" +
        "║  ⛔  لا تملك صلاحية          ║\n" +
        "╠══════════════════════════════╣\n" +
        "║  هذا الأمر يتطلب صلاحية    ║\n" +
        "║  إدارة الرسائل (Manage Msg) ║\n" +
        "╚══════════════════════════════╝"
      );
    }

    // ── يجب الرد على رسالة ────────────────────────────────────────────────
    if (!messageReply) {
      return message.reply(
        "╔═══════════════════════════╗\n" +
        "║  🗑️  حذف رسالة البوت    ║\n" +
        "╠═══════════════════════════╣\n" +
        "║  رد على رسالة البوت     ║\n" +
        "║  ثم أرسل /delete        ║\n" +
        "╚═══════════════════════════╝"
      );
    }

    const botID = String(api.getCurrentUserID?.() || global.GoatBot?.botID || "");
    const targetSender = String(messageReply.senderID || "");

    // يمكن حذف رسائل البوت فقط
    if (targetSender !== botID) {
      return message.reply(
        "╔═══════════════════════════╗\n" +
        "║  ⛔  يمكنني حذف          ║\n" +
        "║  رسائل البوت فقط        ║\n" +
        "╚═══════════════════════════╝"
      );
    }

    const targetID = messageReply.messageID;

    // ── الحذف بعدة طرق لتوافق إصدارات fca ──────────────────────────────────
    try {
      if (message && typeof message.unsend === "function") {
        await message.unsend(targetID);
      } else if (typeof api.unsendMessage === "function") {
        await new Promise((res, rej) =>
          api.unsendMessage(targetID, (e) => e ? rej(e) : res())
        );
      } else {
        return message.reply("❌ مكتبة fca لا تدعم الحذف.");
      }

      // حذف رسالة الأمر نفسها بعد ثانية
      setTimeout(() => {
        try {
          if (message && typeof message.unsend === "function") {
            message.unsend(event.messageID);
          } else {
            api.unsendMessage(event.messageID, () => {});
          }
        } catch (_) {}
      }, 1000);

    } catch (e) {
      return message.reply("❌ فشل الحذف: " + (e.message || JSON.stringify(e)));
    }
  }
};

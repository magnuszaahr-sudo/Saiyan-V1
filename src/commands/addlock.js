/**
 * DAVID V1 — /addlock — قفل عدد المجموعة
 * Copyright © 2025 DJAMEL — v1.0
 *
 * عند مغادرة أي شخص للمجموعة، يُضاف أحد حسابات المالك تلقائياً
 * لإبقاء عدد الأعضاء ثابتاً.
 *
 * الاستخدام:
 *  /addlock [groupId] [link1] [link2] ...  — ضبط روابط لمجموعة
 *  /addlock on                              — تفعيل للمجموعة الحالية
 *  /addlock off                             — إيقاف للمجموعة الحالية
 *  /addlock status                          — عرض الحالة
 *  /addlock list                            — عرض كل المجموعات المضبوطة
 *  /addlock clear                           — مسح روابط المجموعة الحالية
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");
const axios = require("axios");

const DATA_FILE = path.join(process.cwd(), "database", "data", "addLockConfig.json");
fs.ensureDirSync(path.dirname(DATA_FILE));

// ── استخدم global لمنع فقدان الحالة عند hot-reload ─────────────────────────
if (!global._addLockConfig) {
  try {
    global._addLockConfig = fs.existsSync(DATA_FILE)
      ? JSON.parse(fs.readFileSync(DATA_FILE, "utf8"))
      : {};
  } catch (_) { global._addLockConfig = {}; }
}

function loadConfig() { return global._addLockConfig; }
function saveConfig(cfg) {
  global._addLockConfig = cfg;
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(cfg, null, 2)); } catch (_) {}
}

// ── صلاحيات ──────────────────────────────────────────────────────────────────
function isBotAdmin(id) {
  const cfg = global.GoatBot?.config || {};
  const sid = String(id);
  return [cfg.ownerID, ...(cfg.superAdminBot || []), ...(cfg.adminBot || [])]
    .filter(Boolean).map(String).includes(sid);
}

// ── استخراج UID من رابط فيسبوك ──────────────────────────────────────────────
function extractUID(raw) {
  const s = String(raw || "").trim();
  // رقم مباشر
  if (/^\d{8,20}$/.test(s)) return s;
  // profile.php?id=123
  const m1 = s.match(/profile\.php\?[^"]*id=(\d+)/);
  if (m1) return m1[1];
  // /100xxx (id في المسار)
  const m2 = s.match(/facebook\.com\/(\d{8,20})\/?/);
  if (m2) return m2[1];
  return null; // اسم مستخدم — سنتعامل معه لاحقاً
}

// ── محاولة حل username إلى UID عبر HTTP ─────────────────────────────────────
async function resolveUsername(raw) {
  const uid = extractUID(raw);
  if (uid) return uid;
  // استخراج username
  const m = String(raw).match(/facebook\.com\/([^/?#]+)/);
  if (!m) return null;
  const username = m[1].replace(/^@/, "");
  if (["profile.php", "groups", "pages", "events"].includes(username)) return null;
  try {
    const r = await axios.get(`https://www.facebook.com/${username}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
      timeout: 10000, maxRedirects: 3,
    });
    const m2 = r.data.match(/"userID":"(\d+)"|"USER_ID":"(\d+)"|entity_id["\s:]+(\d{8,})/);
    if (m2) return m2[1] || m2[2] || m2[3];
  } catch (_) {}
  return null;
}

// ── إضافة مستخدم للمجموعة ────────────────────────────────────────────────────
async function addUserToGroup(api, uid, tid) {
  return new Promise((resolve, reject) => {
    api.addUserToGroup(uid, tid, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ── معالج حدث مغادرة الغروب ─────────────────────────────────────────────────
function isLeaveEvent(event) {
  const t = event.logMessageType || event.type || "";
  return (
    t === "log:unsubscribe" ||
    t === "log:thread-remove-members" ||
    (t === "event" && (
      event.logMessageType === "log:unsubscribe" ||
      event.logMessageType === "log:thread-remove-members"
    ))
  );
}

function getLeftUID(event) {
  const d = event.logMessageData || {};
  return String(
    d.leftParticipantFbId ||
    d.removedParticipantFbId ||
    (Array.isArray(d.removed_participants) ? d.removed_participants[0] : null) ||
    (Array.isArray(d.participants)         ? d.participants[0]         : null) ||
    ""
  ).trim();
}

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  config: {
    name: "addlock",
    aliases: ["قفل-الأعضاء", "memberlock"],
    version: "1.0",
    author: "DJAMEL",
    countDown: 5,
    role: 2,
    category: "management",
    description: "قفل عدد أعضاء المجموعة — يُضاف حساب تلقائياً عند مغادرة أي شخص",
    guide: {
      en:
        "{pn} [id] [link1] [link2] ... — ضبط روابط لمجموعة\n" +
        "{pn} on  — تفعيل للمجموعة الحالية\n" +
        "{pn} off — إيقاف للمجموعة الحالية\n" +
        "{pn} status — عرض الحالة\n" +
        "{pn} list   — كل المجموعات المضبوطة\n" +
        "{pn} clear  — مسح روابط المجموعة الحالية",
    },
  },

  onStart: async function ({ api, event, args, message }) {
    if (!isBotAdmin(event.senderID))
      return message.reply("⛔ هذا الأمر للمالك والأدمن فقط.");

    const tid = String(event.threadID);
    const cfg = loadConfig();
    const sub = (args[0] || "").toLowerCase();

    // ── /addlock on ───────────────────────────────────────────────────────
    if (sub === "on" || sub === "تفعيل") {
      if (!cfg[tid]?.links?.length)
        return message.reply(
          "⚠️ لا توجد روابط لهذه المجموعة بعد.\n" +
          `استخدم: /addlock ${tid} [رابط1] [رابط2]`
        );
      cfg[tid].enabled = true;
      saveConfig(cfg);
      return message.reply(
        "╔══════════════════════════════╗\n" +
        "║  ✅ تم تفعيل AddLock         ║\n" +
        "╠══════════════════════════════╣\n" +
        `║  الروابط: ${cfg[tid].links.length} حساب              ║\n` +
        "║  عند مغادرة أي عضو سيُضاف  ║\n" +
        "║  أحد حساباتك تلقائياً      ║\n" +
        "╚══════════════════════════════╝"
      );
    }

    // ── /addlock off ──────────────────────────────────────────────────────
    if (sub === "off" || sub === "إيقاف") {
      if (cfg[tid]) { cfg[tid].enabled = false; saveConfig(cfg); }
      return message.reply(
        "╔══════════════════════════════╗\n" +
        "║  🔓 تم إيقاف AddLock         ║\n" +
        "╚══════════════════════════════╝"
      );
    }

    // ── /addlock status ───────────────────────────────────────────────────
    if (sub === "status" || sub === "حالة") {
      const data  = cfg[tid];
      const state = data?.enabled ? "✅ مفعّل" : "⏹ موقوف";
      const count = data?.links?.length || 0;
      return message.reply(
        "╔══════════════════════════════╗\n" +
        "║  🔒 AddLock — الحالة         ║\n" +
        "╠══════════════════════════════╣\n" +
        `║  الحالة : ${state.padEnd(18)}║\n` +
        `║  الروابط: ${String(count).padEnd(18)}║\n` +
        (count
          ? data.links.map((l, i) => `║  ${i + 1}. ${String(l).slice(0, 26)}\n`).join("")
          : "║  لا توجد روابط مضبوطة      ║\n") +
        "╚══════════════════════════════╝"
      );
    }

    // ── /addlock clear ────────────────────────────────────────────────────
    if (sub === "clear" || sub === "مسح") {
      delete cfg[tid];
      saveConfig(cfg);
      return message.reply("✅ تم مسح إعدادات AddLock لهذه المجموعة.");
    }

    // ── /addlock list ─────────────────────────────────────────────────────
    if (sub === "list" || sub === "قائمة") {
      const entries = Object.entries(cfg);
      if (!entries.length)
        return message.reply("📋 لا توجد مجموعات مضبوطة في AddLock.");
      const lines = [
        "╔══════════════════════════════╗",
        "║  📋 AddLock — المجموعات      ║",
        "╠══════════════════════════════╣",
      ];
      for (const [id, data] of entries) {
        lines.push(`║  ${(data?.enabled ? "✅" : "⏹")} ID: ${id}`);
        lines.push(`║     روابط: ${data?.links?.length || 0}`);
      }
      lines.push("╚══════════════════════════════╝");
      return message.reply(lines.join("\n"));
    }

    // ── /addlock [groupId] [link1] [link2] ... ────────────────────────────
    // المعامل الأول إما ID المجموعة أو رابط أول
    let targetTid = tid;
    let linkArgs  = args.slice(1);

    // إذا بدأ المعامل الأول برقم طويل فهو groupId
    if (/^\d{10,20}$/.test(args[0] || "")) {
      targetTid = args[0];
      linkArgs  = args.slice(1);
    } else if (args[0]) {
      // كل المعاملات روابط للمجموعة الحالية
      linkArgs = args;
    }

    if (!linkArgs.length) {
      return message.reply(
        "╔══════════════════════════════════════╗\n" +
        "║  🔒 AddLock — تعليمات الاستخدام      ║\n" +
        "╠══════════════════════════════════════╣\n" +
        "║  ضبط روابط:                          ║\n" +
        "║  /addlock [id] [رابط1] [رابط2]       ║\n" +
        "║  أو في الغروب الحالي:               ║\n" +
        "║  /addlock [رابط1] [رابط2]            ║\n" +
        "╠══════════════════════════════════════╣\n" +
        "║  /addlock on     — تفعيل             ║\n" +
        "║  /addlock off    — إيقاف             ║\n" +
        "║  /addlock status — الحالة            ║\n" +
        "║  /addlock list   — كل المجموعات     ║\n" +
        "╚══════════════════════════════════════╝"
      );
    }

    message.react("⏳", event.messageID);

    // معالجة الروابط
    const resolvedLinks = [];
    const failedLinks   = [];

    for (const raw of linkArgs) {
      const uid = await resolveUsername(raw);
      if (uid) resolvedLinks.push({ raw, uid });
      else     failedLinks.push(raw);
    }

    if (!resolvedLinks.length) {
      message.react("❌", event.messageID);
      return message.reply(
        "❌ لم يتم حل أي رابط إلى UID.\n" +
        "تأكد من الروابط أو استخدم UID مباشرة (أرقام فقط)."
      );
    }

    if (!cfg[targetTid]) cfg[targetTid] = { enabled: false, links: [], index: 0 };
    cfg[targetTid].links = resolvedLinks.map(l => l.uid);
    cfg[targetTid].index = 0;
    saveConfig(cfg);

    message.react("✅", event.messageID);
    const lines = [
      "╔══════════════════════════════╗",
      "║  ✅ تم ضبط AddLock           ║",
      "╠══════════════════════════════╣",
      `║  المجموعة : ${targetTid.slice(0, 17)}`,
      `║  الحسابات : ${resolvedLinks.length}`,
    ];
    resolvedLinks.forEach((l, i) =>
      lines.push(`║  ${i + 1}. UID: ${l.uid.slice(0, 18)}`)
    );
    if (failedLinks.length)
      lines.push(`║  ⚠️ لم يُحل: ${failedLinks.length} رابط`);
    lines.push("╠══════════════════════════════╣");
    lines.push("║  استخدم /addlock on للتفعيل ║");
    lines.push("╚══════════════════════════════╝");
    return message.reply(lines.join("\n"));
  },

  // ── كشف مغادرة الأعضاء وإضافة حساب بديل ────────────────────────────────────
  onEvent: async function ({ api, event }) {
    if (!isLeaveEvent(event)) return;

    const tid    = String(event.threadID);
    const cfg    = loadConfig();
    const data   = cfg[tid];
    if (!data?.enabled || !data?.links?.length) return;

    const leftUID = getLeftUID(event);
    // لا نُضيف بديلاً إذا كان الذي غادر هو أدمن البوت
    if (leftUID && isBotAdmin(leftUID)) return;

    // اختر الحساب التالي بالدوران
    const links = data.links;
    const idx   = (data.index || 0) % links.length;
    const uid   = links[idx];

    // حدّث الفهرس للمرة القادمة
    cfg[tid].index = (idx + 1) % links.length;
    saveConfig(cfg);

    // انتظر قليلاً ثم أضف
    await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));

    try {
      await addUserToGroup(api, uid, tid);
      if (global.log) global.log.info("ADDLOCK", `✅ أُضيف UID ${uid} إلى الغروب ${tid}`);
    } catch (e) {
      if (global.log) global.log.warn("ADDLOCK", `فشل إضافة UID ${uid}: ${e.message}`);
    }
  },
};

/**
 * DAVID V1 — /badwords — فلتر الكلمات المحظورة
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 * Uses onEvent to monitor all messages in real time
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");

const DATA_FILE = path.join(process.cwd(), "database", "data", "badwords.json");

function loadData() {
  try { if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch (_) {}
  return {};
}
function saveData(d) {
  fs.ensureDirSync(path.dirname(DATA_FILE));
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}

function getThread(tid) {
  const d = loadData();
  if (!d[tid]) d[tid] = { enabled: false, words: [], warns: {} };
  return d[tid];
}
function saveThread(tid, thread) {
  const d = loadData();
  d[tid]  = thread;
  saveData(d);
}

function isAdmin(senderID, event) {
  const cfg    = global.GoatBot?.config || {};
  const admins = [...(cfg.adminBot || []), ...(cfg.superAdminBot || [])].map(String);
  if (admins.includes(String(senderID))) return true;
  const groupAdmins = (event?.adminIDs || []).map(a => String(a.id || a));
  return groupAdmins.includes(String(senderID));
}

module.exports = {
  config: {
    name: "badwords",
    aliases: ["badword", "bw", "كلماتسيئة", "فلتر"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 5,
    role: 1,
    category: "management",
    description: "فلتر الكلمات المحظورة — تحذير تلقائي + طرد عند التكرار",
    guide: {
      en: "{pn} on|off — تفعيل/إيقاف\n" +
          "{pn} add [كلمات] — إضافة كلمات محظورة\n" +
          "{pn} remove [كلمات] — حذف كلمات\n" +
          "{pn} list — عرض الكلمات\n" +
          "{pn} unwarn @شخص — إزالة تحذير"
    }
  },

  // ── أمر التحكم ────────────────────────────────────────────────────────────
  onStart: async function ({ api, event, args, message }) {
    const { senderID, threadID, mentions, messageID } = event;

    if (!isAdmin(senderID, event))
      return message.reply("⛔ هذا الأمر للمشرفين فقط.");

    const thread = getThread(threadID);
    const sub    = (args[0] || "").toLowerCase();

    // ── تفعيل / إيقاف ────────────────────────────────────────────────
    if (sub === "on" || sub === "تفعيل") {
      thread.enabled = true;
      saveThread(threadID, thread);
      return message.reply("✅ تم تفعيل فلتر الكلمات المحظورة في هذا الغروب.");
    }
    if (sub === "off" || sub === "إيقاف") {
      thread.enabled = false;
      saveThread(threadID, thread);
      return message.reply("❌ تم إيقاف فلتر الكلمات المحظورة.");
    }

    // ── إضافة كلمات ───────────────────────────────────────────────────
    if (sub === "add" || sub === "إضافة") {
      const newWords = args.slice(1).join(" ").split(/[,|،]/).map(w => w.trim().toLowerCase()).filter(w => w.length >= 2);
      if (!newWords.length) return message.reply("⚠️ أدخل كلمة أو أكثر للإضافة.");
      const added = newWords.filter(w => !thread.words.includes(w));
      thread.words = [...new Set([...thread.words, ...newWords])];
      saveThread(threadID, thread);
      return message.reply(`✅ تمت إضافة ${added.length} كلمة محظورة:\n${added.join(", ")}`);
    }

    // ── حذف كلمات ────────────────────────────────────────────────────
    if (sub === "remove" || sub === "حذف" || sub === "delete") {
      const delWords = args.slice(1).join(" ").split(/[,|،]/).map(w => w.trim().toLowerCase());
      const removed  = delWords.filter(w => thread.words.includes(w));
      thread.words   = thread.words.filter(w => !delWords.includes(w));
      saveThread(threadID, thread);
      return message.reply(`✅ تم حذف ${removed.length} كلمة:\n${removed.join(", ") || "—"}`);
    }

    // ── قائمة الكلمات ────────────────────────────────────────────────
    if (sub === "list" || sub === "قائمة") {
      if (!thread.words.length) return message.reply("📋 لا توجد كلمات محظورة في هذا الغروب.");
      return message.reply(`📋 الكلمات المحظورة (${thread.words.length}):\n${thread.words.join(", ")}`);
    }

    // ── إزالة تحذير ──────────────────────────────────────────────────
    if (sub === "unwarn") {
      const targetID = Object.keys(mentions || {})[0] || args[1];
      if (!targetID) return message.reply("⚠️ حدد الشخص المراد إزالة تحذيره.");
      delete thread.warns[String(targetID)];
      saveThread(threadID, thread);
      return message.reply(`✅ تم إزالة تحذير ${mentions?.[targetID] || targetID}`);
    }

    // ── حالة ────────────────────────────────────────────────────────
    return message.reply(
      `╔═══════════════════════════╗\n` +
      `║  🚫  فلتر الكلمات         ║\n` +
      `╠═══════════════════════════╣\n` +
      `║  الحالة: ${thread.enabled ? "✅ مفعّل" : "❌ متوقف"}\n` +
      `║  الكلمات: ${thread.words.length}\n` +
      `╠═══════════════════════════╣\n` +
      `║  on|off / add / remove    ║\n` +
      `║  list / unwarn @شخص      ║\n` +
      `╚═══════════════════════════╝`
    );
  },

  // ── مراقبة الرسائل تلقائياً ──────────────────────────────────────────────
  onEvent: async function ({ api, event }) {
    if (event.type !== "message" && event.type !== "message_reply") return;

    const { senderID, threadID, body, messageID } = event;
    if (!body || !threadID || !senderID) return;

    const thread = getThread(threadID);
    if (!thread.enabled || !thread.words.length) return;

    // تجاهل المشرفين
    if (isAdmin(senderID, event)) return;

    const msgLower = body.toLowerCase();
    const found    = thread.words.find(w => msgLower.includes(w));
    if (!found) return;

    const warnKey = String(senderID);
    thread.warns[warnKey] = (thread.warns[warnKey] || 0) + 1;
    const warnCount = thread.warns[warnKey];
    saveThread(threadID, thread);

    if (warnCount >= 2) {
      // طرد عند التحذير الثاني
      thread.warns[warnKey] = 0;
      saveThread(threadID, thread);
      try {
        await new Promise((res, rej) =>
          api.removeUserFromGroup(senderID, threadID, e => e ? rej(e) : res())
        );
        api.sendMessage(
          `⛔ تم طرد ${senderID} بسبب استخدام كلمات محظورة (${found}) مرتين.`,
          threadID
        );
      } catch (_) {
        api.sendMessage(
          `⚠️ الكلمة المحظورة "${found}" — تم رصد مخالفتك مرتين لكن البوت لا يملك صلاحية الطرد.`,
          threadID
        );
      }
    } else {
      api.sendMessage(
        `⚠️ تحذير ${warnCount}/2\nالكلمة المحظورة: "${found}"\nاستمرار المخالفة يؤدي للطرد.`,
        threadID,
        null,
        messageID
      );
    }
  }
};

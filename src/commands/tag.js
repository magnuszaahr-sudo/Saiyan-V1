/**
 * DAVID V1 — /tag — تاق مجموعات مخصصة
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 (grouptag) & adapted for DAVID engine
 * Simplified version using file-based storage (no threadsData)
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");

const DATA_FILE = path.join(process.cwd(), "database", "data", "taggroups.json");

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
  if (!d[tid]) d[tid] = {};
  return d[tid];
}
function saveThread(tid, groups) {
  const d  = loadData();
  d[tid]   = groups;
  saveData(d);
}

module.exports = {
  config: {
    name: "tag",
    aliases: ["grouptag", "grtag", "taggroup"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 5,
    role: 1,
    category: "management",
    description: "إنشاء وإدارة مجموعات تاق مخصصة",
    guide: {
      en: "{pn} add [اسم] @tag1 @tag2 — إضافة مجموعة\n" +
          "{pn} [اسم] — تاق المجموعة\n" +
          "{pn} list — عرض المجموعات\n" +
          "{pn} remove [اسم] — حذف مجموعة\n" +
          "{pn} info [اسم] — معلومات المجموعة"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, mentions } = event;
    const groups = getThread(threadID);
    const sub    = (args[0] || "list").toLowerCase();

    // ── add ───────────────────────────────────────────────────────────────
    if (sub === "add" || sub === "إضافة") {
      const groupName = args[1]?.toUpperCase();
      if (!groupName) return message.reply("⚠️ أدخل اسم المجموعة.\nمثال: /tag add TEAM @شخص1 @شخص2");
      const newIDs = Object.keys(mentions || {});
      if (!newIDs.length) return message.reply("⚠️ تاق الأشخاص المراد إضافتهم.");

      if (!groups[groupName]) groups[groupName] = [];
      const added = newIDs.filter(id => !groups[groupName].includes(id));
      groups[groupName] = [...new Set([...groups[groupName], ...newIDs])];
      saveThread(threadID, groups);
      return message.reply(
        `✅ تمت إضافة ${added.length} عضو لمجموعة "${groupName}"\n` +
        `👥 إجمالي الأعضاء: ${groups[groupName].length}`
      );
    }

    // ── list ──────────────────────────────────────────────────────────────
    if (sub === "list" || sub === "all" || sub === "قائمة") {
      const names = Object.keys(groups);
      if (!names.length) return message.reply("📋 لا توجد مجموعات تاق في هذا الغروب.\n/tag add [اسم] @أعضاء");
      const lines = ["╔══════════════════════════╗", "║  🏷️  مجموعات التاق       ║", "╠══════════════════════════╣"];
      for (const n of names) lines.push(`║  • ${n} (${groups[n].length} عضو)`);
      lines.push("╚══════════════════════════╝");
      return message.reply(lines.join("\n"));
    }

    // ── remove ────────────────────────────────────────────────────────────
    if (sub === "remove" || sub === "حذف" || sub === "delete") {
      const groupName = args[1]?.toUpperCase();
      if (!groupName || !groups[groupName]) return message.reply(`⚠️ المجموعة "${args[1] || ''}" غير موجودة.`);
      delete groups[groupName];
      saveThread(threadID, groups);
      return message.reply(`✅ تم حذف مجموعة "${groupName}"`);
    }

    // ── info ──────────────────────────────────────────────────────────────
    if (sub === "info") {
      const groupName = args[1]?.toUpperCase();
      if (!groupName || !groups[groupName]) return message.reply(`⚠️ المجموعة "${args[1] || ''}" غير موجودة.`);
      return message.reply(
        `📑 المجموعة: ${groupName}\n` +
        `👥 الأعضاء (${groups[groupName].length}):\n` +
        groups[groupName].map(id => `  • ${id}`).join("\n")
      );
    }

    // ── tag — استدعاء المجموعة ───────────────────────────────────────────
    const groupName = args[0]?.toUpperCase();
    if (!groups[groupName]) {
      return message.reply(
        `❌ المجموعة "${args[0]}" غير موجودة.\n` +
        `/tag list — عرض المجموعات المتاحة`
      );
    }

    const members = groups[groupName];
    if (!members.length) return message.reply(`⚠️ المجموعة "${groupName}" فارغة.`);

    let body = `👥 ${groupName}:`;
    const tagMentions = [];
    for (const uid of members) {
      const fromIndex = body.length;
      body += " @";
      tagMentions.push({ id: uid, tag: "@", fromIndex });
    }

    try {
      await new Promise((res, rej) =>
        api.sendMessage({ body, mentions: tagMentions }, threadID, (err) => err ? rej(err) : res())
      );
    } catch (err) {
      message.reply(`❌ فشل التاق: ${err.message?.slice(0, 60)}`);
    }
  }
};

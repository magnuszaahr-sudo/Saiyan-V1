/**
 * DAVID V1 — /rank — عرض مستوى المستخدم (نظام XP بسيط)
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");

const XP_FILE = path.join(process.cwd(), "database", "data", "xp.json");

function loadXP() {
  try { if (fs.existsSync(XP_FILE)) return JSON.parse(fs.readFileSync(XP_FILE, "utf8")); } catch (_) {}
  return {};
}
function saveXP(data) {
  fs.ensureDirSync(path.dirname(XP_FILE));
  fs.writeFileSync(XP_FILE, JSON.stringify(data, null, 2));
}
function xpToLevel(xp) { return Math.floor(Math.sqrt(xp / 10)); }
function levelToXP(lvl) { return lvl * lvl * 10; }
function progressBar(current, max, len = 10) {
  const filled = Math.round((current / max) * len);
  return "█".repeat(filled) + "░".repeat(len - filled);
}
function rankLabel(level) {
  if (level >= 50) return "💎 أسطورة";
  if (level >= 30) return "🏆 بطل";
  if (level >= 20) return "🥇 خبير";
  if (level >= 10) return "🥈 متقدم";
  if (level >= 5)  return "🥉 ماهر";
  return "🌱 مبتدئ";
}

// تسجيل XP عند كل رسالة
if (!global._davidXPActive) {
  global._davidXPActive = true;
}

module.exports = {
  config: {
    name: "rank",
    aliases: ["level", "xp", "مستوى", "رتبة"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 5,
    role: 0,
    category: "utility",
    description: "عرض مستواك وXP في الغروب",
    guide: { en: "{pn} — مستواك\n{pn} @tag — مستوى شخص آخر\n{pn} top — أعلى 5" }
  },

  onStart: async function ({ event, args, message }) {
    const { senderID, threadID, mentions } = event;
    const sub = (args[0] || "").toLowerCase();

    const xpData = loadXP();
    const key    = (uid) => `${threadID}:${uid}`;

    // ── Top 5 ──────────────────────────────────────────────────────────
    if (sub === "top" || sub === "أعلى") {
      const entries = Object.entries(xpData)
        .filter(([k]) => k.startsWith(threadID + ":"))
        .map(([k, v]) => ({ uid: k.split(":")[1], xp: v.xp || 0 }))
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 5);

      if (!entries.length) return message.reply("📊 لا توجد بيانات بعد.");

      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
      const lines  = ["╔══════════════════════════╗", "║  🏆  أعلى 5 أعضاء نشاطاً ║", "╠══════════════════════════╣"];
      entries.forEach((e, i) => {
        const lvl = xpToLevel(e.xp);
        lines.push(`║  ${medals[i]} Lv${lvl} — ${e.uid.slice(-6)} — ${e.xp} XP`);
      });
      lines.push("╚══════════════════════════╝");
      return message.reply(lines.join("\n"));
    }

    // ── مستوى شخص ─────────────────────────────────────────────────────
    const tagIDs   = Object.keys(mentions || {});
    const targetID = tagIDs[0] || senderID;
    const k        = key(targetID);

    if (!xpData[k]) xpData[k] = { xp: 0 };

    const xp       = xpData[k].xp || 0;
    const level    = xpToLevel(xp);
    const nextXP   = levelToXP(level + 1);
    const curXP    = xp - levelToXP(level);
    const neededXP = nextXP - levelToXP(level);
    const bar      = progressBar(curXP, neededXP);

    return message.reply(
      `╔══════════════════════════════╗\n` +
      `║  📊  بطاقة المستوى           ║\n` +
      `╠══════════════════════════════╣\n` +
      `║  🆔 ${targetID}\n` +
      `║  🎖  ${rankLabel(level)}\n` +
      `║  📈 المستوى : ${level}\n` +
      `║  ⭐ الـ XP   : ${xp}\n` +
      `║  [${bar}] ${curXP}/${neededXP}\n` +
      `╚══════════════════════════════╝`
    );
  },

  // تسجيل XP عند كل رسالة في الغروب
  onChat: async function ({ event }) {
    const { senderID, threadID } = event;
    if (!senderID || !threadID) return;
    const xpData = loadXP();
    const k      = `${threadID}:${senderID}`;
    if (!xpData[k]) xpData[k] = { xp: 0 };
    xpData[k].xp = (xpData[k].xp || 0) + 1;
    saveXP(xpData);
  }
};

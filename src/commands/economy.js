/**
 * DAVID V1 — /balance /daily /bet /slot — نظام الاقتصاد
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 * Commands: balance, daily, bet, slot, pay
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");

const ECON_FILE = path.join(process.cwd(), "database", "data", "economy.json");
const DAILY_BONUS   = 500;
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000;
const START_BALANCE  = 1000;

// ── File helpers ──────────────────────────────────────────────────────────────
function loadEcon() {
  try { if (fs.existsSync(ECON_FILE)) return JSON.parse(fs.readFileSync(ECON_FILE, "utf8")); } catch (_) {}
  return {};
}
function saveEcon(d) {
  fs.ensureDirSync(path.dirname(ECON_FILE));
  fs.writeFileSync(ECON_FILE, JSON.stringify(d, null, 2));
}
function getUser(uid) {
  const d  = loadEcon();
  if (!d[uid]) d[uid] = { balance: START_BALANCE, daily: 0, wins: 0, losses: 0 };
  return { data: d, user: d[uid] };
}
function saveUser(data) { saveEcon(data); }
function fmt(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

// ── Slot Machine ──────────────────────────────────────────────────────────────
const SLOT_ITEMS = ["🍒", "🍋", "🍊", "🍉", "🎰", "⭐", "🔔", "💎"];
function spin() { return SLOT_ITEMS[Math.floor(Math.random() * SLOT_ITEMS.length)]; }
function slotMultiplier(a, b, c) {
  if (a === b && b === c) {
    if (a === "💎") return 10;
    if (a === "🎰") return 7;
    if (a === "⭐") return 5;
    return 3;
  }
  if (a === b || b === c || a === c) return 1.5;
  return 0;
}

// ── Module ────────────────────────────────────────────────────────────────────
module.exports = {
  config: {
    name: "economy",
    aliases: ["balance", "bal", "daily", "bet", "slot", "pay", "رصيد", "يومي"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 3,
    role: 0,
    category: "economy",
    description: "نظام الاقتصاد: رصيد، مكافأة يومية، رهان، سلوت",
    guide: {
      en: "{pn} balance — رصيدك\n" +
          "{pn} daily   — مكافأة يومية\n" +
          "{pn} bet [مبلغ] — رهان\n" +
          "{pn} slot [مبلغ] — سلوت\n" +
          "{pn} pay @شخص [مبلغ] — تحويل"
    }
  },

  onStart: async function ({ event, args, message, api }) {
    const { senderID, mentions, messageID } = event;
    const sub = (args[0] || "balance").toLowerCase();

    // ── /balance ──────────────────────────────────────────────────────────
    if (["balance", "bal", "رصيد"].includes(sub)) {
      const targetID = Object.keys(mentions || {})[0] || senderID;
      const { data, user } = getUser(targetID);
      const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━";
      return message.reply(
        `${LINE}\n` +
        `  💰 رصيد ${targetID === senderID ? "حسابك" : mentions?.[targetID] || targetID}\n` +
        `${LINE}\n\n` +
        `  💵 الرصيد : ${fmt(user.balance)} عملة\n` +
        `  🏆 انتصارات: ${user.wins}\n` +
        `  💀 خسارات : ${user.losses}\n\n` +
        `${LINE}`
      );
    }

    // ── /daily ────────────────────────────────────────────────────────────
    if (["daily", "يومي"].includes(sub)) {
      const { data, user } = getUser(senderID);
      const now  = Date.now();
      const diff = now - (user.daily || 0);
      if (diff < DAILY_COOLDOWN) {
        const rem = DAILY_COOLDOWN - diff;
        const h   = Math.floor(rem / 3600000);
        const m   = Math.floor((rem % 3600000) / 60000);
        return message.reply(`⏳ لقد أخذت مكافأتك اليومية بالفعل.\n⏱ العودة بعد: ${h}س ${m}د`);
      }
      user.balance += DAILY_BONUS;
      user.daily    = now;
      saveUser(data);
      return message.reply(
        `╔══════════════════════════╗\n` +
        `║  🎁  المكافأة اليومية   ║\n` +
        `╠══════════════════════════╣\n` +
        `║  +${DAILY_BONUS} عملة 🪙          ║\n` +
        `║  الرصيد: ${fmt(user.balance)} عملة ║\n` +
        `╚══════════════════════════╝`
      );
    }

    // ── /bet ──────────────────────────────────────────────────────────────
    if (["bet", "رهان"].includes(sub)) {
      const amount = parseInt(args[1]);
      if (!amount || amount < 10) return message.reply("⚠️ أدخل مبلغاً صحيحاً (الحد الأدنى 10).");
      const { data, user } = getUser(senderID);
      if (user.balance < amount) return message.reply(`❌ رصيدك غير كافٍ (${fmt(user.balance)} عملة)`);

      const win = Math.random() < 0.5;
      if (win) { user.balance += amount; user.wins++; }
      else      { user.balance -= amount; user.losses++; }
      saveUser(data);

      return message.reply(
        `${win ? "✅" : "❌"} ${win ? "فزت" : "خسرت"} ${fmt(amount)} عملة!\n` +
        `💰 الرصيد الجديد: ${fmt(user.balance)} عملة`
      );
    }

    // ── /slot ─────────────────────────────────────────────────────────────
    if (["slot", "سلوت"].includes(sub)) {
      const amount = parseInt(args[1]);
      if (!amount || amount < 10) return message.reply("⚠️ أدخل مبلغاً للرهان (الحد الأدنى 10).");
      const { data, user } = getUser(senderID);
      if (user.balance < amount) return message.reply(`❌ رصيدك غير كافٍ (${fmt(user.balance)} عملة)`);

      const [a, b, c] = [spin(), spin(), spin()];
      const mult = slotMultiplier(a, b, c);
      const gain = Math.floor(amount * mult);

      user.balance -= amount;
      user.balance += gain;
      if (gain > 0) user.wins++; else user.losses++;
      saveUser(data);

      const resultLine = mult >= 3 ? "🎉 جاكبوت!" : mult > 0 ? "✅ ربح جزئي!" : "❌ خسارة";
      return message.reply(
        `╔══════════════════════════╗\n` +
        `║  🎰  سلوت               ║\n` +
        `╠══════════════════════════╣\n` +
        `║   ${a}  ${b}  ${c}          ║\n` +
        `╠══════════════════════════╣\n` +
        `║  ${resultLine}\n` +
        `║  ${gain > 0 ? `+${fmt(gain)}` : `-${fmt(amount)}`} عملة (×${mult})\n` +
        `║  الرصيد: ${fmt(user.balance)} عملة\n` +
        `╚══════════════════════════╝`
      );
    }

    // ── /pay ──────────────────────────────────────────────────────────────
    if (["pay", "تحويل"].includes(sub)) {
      const targetID = Object.keys(mentions || {})[0];
      const amount   = parseInt(args[2] || args[1]);
      if (!targetID || !amount || amount < 1)
        return message.reply("⚠️ الاستخدام: /pay @شخص [مبلغ]");
      if (String(targetID) === String(senderID))
        return message.reply("❌ لا يمكنك التحويل لنفسك.");

      const { data: d1, user: sender } = getUser(senderID);
      if (sender.balance < amount) return message.reply(`❌ رصيدك غير كافٍ (${fmt(sender.balance)} عملة)`);

      const recv = getUser(targetID);
      sender.balance -= amount;
      recv.user.balance += amount;
      recv.data[targetID] = recv.user;
      d1[senderID] = sender;
      saveEcon(d1);

      return message.reply(
        `✅ تم تحويل ${fmt(amount)} عملة 🪙\n` +
        `💰 رصيدك الجديد: ${fmt(sender.balance)}`
      );
    }

    // ── مساعدة ────────────────────────────────────────────────────────────
    const prefix = global.GoatBot?.config?.prefix || "/";
    return message.reply(
      `╔══════════════════════════════╗\n` +
      `║  💰  نظام الاقتصاد          ║\n` +
      `╠══════════════════════════════╣\n` +
      `║  ${prefix}balance — رصيدك           ║\n` +
      `║  ${prefix}daily   — مكافأة +${DAILY_BONUS}🪙   ║\n` +
      `║  ${prefix}bet [مبلغ] — رهان 50/50  ║\n` +
      `║  ${prefix}slot [مبلغ] — سلوت       ║\n` +
      `║  ${prefix}pay @شخص [مبلغ] — تحويل ║\n` +
      `╚══════════════════════════════╝`
    );
  }
};

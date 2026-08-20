/**
 * DAVID V1 — /chats — إدارة المحادثات والغروبات وطلبات المراسلة
 * Copyright © 2025 DJAMEL
 */
"use strict";

const fs   = require("fs-extra");
const path = require("path");
const ctrl = require("../utils/cmdControl");

const DM_DATA = path.join(process.cwd(), "database/data/dmLock.json");

const MANAGED_COMMANDS = [
  { name: "saiyan", label: "Saiyan — الرسائل التلقائية والهروب" },
  { name: "angel",  label: "Angel — الرسائل التلقائية" },
  { name: "nm",     label: "NM — قفل اسم الغروب" },
  { name: "nick",   label: "Nick — قفل كنيات الأعضاء" },
];
const MANAGED_COMMAND_NAMES = new Set(MANAGED_COMMANDS.map(c => c.name));

// ── التحقق من الأدمن ──────────────────────────────────────────────────────────
function isAdmin(id) {
  const cfg = global.GoatBot?.config || {};
  const supers = [...(cfg.superAdminBot || []), cfg.ownerID].filter(Boolean).map(String);
  const admins = (cfg.adminBot || []).map(String);
  return supers.includes(String(id)) || admins.includes(String(id));
}

// ── DM LOCK ──────────────────────────────────────────────────────────────────
function getDmLocked() {
  if (global.GoatBot?.dmLocked !== undefined) return !!global.GoatBot.dmLocked;
  try {
    if (fs.existsSync(DM_DATA)) {
      const data = JSON.parse(fs.readFileSync(DM_DATA, "utf8"));
      global.GoatBot.dmLocked = !!data.locked;
      return global.GoatBot.dmLocked;
    }
  } catch (_) {}
  return false;
}

function setDmLocked(value) {
  global.GoatBot.dmLocked = !!value;
  try {
    fs.ensureDirSync(path.dirname(DM_DATA));
    fs.writeFileSync(DM_DATA, JSON.stringify({ locked: !!value }, null, 2));
  } catch (_) {}
}

// ── SEND ─────────────────────────────────────────────────────────────────────
function send(api, body, threadID, callback) {
  return new Promise(resolve => {
    let settled = false;
    const finish = (error, info) => {
      if (settled) return;
      settled = true;
      if (callback) callback(error, info);
      resolve(info);
    };
    try {
      const result = api.sendMessage(body, threadID, finish);
      if (result && typeof result.then === "function") {
        result.then(info => finish(null, info)).catch(error => finish(error));
      }
    } catch (error) { finish(error); }
  });
}

// ── GET THREAD LIST ──────────────────────────────────────────────────────────
function getThreadList(api, limit, cursor, tags) {
  return new Promise(resolve => {
    let settled = false;
    const finish = (error, data) => {
      if (settled) return;
      settled = true;
      if (error) return resolve([]);
      resolve(Array.isArray(data) ? data : data?.data || []);
    };
    try {
      const result = api.getThreadList(limit, cursor, tags, finish);
      if (result && typeof result.then === "function") {
        result.then(data => finish(null, data)).catch(error => finish(error));
      } else if (Array.isArray(result)) {
        finish(null, result);
      }
    } catch (error) { finish(error); }
  });
}

// ── جلب الغروبات / الطلبات / Other ───────────────────────────────────────────
async function fetchThreads(api, tags) {
  const items = [];
  let cursor = null;
  for (let page = 0; page < 5; page++) {
    const batch = await getThreadList(api, 50, cursor, tags);
    if (!batch.length) break;
    for (const t of batch) if (t?.threadID) items.push(t);
    if (batch.length < 50) break;
    cursor = batch[batch.length - 1]?.timestamp || null;
    if (!cursor) break;
  }
  const seen = new Set();
  return items.filter(t => {
    const id = String(t.threadID);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function getAllGroups(api)         { return fetchThreads(api, ["INBOX"]).then(list => list.filter(t => t?.isGroup)); }
function getAllMessageRequests(api){ return fetchThreads(api, ["PENDING"]); }
function getAllOtherMessages(api)  { return fetchThreads(api, ["OTHER"]); }

// ── أسماء المحادثات ───────────────────────────────────────────────────────────
function threadName(t) {
  return t.name || t.threadName || t.senderName || t.snippet || `مستخدم ${t.threadID}`;
}

// ── حالة الأوامر ──────────────────────────────────────────────────────────────
function commandStatus(tid, cmd) {
  return ctrl.isEnabled(tid, cmd) ? "🟢 مفعل" : "⚫ معطل";
}

// ── مغادرة الغروب ─────────────────────────────────────────────────────────────
async function leaveGroup(api, threadID) {
  const tid = String(threadID);
  const botID = String(api.getCurrentUserID?.() || global.GoatBot?.botID || "");
  
  try {
    await send(api, "🚪 جاري مغادرة المجموعة بواسطة الأدمن...", tid);
  } catch (_) {}

  return new Promise(resolve => {
    try {
      if (typeof api.removeUserFromGroup === "function") {
        api.removeUserFromGroup(botID, tid, (err) => resolve(!err));
      } else {
        resolve(false);
      }
    } catch (_) {
      resolve(false);
    }
  });
}

// ── REPLY SYSTEM ──────────────────────────────────────────────────────────────
function registerReply(api, event, state, callback) {
  if (!state?.messageID || !global.GoatBot?.onReply) return;
  const key = `chats_${state.messageID}`;
  global.GoatBot.onReply.set(key, {
    messageID: state.messageID,
    author: String(event.senderID),
    ts: Date.now(),
    callback: async ({ api: rApi, event: rEv, message }) => {
      if (String(rEv.senderID) !== String(event.senderID)) return;
      await callback({
        api: rApi, event: rEv, message, state,
        input: String(rEv.body || "").trim(),
      });
    },
  });
}

async function sendReplyMenu(api, event, body, state, callback) {
  await send(api, body, event.threadID, (_e, info) => {
    if (info?.messageID) registerReply(api, event, { ...state, messageID: info.messageID }, callback);
  });
}

// ── قبول المحادثة ─────────────────────────────────────────────────────────────
async function acceptConversation(api, threadID) {
  const tid = String(threadID);
  let accepted = false, acceptError = null;
  try {
    if (typeof api.handleMessageRequest === "function") {
      await new Promise(resolve => {
        let done = false;
        const finish = (error) => {
          if (done) return;
          done = true;
          if (error) acceptError = error; else accepted = true;
          resolve();
        };
        try {
          const result = api.handleMessageRequest(tid, true, finish);
          if (result && typeof result.then === "function") {
            result.then(() => finish(null)).catch(finish);
          }
        } catch (e) { finish(e); }
      });
    }
  } catch (e) { acceptError = e; }

  let helloSent = false, helloError = null;
  try {
    await new Promise(resolve => {
      let done = false;
      const finish = (error) => {
        if (done) return;
        done = true;
        if (error) helloError = error; else helloSent = true;
        resolve();
      };
      try {
        const result = api.sendMessage("اهلاً", tid, finish);
        if (result && typeof result.then === "function") {
          result.then(() => finish(null)).catch(finish);
        }
      } catch (e) { finish(e); }
    });
  } catch (e) { helloError = e; }

  return { accepted, acceptError, helloSent, helloError };
}

// ── القوائم ──────────────────────────────────────────────────────────────────
function buildMainMenu() {
  return (
    "🛠️ إدارة المحادثات\n" +
    "━━━━━━━━━━━━━━━━\n" +
    "1️⃣ 👥 الغروبات\n" +
    "2️⃣ 📩 طلبات المراسلة\n" +
    "3️⃣ 🚨 غير مهم / Spam\n" +
    "4️⃣ 📊 إحصائيات المحادثات\n" +
    "5️⃣ 🔒 حالة DM Lock\n" +
    "━━━━━━━━━━━━━━━━\n" +
    "↩️ رد برقم الخيار"
  );
}

function buildGroupList(groups) {
  let body = `👥 الغروبات (${groups.length})\n━━━━━━━━━━━━━━━━\n`;
  groups.slice(0, 30).forEach((g, i) => {
    body += `${i + 1}. ${threadName(g)}\n   🆔 ${g.threadID}\n\n`;
  });
  body += "━━━━━━━━━━━━━━━━\n↩️ رد برقم الغروب لإدارته\n0️⃣ العودة";
  return body;
}

function buildRequestList(requests, emoji, title) {
  let body = `${emoji} ${title} (${requests.length})\n━━━━━━━━━━━━━━━━\n`;
  requests.slice(0, 30).forEach((r, i) => {
    body += `${i + 1}. ${threadName(r)}\n   🆔 ${r.threadID}\n`;
    if (r.snippet) body += `   💬 ${String(r.snippet).slice(0, 80)}\n`;
    body += "\n";
  });
  body += "━━━━━━━━━━━━━━━━\n📌 اختر رقم لإدارته.\n0️⃣ العودة";
  return body;
}

function buildRequestDetails(request, emoji, title) {
  return (
    `${emoji} ${title}\n` +
    "━━━━━━━━━━━━━━━━\n" +
    `👤 الاسم: ${threadName(request)}\n` +
    `🆔 Thread ID: ${request.threadID}\n` +
    (request.snippet ? `💬 الرسالة: ${request.snippet}\n` : "") +
    "━━━━━━━━━━━━━━━━\n" +
    "1️⃣ ✅ قبول وإرسال اهلاً\n" +
    "0️⃣ ↩️ العودة"
  );
}

function buildGroupActions(group) {
  const tid = String(group.threadID);
  let body = `👥 ${threadName(group)}\n🆔 ${tid}\n━━━━━━━━━━━━━━━━\n`;
  MANAGED_COMMANDS.forEach((c, i) => {
    body += `${i + 1}. /${c.name} — ${commandStatus(tid, c.name)}\n`;
  });
  body += `${MANAGED_COMMANDS.length + 1}. 📝 إرسال أمر مخصص\n`;
  body += `${MANAGED_COMMANDS.length + 2}. 🚪 مغادرة الغروب\n`;
  body += "━━━━━━━━━━━━━━━━\n↩️ رد برقم الخيار\n0️⃣ العودة إلى قائمة الغروبات";
  return body;
}

function buildCommandPrompt(group) {
  return (
    `✅ تم اختيار الغروب: ${threadName(group)}\n` +
    `🆔 ${group.threadID}\n` +
    "━━━━━━━━━━━━━━━━\n" +
    "أرسل الآن الأمر الذي تريد تفعيله في هذا الغروب بالرد على هذه الرسالة:\n\n" +
    "• /saiyan [الرسالة] [min] [max]\n" +
    "• /angel [الرسالة] [min] [max]\n" +
    "• /nm [الاسم] [min] [max]\n" +
    "• /nick [الاسم]\n\n" +
    "0️⃣ إلغاء"
  );
}

// ── تنفيذ الأمر في غروب آخر ───────────────────────────────────────────────────
function parseManagedCommand(input) {
  const prefix = global.GoatBot?.config?.prefix || "/";
  const raw = String(input || "").trim();
  if (!raw.startsWith(prefix)) return null;
  const parts = raw.slice(prefix.length).trim().split(/\s+/).filter(Boolean);
  const name = String(parts.shift() || "").toLowerCase();
  if (!MANAGED_COMMAND_NAMES.has(name)) return null;
  const command = global.GoatBot?.commands?.get(name);
  if (!command?.onStart) return null;
  return { name, args: parts, command };
}

function buildRemoteMessage(api, targetEvent) {
  return {
    reply: (body, cb) => send(api, body, targetEvent.threadID, cb),
    unsend: (mid, cb) => { try { return api.unsendMessage(mid || targetEvent.messageID, cb); } catch (_) {} },
    react: (emoji, mid, cb) => { try { return api.setMessageReaction(emoji, mid || targetEvent.messageID, cb || (() => {}), true); } catch (_) {} },
    send: (body, tid, cb) => send(api, body, tid || targetEvent.threadID, cb),
  };
}

async function executeRemoteCommand(api, sourceEvent, sourceMessage, group, input) {
  const parsed = parseManagedCommand(input);
  if (!parsed) {
    return sourceMessage.reply(
      "❌ أمر غير مدعوم.\nالأوامر المتاحة:\n/saiyan [رسالة] [min] [max]\n/angel [رسالة] [min] [max]\n/nm [اسم] [min] [max]\n/nick [اسم]\nأرسل 0 للإلغاء."
    );
  }
  const targetThreadID = String(group.threadID);
  ctrl.setCommandEnabled(targetThreadID, parsed.name, true);
  const targetEvent = {
    ...sourceEvent, type: "message",
    messageID: `chats_remote_${Date.now()}`,
    threadID: targetThreadID, isGroup: true,
    body: String(input).trim(),
  };
  try {
    await parsed.command.onStart({
      api, event: targetEvent, args: parsed.args, commandName: parsed.name,
      message: buildRemoteMessage(api, targetEvent),
      prefix: global.GoatBot?.config?.prefix || "/",
      role: 2, senderID: sourceEvent.senderID, threadID: targetThreadID,
    });
    return sourceMessage.reply(
      `✅ تم إرسال /${parsed.name} إلى غروب "${threadName(group)}".\nيمكنك إرسال أمر آخر بالرد على رسالة الغروب نفسها.`
    );
  } catch (error) {
    global.log?.error?.("CHATS_REMOTE", `فشل تنفيذ /${parsed.name}: ${error.message}`);
    return sourceMessage.reply(`❌ تعذر تنفيذ /${parsed.name} في غروب "${threadName(group)}": ${error.message}`);
  }
}

// ── التنقل بين القوائم ───────────────────────────────────────────────────────
async function showGroupCommandPrompt(api, event, group) {
  return sendReplyMenu(api, event, buildCommandPrompt(group), { step: "COMMAND_INPUT", group },
    async ({ api: rApi, event: rEv, message, state, input }) => {
      if (input === "0") return message.reply("✅ تم إلغاء التحكم بالغروب.");
      return executeRemoteCommand(rApi, event, message, state.group, input);
    });
}

async function showGroupActions(api, event, group) {
  return sendReplyMenu(api, event, buildGroupActions(group), { step: "GROUP_ACTION", group },
    async ({ api: rApi, event: rEv, message: m, state, input }) => {
      if (input === "0") return showGroups(rApi, rEv);
      const idx = Number.parseInt(input, 10) - 1;
      
      // تبديل حالة الأوامر المدارة
      if (Number.isInteger(idx) && idx >= 0 && idx < MANAGED_COMMANDS.length) {
        const cmd = MANAGED_COMMANDS[idx];
        const enabled = !ctrl.isEnabled(state.group.threadID, cmd.name);
        ctrl.setCommandEnabled(state.group.threadID, cmd.name, enabled);
        return showGroupActions(rApi, rEv, state.group).then(() =>
          m.reply(`✅ تم ${enabled ? "تفعيل" : "تعطيل"} /${cmd.name} في "${threadName(state.group)}"`)
        );
      }

      // إرسال أمر مخصص
      if (idx === MANAGED_COMMANDS.length) {
        return showGroupCommandPrompt(rApi, rEv, state.group);
      }

      // مغادرة الغروب
      if (idx === MANAGED_COMMANDS.length + 1) {
        const success = await leaveGroup(rApi, state.group.threadID);
        if (success) {
          return m.reply(`✅ تم خروج البوت من الغروب "${threadName(state.group)}" بنجاح.`);
        } else {
          return m.reply(`❌ تعذر خروج البوت من الغروب "${threadName(state.group)}". تحقق من الصلاحيات.`);
        }
      }

      return m.reply(`❌ رقم غير صحيح. اختر من 1 إلى ${MANAGED_COMMANDS.length + 2} أو 0 للعودة.`);
    });
}

async function showGroups(api, event) {
  const groups = await getAllGroups(api);
  if (!groups.length) return send(api, "📭 لم أجد غروبات يديرها البوت حالياً.", event.threadID);
  return sendReplyMenu(api, event, buildGroupList(groups), { step: "GROUP_LIST", groups },
    async ({ api: rApi, event: rEv, message, state, input }) => {
      if (input === "0") return showMainMenu(rApi, rEv);
      const idx = Number.parseInt(input, 10) - 1;
      if (!Number.isInteger(idx) || idx < 0 || idx >= Math.min(state.groups.length, 30))
        return message.reply(`❌ رقم غير صحيح. اختر من 1 إلى ${Math.min(state.groups.length, 30)}.`);
      return showGroupActions(rApi, rEv, state.groups[idx]);
    });
}

async function showRequestList(api, event, fetcher, emoji, title, stepPrefix) {
  const items = await fetcher(api);
  if (!items.length) {
    return sendReplyMenu(api, event,
      `${emoji} ${title}\n━━━━━━━━━━━━━━━━\n📭 لا توجد ${title} حالياً.\n━━━━━━━━━━━━━━━━\n0️⃣ العودة`,
      { step: `${stepPrefix}_EMPTY` },
      async ({ api: rApi, event: rEv, message, input }) => {
        if (input === "0") return showMainMenu(rApi, rEv);
        return message.reply("❌ اختر 0 للعودة.");
      });
  }
  return sendReplyMenu(api, event, buildRequestList(items, emoji, title), { step: `${stepPrefix}_LIST`, items },
    async ({ api: rApi, event: rEv, message, state, input }) => {
      if (input === "0") return showMainMenu(rApi, rEv);
      const idx = Number.parseInt(input, 10) - 1;
      if (!Number.isInteger(idx) || idx < 0 || idx >= Math.min(state.items.length, 30))
        return message.reply(`❌ رقم غير صحيح. اختر من 1 إلى ${Math.min(state.items.length, 30)}.`);
      const selected = state.items[idx];
      return sendReplyMenu(rApi, rEv, buildRequestDetails(selected, emoji, title),
        { step: `${stepPrefix}_DETAILS`, items: state.items, selected },
        async ({ api: dApi, event: dEv, message: dMsg, state: dState, input: dInput }) => {
          if (dInput === "0") return showRequestList(dApi, dEv, fetcher, emoji, title, stepPrefix);
          if (dInput === "1" || dInput.toLowerCase() === "قبول" || dInput.toLowerCase() === "accept") {
            const result = await acceptConversation(dApi, dState.selected.threadID);
            if (result.helloSent) return dMsg.reply("✅ تم قبول المحادثة.\n👋 تم إرسال: اهلاً");
            return dMsg.reply(
              "⚠️ تمت محاولة قبول المحادثة، لكن تعذر إرسال «اهلاً».\n" +
              (result.helloError?.message || "تحقق من صلاحيات الحساب أو اتصال البوت.")
            );
          }
          return dMsg.reply("❌ اختيار غير صحيح.\n1️⃣ قبول\n0️⃣ العودة");
        });
    });
}

function showMessageRequests(api, event) {
  return showRequestList(api, event, getAllMessageRequests, "📩", "طلبات المراسلة", "REQUESTS");
}
function showOtherMessages(api, event) {
  return showRequestList(api, event, getAllOtherMessages, "🚨", "غير مهم / Spam", "OTHER");
}

async function acceptByThreadID(api, event, message, threadID) {
  const tid = String(threadID || "").trim();
  if (!tid) return message.reply("❌ يجب تحديد Thread ID.\n\nمثال:\n/chats accept 123456789");
  const result = await acceptConversation(api, tid);
  if (result.helloSent) return message.reply(`✅ تم قبول المحادثة بنجاح.\n🆔 ${tid}\n👋 تم إرسال: اهلاً`);
  return message.reply(
    "⚠️ تمت محاولة قبول المحادثة، لكن تعذر إرسال «اهلاً».\n" +
    (result.helloError?.message || result.acceptError?.message || "حدث خطأ غير معروف.")
  );
}

async function showChatCount(api, event) {
  const threads = await getThreadList(api, 50, null, ["INBOX"]);
  const groups = threads.filter(t => t?.isGroup);
  const dms = threads.filter(t => !t?.isGroup);
  const requests = await getAllMessageRequests(api);
  const other = await getAllOtherMessages(api);
  return sendReplyMenu(api, event,
    `📊 إحصائيات المحادثات\n━━━━━━━━━━━━━━━━\n` +
    `👥 غروبات: ${groups.length}\n` +
    `💬 محادثات خاصة: ${dms.length}\n` +
    `📩 طلبات مراسلة: ${requests.length}\n` +
    `🚨 غير مهم / Other: ${other.length}\n` +
    `🔒 DM Lock: ${getDmLocked() ? "مفعل" : "معطل"}\n` +
    "━━━━━━━━━━━━━━━━\n0️⃣ العودة",
    { step: "CHAT_COUNT" },
    async ({ api: rApi, event: rEv, message, input }) => {
      if (input === "0") return showMainMenu(rApi, rEv);
      return message.reply("❌ اختر 0 للعودة.");
    });
}

async function showMainMenu(api, event) {
  return sendReplyMenu(api, event, buildMainMenu(), { step: "MAIN_MENU" },
    async ({ api: rApi, event: rEv, message, input }) => {
      if (input === "1") return showGroups(rApi, rEv);
      if (input === "2") return showMessageRequests(rApi, rEv);
      if (input === "3") return showOtherMessages(rApi, rEv);
      if (input === "4") return showChatCount(rApi, rEv);
      if (input === "5") {
        return message.reply(
          `🔒 DM Lock: ${getDmLocked() ? "🟢 مفعل" : "⚫ معطل"}\n\nاستخدم:\n/chats dm on\n/chats dm off`
        );
      }
      return message.reply("❌ اختيار غير صحيح. اختر من 1 إلى 5.");
    });
}

// ── MODULE ────────────────────────────────────────────────────────────────────
module.exports = {
  config: {
    name: "chats",
    aliases: ["محادثات", "chat"],
    version: "4.5",
    author: "DJAMEL",
    countDown: 3,
    role: 2,
    category: "management",
    description: "إدارة المحادثات والغروبات وطلبات المراسلة والمحادثات غير المهمة وقبولها وإرسال الترحيب والمغادرة",
    guide: {
      en:
        "{pn} — القائمة الرئيسية\n" +
        "{pn} list — قائمة الغروبات\n" +
        "{pn} requests — طلبات المراسلة\n" +
        "{pn} leave THREAD_ID — مغادرة غروب معين\n" +
        "{pn} accept THREAD_ID — قبول محادثة وإرسال اهلاً\n" +
        "{pn} count — إحصائيات المحادثات\n" +
        "{pn} dm on/off — قفل أو فتح الخاص",
    },
  },

  onStart: async function ({ api, event, args, message }) {
    if (!isAdmin(event.senderID)) return message.reply("⛔ للأدمن فقط.");

    const sub = String(args[0] || "").toLowerCase();

    // DM LOCK
    if (sub === "dm") {
      const action = String(args[1] || "").toLowerCase();
      if (action === "on")  { setDmLocked(true);  return message.reply("✅ تم تفعيل DM Lock — البوت لن يرد على الرسائل الخاصة."); }
      if (action === "off") { setDmLocked(false); return message.reply("✅ تم إلغاء DM Lock."); }
      return message.reply(`🔒 DM Lock: ${getDmLocked() ? "مفعل" : "معطل"}\nاستخدم: /chats dm on/off`);
    }

    // قبول مباشر
    if (sub === "accept" || sub === "قبول") {
      return acceptByThreadID(api, event, message, args[1]);
    }

    // مغادرة غروب عبر المعرف مباشرة
    if (sub === "leave" || sub === "مغادرة" || sub === "خروج") {
      const tid = args[1];
      if (!tid) return message.reply("❌ يرجى كتابة معرف الغروب Thread ID.\nمثال: /chats leave 123456789");
      const success = await leaveGroup(api, tid);
      if (success) return message.reply(`✅ تم خروج البوت من الغروب (${tid}) بنجاح.`);
      return message.reply(`❌ تعذر خروج البوت من الغروب (${tid}).`);
    }

    // إحصائيات
    if (sub === "count") return showChatCount(api, event);

    // طلبات المراسلة
    if (sub === "requests" || sub === "pending" || sub === "طلبات") return showMessageRequests(api, event);

    // Other / Spam
    if (sub === "other" || sub === "spam" || sub === "غيرمهم") return showOtherMessages(api, event);

    // الغروبات
    if (sub === "list" || sub === "groups") return showGroups(api, event);

    // القائمة الرئيسية
    if (!sub) return showMainMenu(api, event);

    // الاستخدام
    return message.reply(
      "📌 الاستخدام:\n" +
      "/chats — القائمة الرئيسية\n" +
      "/chats list — الغروبات\n" +
      "/chats leave [Thread ID] — مغادرة غروب معين\n" +
      "/chats requests — طلبات المراسلة\n" +
      "/chats other — غير مهم / Spam\n" +
      "/chats accept [Thread ID] — قبول وإرسال اهلاً\n" +
      "/chats count — الإحصائيات\n" +
      "/chats dm on/off"
    );
  },

  onReply: async function () {},
};

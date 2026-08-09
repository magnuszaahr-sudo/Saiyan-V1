/**
 * DAVID V1 — /chats — إدارة المحادثات والغروبات
 * Copyright © 2025 DJAMEL
 *
 * The group-management flow is inspired by the local WHITE-V3 reference
 * script, but uses David's per-thread command-control store instead of
 * executing arbitrary commands remotely.
 */
"use strict";

const fs = require("fs-extra");
const path = require("path");

const DM_DATA = path.join(process.cwd(), "database/data/dmLock.json");
const ctrl = require("../utils/cmdControl");

// These are the management commands requested for cross-group control.
// More commands can be added here without changing the reply flow.
const MANAGED_COMMANDS = [
  { name: "angel", label: "Angel — الرسائل التلقائية" },
  { name: "nm",    label: "NM — قفل اسم الغروب" },
  { name: "nick",  label: "Nick — قفل كنيات الأعضاء" },
];

function isAdmin(id) {
  return (global.GoatBot?.config?.adminBot || [])
    .map(String)
    .includes(String(id));
}

function getDmLocked() {
  if (global.GoatBot.dmLocked !== undefined) return !!global.GoatBot.dmLocked;
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
    } catch (error) {
      finish(error);
    }
  });
}

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
    } catch (error) {
      finish(error);
    }
  });
}

async function getAllGroups(api) {
  const groups = [];
  let cursor = null;

  for (let page = 0; page < 5; page++) {
    const batch = await getThreadList(api, 50, cursor, ["INBOX"]);
    if (!batch.length) break;

    for (const thread of batch) {
      if (thread?.isGroup && thread.threadID) groups.push(thread);
    }

    if (batch.length < 50) break;
    const last = batch[batch.length - 1];
    cursor = last?.timestamp || null;
    if (!cursor) break;
  }

  const seen = new Set();
  return groups.filter(group => {
    const id = String(group.threadID);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function groupName(group) {
  return group.name || group.threadName || `غروب ${group.threadID}`;
}

function commandStatus(tid, command) {
  return ctrl.isEnabled(tid, command) ? "🟢 مفعل" : "⚫ معطل";
}

function registerReply(api, event, state, callback) {
  if (!state?.messageID || !global.GoatBot?.onReply) return;
  const key = `chats_${state.messageID}`;
  global.GoatBot.onReply.set(key, {
    messageID: state.messageID,
    author: String(event.senderID),
    ts: Date.now(),
    callback: async ({ api: replyApi, event: replyEvent, message }) => {
      if (String(replyEvent.senderID) !== String(event.senderID)) return;
      await callback({
        api: replyApi,
        event: replyEvent,
        message,
        state,
        input: String(replyEvent.body || "").trim(),
      });
    },
  });
}

async function sendReplyMenu(api, event, body, state, callback) {
  await send(api, body, event.threadID, (_error, info) => {
    if (info?.messageID) registerReply(api, event, { ...state, messageID: info.messageID }, callback);
  });
}

function buildGroupList(groups) {
  let body = `👥 الغروبات (${groups.length})\n━━━━━━━━━━━━━━━━\n`;
  groups.slice(0, 30).forEach((group, index) => {
    body += `${index + 1}. ${groupName(group)}\n   🆔 ${group.threadID}\n\n`;
  });
  body += "━━━━━━━━━━━━━━━━\n↩️ رد برقم الغروب لإدارة أوامره";
  return body;
}

function buildGroupActions(group) {
  const tid = String(group.threadID);
  let body = `👥 ${groupName(group)}\n🆔 ${tid}\n`;
  body += "━━━━━━━━━━━━━━━━\n";
  MANAGED_COMMANDS.forEach((command, index) => {
    body += `${index + 1}. /${command.name} — ${commandStatus(tid, command.name)}\n`;
  });
  body += "━━━━━━━━━━━━━━━━\n";
  body += "↩️ رد برقم الأمر لتبديل حالته\n";
  body += "0️⃣ العودة إلى قائمة الغروبات";
  return body;
}

async function showGroupActions(api, event, group) {
  return sendReplyMenu(
    api,
    event,
    buildGroupActions(group),
    { step: "GROUP_ACTION", group },
    async ({ api: actionApi, event: actionEvent, message: actionMessage, state: actionState, input: actionInput }) => {
      if (actionInput === "0") return showGroups(actionApi, actionEvent);

      const commandIndex = Number.parseInt(actionInput, 10) - 1;
      if (!Number.isInteger(commandIndex) || commandIndex < 0 || commandIndex >= MANAGED_COMMANDS.length) {
        return actionMessage.reply(`❌ رقم غير صحيح. اختر من 1 إلى ${MANAGED_COMMANDS.length} أو 0 للعودة.`);
      }

      const command = MANAGED_COMMANDS[commandIndex];
      const enabled = !ctrl.isEnabled(actionState.group.threadID, command.name);
      ctrl.setCommandEnabled(actionState.group.threadID, command.name, enabled);

      return showGroupActions(
        actionApi,
        actionEvent,
        actionState.group,
      ).then(() => actionMessage.reply(
        `✅ تم ${enabled ? "تفعيل" : "تعطيل"} /${command.name} في "${groupName(actionState.group)}"`
      ));
    }
  );
}

async function showGroups(api, event) {
  const groups = await getAllGroups(api);
  if (!groups.length) {
    return send(api, "📭 لم أجد غروبات يديرها البوت حالياً.", event.threadID);
  }

  return sendReplyMenu(api, event, buildGroupList(groups), { step: "GROUP_LIST", groups }, async ({
    api: replyApi,
    event: replyEvent,
    message,
    state,
    input,
  }) => {
    if (input === "0") return message.reply("✅ تم إلغاء إدارة الغروبات.");
    const index = Number.parseInt(input, 10) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= Math.min(state.groups.length, 30)) {
      return message.reply(`❌ رقم غير صحيح. اختر من 1 إلى ${Math.min(state.groups.length, 30)}.`);
    }

    const selected = state.groups[index];
    return showGroupActions(replyApi, replyEvent, selected);
  });
}

module.exports = {
  config: {
    name: "chats",
    aliases: ["محادثات", "chat"],
    version: "3.0",
    author: "DJAMEL",
    countDown: 3,
    role: 2,
    category: "management",
    description: "إدارة المحادثات والغروبات والتحكم بأوامرها",
    guide: {
      en: "{pn} — اختيار غروب والتحكم في Angel وNM وNick\n" +
          "{pn} list — قائمة الغروبات\n" +
          "{pn} dm on/off — قفل أو فتح الخاص\n" +
          "{pn} count — إحصائيات المحادثات",
    },
  },

  onStart: async function({ api, event, args, message }) {
    if (!isAdmin(event.senderID)) return message.reply("⛔ للأدمن فقط.");

    const sub = String(args[0] || "").toLowerCase();
    if (sub === "dm") {
      const action = String(args[1] || "").toLowerCase();
      if (action === "on") {
        setDmLocked(true);
        return message.reply("✅ تم تفعيل DM Lock — البوت لن يرد على الرسائل الخاصة.");
      }
      if (action === "off") {
        setDmLocked(false);
        return message.reply("✅ تم إلغاء DM Lock.");
      }
      return message.reply(`🔒 DM Lock: ${getDmLocked() ? "مفعل" : "معطل"}\nاستخدم: /chats dm on/off`);
    }

    if (sub === "count") {
      const threads = await getThreadList(api, 50, null, ["INBOX"]);
      const groups = threads.filter(thread => thread?.isGroup);
      const dms = threads.filter(thread => !thread?.isGroup);
      return message.reply(
        `📊 إحصائيات المحادثات\n━━━━━━━━━━━━━━━━\n` +
        `👥 غروبات: ${groups.length}\n` +
        `💬 محادثات خاصة: ${dms.length}\n` +
        `🔒 DM Lock: ${getDmLocked() ? "مفعل" : "معطل"}`
      );
    }

    if (sub === "list" || sub === "groups" || !sub) return showGroups(api, event);
    return message.reply("📌 الاستخدام:\n/chats — إدارة أوامر الغروبات\n/chats list\n/chats count\n/chats dm on/off");
  },

  // Kept for compatibility with command runners that call command-level replies.
  onReply: async function() {},
};
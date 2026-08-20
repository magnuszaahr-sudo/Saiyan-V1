/**
 * DAVID V1 — /magnus — تنفيذ أي أمر في مجموعة معينة بالاسم
 * Copyright © 2025 DJAMEL
 *
 * الاستخدام:
 *   /magnus [اسم المجموعة] [الأمر والمدخلات]
 * مثال:
 *   /magnus سايان groupimg https://example.com/photo.jpg
 *   /magnus سايان groupname الاسم الجديد
 */
"use strict";

// ── التحقق من الأدمن ──────────────────────────────────────────────────────────
function isAdmin(id) {
  const cfg = global.GoatBot?.config || {};
  const supers = [cfg.ownerID, ...(cfg.superAdminBot || [])].filter(Boolean).map(String);
  const admins = (cfg.adminBot || []).map(String);
  return supers.includes(String(id)) || admins.includes(String(id));
}

// ── إرسال رسالة (يدعم callback و promise) ─────────────────────────────────────
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

// ── جلب قائمة المحادثات ──────────────────────────────────────────────────────
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

// ── جلب جميع الغروبات من INBOX ───────────────────────────────────────────────
async function getAllGroups(api) {
  const groups = [];
  let cursor = null;
  for (let page = 0; page < 10; page++) {
    const batch = await getThreadList(api, 50, cursor, ["INBOX"]);
    if (!batch.length) break;
    for (const t of batch) {
      if (t?.isGroup && t.threadID) groups.push(t);
    }
    if (batch.length < 50) break;
    cursor = batch[batch.length - 1]?.timestamp || null;
    if (!cursor) break;
  }
  const seen = new Set();
  return groups.filter(g => {
    const id = String(g.threadID);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

// ── البحث عن مجموعة بالاسم ────────────────────────────────────────────────────
function findGroupByName(groups, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return null;

  // مطابقة تامة أولاً
  let match = groups.find(g => String(g.name || g.threadName || "").trim().toLowerCase() === q);
  if (match) return match;

  // مطابقة جزئية (يحتوي)
  match = groups.find(g => String(g.name || g.threadName || "").trim().toLowerCase().includes(q));
  if (match) return match;

  return null;
}

// ── بناء كائن رسالة وهمي للتنفيذ عن بُعد ──────────────────────────────────────
function buildRemoteMessage(api, targetThreadID) {
  return {
    reply: (body, callback) => send(api, body, targetThreadID, callback),
    unsend: (messageID, callback) => {
      try { return api.unsendMessage(messageID, callback); } catch (_) {}
    },
    react: (emoji, messageID, callback) => {
      try {
        return api.setMessageReaction(emoji, messageID, callback || (() => {}), true);
      } catch (_) {}
    },
    send: (body, threadID, callback) => send(api, body, threadID || targetThreadID, callback),
  };
}

// ── استخراج اسم الأمر والمدخلات من النص المتبقي ───────────────────────────────
function parseCommand(input) {
  const prefix = global.GoatBot?.config?.prefix || "/";
  const raw = String(input || "").trim();
  if (!raw) return null;

  // إزالة البادئة إن وجدت
  let text = raw;
  if (text.startsWith(prefix)) text = text.slice(prefix.length).trim();

  const parts = text.split(/\s+/).filter(Boolean);
  if (!parts.length) return null;

  const name = String(parts.shift() || "").toLowerCase();
  const args = parts;

  const command = global.GoatBot?.commands?.get(name);
  if (!command?.onStart) return null;

  return { name, args, command };
}

// ── MODULE ────────────────────────────────────────────────────────────────────
module.exports = {
  config: {
    name: "magnus",
    aliases: ["ماغنوس", "ماجنوس"],
    version: "1.0",
    author: "DJAMEL",
    countDown: 5,
    role: 2,
    category: "management",
    description: "تنفيذ أي أمر داخل مجموعة معينة من خلال كتابة اسمها",
    guide: {
      en:
        "{pn} [اسم المجموعة] [الأمر والمدخلات]\n\n" +
        "أمثلة:\n" +
        "  {pn} سايان groupimg https://example.com/photo.jpg\n" +
        "  {pn} سايان groupname الاسم الجديد\n" +
        "  {pn} سايان nick @user كنية",
    },
  },

  onStart: async function ({ api, event, args, message }) {
    // حماية الأدمن
    if (!isAdmin(event.senderID))
      return message.reply("⛔ هذا الأمر للمطور والأدمن فقط.");

    // التحقق من المدخلات
    if (!args || args.length < 2) {
      return message.reply(
        "📌 الاستخدام:\n" +
        "/magnus [اسم المجموعة] [الأمر والمدخلات]\n\n" +
        "أمثلة:\n" +
        "  /magnus سايان groupimg https://example.com/photo.jpg\n" +
        "  /magnus سايان groupname الاسم الجديد"
      );
    }

    // اسم المجموعة هو أول كلمة، وباقي النص هو الأمر
    const groupName = args[0];
    const commandText = args.slice(1).join(" ");

    message.react("⏳", event.messageID);

    // جلب الغروبات
    let groups;
    try {
      groups = await getAllGroups(api);
    } catch (e) {
      message.react("❌", event.messageID);
      return message.reply(`❌ تعذر جلب قائمة الغروبات: ${e.message || e}`);
    }

    if (!groups.length) {
      message.react("❌", event.messageID);
      return message.reply("❌ لا توجد غروبات متاحة حالياً.");
    }

    // البحث عن المجموعة
    const targetGroup = findGroupByName(groups, groupName);
    if (!targetGroup) {
      message.react("❌", event.messageID);
      return message.reply("هذه المجموعة ليست من ضمن قروبات سايان🎴");
    }

    // استخراج الأمر المطلوب
    const parsed = parseCommand(commandText);
    if (!parsed) {
      message.react("❌", event.messageID);
      return message.reply(
        `❌ الأمر غير صالح أو غير موجود: "${commandText}"\n` +
        "تأكد من كتابة اسم الأمر بشكل صحيح."
      );
    }

    const targetThreadID = String(targetGroup.threadID);

    // بناء كائن حدث وهمي يحمل threadID المجموعة الهدف
    // مع الحفاظ على المرفقات والردود من الحدث الأصلي
    const targetEvent = {
      ...event,
      type: "message",
      messageID: `magnus_remote_${Date.now()}`,
      threadID: targetThreadID,
      isGroup: true,
      body: String(commandText).trim(),
      // الحفاظ على المرفقات الأصلية (مثل الصور المرفقة لأمر groupimg)
      attachments: event.attachments || [],
      messageReply: event.messageReply || null,
    };

    try {
      await parsed.command.onStart({
        api,
        event: targetEvent,
        args: parsed.args,
        commandName: parsed.name,
        message: buildRemoteMessage(api, targetThreadID),
        prefix: global.GoatBot?.config?.prefix || "/",
        role: 2,
        senderID: event.senderID,
        threadID: targetThreadID,
      });

      message.react("✅", event.messageID);
      const displayName = targetGroup.name || targetGroup.threadName || targetThreadID;
      return message.reply(
        `✅ تم تنفيذ /${parsed.name} في غروب "${displayName}" بنجاح.`
      );
    } catch (e) {
      message.react("❌", event.messageID);
      const displayName = targetGroup.name || targetGroup.threadName || targetThreadID;
      return message.reply(
        `❌ تعذر تنفيذ /${parsed.name} في غروب "${displayName}": ${e.message || e}`
      );
    }
  },

  onReply: async function () {},
};

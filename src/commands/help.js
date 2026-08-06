/**
 * DAVID V1 — /help — قائمة الأوامر الكاملة (Hybrid Edition)
 * Copyright © 2025 DJAMEL — All rights reserved
 * DAVID V1 + WHITE-V3 merged commands
 */
"use strict";

const CATEGORIES = [
  {
    icon: "🛡️",
    title: "الإدارة والتحكم",
    cmds: [
      { name: "nm",          icon: "🔒", desc: "قفل اسم الغروب ومنع تغييره" },
      { name: "nick",        icon: "✍️", desc: "قفل كنيات الأعضاء باستمرار" },
      { name: "groupimg",    icon: "🖼️", desc: "تغيير وقفل صورة الغروب" },
      { name: "groupname",   icon: "📝", desc: "تغيير اسم الغروب" },
      { name: "setavatar",   icon: "📸", desc: "تغيير صورة حساب البوت" },
      { name: "addlock",     icon: "🔐", desc: "قفل عدد أعضاء الغروب تلقائياً" },
      { name: "thread",      icon: "⚙️", desc: "إعدادات الغروب (ترحيب/وداع)" },
      { name: "out",         icon: "🚪", desc: "إخراج البوت من الغروب" },
    ],
  },
  {
    icon: "👥",
    title: "إدارة الأعضاء",
    cmds: [
      { name: "all",         icon: "📢", desc: "تاق جميع أعضاء الغروب" },
      { name: "tag",         icon: "🏷️", desc: "تاق مجموعات مخصصة" },
      { name: "kick",        icon: "👢", desc: "طرد عضو من الغروب" },
      { name: "adduser",     icon: "➕", desc: "إضافة عضو للغروب" },
      { name: "addadmin",    icon: "👑", desc: "إضافة أو إزالة أدمن البوت" },
      { name: "ban",         icon: "🚫", desc: "حظر مستخدم من البوت" },
      { name: "warn",        icon: "⚠️", desc: "تحذير مستخدم (3 تحذيرات = طرد)" },
      { name: "badwords",    icon: "🤬", desc: "فلتر الكلمات المحظورة تلقائياً" },
    ],
  },
  {
    icon: "💬",
    title: "الرسائل التلقائية",
    cmds: [
      { name: "angel",       icon: "👼", desc: "رسائل تلقائية دورية للغروبات" },
      { name: "divel",       icon: "🌀", desc: "رسائل دورية بانتظار عشوائي" },
      { name: "greet",       icon: "👋", desc: "رسالة ترحيبية بالبوت وأوامره" },
    ],
  },
  {
    icon: "🎭",
    title: "الترفيه والوسائط",
    cmds: [
      { name: "song",        icon: "🎵", desc: "تنزيل أغاني من YouTube" },
      { name: "video",       icon: "🎬", desc: "تنزيل فيديو من YouTube" },
      { name: "tiktok",      icon: "📱", desc: "تنزيل فيديو TikTok بدون علامة مائية" },
      { name: "sticker",     icon: "🎭", desc: "تحويل صورة إلى ملصق" },
      { name: "sexvid",      icon: "🔞", desc: "فيديو 18+ عشوائي (للمشرفين)" },
      { name: "webvideo",    icon: "🎥", desc: "بحث وتحميل من xnxx/xvideos/pornhub..." },
      { name: "pair",        icon: "💑", desc: "ربط عشوائي بين عضوين" },
    ],
  },
  {
    icon: "🤖",
    title: "الذكاء الاصطناعي",
    cmds: [
      { name: "ai",          icon: "🧠", desc: "دردشة مع الذكاء الاصطناعي" },
      { name: "imagegen",    icon: "🎨", desc: "توليد صور بالذكاء الاصطناعي" },
      { name: "pinterest",   icon: "🖼️", desc: "بحث صور Pinterest" },
      { name: "webss",       icon: "📸", desc: "لقطة شاشة لأي موقع" },
    ],
  },
  {
    icon: "🔧",
    title: "الأدوات والمعلومات",
    cmds: [
      { name: "translate",   icon: "🌐", desc: "ترجمة النصوص لأي لغة" },
      { name: "weather",     icon: "🌤️", desc: "حالة الطقس لأي مدينة" },
      { name: "uid",         icon: "🆔", desc: "معرفة ID الفيسبوك" },
      { name: "info",        icon: "ℹ️", desc: "معلومات عن الغروب أو شخص" },
      { name: "ping",        icon: "📡", desc: "قياس زمن استجابة البوت" },
      { name: "rank",        icon: "🏆", desc: "عرض مستواك ونقاطك XP" },
      { name: "unsend",      icon: "🗑️", desc: "حذف آخر رسالة للبوت" },
    ],
  },
  {
    icon: "💰",
    title: "الاقتصاد",
    cmds: [
      { name: "economy",     icon: "💵", desc: "رصيدك (balance/daily/bet/slot/pay)" },
    ],
  },
  {
    icon: "⚙️",
    title: "النظام والإعدادات",
    cmds: [
      { name: "prefix",      icon: "🔑", desc: "تغيير بادئة الأوامر" },
      { name: "autoseen",    icon: "👁️", desc: "رؤية الرسائل تلقائياً" },
      { name: "uptime",      icon: "⏱️", desc: "وقت التشغيل والإحصائيات" },
      { name: "chats",       icon: "💬", desc: "إدارة المحادثات والغروبات" },
      { name: "getstate",    icon: "🔑", desc: "الحصول على AppState (للمالك)" },
      { name: "help",        icon: "❓", desc: "عرض قائمة الأوامر" },
    ],
  },
];

const CMD_DETAILS = {
  nm:           { usage: "/nm [اسم] / off / time [min] [max] / status",         role: "🔑 Admin",  cat: "الإدارة" },
  nick:         { usage: "/nick [اسم] / off / status / حدف",                    role: "🔑 Admin",  cat: "الإدارة" },
  groupimg:     { usage: "/groupimg [رابط أو صورة] / off / status",             role: "🔑 Admin",  cat: "الإدارة" },
  groupname:    { usage: "/groupname [الاسم الجديد]",                            role: "🔑 Admin",  cat: "الإدارة" },
  setavatar:    { usage: "/setavatar [رابط] — أو رد على صورة",                  role: "👑 Owner",  cat: "الإدارة" },
  addlock:      { usage: "/addlock on|off|status|list|clear / [id] [روابط...]",  role: "👑 Owner",  cat: "الإدارة" },
  thread:       { usage: "/thread welcome [رسالة] / leave [رسالة] / status",    role: "🔑 Admin",  cat: "الإدارة" },
  out:          { usage: "/out — خروج البوت من الغروب الحالي",                  role: "👑 Owner",  cat: "الإدارة" },
  all:          { usage: "/all [رسالة اختيارية] — تاق الكل",                   role: "🔑 Admin",  cat: "الأعضاء" },
  tag:          { usage: "/tag add [اسم] @tag / [اسم] / list / remove / info",  role: "🔑 Admin",  cat: "الأعضاء" },
  kick:         { usage: "/kick @شخص — أو رد على رسالته",                       role: "🔑 Admin",  cat: "الأعضاء" },
  adduser:      { usage: "/adduser [ID أو رابط] / [ID1] [ID2]",                 role: "🔑 Admin",  cat: "الأعضاء" },
  addadmin:     { usage: "/addadmin [1-3] @tag / list / remove [ID]",            role: "👑 Owner",  cat: "الأعضاء" },
  ban:          { usage: "/ban @شخص / list / remove [ID]",                       role: "🔑 Admin",  cat: "الأعضاء" },
  warn:         { usage: "/warn @شخص / clear @شخص / list",                      role: "🔑 Admin",  cat: "الأعضاء" },
  badwords:     { usage: "/badwords on|off / add [كلمات] / remove / list / unwarn", role: "🔑 Admin", cat: "الأعضاء" },
  angel:        { usage: "/angel [رسالة] [min-max ثانية] / off / status",       role: "🔑 Admin",  cat: "الرسائل" },
  divel:        { usage: "/divel [رسالة] [min-max] / off / status",              role: "🔑 Admin",  cat: "الرسائل" },
  greet:        { usage: "/greet — رسالة ترحيبية",                              role: "👤 User",   cat: "الرسائل" },
  song:         { usage: "/song [اسم الأغنية أو كلمات]",                        role: "👤 User",   cat: "الترفيه" },
  video:        { usage: "/video [بحث أو رابط يوتيوب]",                          role: "👤 User",   cat: "الترفيه" },
  tiktok:       { usage: "/tiktok [بحث أو رابط]",                               role: "👤 User",   cat: "الترفيه" },
  tik:          { usage: "/tiktok [بحث أو رابط]",                               role: "👤 User",   cat: "الترفيه" },
  sticker:      { usage: "/sticker — رد على صورة بالأمر",                       role: "👤 User",   cat: "الترفيه" },
  sexvid:       { usage: "/sexvid — فيديو عشوائي 18+",                          role: "🔑 Admin",  cat: "الترفيه" },
  webvideo:     { usage: "/webvideo [موقع] [بحث?]\nمواقع: xnxx|xvideos|pornhub|xhamster|redtube|youporn\nردّ بالرقم لتحميل الفيديو", role: "🔑 Admin", cat: "الترفيه" },
  pair:         { usage: "/pair — اختيار عشوائي / @شخص تحديد",                 role: "👤 User",   cat: "الترفيه" },
  ai:           { usage: "/ai [سؤالك] / /gpt [سؤالك]",                         role: "👤 User",   cat: "الذكاء" },
  imagegen:     { usage: "/imagegen [وصف الصورة] / /wgen [prompt]",             role: "👤 User",   cat: "الذكاء" },
  pinterest:    { usage: "/pinterest [كلمة البحث] / /pin [كلمة]",              role: "👤 User",   cat: "الذكاء" },
  webss:        { usage: "/webss [رابط الموقع]",                                role: "👤 User",   cat: "الذكاء" },
  translate:    { usage: "/translate [نص] -> [كود]\n/trans مرحبا -> en",        role: "👤 User",   cat: "الأدوات" },
  weather:      { usage: "/weather [المدينة]\nمثال: /weather الجزائر",          role: "👤 User",   cat: "الأدوات" },
  uid:          { usage: "/uid — معرفك / رد على رسالة / @tag",                  role: "👤 User",   cat: "الأدوات" },
  info:         { usage: "/info — معلومات الغروب / @tag معلومات شخص",           role: "👤 User",   cat: "الأدوات" },
  ping:         { usage: "/ping — قياس زمن الاستجابة",                          role: "👤 User",   cat: "الأدوات" },
  rank:         { usage: "/rank — مستواك / /rank @tag — مستوى شخص",            role: "👤 User",   cat: "الأدوات" },
  unsend:       { usage: "/unsend — حذف آخر رسالة للبوت / رد على رسالته",      role: "👤 User",   cat: "الأدوات" },
  economy:      { usage: "/balance / /daily / /bet [مبلغ] / /slot [مبلغ] / /pay @شخص [مبلغ]", role: "👤 User", cat: "الاقتصاد" },
  prefix:       { usage: "/prefix [البادئة الجديدة] — مثال: /prefix !",         role: "👑 Owner",  cat: "النظام" },
  autoseen:     { usage: "/autoseen on|off|status",                              role: "🔑 Admin",  cat: "النظام" },
  uptime:       { usage: "/uptime",                                               role: "👤 User",   cat: "النظام" },
  chats:        { usage: "/chats count / list / dm on|off / angel",              role: "🔑 Admin",  cat: "النظام" },
  getstate:     { usage: "/getstate / /getstate cookie / /getstate string",      role: "👑 Owner",  cat: "النظام" },
  help:         { usage: "/help — /help [اسم الأمر]",                            role: "👤 User",   cat: "النظام" },
};

const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

function buildHelpAll(prefix) {
  const allCmds = global.GoatBot?.commands;
  let totalCmds = 0;
  if (allCmds?.size) {
    const seen = new Set();
    for (const [, cmd] of allCmds) { if (cmd.config?.name) seen.add(cmd.config.name); }
    totalCmds = seen.size;
  } else {
    for (const cat of CATEGORIES) totalCmds += cat.cmds.length;
  }

  const lines = [];
  lines.push(LINE);
  lines.push("  ✦  D A V I D  V 1  ✦  H Y B R I D");
  lines.push("  🤖 مساعدك الذكي على ماسنجر");
  lines.push(`  ⚡ by DJAMEL  •  Prefix: ${prefix}`);
  lines.push(LINE);
  lines.push("");

  for (const cat of CATEGORIES) {
    const padLen = Math.max(1, 22 - cat.title.length);
    lines.push(` ╔═ ${cat.icon} ${cat.title} ${"═".repeat(padLen)}╗`);
    for (const cmd of cat.cmds) {
      lines.push(` ║  ${cmd.icon}  ${prefix}${cmd.name.padEnd(13)}${cmd.desc}`);
    }
    lines.push(` ╚${"═".repeat(35)}╝`);
    lines.push("");
  }

  lines.push(LINE);
  lines.push(`  📦 الأوامر: ${totalCmds}  •  🛡 الحماية: 20 طبقة`);
  lines.push(`  ❓ ${prefix}help [اسم الأمر] ← للتفاصيل الكاملة`);
  lines.push(LINE);
  return lines.join("\n");
}

function buildHelpOne(rawName, prefix) {
  const name    = rawName.toLowerCase().replace(/^\//, "");
  const allCmds = global.GoatBot?.commands;

  let cmd = allCmds?.get(name);
  if (!cmd && allCmds) {
    for (const [, c] of allCmds) {
      if ((c.config?.aliases || []).map(a => String(a).toLowerCase()).includes(name)) {
        cmd = c; break;
      }
    }
  }

  const info    = CMD_DETAILS[name] || CMD_DETAILS[cmd?.config?.name] || {};
  const config  = cmd?.config || {};
  const cmdName = config.name || name;
  const desc    = config.description || config.longDescription || "لا يوجد وصف";
  const usage   = (config.guide?.en?.replace(/\{p[n]?\}/g, prefix)) || info.usage || `${prefix}${cmdName}`;
  const role    = info.role || (config.role === 3 ? "👑 Owner" : config.role === 2 ? "🔑 Admin" : "👤 User");
  const cat     = info.cat  || config.category || "عام";
  const aliases = (config.aliases || []).filter(Boolean);

  let icon = "•";
  outer: for (const c of CATEGORIES)
    for (const cm of c.cmds)
      if (cm.name === cmdName || cm.name === name) { icon = cm.icon; break outer; }

  const lines = [];
  lines.push(LINE);
  lines.push(`  ${icon}  ${prefix}${cmdName.toUpperCase()}`);
  lines.push(LINE);
  lines.push("");
  lines.push(`  📝 الوصف:`);
  lines.push(`     ${desc}`);
  lines.push("");
  lines.push(`  📌 الاستخدام:`);
  for (const l of usage.split("\n")) lines.push(`     ${l}`);
  lines.push("");
  lines.push(`  🏷  الفئة    : ${cat}`);
  lines.push(`  🔑 الصلاحية : ${role}`);
  if (aliases.length) lines.push(`  🔀 اختصارات : ${aliases.join("، ")}`);
  lines.push("");
  lines.push(LINE);
  return lines.join("\n");
}

module.exports = {
  config: {
    name: "help",
    aliases: ["h", "مساعدة", "أوامر", "commands"],
    version: "5.0",
    author: "DJAMEL",
    countDown: 3,
    role: 0,
    category: "info",
    description: "عرض قائمة الأوامر الكاملة — DAVID V1 Hybrid Edition",
    guide: {
      en: "{pn} — عرض كل الأوامر\n{pn} [اسم الأمر] — تفاصيل أمر محدد",
    },
  },

  onStart: async function ({ args, message, prefix }) {
    if (args[0]) {
      message.reply(buildHelpOne(args[0], prefix));
    } else {
      message.reply(buildHelpAll(prefix));
    }
  },
};

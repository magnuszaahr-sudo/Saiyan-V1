/**
 * SAIYAN — /help — Command Center
 * Copyright © 2026 Magnus
 * Saiyan Messenger Bot
 */
"use strict";

const CATEGORIES = [
  {
    icon: "⚡",
    title: "مركز الإدارة",
    cmds: [
      { name: "nm",        icon: "🧱", desc: "تثبيت اسم الغروب وحمايته من التغيير" },
      { name: "nick",      icon: "🎴", desc: "حماية كنيات الأعضاء ومراقبة تغييراتها" },
      { name: "groupimg",  icon: "🌠", desc: "تغيير صورة الغروب وتثبيتها" },
      { name: "groupname", icon: "🏷️", desc: "تحديث اسم الغروب بالاسم الذي تحدده" },
      { name: "setavatar", icon: "🪪", desc: "تعديل صورة حساب سايان" },
      { name: "addlock",   icon: "🔗", desc: "الحفاظ على عدد أعضاء الغروب" },
      { name: "thread",    icon: "🧩", desc: "ضبط إعدادات الغروب والرسائل التلقائية" },
      { name: "out",       icon: "⏏️", desc: "إخراج سايان من الغروب الحالي" },
    ],
  },

  {
    icon: "🧑‍🤝‍🧑",
    title: "الأعضاء",
    cmds: [
      { name: "all",      icon: "📣", desc: "استدعاء جميع أعضاء الغروب" },
      { name: "tag",      icon: "🎯", desc: "إنشاء وإدارة مجموعات التاق" },
      { name: "kick",     icon: "🥾", desc: "إزالة عضو من الغروب" },
      { name: "adduser",  icon: "➕", desc: "إضافة أعضاء إلى الغروب" },
      { name: "addadmin", icon: "♛", desc: "إدارة مشرفي سايان" },
      { name: "ban",      icon: "🚷", desc: "منع مستخدم من استعمال البوت" },
      { name: "warn",     icon: "🚨", desc: "إدارة التحذيرات والتنبيهات" },
      { name: "badwords", icon: "🧼", desc: "تنقية المحادثة من الكلمات المحددة" },
    ],
  },

  {
    icon: "🔄",
    title: "التشغيل التلقائي",
    cmds: [
      { name: "angel", icon: "🪽", desc: "تشغيل رسائل دورية تلقائية" },
      { name: "divel", icon: "🌘", desc: "إرسال رسائل بفواصل زمنية متغيرة" },
      { name: "greet", icon: "🌟", desc: "إظهار رسالة ترحيب خاصة بسايان" },
    ],
  },

  {
    icon: "🎵",
    title: "الوسائط والترفيه",
    cmds: [
      { name: "song",    icon: "🎼", desc: "البحث عن الأغاني وتحميلها" },
      { name: "video",   icon: "📹", desc: "البحث عن فيديوهات وتحميلها" },
      { name: "tiktok",  icon: "🎞️", desc: "تحميل فيديوهات TikTok" },
      { name: "sticker", icon: "🧷", desc: "تحويل الصور إلى ملصقات" },
      { name: "pair",    icon: "💞", desc: "اختيار شخصين بشكل عشوائي" },
    ],
  },

  {
    icon: "🧠",
    title: "الذكاء الاصطناعي",
    cmds: [
      { name: "ai",        icon: "🧬", desc: "محادثة مباشرة مع الذكاء الاصطناعي" },
      { name: "imagegen",  icon: "🖍️", desc: "إنشاء صور من وصف نصي" },
      { name: "pinterest", icon: "🔭", desc: "البحث عن صور من Pinterest" },
      { name: "webss",     icon: "🖥️", desc: "التقاط صورة لصفحة ويب" },
    ],
  },

  {
    icon: "🧰",
    title: "الخدمات",
    cmds: [
      { name: "translate", icon: "🔤", desc: "تحويل النص بين اللغات" },
      { name: "weather",   icon: "🌦️", desc: "معرفة الطقس في مدينة معينة" },
      { name: "uid",       icon: "🆔", desc: "عرض معرف حساب فيسبوك" },
      { name: "info",      icon: "📑", desc: "عرض بيانات الغروب أو أحد أعضائه" },
      { name: "ping",      icon: "📡", desc: "اختبار سرعة استجابة سايان" },
      { name: "rank",      icon: "🏅", desc: "عرض المستوى ونقاط الخبرة" },
      { name: "unsend",    icon: "♻️", desc: "إزالة رسالة أرسلها سايان" },
    ],
  },

  {
    icon: "🪙",
    title: "النظام الاقتصادي",
    cmds: [
      {
        name: "economy",
        icon: "💳",
        desc: "الرصيد والمكافآت والألعاب المالية",
      },
    ],
  },

  {
    icon: "🛠️",
    title: "إعدادات النظام",
    cmds: [
      {
        name: "prefix",
        icon: "🔧",
        desc: "تغيير رمز بداية الأوامر",
      },
      {
        name: "autoseen",
        icon: "👁️‍🗨️",
        desc: "التحكم في مشاهدة الرسائل تلقائياً",
      },
      {
        name: "uptime",
        icon: "⌛",
        desc: "معرفة مدة تشغيل سايان",
      },
      {
        name: "chats",
        icon: "🗃️",
        desc: "إدارة المحادثات والغروبات",
      },
      {
        name: "getstate",
        icon: "🗝️",
        desc: "استخراج AppState للمالك",
      },
      {
        name: "help",
        icon: "📚",
        desc: "فتح مركز أوامر سايان",
      },
    ],
  },
];

const CMD_DETAILS = {
  nm: {
    usage: "/nm [اسم] / off / time [min] [max] / status",
    role: "🔐 Admin",
    cat: "الإدارة",
  },

  nick: {
    usage: "/nick [اسم] / off / status / حدف",
    role: "🔐 Admin",
    cat: "الإدارة",
  },

  groupimg: {
    usage: "/groupimg [رابط أو صورة] / off / status",
    role: "🔐 Admin",
    cat: "الإدارة",
  },

  groupname: {
    usage: "/groupname [الاسم الجديد]",
    role: "🔐 Admin",
    cat: "الإدارة",
  },

  setavatar: {
    usage: "/setavatar [رابط] — أو الرد على صورة",
    role: "👑 Owner",
    cat: "الإدارة",
  },

  addlock: {
    usage: "/addlock on|off|status|list|clear / [id] [روابط...]",
    role: "👑 Owner",
    cat: "الإدارة",
  },

  thread: {
    usage: "/thread welcome [رسالة] / leave [رسالة] / status",
    role: "🔐 Admin",
    cat: "الإدارة",
  },

  out: {
    usage: "/out — إخراج سايان من الغروب",
    role: "👑 Owner",
    cat: "الإدارة",
  },

  all: {
    usage: "/all [رسالة اختيارية] — استدعاء الجميع",
    role: "🔐 Admin",
    cat: "الأعضاء",
  },

  tag: {
    usage: "/tag add [اسم] @tag / [اسم] / list / remove / info",
    role: "🔐 Admin",
    cat: "الأعضاء",
  },

  kick: {
    usage: "/kick @شخص — أو الرد على رسالته",
    role: "🔐 Admin",
    cat: "الأعضاء",
  },

  adduser: {
    usage: "/adduser [ID أو رابط] / [ID1] [ID2]",
    role: "🔐 Admin",
    cat: "الأعضاء",
  },

  addadmin: {
    usage: "/addadmin [1-3] @tag / list / remove [ID]",
    role: "👑 Owner",
    cat: "الأعضاء",
  },

  ban: {
    usage: "/ban @شخص / list / remove [ID]",
    role: "🔐 Admin",
    cat: "الأعضاء",
  },

  warn: {
    usage: "/warn @شخص / clear @شخص / list",
    role: "🔐 Admin",
    cat: "الأعضاء",
  },

  badwords: {
    usage: "/badwords on|off / add [كلمات] / remove / list / unwarn",
    role: "🔐 Admin",
    cat: "الأعضاء",
  },

  angel: {
    usage: "/angel [رسالة] [min-max ثانية] / off / status",
    role: "🔐 Admin",
    cat: "التشغيل",
  },

  divel: {
    usage: "/divel [رسالة] [min-max] / off / status",
    role: "🔐 Admin",
    cat: "التشغيل",
  },

  greet: {
    usage: "/greet — عرض رسالة الترحيب",
    role: "👤 User",
    cat: "التشغيل",
  },

  song: {
    usage: "/song [اسم الأغنية أو كلمات البحث]",
    role: "👤 User",
    cat: "الوسائط",
  },

  video: {
    usage: "/video [بحث أو رابط يوتيوب]",
    role: "👤 User",
    cat: "الوسائط",
  },

  tiktok: {
    usage: "/tiktok [بحث أو رابط]",
    role: "👤 User",
    cat: "الوسائط",
  },

  tik: {
    usage: "/tiktok [بحث أو رابط]",
    role: "👤 User",
    cat: "الوسائط",
  },

  sticker: {
    usage: "/sticker — الرد على صورة بالأمر",
    role: "👤 User",
    cat: "الوسائط",
  },

  pair: {
    usage: "/pair — اختيار عشوائي / @شخص لتحديد العضو",
    role: "👤 User",
    cat: "الوسائط",
  },

  ai: {
    usage: "/ai [سؤالك] / /gpt [سؤالك]",
    role: "👤 User",
    cat: "الذكاء",
  },

  imagegen: {
    usage: "/imagegen [وصف الصورة] / /wgen [prompt]",
    role: "👤 User",
    cat: "الذكاء",
  },

  pinterest: {
    usage: "/pinterest [كلمة البحث] / /pin [كلمة]",
    role: "👤 User",
    cat: "الذكاء",
  },

  webss: {
    usage: "/webss [رابط الموقع]",
    role: "👤 User",
    cat: "الذكاء",
  },

  translate: {
    usage: "/translate [نص] -> [كود]\n/trans مرحبا -> en",
    role: "👤 User",
    cat: "الخدمات",
  },

  weather: {
    usage: "/weather [المدينة]\nمثال: /weather طرابلس",
    role: "👤 User",
    cat: "الخدمات",
  },

  uid: {
    usage: "/uid — معرفك / الرد على رسالة / @tag",
    role: "👤 User",
    cat: "الخدمات",
  },

  info: {
    usage: "/info — بيانات الغروب / @tag لبيانات شخص",
    role: "👤 User",
    cat: "الخدمات",
  },

  ping: {
    usage: "/ping — اختبار سرعة الاستجابة",
    role: "👤 User",
    cat: "الخدمات",
  },

  rank: {
    usage: "/rank — مستواك / /rank @tag — مستوى شخص",
    role: "👤 User",
    cat: "الخدمات",
  },

  unsend: {
    usage: "/unsend — الرد على رسالة سايان لحذفها",
    role: "👤 User",
    cat: "الخدمات",
  },

  economy: {
    usage: "/balance / /daily / /bet [مبلغ] / /slot [مبلغ] / /pay @شخص [مبلغ]",
    role: "👤 User",
    cat: "الاقتصاد",
  },

  prefix: {
    usage: "/prefix [البادئة الجديدة] — مثال: /prefix !",
    role: "👑 Owner",
    cat: "النظام",
  },

  autoseen: {
    usage: "/autoseen on|off|status",
    role: "🔐 Admin",
    cat: "النظام",
  },

  uptime: {
    usage: "/uptime — عرض مدة تشغيل سايان",
    role: "👤 User",
    cat: "النظام",
  },

  chats: {
    usage:
      "/chats — إدارة الغروبات\n" +
      "/chats count\n" +
      "/chats dm on|off",
    role: "🔐 Admin",
    cat: "النظام",
  },

  getstate: {
    usage: "/getstate / /getstate cookie / /getstate string",
    role: "👑 Owner",
    cat: "النظام",
  },

  help: {
    usage: "/help — القائمة العامة / /help [الأمر]",
    role: "👤 User",
    cat: "النظام",
  },
};

const LINE = "════════════════════════════════════";

function buildHelpAll(prefix) {
  const allCmds = global.GoatBot?.commands;
  let totalCmds = 0;

  if (allCmds?.size) {
    const seen = new Set();

    for (const [, cmd] of allCmds) {
      if (cmd.config?.name) {
        seen.add(cmd.config.name);
      }
    }

    totalCmds = seen.size;
  } else {
    for (const cat of CATEGORIES) {
      totalCmds += cat.cmds.length;
    }
  }

  const lines = [];

  lines.push(LINE);
  lines.push("      S A I Y A N  •  C O M M A N D S");
  lines.push("      مركز التحكم الذكي لمسنجر");
  lines.push(`      Magnus  |  Prefix: ${prefix}`);
  lines.push(LINE);
  lines.push("");

  for (const cat of CATEGORIES) {
    const padLen = Math.max(
      1,
      22 - cat.title.length
    );

    lines.push(
      ` ╭─ ${cat.icon} ${cat.title} ${"─".repeat(padLen)}╮`
    );

    for (const cmd of cat.cmds) {
      lines.push(
        ` │ ${cmd.icon} ${prefix}${cmd.name.padEnd(
          13
        )} ${cmd.desc}`
      );
    }

    lines.push(
      ` ╰${"─".repeat(35)}╯`
    );

    lines.push("");
  }

  lines.push(LINE);
  lines.push(`  📦 عدد الأوامر: ${totalCmds}`);
  lines.push(`  🔎 ${prefix}help [الأمر] ← تفاصيل الأمر`);
  lines.push(`  Magnus  •  Saiyan`);
  lines.push(LINE);

  return lines.join("\n");
}

function buildHelpOne(rawName, prefix) {
  const name = String(rawName)
    .toLowerCase()
    .replace(/^\//, "");

  const allCmds = global.GoatBot?.commands;

  let cmd = allCmds?.get(name);

  if (!cmd && allCmds) {
    for (const [, c] of allCmds) {
      if (
        (c.config?.aliases || [])
          .map(a => String(a).toLowerCase())
          .includes(name)
      ) {
        cmd = c;
        break;
      }
    }
  }

  const info =
    CMD_DETAILS[name] ||
    CMD_DETAILS[cmd?.config?.name] ||
    {};

  const config = cmd?.config || {};

  const cmdName =
    config.name || name;

  const desc =
    config.description ||
    config.longDescription ||
    "لا توجد تفاصيل إضافية لهذا الأمر.";

  const usage =
    config.guide?.en
      ?.replace(/\{p[n]?\}/g, prefix) ||
    info.usage ||
    `${prefix}${cmdName}`;

  const role =
    info.role ||
    (
      config.role === 3
        ? "👑 Owner"
        : config.role === 2
          ? "🔐 Admin"
          : "👤 User"
    );

  const cat =
    info.cat ||
    config.category ||
    "عام";

  const aliases =
    (config.aliases || [])
      .filter(Boolean);

  let icon = "◇";

  outer:
  for (const c of CATEGORIES) {
    for (const cm of c.cmds) {
      if (
        cm.name === cmdName ||
        cm.name === name
      ) {
        icon = cm.icon;
        break outer;
      }
    }
  }

  const lines = [];

  lines.push(LINE);
  lines.push(
    `  ${icon}  SAIYAN  •  ${prefix}${cmdName.toUpperCase()}`
  );
  lines.push(LINE);
  lines.push("");

  lines.push("  ◈ نبذة عن الأمر:");
  lines.push(`     ${desc}`);
  lines.push("");

  lines.push("  ◈ طريقة الاستخدام:");

  for (const l of String(usage).split("\n")) {
    lines.push(`     ${l}`);
  }

  lines.push("");

  lines.push(`  ◇ القسم     : ${cat}`);
  lines.push(`  ◇ الصلاحية  : ${role}`);

  if (aliases.length) {
    lines.push(
      `  ◇ البدائل   : ${aliases.join("، ")}`
    );
  }

  lines.push("");
  lines.push("  Magnus  •  Saiyan");
  lines.push("");
  lines.push(LINE);

  return lines.join("\n");
}

module.exports = {
  config: {
    name: "help",

    aliases: [
      "h",
      "مساعدة",
      "أوامر",
      "commands",
    ],

    version: "5.0",

    author: "Magnus",

    countDown: 3,

    role: 0,

    category: "info",

    description:
      "دليل أوامر Saiyan الكامل",

    guide: {
      en:
        "{pn} — عرض جميع الأوامر\n" +
        "{pn} [اسم الأمر] — عرض تفاصيل أمر محدد",
    },
  },

  onStart: async function ({
    args,
    message,
    prefix,
  }) {
    if (args[0]) {
      return message.reply(
        buildHelpOne(
          args[0],
          prefix
        )
      );
    }

    return message.reply(
      buildHelpAll(prefix)
    );
  },
};

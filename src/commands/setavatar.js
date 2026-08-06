/**
 * DAVID V1 — /setavatar — تغيير صورة بروفايل البوت
 * Copyright © 2025 DJAMEL
 *
 * تم المقارنة مع WHITE-V3 المصدر:
 *  - arraybuffer ← حفظ ملف مؤقت ← fs.createReadStream  (مطابق WHITE-V3)
 *  - api.changeAvatar(stream, "", null, cb)  (يدعم Legacy Promise)
 *  - تنظيف الملف المؤقت في finally
 */
"use strict";
const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const os    = require("os");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

function isBotAdmin(id) {
  const cfg = global.GoatBot?.config || {};
  const sid = String(id);
  return [cfg.ownerID, ...(cfg.superAdminBot || []), ...(cfg.adminBot || [])]
    .filter(Boolean).map(String).includes(sid);
}

module.exports = {
  config: {
    name: "setavatar",
    aliases: ["changeavatar", "avatar", "pfp", "صورة-البوت"],
    version: "4.0",
    author: "DJAMEL",
    countDown: 15,
    role: 3,
    category: "management",
    description: "تغيير صورة بروفايل البوت (للمالك فقط)",
    guide: { en: "{pn} [رابط] — أو رد على صورة بـ {pn}" }
  },

  onStart: async function ({ api, event, args, message }) {
    if (!isBotAdmin(event.senderID))
      return message.reply("⛔ هذا الأمر للمالك فقط.");

    // ── استخراج رابط الصورة ─────────────────────────────────────────────
    let imgUrl = null;
    const findImg = (atts = []) => {
      const img = atts.find(a => a.type === "photo" || a.type === "sticker");
      return img?.url || img?.previewUrl || img?.playbackUrl || null;
    };

    imgUrl = findImg(event.attachments || []);
    if (!imgUrl && event.messageReply)
      imgUrl = findImg(event.messageReply.attachments || []);
    if (!imgUrl)
      for (const a of args)
        if (a?.startsWith("http")) { imgUrl = a; break; }

    if (!imgUrl) {
      return message.reply(
        "╔══════════════════════════╗\n" +
        "║  📸  تغيير صورة البوت   ║\n" +
        "╠══════════════════════════╣\n" +
        "║  الاستخدام:              ║\n" +
        "║  • /setavatar [رابط]    ║\n" +
        "║  • رد على صورة بالأمر   ║\n" +
        "╚══════════════════════════╝"
      );
    }

    message.react("⏳", event.messageID);

    // ── تحميل الصورة كـ arraybuffer (نهج WHITE-V3) ──────────────────────
    const tmpFile = path.join(os.tmpdir(), `david_avatar_${Date.now()}.jpg`);

    try {
      const imgRes = await axios.get(imgUrl, {
        responseType: "arraybuffer",
        timeout: 25000,
        headers: { "User-Agent": UA }
      });

      // حفظ في ملف مؤقت — مطلوب لأن FCA تتحقق بـ isReadableStream3
      fs.writeFileSync(tmpFile, Buffer.from(imgRes.data));

      // إنشاء ReadStream نظيف من الملف (مطابق WHITE-V3)
      const stream = fs.createReadStream(tmpFile);

      await new Promise((resolve, reject) => {
        stream.on("error", reject);
        api.changeAvatar(stream, "", null, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      message.react("✅", event.messageID);
      return message.reply(
        "╔═══════════════════════════╗\n" +
        "║  ✅ تم بنجاح              ║\n" +
        "╠═══════════════════════════╣\n" +
        "║  تم تغيير صورة البوت 🎉  ║\n" +
        "║  قد تحتاج لإعادة تحميل   ║\n" +
        "║  الصفحة لرؤية التغيير    ║\n" +
        "╚═══════════════════════════╝"
      );

    } catch (err) {
      message.react("❌", event.messageID);
      return message.reply(
        "╔═══════════════════════════╗\n" +
        "║  ❌ فشل تغيير الصورة      ║\n" +
        "╠═══════════════════════════╣\n" +
        "║  السبب: " + String(err.message || err).slice(0, 35) + "\n" +
        "╠═══════════════════════════╣\n" +
        "║  ⚠️ قد يكون السبب:        ║\n" +
        "║  • الكوكيز منتهية الصلاحية║\n" +
        "║  • فيسبوك حظر الطلب مؤقتاً║\n" +
        "║  • رابط الصورة غير صالح  ║\n" +
        "╚═══════════════════════════╝"
      );

    } finally {
      try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (_) {}
    }
  }
};

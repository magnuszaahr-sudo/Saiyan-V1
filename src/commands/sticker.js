/**
 * DAVID V1 — /sticker — تحويل صورة إلى ملصق
 * Copyright © 2025 DJAMEL
 * Ported from WHITE-V3 & adapted for DAVID engine
 */
"use strict";
const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const os    = require("os");

module.exports = {
  config: {
    name: "sticker",
    aliases: ["ملصق", "stk"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 5,
    role: 0,
    category: "media",
    description: "تحويل صورة إلى ملصق / إرسال رد على صورة",
    guide: { en: "رد على صورة بـ {pn}" }
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, messageReply, attachments } = event;

    const atts = attachments?.length ? attachments : (messageReply?.attachments || []);
    const img  = atts.find(a => a.type === "photo" || a.type === "sticker");

    if (!img) {
      return message.reply(
        "╔══════════════════════════╗\n" +
        "║  🖼️  تحويل إلى ملصق     ║\n" +
        "╠══════════════════════════╣\n" +
        "║  رد على صورة بـ /sticker ║\n" +
        "╚══════════════════════════╝"
      );
    }

    message.react("⏳", event.messageID);

    try {
      const imgUrl  = img.url || img.previewUrl || img.playbackUrl;
      const tmpFile = path.join(os.tmpdir(), `sticker_${Date.now()}.png`);

      const res = await axios.get(imgUrl, {
        responseType: "arraybuffer",
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      fs.writeFileSync(tmpFile, Buffer.from(res.data));

      await new Promise((resolve, reject) => {
        api.sendMessage(
          { attachment: fs.createReadStream(tmpFile) },
          threadID,
          (err) => {
            try { fs.unlinkSync(tmpFile); } catch (_) {}
            err ? reject(err) : resolve();
          }
        );
      });

      message.react("✅", event.messageID);
    } catch (e) {
      message.react("❌", event.messageID);
      message.reply(`❌ فشل: ${e.message}`);
    }
  }
};

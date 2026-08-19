// src/commands/delete.js
// Command: delete / حذف
// Deletes a replied-to bot message. Intended for admins.

module.exports = {
  name: "delete",
  aliases: ["حذف"],
  description: "Delete a replied bot message (admins only).",
  async execute(client, message, args = {}) {
    // This command attempts to support multiple bot frameworks (WhatsApp/Baileys, Discord, Telegram).
    // It checks for a replied message and whether the replied message was sent by a bot, and then
    // attempts to delete it using the platform-appropriate API. It also attempts an admin check
    // where a standard field is available. Depending on your repo's framework you may want to
    // adapt the property names (e.g., `message.quoted`, `message.reference`, `message.reply_to_message`).

    // Helper: reply back to user (best-effort)
    const reply = async (text) => {
      try {
        if (typeof message.reply === "function") return await message.reply(text);
        if (typeof client.sendMessage === "function" && message.chat) return await client.sendMessage(message.chat, { text });
        if (typeof client.telegram?.sendMessage === "function") return await client.telegram.sendMessage(message.chat?.id || message.chatId, text);
        // fallback: console
        console.log(text);
      } catch (e) {
        console.error("Failed to send feedback message:", e);
      }
    };

    // Admin check helpers (best-effort)
    const isAdmin = async () => {
      try {
        // Discord (discord.js): message.member.permissions
        if (message.member && typeof message.member.permissions?.has === "function") {
          return message.member.permissions.has("MANAGE_MESSAGES") || message.member.permissions.has("ADMINISTRATOR");
        }
        // Telegram (telegraf): ask telegram for chat member status
        if (client.telegram && message.chat && message.from) {
          try {
            const member = await client.telegram.getChatMember(message.chat.id || message.chatId, message.from.id || message.from);
            return ["creator", "administrator"].includes(member.status);
          } catch (e) {
            // ignore and continue
          }
        }
        // WhatsApp-like: some bots provide isGroupAdmin or isAdmin flags on message
        if (message.isGroup && (message.isGroupAdmin || message.isAdmin || message.sender?.isAdmin || message.participantIsAdmin)) return true;
        // Fallback: if the message object says sender is bot owner/creator
        if (message.isOwner || message.from === client.user?.id || message.author === client.user?.id) return true;
      } catch (e) {
        console.error(e);
      }
      return false;
    };

    const allowed = await isAdmin();
    if (!allowed) return reply("You must be an admin to use this command.");

    // Platform: WhatsApp/Baileys. Many WA bots attach the quoted message to `message.quoted` or `message.quotedMsg`.
    const quoted = message.quoted || message.quotedMsg || message.msg?.quoted || (message.reply && message.reply.message) || null;
    try {
      // 1) WhatsApp/Baileys style deletion
      if (quoted && quoted.key && message.chat && typeof client.sendMessage === "function") {
        // Baileys supports sending a 'delete' message with the quoted key
        try {
          await client.sendMessage(message.chat, { delete: quoted.key });
          return; // done
        } catch (e) {
          // Some implementations expose a different method to delete; ignore and continue to other strategies
          console.warn("WhatsApp-style delete failed, trying other methods:", e?.message || e);
        }
      }

      // 2) Discord.js: message.reference.messageId
      if (message.reference && message.reference.messageId && message.channel && typeof message.channel.messages?.fetch === "function") {
        const refId = message.reference.messageId;
        const channel = message.channel;
        const target = await channel.messages.fetch(refId).catch(() => null);
        if (!target) return reply("Could not find the replied message to delete.");
        if (!target.author.bot) return reply("I can only delete messages sent by bots.");
        await target.delete();
        return;
      }

      // 3) Telegram: reply_to_message
      if (message.reply_to_message && client.telegram && message.chat) {
        const ref = message.reply_to_message;
        if (!ref.from?.is_bot) return reply("I can only delete messages sent by bots.");
        await client.telegram.deleteMessage(message.chat.id || message.chatId, ref.message_id || ref.messageId);
        return;
      }

      // 4) Some frameworks provide quoted.messageId + chatId
      if (quoted && quoted.id && quoted.chat) {
        // attempt generic deletion API
        if (typeof client.deleteMessage === "function") {
          await client.deleteMessage(quoted.chat, quoted.id);
          return;
        }
        if (typeof client.delete === "function") {
          await client.delete(quoted.chat, quoted.id);
          return;
        }
      }

      // If we reach here, no supported pattern matched
      return reply("Could not detect a replied bot message or platform not supported by this command. Please reply to the bot message you want to delete and run the command.");
    } catch (err) {
      console.error(err);
      return reply("Failed to delete the replied message. Check bot permissions and that the replied message was sent by the bot.");
    }
  }
};

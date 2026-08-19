/**
 * DAVID V1 — /chats — إدارة المحادثات والغروبات وطلبات المراسلة
 * Copyright © 2025 DJAMEL
 *
 * Added:
 *  - قبول طلبات المراسلة
 *  - قبول محادثات Other / Spam
 *  - إرسال "اهلاً" بعد القبول
 *  - دعم /chats accept THREAD_ID
 */
"use strict";

const fs = require("fs-extra");
const path = require("path");

const DM_DATA = path.join(
  process.cwd(),
  "database/data/dmLock.json"
);

const ctrl = require("../utils/cmdControl");

// ======================================================
// الأوامر التي يمكن التحكم بها عن بعد
// ======================================================

const MANAGED_COMMANDS = [
  {
    name: "angel",
    label: "Angel — الرسائل التلقائية"
  },
  {
    name: "nm",
    label: "NM — قفل اسم الغروب"
  },
  {
    name: "nick",
    label: "Nick — قفل كنيات الأعضاء"
  },
];

const MANAGED_COMMAND_NAMES = new Set(
  MANAGED_COMMANDS.map(command => command.name)
);

// ======================================================
// التحقق من الأدمن
// ======================================================

function isAdmin(id) {
  return (
    global.GoatBot?.config?.adminBot || []
  )
    .map(String)
    .includes(String(id));
}

// ======================================================
// DM LOCK
// ======================================================

function getDmLocked() {
  if (
    global.GoatBot.dmLocked !== undefined
  ) {
    return !!global.GoatBot.dmLocked;
  }

  try {
    if (fs.existsSync(DM_DATA)) {
      const data = JSON.parse(
        fs.readFileSync(
          DM_DATA,
          "utf8"
        )
      );

      global.GoatBot.dmLocked =
        !!data.locked;

      return global.GoatBot.dmLocked;
    }
  } catch (_) {}

  return false;
}

function setDmLocked(value) {
  global.GoatBot.dmLocked = !!value;

  try {
    fs.ensureDirSync(
      path.dirname(DM_DATA)
    );

    fs.writeFileSync(
      DM_DATA,
      JSON.stringify(
        {
          locked: !!value
        },
        null,
        2
      )
    );
  } catch (_) {}
}

// ======================================================
// SEND
// ======================================================

function send(
  api,
  body,
  threadID,
  callback
) {
  return new Promise(resolve => {
    let settled = false;

    const finish = (
      error,
      info
    ) => {
      if (settled) return;

      settled = true;

      if (callback) {
        callback(
          error,
          info
        );
      }

      resolve(info);
    };

    try {
      const result =
        api.sendMessage(
          body,
          threadID,
          finish
        );

      if (
        result &&
        typeof result.then ===
          "function"
      ) {
        result
          .then(info =>
            finish(null, info)
          )
          .catch(error =>
            finish(error)
          );
      }
    } catch (error) {
      finish(error);
    }
  });
}

// ======================================================
// GET THREAD LIST
// ======================================================

function getThreadList(
  api,
  limit,
  cursor,
  tags
) {
  return new Promise(resolve => {
    let settled = false;

    const finish = (
      error,
      data
    ) => {
      if (settled) return;

      settled = true;

      if (error) {
        return resolve([]);
      }

      resolve(
        Array.isArray(data)
          ? data
          : data?.data || []
      );
    };

    try {
      const result =
        api.getThreadList(
          limit,
          cursor,
          tags,
          finish
        );

      if (
        result &&
        typeof result.then ===
          "function"
      ) {
        result
          .then(data =>
            finish(null, data)
          )
          .catch(error =>
            finish(error)
          );
      } else if (
        Array.isArray(result)
      ) {
        finish(
          null,
          result
        );
      }
    } catch (error) {
      finish(error);
    }
  });
}

// ======================================================
// جلب جميع الغروبات
// ======================================================

async function getAllGroups(api) {
  const groups = [];
  let cursor = null;

  for (
    let page = 0;
    page < 5;
    page++
  ) {
    const batch =
      await getThreadList(
        api,
        50,
        cursor,
        ["INBOX"]
      );

    if (!batch.length) {
      break;
    }

    for (const thread of batch) {
      if (
        thread?.isGroup &&
        thread.threadID
      ) {
        groups.push(thread);
      }
    }

    if (batch.length < 50) {
      break;
    }

    const last =
      batch[batch.length - 1];

    cursor =
      last?.timestamp || null;

    if (!cursor) {
      break;
    }
  }

  const seen = new Set();

  return groups.filter(
    group => {
      const id =
        String(
          group.threadID
        );

      if (seen.has(id)) {
        return false;
      }

      seen.add(id);

      return true;
    }
  );
}

// ======================================================
// جلب طلبات المراسلة
// ======================================================

async function getAllMessageRequests(
  api
) {
  const requests = [];
  let cursor = null;

  for (
    let page = 0;
    page < 5;
    page++
  ) {
    const batch =
      await getThreadList(
        api,
        50,
        cursor,
        ["PENDING"]
      );

    if (!batch.length) {
      break;
    }

    for (const thread of batch) {
      if (thread?.threadID) {
        requests.push(thread);
      }
    }

    if (batch.length < 50) {
      break;
    }

    const last =
      batch[batch.length - 1];

    cursor =
      last?.timestamp || null;

    if (!cursor) {
      break;
    }
  }

  const seen = new Set();

  return requests.filter(
    request => {
      const id =
        String(
          request.threadID
        );

      if (seen.has(id)) {
        return false;
      }

      seen.add(id);

      return true;
    }
  );
}

// ======================================================
// جلب Other / Spam
// ======================================================

async function getAllOtherMessages(
  api
) {
  const messages = [];
  let cursor = null;

  for (
    let page = 0;
    page < 5;
    page++
  ) {
    const batch =
      await getThreadList(
        api,
        50,
        cursor,
        ["OTHER"]
      );

    if (!batch.length) {
      break;
    }

    for (const thread of batch) {
      if (thread?.threadID) {
        messages.push(thread);
      }
    }

    if (batch.length < 50) {
      break;
    }

    const last =
      batch[batch.length - 1];

    cursor =
      last?.timestamp || null;

    if (!cursor) {
      break;
    }
  }

  const seen = new Set();

  return messages.filter(
    message => {
      const id =
        String(
          message.threadID
        );

      if (seen.has(id)) {
        return false;
      }

      seen.add(id);

      return true;
    }
  );
}

// ======================================================
// أسماء المحادثات
// ======================================================

function groupName(group) {
  return (
    group.name ||
    group.threadName ||
    `غروب ${group.threadID}`
  );
}

function requestName(request) {
  return (
    request.name ||
    request.threadName ||
    request.senderName ||
    request.snippet ||
    `مستخدم ${request.threadID}`
  );
}

function otherMessageName(thread) {
  return (
    thread.name ||
    thread.threadName ||
    thread.senderName ||
    thread.snippet ||
    `مستخدم ${thread.threadID}`
  );
}

// ======================================================
// حالة الأوامر
// ======================================================

function commandStatus(
  tid,
  command
) {
  return ctrl.isEnabled(
    tid,
    command
  )
    ? "🟢 مفعل"
    : "⚫ معطل";
}

// ======================================================
// REPLY SYSTEM
// ======================================================

function registerReply(
  api,
  event,
  state,
  callback
) {
  if (
    !state?.messageID ||
    !global.GoatBot?.onReply
  ) {
    return;
  }

  const key =
    `chats_${state.messageID}`;

  global.GoatBot.onReply.set(
    key,
    {
      messageID:
        state.messageID,

      author:
        String(
          event.senderID
        ),

      ts: Date.now(),

      callback:
        async ({
          api: replyApi,
          event: replyEvent,
          message
        }) => {
          if (
            String(
              replyEvent.senderID
            ) !==
            String(
              event.senderID
            )
          ) {
            return;
          }

          await callback({
            api: replyApi,
            event: replyEvent,
            message,
            state,
            input:
              String(
                replyEvent.body ||
                  ""
              ).trim(),
          });
        },
    }
  );
}

async function sendReplyMenu(
  api,
  event,
  body,
  state,
  callback
) {
  await send(
    api,
    body,
    event.threadID,
    (
      _error,
      info
    ) => {
      if (
        info?.messageID
      ) {
        registerReply(
          api,
          event,
          {
            ...state,
            messageID:
              info.messageID
          },
          callback
        );
      }
    }
  );
}

// ======================================================
// قبول المحادثة / طلب المراسلة
// ======================================================

async function acceptConversation(
  api,
  threadID
) {
  const tid =
    String(threadID);

  let accepted = false;
  let acceptError = null;

  /*
   * محاولة قبول طلب المراسلة.
   *
   * بعض إصدارات FCA توفر:
   * api.handleMessageRequest(threadID, true)
   */
  try {
    if (
      typeof api.handleMessageRequest ===
      "function"
    ) {
      await new Promise(
        resolve => {
          let done = false;

          const finish = (
            error
          ) => {
            if (done) {
              return;
            }

            done = true;

            if (error) {
              acceptError =
                error;
            } else {
              accepted = true;
            }

            resolve();
          };

          try {
            const result =
              api.handleMessageRequest(
                tid,
                true,
                finish
              );

            if (
              result &&
              typeof result.then ===
                "function"
            ) {
              result
                .then(() =>
                  finish(null)
                )
                .catch(
                  error =>
                    finish(error)
                );
            }
          } catch (error) {
            finish(error);
          }
        }
      );
    }
  } catch (error) {
    acceptError = error;
  }

  /*
   * بعد محاولة القبول نرسل الترحيب.
   *
   * إذا كانت المحادثة أصلًا عادية
   * فسيتم إرسال "اهلاً" أيضًا.
   */
  let helloSent = false;
  let helloError = null;

  try {
    await new Promise(
      resolve => {
        let done = false;

        const finish = (
          error
        ) => {
          if (done) {
            return;
          }

          done = true;

          if (error) {
            helloError =
              error;
          } else {
            helloSent = true;
          }

          resolve();
        };

        try {
          const result =
            api.sendMessage(
              "اهلاً",
              tid,
              finish
            );

          if (
            result &&
            typeof result.then ===
              "function"
          ) {
            result
              .then(() =>
                finish(null)
              )
              .catch(
                error =>
                  finish(error)
              );
          }
        } catch (error) {
          finish(error);
        }
      }
    );
  } catch (error) {
    helloError = error;
  }

  return {
    accepted,
    acceptError,
    helloSent,
    helloError
  };
}

// ======================================================
// القائمة الرئيسية
// ======================================================

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

// ======================================================
// قائمة الغروبات
// ======================================================

function buildGroupList(
  groups
) {
  let body =
    `👥 الغروبات (${groups.length})\n` +
    "━━━━━━━━━━━━━━━━\n";

  groups
    .slice(0, 30)
    .forEach(
      (
        group,
        index
      ) => {
        body +=
          `${index + 1}. ${groupName(group)}\n` +
          `   🆔 ${group.threadID}\n\n`;
      }
    );

  body +=
    "━━━━━━━━━━━━━━━━\n" +
    "↩️ رد برقم الغروب لإدارة أوامره\n" +
    "0️⃣ العودة";

  return body;
}

// ======================================================
// قائمة طلبات المراسلة
// ======================================================

function buildMessageRequestList(
  requests
) {
  let body =
    `📩 طلبات المراسلة (${requests.length})\n` +
    "━━━━━━━━━━━━━━━━\n";

  requests
    .slice(0, 30)
    .forEach(
      (
        request,
        index
      ) => {
        body +=
          `${index + 1}. ${requestName(request)}\n` +
          `   🆔 ${request.threadID}\n`;

        if (
          request.snippet
        ) {
          body +=
            `   💬 ${String(request.snippet).slice(0, 80)}\n`;
        }

        body += "\n";
      }
    );

  body +=
    "━━━━━━━━━━━━━━━━\n" +
    "📌 اختر رقم الطلب لإدارته.\n" +
    "0️⃣ العودة";

  return body;
}

// ======================================================
// قائمة Other / Spam
// ======================================================

function buildOtherMessageList(
  messages
) {
  let body =
    `🚨 غير مهم / Spam (${messages.length})\n` +
    "━━━━━━━━━━━━━━━━\n";

  messages
    .slice(0, 30)
    .forEach(
      (
        thread,
        index
      ) => {
        body +=
          `${index + 1}. ${otherMessageName(thread)}\n` +
          `   🆔 ${thread.threadID}\n`;

        if (
          thread.snippet
        ) {
          body +=
            `   💬 ${String(thread.snippet).slice(0, 80)}\n`;
        }

        body += "\n";
      }
    );

  body +=
    "━━━━━━━━━━━━━━━━\n" +
    "📌 اختر رقم المحادثة لإدارتها.\n" +
    "0️⃣ العودة";

  return body;
}

// ======================================================
// تفاصيل طلب المراسلة
// ======================================================

function buildMessageRequestDetails(
  request
) {
  return (
    `📩 طلب مراسلة\n` +
    "━━━━━━━━━━━━━━━━\n" +
    `👤 الاسم: ${requestName(request)}\n` +
    `🆔 Thread ID: ${request.threadID}\n` +
    (
      request.snippet
        ? `💬 الرسالة: ${request.snippet}\n`
        : ""
    ) +
    "━━━━━━━━━━━━━━━━\n" +
    "1️⃣ ✅ قبول وإرسال اهلاً\n" +
    "0️⃣ ↩️ العودة إلى الطلبات"
  );
}

// ======================================================
// تفاصيل Other / Spam
// ======================================================

function buildOtherMessageDetails(
  thread
) {
  return (
    `🚨 محادثة غير مهمة / Spam\n` +
    "━━━━━━━━━━━━━━━━\n" +
    `👤 الاسم: ${otherMessageName(thread)}\n` +
    `🆔 Thread ID: ${thread.threadID}\n` +
    (
      thread.snippet
        ? `💬 الرسالة: ${thread.snippet}\n`
        : ""
    ) +
    "━━━━━━━━━━━━━━━━\n" +
    "1️⃣ ✅ قبول وإرسال اهلاً\n" +
    "0️⃣ ↩️ العودة"
  );
}

// ======================================================
// أفعال الغروب
// ======================================================

function buildGroupActions(
  group
) {
  const tid =
    String(
      group.threadID
    );

  let body =
    `👥 ${groupName(group)}\n` +
    `🆔 ${tid}\n`;

  body +=
    "━━━━━━━━━━━━━━━━\n";

  MANAGED_COMMANDS.forEach(
    (
      command,
      index
    ) => {
      body +=
        `${index + 1}. /${command.name} — ` +
        `${commandStatus(
          tid,
          command.name
        )}\n`;
    }
  );

  body +=
    "━━━━━━━━━━━━━━━━\n" +
    "↩️ رد برقم الأمر لتبديل حالته\n" +
    "0️⃣ العودة إلى قائمة الغروبات";

  return body;
}

// ======================================================
// طلب أمر للغروب
// ======================================================

function buildCommandPrompt(
  group
) {
  return (
    `✅ تم اختيار الغروب: ${groupName(group)}\n` +
    `🆔 ${group.threadID}\n` +
    "━━━━━━━━━━━━━━━━\n" +
    "أرسل الآن الأمر الذي تريد تفعيله في هذا الغروب بالرد على هذه الرسالة:\n\n" +
    "• /angel hh 60 80\n" +
    "• /nm hhh 5 15\n" +
    "• /nick hhh\n\n" +
    "0️⃣ إلغاء"
  );
}

// ======================================================
// Parse Managed Command
// ======================================================

function parseManagedCommand(
  input
) {
  const prefix =
    global.GoatBot?.config?.prefix ||
    "/";

  const raw =
    String(input || "")
      .trim();

  if (
    !raw.startsWith(
      prefix
    )
  ) {
    return null;
  }

  const parts =
    raw
      .slice(
        prefix.length
      )
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  const name =
    String(
      parts.shift() ||
        ""
    ).toLowerCase();

  if (
    !MANAGED_COMMAND_NAMES.has(
      name
    )
  ) {
    return null;
  }

  const command =
    global.GoatBot?.commands?.get(
      name
    );

  if (
    !command?.onStart
  ) {
    return null;
  }

  return {
    name,
    args: parts,
    command
  };
}

// ======================================================
// Remote Message
// ======================================================

function buildRemoteMessage(
  api,
  targetEvent
) {
  return {
    reply: (
      body,
      callback
    ) =>
      send(
        api,
        body,
        targetEvent.threadID,
        callback
      ),

    unsend: (
      messageID,
      callback
    ) => {
      try {
        return api.unsendMessage(
          messageID ||
            targetEvent.messageID,
          callback
        );
      } catch (_) {}
    },

    react: (
      emoji,
      messageID,
      callback
    ) => {
      try {
        return api.setMessageReaction(
          emoji,
          messageID ||
            targetEvent.messageID,
          callback ||
            (() => {}),
          true
        );
      } catch (_) {}
    },

    send: (
      body,
      threadID,
      callback
    ) =>
      send(
        api,
        body,
        threadID ||
          targetEvent.threadID,
        callback
      ),
  };
}

// ======================================================
// تنفيذ الأمر في غروب آخر
// ======================================================

async function executeRemoteCommand(
  api,
  sourceEvent,
  sourceMessage,
  group,
  input
) {
  const parsed =
    parseManagedCommand(
      input
    );

  if (!parsed) {
    return sourceMessage.reply(
      "❌ أمر غير مدعوم.\n" +
      "الأوامر المتاحة:\n" +
      "/angel [رسالة] [min] [max]\n" +
      "/nm [اسم] [min] [max]\n" +
      "/nick [اسم]\n" +
      "أرسل 0 للإلغاء."
    );
  }

  const targetThreadID =
    String(
      group.threadID
    );

  ctrl.setCommandEnabled(
    targetThreadID,
    parsed.name,
    true
  );

  const targetEvent = {
    ...sourceEvent,

    type: "message",

    messageID:
      `chats_remote_${Date.now()}`,

    threadID:
      targetThreadID,

    isGroup: true,

    body:
      String(input).trim(),
  };

  try {
    await parsed.command.onStart({
      api,
      event: targetEvent,
      args: parsed.args,
      commandName:
        parsed.name,

      message:
        buildRemoteMessage(
          api,
          targetEvent
        ),

      prefix:
        global.GoatBot?.config?.prefix ||
        "/",

      role: 2,

      senderID:
        sourceEvent.senderID,

      threadID:
        targetThreadID,
    });

    return sourceMessage.reply(
      `✅ تم إرسال /${parsed.name} إلى غروب "${groupName(group)}".\n` +
      "يمكنك إرسال أمر آخر بالرد على رسالة الغروب نفسها."
    );
  } catch (error) {
    global.log?.error?.(
      "CHATS_REMOTE",
      `فشل تنفيذ /${parsed.name}: ${error.message}`
    );

    return sourceMessage.reply(
      `❌ تعذر تنفيذ /${parsed.name} في غروب "${groupName(group)}": ${error.message}`
    );
  }
}

// ======================================================
// التحكم بأوامر الغروب
// ======================================================

async function showGroupCommandPrompt(
  api,
  event,
  group
) {
  return sendReplyMenu(
    api,
    event,
    buildCommandPrompt(
      group
    ),
    {
      step:
        "COMMAND_INPUT",

      group
    },

    async ({
      api: replyApi,
      event: replyEvent,
      message,
      state,
      input
    }) => {
      if (
        input === "0"
      ) {
        return message.reply(
          "✅ تم إلغاء التحكم بالغروب."
        );
      }

      return executeRemoteCommand(
        replyApi,
        event,
        message,
        state.group,
        input
      );
    }
  );
}

async function showGroupActions(
  api,
  event,
  group
) {
  return sendReplyMenu(
    api,
    event,
    buildGroupActions(
      group
    ),
    {
      step:
        "GROUP_ACTION",

      group
    },

    async ({
      api: actionApi,
      event: actionEvent,
      message: actionMessage,
      state: actionState,
      input: actionInput
    }) => {
      if (
        actionInput === "0"
      ) {
        return showGroups(
          actionApi,
          actionEvent
        );
      }

      const commandIndex =
        Number.parseInt(
          actionInput,
          10
        ) - 1;

      if (
        !Number.isInteger(
          commandIndex
        ) ||
        commandIndex < 0 ||
        commandIndex >=
          MANAGED_COMMANDS.length
      ) {
        return actionMessage.reply(
          `❌ رقم غير صحيح. اختر من 1 إلى ${MANAGED_COMMANDS.length} أو 0 للعودة.`
        );
      }

      const command =
        MANAGED_COMMANDS[
          commandIndex
        ];

      const enabled =
        !ctrl.isEnabled(
          actionState.group.threadID,
          command.name
        );

      ctrl.setCommandEnabled(
        actionState.group.threadID,
        command.name,
        enabled
      );

      return showGroupActions(
        actionApi,
        actionEvent,
        actionState.group
      ).then(() =>
        actionMessage.reply(
          `✅ تم ${enabled ? "تفعيل" : "تعطيل"} /${command.name} في "${groupName(actionState.group)}"`
        )
      );
    }
  );
}

// ======================================================
// الغروبات
// ======================================================

async function showGroups(
  api,
  event
) {
  const groups =
    await getAllGroups(
      api
    );

  if (!groups.length) {
    return send(
      api,
      "📭 لم أجد غروبات يديرها البوت حالياً.",
      event.threadID
    );
  }

  return sendReplyMenu(
    api,
    event,
    buildGroupList(
      groups
    ),
    {
      step:
        "GROUP_LIST",

      groups
    },

    async ({
      api: replyApi,
      event: replyEvent,
      message,
      state,
      input
    }) => {
      if (
        input === "0"
      ) {
        return showMainMenu(
          replyApi,
          replyEvent
        );
      }

      const index =
        Number.parseInt(
          input,
          10
        ) - 1;

      if (
        !Number.isInteger(
          index
        ) ||
        index < 0 ||
        index >=
          Math.min(
            state.groups.length,
            30
          )
      ) {
        return message.reply(
          `❌ رقم غير صحيح. اختر من 1 إلى ${Math.min(state.groups.length, 30)}.`
        );
      }

      const selected =
        state.groups[index];

      return showGroupCommandPrompt(
        replyApi,
        replyEvent,
        selected
      );
    }
  );
}

// ======================================================
// طلبات المراسلة
// ======================================================

async function showMessageRequests(
  api,
  event
) {
  const requests =
    await getAllMessageRequests(
      api
    );

  if (!requests.length) {
    return sendReplyMenu(
      api,
      event,

      "📩 طلبات المراسلة\n" +
      "━━━━━━━━━━━━━━━━\n" +
      "📭 لا توجد طلبات مراسلة حالياً.\n" +
      "━━━━━━━━━━━━━━━━\n" +
      "0️⃣ العودة",

      {
        step:
          "REQUESTS_EMPTY"
      },

      async ({
        api: replyApi,
        event: replyEvent,
        message,
        input
      }) => {
        if (
          input === "0"
        ) {
          return showMainMenu(
            replyApi,
            replyEvent
          );
        }

        return message.reply(
          "❌ اختر 0 للعودة."
        );
      }
    );
  }

  return sendReplyMenu(
    api,
    event,

    buildMessageRequestList(
      requests
    ),

    {
      step:
        "MESSAGE_REQUESTS",

      requests
    },

    async ({
      api: replyApi,
      event: replyEvent,
      message,
      state,
      input
    }) => {
      if (
        input === "0"
      ) {
        return showMainMenu(
          replyApi,
          replyEvent
        );
      }

      const index =
        Number.parseInt(
          input,
          10
        ) - 1;

      if (
        !Number.isInteger(
          index
        ) ||
        index < 0 ||
        index >=
          Math.min(
            state.requests.length,
            30
          )
      ) {
        return message.reply(
          `❌ رقم غير صحيح. اختر من 1 إلى ${Math.min(state.requests.length, 30)}.`
        );
      }

      const selected =
        state.requests[index];

      return sendReplyMenu(
        replyApi,
        replyEvent,

        buildMessageRequestDetails(
          selected
        ),

        {
          step:
            "REQUEST_DETAILS",

          requests:
            state.requests,

          request:
            selected
        },

        async ({
          api: detailsApi,
          event: detailsEvent,
          message: detailsMessage,
          state: detailsState,
          input: detailsInput
        }) => {

          // العودة
          if (
            detailsInput ===
            "0"
          ) {
            return showMessageRequests(
              detailsApi,
              detailsEvent
            );
          }

          // قبول
          if (
            detailsInput ===
            "1" ||
            detailsInput
              .toLowerCase() ===
              "قبول" ||
            detailsInput
              .toLowerCase() ===
              "accept"
          ) {
            const result =
              await acceptConversation(
                detailsApi,
                detailsState.request.threadID
              );

            if (
              result.helloSent
            ) {
              return detailsMessage.reply(
                "✅ تم قبول المحادثة.\n" +
                "👋 تم إرسال: اهلاً"
              );
            }

            return detailsMessage.reply(
              "⚠️ تمت محاولة قبول المحادثة، لكن تعذر إرسال رسالة «اهلاً».\n" +
              (
                result.helloError?.message ||
                "تحقق من صلاحيات الحساب أو اتصال البوت."
              )
            );
          }

          return detailsMessage.reply(
            "❌ اختيار غير صحيح.\n" +
            "1️⃣ قبول\n" +
            "0️⃣ العودة"
          );
        }
      );
    }
  );
}

// ======================================================
// Other / Spam
// ======================================================

async function showOtherMessages(
  api,
  event
) {
  const messages =
    await getAllOtherMessages(
      api
    );

  if (!messages.length) {
    return sendReplyMenu(
      api,
      event,

      "🚨 غير مهم / Spam\n" +
      "━━━━━━━━━━━━━━━━\n" +
      "📭 لا توجد محادثات في تصنيف Other حالياً.\n" +
      "━━━━━━━━━━━━━━━━\n" +
      "0️⃣ العودة",

      {
        step:
          "OTHER_EMPTY"
      },

      async ({
        api: replyApi,
        event: replyEvent,
        message,
        input
      }) => {
        if (
          input === "0"
        ) {
          return showMainMenu(
            replyApi,
            replyEvent
          );
        }

        return message.reply(
          "❌ اختر 0 للعودة."
        );
      }
    );
  }

  return sendReplyMenu(
    api,
    event,

    buildOtherMessageList(
      messages
    ),

    {
      step:
        "OTHER_MESSAGES",

      messages
    },

    async ({
      api: replyApi,
      event: replyEvent,
      message,
      state,
      input
    }) => {
      if (
        input === "0"
      ) {
        return showMainMenu(
          replyApi,
          replyEvent
        );
      }

      const index =
        Number.parseInt(
          input,
          10
        ) - 1;

      if (
        !Number.isInteger(
          index
        ) ||
        index < 0 ||
        index >=
          Math.min(
            state.messages.length,
            30
          )
      ) {
        return message.reply(
          `❌ رقم غير صحيح. اختر من 1 إلى ${Math.min(state.messages.length, 30)}.`
        );
      }

      const selected =
        state.messages[index];

      return sendReplyMenu(
        replyApi,
        replyEvent,

        buildOtherMessageDetails(
          selected
        ),

        {
          step:
            "OTHER_DETAILS",

          messages:
            state.messages,

          message:
            selected
        },

        async ({
          api: detailsApi,
          event: detailsEvent,
          message: detailsMessage,
          state: detailsState,
          input: detailsInput
        }) => {

          // العودة
          if (
            detailsInput ===
            "0"
          ) {
            return showOtherMessages(
              detailsApi,
              detailsEvent
            );
          }

          // قبول + اهلاً
          if (
            detailsInput ===
            "1" ||
            detailsInput
              .toLowerCase() ===
              "قبول" ||
            detailsInput
              .toLowerCase() ===
              "accept"
          ) {
            const result =
              await acceptConversation(
                detailsApi,
                detailsState.message.threadID
              );

            if (
              result.helloSent
            ) {
              return detailsMessage.reply(
                "✅ تم قبول المحادثة.\n" +
                "👋 تم إرسال: اهلاً"
              );
            }

            return detailsMessage.reply(
              "⚠️ تمت محاولة قبول المحادثة، لكن تعذر إرسال رسالة «اهلاً».\n" +
              (
                result.helloError?.message ||
                "تحقق من صلاحيات الحساب أو اتصال البوت."
              )
            );
          }

          return detailsMessage.reply(
            "❌ اختيار غير صحيح.\n" +
            "1️⃣ قبول\n" +
            "0️⃣ العودة"
          );
        }
      );
    }
  );
}

// ======================================================
// قبول مباشر بواسطة Thread ID
// ======================================================

async function acceptByThreadID(
  api,
  event,
  message,
  threadID
) {
  const tid =
    String(
      threadID || ""
    ).trim();

  if (!tid) {
    return message.reply(
      "❌ يجب تحديد Thread ID.\n\n" +
      "مثال:\n" +
      "/chats accept 123456789"
    );
  }

  const result =
    await acceptConversation(
      api,
      tid
    );

  if (
    result.helloSent
  ) {
    return message.reply(
      "✅ تم قبول المحادثة بنجاح.\n" +
      `🆔 ${tid}\n` +
      "👋 تم إرسال: اهلاً"
    );
  }

  return message.reply(
    "⚠️ تمت محاولة قبول المحادثة، لكن تعذر إرسال «اهلاً».\n" +
    (
      result.helloError?.message ||
      result.acceptError?.message ||
      "حدث خطأ غير معروف."
    )
  );
}

// ======================================================
// القائمة الرئيسية
// ======================================================

async function showMainMenu(
  api,
  event
) {
  return sendReplyMenu(
    api,
    event,

    buildMainMenu(),

    {
      step:
        "MAIN_MENU"
    },

    async ({
      api: replyApi,
      event: replyEvent,
      message,
      input
    }) => {

      if (
        input === "1"
      ) {
        return showGroups(
          replyApi,
          replyEvent
        );
      }

      if (
        input === "2"
      ) {
        return showMessageRequests(
          replyApi,
          replyEvent
        );
      }

      if (
        input === "3"
      ) {
        return showOtherMessages(
          replyApi,
          replyEvent
        );
      }

      if (
        input === "4"
      ) {
        return showChatCount(
          replyApi,
          replyEvent
        );
      }

      if (
        input === "5"
      ) {
        return message.reply(
          `🔒 DM Lock: ${
            getDmLocked()
              ? "🟢 مفعل"
              : "⚫ معطل"
          }\n\n` +
          "استخدم:\n" +
          "/chats dm on\n" +
          "/chats dm off"
        );
      }

      return message.reply(
        "❌ اختيار غير صحيح. اختر من 1 إلى 5."
      );
    }
  );
}

// ======================================================
// الإحصائيات
// ======================================================

async function showChatCount(
  api,
  event
) {
  const threads =
    await getThreadList(
      api,
      50,
      null,
      ["INBOX"]
    );

  const groups =
    threads.filter(
      thread =>
        thread?.isGroup
    );

  const dms =
    threads.filter(
      thread =>
        !thread?.isGroup
    );

  const requests =
    await getAllMessageRequests(
      api
    );

  const other =
    await getAllOtherMessages(
      api
    );

  return sendReplyMenu(
    api,
    event,

    `📊 إحصائيات المحادثات\n` +
    "━━━━━━━━━━━━━━━━\n" +
    `👥 غروبات: ${groups.length}\n` +
    `💬 محادثات خاصة: ${dms.length}\n` +
    `📩 طلبات مراسلة: ${requests.length}\n` +
    `🚨 غير مهم / Other: ${other.length}\n` +
    `🔒 DM Lock: ${
      getDmLocked()
        ? "مفعل"
        : "معطل"
    }\n` +
    "━━━━━━━━━━━━━━━━\n" +
    "0️⃣ العودة",

    {
      step:
        "CHAT_COUNT"
    },

    async ({
      api: replyApi,
      event: replyEvent,
      message,
      input
    }) => {
      if (
        input === "0"
      ) {
        return showMainMenu(
          replyApi,
          replyEvent
        );
      }

      return message.reply(
        "❌ اختر 0 للعودة."
      );
    }
  );
}

// ======================================================
// MODULE
// ======================================================

module.exports = {

  config: {

    name: "chats",

    aliases: [
      "محادثات",
      "chat"
    ],

    version: "4.2",

    author:
      "DJAMEL",

    countDown: 3,

    role: 2,

    category:
      "management",

    description:
      "إدارة المحادثات والغروبات وطلبات المراسلة والمحادثات غير المهمة وقبولها وإرسال الترحيب",

    guide: {
      en:
        "{pn} — القائمة الرئيسية\n" +
        "{pn} list — قائمة الغروبات\n" +
        "{pn} requests — طلبات المراسلة\n" +
        "{pn} other — المحادثات غير المهمة\n" +
        "{pn} spam — المحادثات غير المهمة\n" +
        "{pn} accept THREAD_ID — قبول محادثة وإرسال اهلاً\n" +
        "{pn} count — إحصائيات المحادثات\n" +
        "{pn} dm on/off — قفل أو فتح الخاص",
    },
  },

  onStart:
    async function({
      api,
      event,
      args,
      message
    }) {

      // ==================================================
      // حماية الأدمن
      // ==================================================

      if (
        !isAdmin(
          event.senderID
        )
      ) {
        return message.reply(
          "⛔ للأدمن فقط."
        );
      }

      const sub =
        String(
          args[0] || ""
        ).toLowerCase();

      // ==================================================
      // DM LOCK
      // ==================================================

      if (
        sub === "dm"
      ) {

        const action =
          String(
            args[1] || ""
          ).toLowerCase();

        if (
          action ===
          "on"
        ) {

          setDmLocked(
            true
          );

          return message.reply(
            "✅ تم تفعيل DM Lock — البوت لن يرد على الرسائل الخاصة."
          );
        }

        if (
          action ===
          "off"
        ) {

          setDmLocked(
            false
          );

          return message.reply(
            "✅ تم إلغاء DM Lock."
          );
        }

        return message.reply(
          `🔒 DM Lock: ${
            getDmLocked()
              ? "مفعل"
              : "معطل"
          }\n` +
          "استخدم: /chats dm on/off"
        );
      }

      // ==================================================
      // قبول مباشر
      // ==================================================

      if (
        sub ===
          "accept" ||
        sub ===
          "قبول"
      ) {

        const threadID =
          args[1];

        return acceptByThreadID(
          api,
          event,
          message,
          threadID
        );
      }

      // ==================================================
      // إحصائيات
      // ==================================================

      if (
        sub ===
        "count"
      ) {
        return showChatCount(
          api,
          event
        );
      }

      // ==================================================
      // طلبات المراسلة
      // ==================================================

      if (
        sub ===
          "requests" ||
        sub ===
          "pending" ||
        sub ===
          "طلبات"
      ) {
        return showMessageRequests(
          api,
          event
        );
      }

      // ==================================================
      // Other / Spam
      // ==================================================

      if (
        sub ===
          "other" ||
        sub ===
          "spam" ||
        sub ===
          "غيرمهم"
      ) {
        return showOtherMessages(
          api,
          event
        );
      }

      // ==================================================
      // الغروبات
      // ==================================================

      if (
        sub ===
          "list" ||
        sub ===
          "groups"
      ) {
        return showGroups(
          api,
          event
        );
      }

      // ==================================================
      // القائمة الرئيسية
      // ==================================================

      if (!sub) {
        return showMainMenu(
          api,
          event
        );
      }

      // ==================================================
      // الاستخدام
      // ==================================================

      return message.reply(
        "📌 الاستخدام:\n" +
        "/chats — القائمة الرئيسية\n" +
        "/chats list — الغروبات\n" +
        "/chats requests — طلبات المراسلة\n" +
        "/chats other — غير مهم / Spam\n" +
        "/chats accept [Thread ID] — قبول وإرسال اهلاً\n" +
        "/chats count — الإحصائيات\n" +
        "/chats dm on/off"
      );
    },

  // ====================================================
  // Compatibility
  // ====================================================

  onReply:
    async function() {}
}; البوت حالياً.", event.threadID);
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
     return showGroupCommandPrompt(replyApi, replyEvent, selected);
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
     description: "إدارة المحادثات والغروبات وتشغيل أوامرها عن بعد",
    guide: {
       en: "{pn} — اختيار غروب ثم إرسال أمر Angel أو NM أو Nick إليه\n" +
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

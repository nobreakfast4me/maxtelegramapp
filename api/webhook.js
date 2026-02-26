export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  const BOT_TOKEN = '8621322586:AAEseTenSqpSmmokdmdzWSB82S9pzPBps5o';
  const OWNER_ID = '1618777001';
  const OWNER_USERNAME = 'Maxknoepfle';
  const BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

  const post = (method, body) => fetch(`${BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const send = (chat_id, text, extra = {}) =>
    post('sendMessage', { chat_id, text, parse_mode: 'Markdown', ...extra });

  const answerCb = (id) =>
    post('answerCallbackQuery', { callback_query_id: id, text: '' });

  const removeButtons = (chat_id, message_id) =>
    post('editMessageReplyMarkup', { chat_id, message_id, reply_markup: { inline_keyboard: [] } });

  const mainMenu = (cid, ot) => ({
    inline_keyboard: [
      [{ text: '📍 Wo ist meine Bestellung?', callback_data: `location|${cid}|${ot}` }],
      [{ text: '⏱ Wie lange noch?', callback_data: `eta|${cid}|${ot}` }],
      [{ text: '➕ Extra hinzufügen', callback_data: `extra|${cid}|${ot}` }],
      [{ text: '🔄 Bestellung ändern', callback_data: `change|${cid}|${ot}` }],
      [{ text: '❌ Stornieren', callback_data: `cancel|${cid}|${ot}` }],
      [{ text: '💬 Direkt mit Max schreiben', url: `https://t.me/${OWNER_USERNAME}` }],
    ]
  });

  const body = req.body;

  try {
    if (body.callback_query) {
      const cb = body.callback_query;
      const parts = cb.data.split('|');
      const action = parts[0];
      const cid = parts[1];
      const ot = parts[2];
      const msgId = cb.message.message_id;
      const fromId = String(cb.from.id);

      await answerCb(cb.id);

      if (action === 'confirm') {
        await removeButtons(OWNER_ID, msgId);
        await send(OWNER_ID, `✅ *Bestätigt!* Kunde wird benachrichtigt.`, {
          reply_markup: { inline_keyboard: [[{ text: '💬 Chat mit Kunde', url: `tg://user?id=${cid}` }]] }
        });
        if (cid && cid !== 'undefined' && cid.length > 3) {
          await send(cid,
            `✅ *Deine Bestellung wurde bestätigt!* 🎉\n\nDein Essen wird jetzt frisch zubereitet 👨‍🍳\n\nWas brauchst du?`,
            { reply_markup: mainMenu(cid, ot) }
          );
        }

      } else if (action === 'decline') {
        await removeButtons(OWNER_ID, msgId);
        await send(OWNER_ID, '❌ Abgelehnt.');
        if (cid && cid !== 'undefined' && cid.length > 3) {
          await send(cid,
            `❌ *Deine Bestellung wurde leider abgelehnt.*\n\nBitte versuche es erneut oder schreib Max direkt.`,
            { reply_markup: { inline_keyboard: [[{ text: '💬 Max kontaktieren', url: `https://t.me/${OWNER_USERNAME}` }]] } }
          );
        }

      } else if (action === 'location') {
        await send(fromId, `📍 *Aktueller Status:*`, {
          reply_markup: { inline_keyboard: [
            [{ text: '👨‍🍳 Wird gekocht', callback_data: `setstatus|gekocht|${cid}|${ot}` }],
            [{ text: '📦 Wird verpackt', callback_data: `setstatus|verpackt|${cid}|${ot}` }],
            [{ text: '🛵 Fahrer unterwegs', callback_data: `setstatus|unterwegs|${cid}|${ot}` }],
            [{ text: '🏠 Gleich da!', callback_data: `setstatus|gleich|${cid}|${ot}` }],
            [{ text: '↩️ Zurück', callback_data: `menu|${cid}|${ot}` }],
          ]}
        });

      } else if (action === 'setstatus') {
        const map = {
          gekocht: '👨‍🍳 Wird gerade frisch gekocht — noch ~15-20 Min.',
          verpackt: '📦 Wird verpackt. Fahrer kommt gleich!',
          unterwegs: '🛵 Fahrer unterwegs — noch ~10-15 Min.',
          gleich: '🏠 Fahrer ist fast da — < 5 Min!',
        };
        const custId = parts[2];
        await send(custId, `📍 *Status:*\n\n${map[parts[1]]}`, { reply_markup: mainMenu(custId, parts[3]) });

      } else if (action === 'eta') {
        const ordered = parseInt(ot || '0');
        const elapsed = Math.floor((Date.now() - ordered) / 60000);
        const remaining = Math.max(5, 30 - elapsed);
        await send(fromId, `⏱ *Noch ca. ${remaining} Minuten!*\n\n_Bestellung vor ${elapsed} Min aufgegeben._`, {
          reply_markup: mainMenu(fromId, ot)
        });

      } else if (action === 'extra') {
        const ordered = parseInt(ot || '0');
        const mins = Math.floor(10 - (Date.now() - ordered) / 60000);
        if (mins > 0) {
          await send(fromId, `➕ *Extra hinzufügen*\n\nNoch *${mins} Minuten* im Zeitfenster!`, {
            reply_markup: { inline_keyboard: [
              [{ text: '🧀 Extra Käse +€1.00', callback_data: `addextra|Käse|${fromId}|${ot}` }],
              [{ text: '🌶️ Chili-Öl +€0.50', callback_data: `addextra|Chili-Öl|${fromId}|${ot}` }],
              [{ text: '🥤 Cola +€2.50', callback_data: `addextra|Cola|${fromId}|${ot}` }],
              [{ text: '🍟 Pommes +€3.50', callback_data: `addextra|Pommes|${fromId}|${ot}` }],
              [{ text: '↩️ Zurück', callback_data: `menu|${fromId}|${ot}` }],
            ]}
          });
        } else {
          await send(fromId, `⏰ *Zeitfenster abgelaufen.*\n\nDeine Bestellung kann nicht mehr geändert werden.`, {
            reply_markup: mainMenu(fromId, ot)
          });
        }

      } else if (action === 'addextra') {
        const extraName = parts[1];
        const custId = parts[2];
        await send(custId, `✅ *${extraName}* wurde hinzugefügt!`, { reply_markup: mainMenu(custId, parts[3]) });
        await send(OWNER_ID, `➕ *Extra-Wunsch:* "${extraName}" hinzufügen!`);

      } else if (action === 'change') {
        await send(fromId, `🔄 *Was möchtest du ändern?*`, {
          reply_markup: { inline_keyboard: [
            [{ text: '🥬 Zutat entfernen', callback_data: `changetype|zutat|${cid}|${ot}` }],
            [{ text: '➕ Artikel hinzufügen', callback_data: `extra|${cid}|${ot}` }],
            [{ text: '📍 Adresse ändern', callback_data: `changeaddr|${cid}|${ot}` }],
            [{ text: '🚫 Stornieren', callback_data: `cancel|${cid}|${ot}` }],
            [{ text: '↩️ Zurück', callback_data: `menu|${cid}|${ot}` }],
          ]}
        });

      } else if (action === 'changeaddr') {
        await send(fromId, `📍 Schreib deine neue Adresse als Nachricht in diesen Chat.`);
        await send(OWNER_ID, `📍 *Kunde möchte Adresse ändern!*`);

      } else if (action === 'changetype') {
        await send(fromId, `🥬 Schreib die Zutat die du entfernen möchtest als Nachricht.`);
        await send(OWNER_ID, `🥬 *Kunde möchte Zutat entfernen!*`);

      } else if (action === 'cancel') {
        await send(fromId, `❌ *Wirklich stornieren?*`, {
          reply_markup: { inline_keyboard: [
            [{ text: '✅ Ja, stornieren', callback_data: `confirmcancel|${cid}|${ot}` }],
            [{ text: '↩️ Nein, zurück', callback_data: `menu|${cid}|${ot}` }],
          ]}
        });

      } else if (action === 'confirmcancel') {
        await send(fromId, `✅ Bestellung storniert. Bis bald! 👋`);
        await send(OWNER_ID, `❌ *Kunde hat storniert!*`);

      } else if (action === 'menu') {
        await send(fromId, `Was kann ich für dich tun?`, { reply_markup: mainMenu(fromId, ot) });
      }

    } else if (body.message?.text) {
      const msg = body.message;
      const chatId = String(msg.chat.id);
      const text = msg.text;
      const userName = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;

      if (text.startsWith('/start')) {
        await send(chatId,
          `👋 *Hey ${msg.from.first_name}!*\n\nDu bist jetzt mit Max Delivery verbunden ✅\n\n⏳ Sobald Max deine Bestellung bestätigt bekommst du hier alle Updates!`
        );
      } else if (chatId !== OWNER_ID) {
        await send(OWNER_ID, `💬 *Nachricht von ${userName}:*\n\n"${text}"`, {
          reply_markup: { inline_keyboard: [[{ text: `💬 ${userName} antworten`, url: `tg://user?id=${chatId}` }]] }
        });
        await send(chatId, `✉️ Nachricht weitergeleitet. Max meldet sich gleich! ⚡`);
      }
    }
  } catch(e) {
    console.error('Webhook error:', e);
  }

  return res.status(200).json({ ok: true });
}

  const BOT_TOKEN = '8621322586:AAEseTenSqpSmmokdmdzWSB82S9pzPBps5o';
  const OWNER_ID = '1618777001';
  const OWNER_USERNAME = 'Maxknoepfle';
  const BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

  const post = (method, body) => fetch(`${BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const send = (chat_id, text, extra = {}) =>
    post('sendMessage', { chat_id, text, parse_mode: 'Markdown', ...extra });

  const answerCb = (id) =>
    post('answerCallbackQuery', { callback_query_id: id, text: '' });

  const removeButtons = (chat_id, message_id) =>
    post('editMessageReplyMarkup', { chat_id, message_id, reply_markup: { inline_keyboard: [] } });

  const mainMenu = (cid, ot) => ({
    inline_keyboard: [
      [{ text: '📍 Wo ist meine Bestellung?', callback_data: `location|${cid}|${ot}` }],
      [{ text: '⏱ Wie lange noch?', callback_data: `eta|${cid}|${ot}` }],
      [{ text: '➕ Extra hinzufügen', callback_data: `extra|${cid}|${ot}` }],
      [{ text: '🔄 Bestellung ändern', callback_data: `change|${cid}|${ot}` }],
      [{ text: '❌ Stornieren', callback_data: `cancel|${cid}|${ot}` }],
      [{ text: '💬 Direkt mit Max schreiben', url: `https://t.me/${OWNER_USERNAME}` }],
    ]
  });

  const body = req.body;

  if (body.callback_query) {
    const cb = body.callback_query;
    const parts = cb.data.split('|');
    const action = parts[0];
    const cid = parts[1];
    const ot = parts[2];
    const msgId = cb.message.message_id;
    const fromId = String(cb.from.id);

    // Answer immediately in parallel with everything else
    answerCb(cb.id);

    if (action === 'confirm') {
      await Promise.all([
        removeButtons(OWNER_ID, msgId),
        send(OWNER_ID, `✅ *Bestätigt!*`, {
          reply_markup: { inline_keyboard: [[{ text: '💬 Chat mit Kunde öffnen', url: `tg://user?id=${cid}` }]] }
        }),
        cid && cid !== 'undefined' ? send(cid,
          `✅ *Deine Bestellung wurde bestätigt!* 🎉\n\nDein Essen wird jetzt frisch zubereitet 👨‍🍳\n\nWas brauchst du?`,
          { reply_markup: mainMenu(cid, ot) }
        ) : Promise.resolve(),
      ]);

    } else if (action === 'decline') {
      await Promise.all([
        removeButtons(OWNER_ID, msgId),
        send(OWNER_ID, '❌ Abgelehnt.'),
        cid && cid !== 'undefined' ? send(cid,
          `❌ *Deine Bestellung wurde leider abgelehnt.*\n\nBitte versuche es erneut oder schreib Max direkt.`,
          { reply_markup: { inline_keyboard: [[{ text: '💬 Max kontaktieren', url: `https://t.me/${OWNER_USERNAME}` }]] } }
        ) : Promise.resolve(),
      ]);

    } else if (action === 'location') {
      await send(fromId, `📍 *Wo ist deine Bestellung?*`, {
        reply_markup: { inline_keyboard: [
          [{ text: '👨‍🍳 Wird gekocht', callback_data: `setstatus|gekocht|${cid}|${ot}` }],
          [{ text: '📦 Wird verpackt', callback_data: `setstatus|verpackt|${cid}|${ot}` }],
          [{ text: '🛵 Fahrer unterwegs', callback_data: `setstatus|unterwegs|${cid}|${ot}` }],
          [{ text: '🏠 Gleich da!', callback_data: `setstatus|gleich|${cid}|${ot}` }],
          [{ text: '↩️ Zurück', callback_data: `menu|${cid}|${ot}` }],
        ]}
      });

    } else if (action === 'setstatus') {
      const map = {
        gekocht: '👨‍🍳 Dein Essen wird gerade frisch gekocht — noch ~15-20 Min.',
        verpackt: '📦 Dein Essen wird verpackt. Der Fahrer kommt gleich!',
        unterwegs: '🛵 Fahrer ist unterwegs — noch ~10-15 Min.',
        gleich: '🏠 Der Fahrer ist fast da — noch < 5 Min!',
      };
      const custId = parts[2];
      await send(custId, `📍 *Status:*\n\n${map[parts[1]]}`, { reply_markup: mainMenu(custId, parts[3]) });

    } else if (action === 'eta') {
      const ordered = parseInt(ot || '0');
      const elapsed = Math.floor((Date.now() - ordered) / 60000);
      const remaining = Math.max(5, 30 - elapsed);
      await send(fromId, `⏱ *Noch ca. ${remaining} Minuten!*\n\n_Bestellung vor ${elapsed} Min aufgegeben._`, {
        reply_markup: mainMenu(fromId, ot)
      });

    } else if (action === 'extra') {
      const ordered = parseInt(ot || '0');
      const mins = Math.floor(10 - (Date.now() - ordered) / 60000);
      if (mins > 0) {
        await send(fromId, `➕ *Extra hinzufügen*\n\nNoch *${mins} Minuten* im Zeitfenster!`, {
          reply_markup: { inline_keyboard: [
            [{ text: '🧀 Extra Käse +€1.00', callback_data: `addextra|Käse|${fromId}|${ot}` }],
            [{ text: '🌶️ Chili-Öl +€0.50', callback_data: `addextra|Chili-Öl|${fromId}|${ot}` }],
            [{ text: '🥤 Cola +€2.50', callback_data: `addextra|Cola|${fromId}|${ot}` }],
            [{ text: '🍟 Pommes +€3.50', callback_data: `addextra|Pommes|${fromId}|${ot}` }],
            [{ text: '↩️ Zurück', callback_data: `menu|${fromId}|${ot}` }],
          ]}
        });
      } else {
        await send(fromId, `⏰ *Zeitfenster abgelaufen.*\n\nDeine Bestellung kann nicht mehr geändert werden.`, {
          reply_markup: mainMenu(fromId, ot)
        });
      }

    } else if (action === 'addextra') {
      const extraName = parts[1];
      const custId = parts[2];
      await Promise.all([
        send(custId, `✅ *${extraName}* wurde hinzugefügt!`, { reply_markup: mainMenu(custId, parts[3]) }),
        send(OWNER_ID, `➕ *Extra-Wunsch:* Kunde möchte "${extraName}" hinzufügen!`),
      ]);

    } else if (action === 'change') {
      await send(fromId, `🔄 *Was möchtest du ändern?*`, {
        reply_markup: { inline_keyboard: [
          [{ text: '🥬 Zutat entfernen', callback_data: `changetype|zutat|${cid}|${ot}` }],
          [{ text: '➕ Artikel hinzufügen', callback_data: `extra|${cid}|${ot}` }],
          [{ text: '📍 Adresse ändern', callback_data: `changeaddr|${cid}|${ot}` }],
          [{ text: '🚫 Stornieren', callback_data: `cancel|${cid}|${ot}` }],
          [{ text: '↩️ Zurück', callback_data: `menu|${cid}|${ot}` }],
        ]}
      });

    } else if (action === 'changeaddr') {
      await Promise.all([
        send(fromId, `📍 Schreib deine neue Adresse als Nachricht in diesen Chat.`),
        send(OWNER_ID, `📍 *Kunde möchte Adresse ändern!* Warte auf neue Nachricht.`),
      ]);

    } else if (action === 'changetype') {
      await Promise.all([
        send(fromId, `🥬 Schreib die Zutat die du entfernen möchtest als Nachricht.`),
        send(OWNER_ID, `🥬 *Kunde möchte Zutat entfernen!* Warte auf neue Nachricht.`),
      ]);

    } else if (action === 'cancel') {
      await send(fromId, `❌ *Wirklich stornieren?*`, {
        reply_markup: { inline_keyboard: [
          [{ text: '✅ Ja, stornieren', callback_data: `confirmcancel|${cid}|${ot}` }],
          [{ text: '↩️ Nein, zurück', callback_data: `menu|${cid}|${ot}` }],
        ]}
      });

    } else if (action === 'confirmcancel') {
      await Promise.all([
        send(fromId, `✅ Bestellung storniert. Bis bald! 👋`),
        send(OWNER_ID, `❌ *Kunde hat storniert!*`),
      ]);

    } else if (action === 'menu') {
      await send(fromId, `Was kann ich für dich tun?`, { reply_markup: mainMenu(fromId, ot) });
    }

    return;
  }

  // ── Text messages from customer ──────────────────────────────────────────
  if (body.message?.text) {
    const msg = body.message;
    const chatId = String(msg.chat.id);
    const text = msg.text;
    const userName = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;

    if (text.startsWith('/start')) {
      await send(chatId,
        `👋 *Hey ${msg.from.first_name}!*\n\nDu bist jetzt mit Max Delivery verbunden ✅\n\n⏳ Deine Bestellung wird geprüft — sobald Max bestätigt bekommst du hier alle Updates!`
      );
      return;
    }

    if (chatId !== OWNER_ID) {
      await Promise.all([
        send(OWNER_ID, `💬 *Nachricht von ${userName}:*\n\n"${text}"`, {
          reply_markup: { inline_keyboard: [[{ text: `💬 ${userName} antworten`, url: `tg://user?id=${chatId}` }]] }
        }),
        send(chatId, `✉️ Nachricht weitergeleitet. Max meldet sich gleich! ⚡`),
      ]);
    }
  }
}


  const BOT_TOKEN = '8621322586:AAEseTenSqpSmmokdmdzWSB82S9pzPBps5o';
  const OWNER_ID = '1618777001';
  const OWNER_USERNAME = 'Maxknoepfle';
  const BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

  async function send(chat_id, text, extra = {}) {
    await fetch(`${BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id, text, parse_mode: 'Markdown', ...extra }),
    });
  }

  async function editButtons(chat_id, message_id, buttons = []) {
    await fetch(`${BASE}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id, message_id, reply_markup: { inline_keyboard: buttons } }),
    });
  }

  async function answerCb(id, text) {
    await fetch(`${BASE}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: id, text }),
    });
  }

  // Main menu buttons for customer
  function mainMenu(cid, ot) {
    return {
      inline_keyboard: [
        [{ text: '📍 Wo ist meine Bestellung?', callback_data: `location|${cid}|${ot}` }],
        [{ text: '⏱ Wie lange noch?', callback_data: `eta|${cid}|${ot}` }],
        [{ text: '➕ Extra hinzufügen', callback_data: `extra|${cid}|${ot}` }],
        [{ text: '🔄 Bestellung ändern', callback_data: `change|${cid}|${ot}` }],
        [{ text: '❌ Stornieren', callback_data: `cancel|${cid}|${ot}` }],
        [{ text: '💬 Direkt mit Max schreiben', url: `https://t.me/${OWNER_USERNAME}` }],
      ]
    };
  }

  const body = req.body;

  if (body.callback_query) {
    const cb = body.callback_query;
    const parts = cb.data.split('|');
    const action = parts[0];
    const cid = parts[1];
    const ot = parts[2];
    const msgId = cb.message.message_id;
    const fromId = cb.from.id;

    // ⚡ ALWAYS answer callback first to stop the loading spinner
    await answerCb(cb.id, '');

    // ── OWNER: Bestätigen ──
    if (action === 'confirm') {
      await editButtons(OWNER_ID, msgId);

      if (cid && cid !== 'undefined' && cid !== '') {
        // Send owner a direct link to customer chat
        await send(OWNER_ID,
          `✅ *Bestätigt!*\n\nKunde wird benachrichtigt. Klick unten um den Chat zu öffnen:`,
          { reply_markup: { inline_keyboard: [[{ text: `💬 Chat mit Kunde öffnen`, url: `tg://user?id=${cid}` }]] } }
        );
        // Send customer the full menu
        await send(cid,
          `✅ *Deine Bestellung wurde bestätigt!* 🎉\n\nDein Essen wird jetzt frisch zubereitet. 👨‍🍳\n\nWas brauchst du?`,
          { reply_markup: mainMenu(cid, ot) }
        );
      } else {
        // No customer ID available (old order or browser test)
        await send(OWNER_ID,
          `✅ *Bestätigt!*\n\n⚠️ Kunde konnte nicht automatisch benachrichtigt werden (keine Chat-ID). Bitte manuell kontaktieren.`
        );
      }

    // ── OWNER: Ablehnen ──
    } else if (action === 'decline') {
      await editButtons(OWNER_ID, msgId);
      await send(OWNER_ID, '❌ Abgelehnt. Kunde wurde benachrichtigt.');
      await send(cid,
        `❌ *Deine Bestellung wurde leider abgelehnt.*\n\nMögliche Gründe: Ausverkauft, geschlossen oder technisches Problem.\n\nBitte versuche es später erneut oder schreib uns direkt.`,
        { reply_markup: { inline_keyboard: [[{ text: '💬 Max direkt kontaktieren', url: `https://t.me/${OWNER_USERNAME}` }]] } }
      );

    // ── CUSTOMER: Wo ist meine Bestellung? ──
    } else if (action === 'location') {
      await send(fromId,
        `📍 *Aktueller Status deiner Bestellung:*\n\nWähle den passenden Status:`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '👨‍🍳 Wird noch gekocht', callback_data: `status|gekocht|${cid}|${ot}` }],
              [{ text: '📦 Wird gerade verpackt', callback_data: `status|verpackt|${cid}|${ot}` }],
              [{ text: '🛵 Fahrer ist unterwegs', callback_data: `status|unterwegs|${cid}|${ot}` }],
              [{ text: '🏠 Gleich da (< 5 Min)', callback_data: `status|gleich|${cid}|${ot}` }],
              [{ text: '↩️ Zurück', callback_data: `menu|${cid}|${ot}` }],
            ]
          }
        }
      );

    // ── Status update (owner sets it) ──
    } else if (action === 'status') {
      const statusMap = {
        'gekocht': '👨‍🍳 Dein Essen wird gerade frisch gekocht. Noch ca. 15-20 Min.',
        'verpackt': '📦 Dein Essen wird gerade verpackt. Gleich kommt der Fahrer!',
        'unterwegs': '🛵 Der Fahrer ist unterwegs zu dir! Noch ca. 10-15 Min.',
        'gleich': '🏠 Der Fahrer ist fast bei dir — noch < 5 Minuten!',
      };
      const statusKey = parts[1];
      const custId = parts[2];
      await send(custId, `📍 *Status-Update:*\n\n${statusMap[statusKey]}`, {
        reply_markup: mainMenu(custId, parts[3])
      });
      await answerCb(cb.id, 'Status gesendet ✅');

    // ── CUSTOMER: Wie lange noch? ──
    } else if (action === 'eta') {
      const ordered = parseInt(ot || '0');
      const elapsed = Math.floor((Date.now() - ordered) / 60000);
      const remaining = Math.max(5, 30 - elapsed);
      await send(fromId,
        `⏱ *Geschätzte Lieferzeit:*\n\nNoch ca. *${remaining} Minuten* 🚀\n\n_Bestellung vor ${elapsed} Min aufgegeben_`,
        { reply_markup: mainMenu(fromId, ot) }
      );

    // ── CUSTOMER: Extra hinzufügen ──
    } else if (action === 'extra') {
      const ordered = parseInt(ot || '0');
      const withinWindow = (Date.now() - ordered) < 10 * 60 * 1000;
      if (withinWindow) {
        const remaining = Math.floor(10 - (Date.now() - ordered) / 60000);
        await send(fromId,
          `➕ *Extra hinzufügen*\n\n⚡ Noch *${remaining} Minuten* im Zeitfenster!\n\nWas möchtest du dazubestellen?`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🧀 Extra Käse +€1.00', callback_data: `addextra|Käse|${cid}|${ot}` }],
                [{ text: '🌶️ Chili-Öl +€0.50', callback_data: `addextra|Chili-Öl|${cid}|${ot}` }],
                [{ text: '🥤 Cola +€2.50', callback_data: `addextra|Cola|${cid}|${ot}` }],
                [{ text: '🍟 Pommes +€3.50', callback_data: `addextra|Pommes|${cid}|${ot}` }],
                [{ text: '🥗 Salat +€4.00', callback_data: `addextra|Salat|${cid}|${ot}` }],
                [{ text: '↩️ Zurück', callback_data: `menu|${cid}|${ot}` }],
              ]
            }
          }
        );
      } else {
        await send(fromId,
          `⏰ *Das 10-Minuten-Zeitfenster ist abgelaufen.*\n\nDeine Bestellung wird bereits zubereitet und kann nicht mehr geändert werden.`,
          { reply_markup: mainMenu(fromId, ot) }
        );
      }

    // ── Add extra item ──
    } else if (action === 'addextra') {
      const extraName = parts[1];
      const custId = parts[2];
      await send(custId, `✅ *${extraName}* wurde zu deiner Bestellung hinzugefügt!`, {
        reply_markup: mainMenu(custId, parts[3])
      });
      await send(OWNER_ID, `➕ *Extra-Wunsch:*\nKunde möchte "${extraName}" hinzufügen!`);

    // ── CUSTOMER: Bestellung ändern ──
    } else if (action === 'change') {
      await send(fromId,
        `🔄 *Was möchtest du ändern?*`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🥬 Zutat entfernen', callback_data: `changetype|zutat|${cid}|${ot}` }],
              [{ text: '➕ Artikel hinzufügen', callback_data: `extra|${cid}|${ot}` }],
              [{ text: '📍 Adresse ändern', callback_data: `changeaddr|${cid}|${ot}` }],
              [{ text: '🚫 Doch lieber stornieren', callback_data: `cancel|${cid}|${ot}` }],
              [{ text: '↩️ Zurück', callback_data: `menu|${cid}|${ot}` }],
            ]
          }
        }
      );

    // ── Change address ──
    } else if (action === 'changeaddr') {
      await send(fromId,
        `📍 *Adresse ändern:*\n\nSchreib deine neue Adresse direkt als Nachricht in diesen Chat. Max wird sie sofort sehen.`
      );
      await send(OWNER_ID, `📍 *Kunde möchte Adresse ändern!*\nBitte auf neue Nachricht warten.`);

    // ── Change ingredient ──
    } else if (action === 'changetype') {
      await send(fromId,
        `🥬 *Welche Zutat soll entfernt werden?*\n\nSchreib die Zutat als Nachricht in diesen Chat.`
      );
      await send(OWNER_ID, `🥬 *Kunde möchte eine Zutat entfernen!*\nBitte auf neue Nachricht warten.`);

    // ── CUSTOMER: Stornieren ──
    } else if (action === 'cancel') {
      await send(fromId,
        `❌ *Bestellung wirklich stornieren?*\n\nDieser Schritt kann nicht rückgängig gemacht werden.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Ja, stornieren', callback_data: `confirmcancel|${cid}|${ot}` }],
              [{ text: '↩️ Nein, zurück', callback_data: `menu|${cid}|${ot}` }],
            ]
          }
        }
      );

    // ── Confirm cancel ──
    } else if (action === 'confirmcancel') {
      await send(fromId, `✅ *Deine Bestellung wurde storniert.*\n\nWir hoffen dich bald wieder zu sehen! 👋`);
      await send(OWNER_ID, `❌ *Kunde hat storniert!*\nBestellung wurde abgebrochen.`);

    // ── Back to main menu ──
    } else if (action === 'menu') {
      await send(fromId, `_Was kann ich für dich tun?_`, { reply_markup: mainMenu(fromId, ot) });
    }

    return res.status(200).json({ ok: true });
  }

  // ── Customer sends text message ──────────────────────────────────────────
  if (body.message?.text) {
    const msg = body.message;
    const chatId = msg.chat.id;
    const text = msg.text;
    const userName = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;

    // Handle /start - welcome + waiting message
    if (text.startsWith('/start')) {
      await send(chatId,
        `👋 *Hey ${msg.from.first_name}!*\n\nDu bist jetzt mit Max Delivery verbunden. ✅\n\n⏳ Deine Bestellung wird gerade von Max geprüft.\n\nSobald er bestätigt, bekommst du hier automatisch alle Updates und Optionen!\n\n_Kein weiterer Schritt nötig — einfach warten._ 🍔`,
      );
      return res.status(200).json({ ok: true });
    }
      await send(OWNER_ID,
        `💬 *Nachricht von ${userName}:*\n\n"${text}"`,
        { reply_markup: { inline_keyboard: [[{ text: `💬 ${userName} antworten`, url: `tg://user?id=${chatId}` }]] } }
      );
      await send(chatId, `✉️ Deine Nachricht wurde weitergeleitet. Max meldet sich gleich! ⚡`);
    }
  }

  res.status(200).json({ ok: true });
}


  // ── Owner clicks Bestätigen / Ablehnen ──────────────────────────────────
  if (body.callback_query) {
    const cb = body.callback_query;
    const [action, customerChatId, orderTime] = cb.data.split('|');
    const msgId = cb.message.message_id;

    if (action === 'confirm') {
      // Notify owner
      await send(OWNER_ID, '✅ Bestellung bestätigt! Kunde wird benachrichtigt.');
      // Remove buttons from owner message
      await editButtons(OWNER_ID, msgId);
      // Notify customer
      if (customerChatId) {
        await send(customerChatId,
          '✅ *Deine Bestellung wurde bestätigt!*\n\nDein Essen wird jetzt zubereitet. 👨‍🍳\n\n_Tippe auf einen Button für Updates:_',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '📍 Status abfragen', callback_data: `status|${customerChatId}|${orderTime}` }],
                [{ text: '➕ Extra hinzufügen', callback_data: `extra|${customerChatId}|${orderTime}` }],
                [{ text: '❓ Frage stellen', callback_data: `question|${customerChatId}|${orderTime}` }],
              ]
            }
          }
        );
      }
    } else if (action === 'decline') {
      await send(OWNER_ID, '❌ Bestellung abgelehnt! Kunde wird benachrichtigt.');
      await editButtons(OWNER_ID, msgId);
      if (customerChatId) {
        await send(customerChatId,
          '❌ *Deine Bestellung wurde leider abgelehnt.*\n\nMögliche Gründe: Ausverkauft, geschlossen oder technisches Problem.\n\nBitte versuche es erneut oder wende dich direkt an uns.'
        );
      }
    } else if (action === 'status') {
      const stages = ['👨‍🍳 Wird zubereitet', '📦 Wird verpackt', '🛵 Fahrer unterwegs', '🏠 Fast da!'];
      const rand = stages[Math.floor(Math.random() * stages.length)];
      await answerCb(cb.id, rand);
      await send(customerChatId || cb.from.id,
        `📍 *Aktueller Status:*\n\n${rand}\n\n_Schätzung: noch ~15 Minuten_`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Status aktualisieren', callback_data: `status|${customerChatId}|${orderTime}` }],
              [{ text: '➕ Extra hinzufügen', callback_data: `extra|${customerChatId}|${orderTime}` }],
            ]
          }
        }
      );
    } else if (action === 'extra') {
      const now = Date.now();
      const ordered = parseInt(orderTime || '0');
      const withinWindow = (now - ordered) < 10 * 60 * 1000; // 10 Minuten

      if (withinWindow) {
        await answerCb(cb.id, 'Wähle dein Extra:');
        await send(customerChatId || cb.from.id,
          '➕ *Extra hinzufügen* (noch innerhalb des 10-Minuten-Fensters)\n\nWas möchtest du hinzufügen?',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🧀 Extra Käse +€1', callback_data: `addextra|Käse|${customerChatId}|${orderTime}` }],
                [{ text: '🌶️ Chili-Öl +€0.50', callback_data: `addextra|Chili-Öl|${customerChatId}|${orderTime}` }],
                [{ text: '🥤 Cola +€2.50', callback_data: `addextra|Cola|${customerChatId}|${orderTime}` }],
                [{ text: '🍟 Pommes +€3.50', callback_data: `addextra|Pommes|${customerChatId}|${orderTime}` }],
              ]
            }
          }
        );
      } else {
        await answerCb(cb.id, '⏰ Zeitfenster abgelaufen!');
        await send(customerChatId || cb.from.id,
          '⏰ *Das 10-Minuten-Fenster für Extras ist leider abgelaufen.*\n\nDeine Bestellung wird bereits zubereitet und kann nicht mehr geändert werden.'
        );
      }
    } else if (action === 'addextra') {
      const [, extraName, custId, oTime] = cb.data.split('|');
      await answerCb(cb.id, `${extraName} hinzugefügt! ✅`);
      await send(custId || cb.from.id, `✅ *${extraName}* wurde zu deiner Bestellung hinzugefügt!`);
      // Notify owner about extra
      await send(OWNER_ID, `➕ *Extra-Wunsch:* Kunde möchte "${extraName}" hinzufügen!`);
    } else if (action === 'question') {
      await answerCb(cb.id, 'Schreib deine Frage direkt in den Chat!');
      await send(customerChatId || cb.from.id,
        '❓ *Schreib deine Frage einfach als Nachricht* und wir antworten so schnell wie möglich!'
      );
    }

    return res.status(200).json({ ok: true });
  }

  // ── Customer sends a text message to the bot ─────────────────────────────
  if (body.message?.text) {
    const msg = body.message;
    const chatId = msg.chat.id;
    const text = msg.text;
    const userName = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;

    // Forward customer message to owner
    if (String(chatId) !== OWNER_ID) {
      await send(OWNER_ID,
        `💬 *Nachricht von ${userName}:*\n\n"${text}"\n\n_Chat-ID: ${chatId}_`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '↩️ Antworten', callback_data: `reply|${chatId}` }
            ]]
          }
        }
      );
      await send(chatId, '💬 Deine Nachricht wurde weitergeleitet. Wir melden uns gleich! ⚡');
    }
  }

  res.status(200).json({ ok: true });
}

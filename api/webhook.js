export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  const BOT_TOKEN = '8621322586:AAEseTenSqpSmmokdmdzWSB82S9pzPBps5o';
  const CHAT_ID = '1618777001';
  const body = req.body;

  if (body.callback_query) {
    const cb = body.callback_query;
    const action = cb.data;
    const msgId = cb.message.message_id;
    const confirmed = action === 'confirm';

    // Send reply to owner
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: confirmed
          ? '✅ Bestellung bestätigt! Der Kunde wird benachrichtigt.'
          : '❌ Bestellung abgelehnt! Der Kunde wird benachrichtigt.',
      }),
    });

    // Edit original message to remove buttons
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        message_id: msgId,
        reply_markup: { inline_keyboard: [] },
      }),
    });

    // Answer callback query (removes loading spinner)
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: cb.id,
        text: confirmed ? '✅ Bestätigt!' : '❌ Abgelehnt!',
      }),
    });
  }

  res.status(200).json({ ok: true });
}

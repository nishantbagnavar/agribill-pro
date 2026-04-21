// Sends alert messages to owner's Telegram chat.
// Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in .env to enable.
const https = require('https');

function sendTelegramAlert(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
  const req = https.request(
    {
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    },
    (res) => {
      // fire-and-forget; consume response to free socket
      res.resume();
    }
  );
  req.on('error', () => {}); // never crash the app on alert failure
  req.write(body);
  req.end();
}

module.exports = { sendTelegramAlert };

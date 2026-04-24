const { sqlite } = require('../../config/db');
const path = require('path');

// WhatsApp state (in-memory singleton)
let waClient = null;
let waStatus = 'DISCONNECTED'; // DISCONNECTED | QR_READY | CONNECTED
let waQR = null;
let waPhone = null;

function getStatus() {
  return { status: waStatus, qr: waQR, phone: waPhone };
}

async function init() {
  try {
    const { Client, LocalAuth } = require('whatsapp-web.js');
    waClient = new Client({
      authStrategy: new LocalAuth({ dataPath: path.join(process.cwd(), 'backend/wa-session') }),
      puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
    });

    waClient.on('qr', (qr) => {
      const qrcode = require('qrcode');
      qrcode.toDataURL(qr, (err, url) => {
        if (!err) { waQR = url; waStatus = 'QR_READY'; }
      });
      console.log('📱 WhatsApp QR ready — scan to connect');
    });

    waClient.on('ready', () => {
      waStatus = 'CONNECTED';
      waQR = null;
      waPhone = waClient.info?.wid?.user || null;
      console.log('✅ WhatsApp connected:', waPhone);
    });

    waClient.on('disconnected', () => {
      waStatus = 'DISCONNECTED';
      waQR = null;
      waPhone = null;
      console.log('⚠️  WhatsApp disconnected');
    });

    await waClient.initialize();
  } catch (e) {
    console.warn('⚠️  WhatsApp not available:', e.message);
    waStatus = 'DISCONNECTED';
  }
}

function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  const num = digits.startsWith('91') && digits.length === 12 ? digits : `91${digits.slice(-10)}`;
  return `${num}@c.us`;
}

async function sendMessage(phone, message) {
  if (!waClient || waStatus !== 'CONNECTED') throw new Error('WhatsApp not connected');
  await waClient.sendMessage(normalizePhone(phone), message);
  logMessage(phone, 'CUSTOM', message, 'SENT');
}

async function sendBillMessage(phone, billId, customerName) {
  if (!waClient || waStatus !== 'CONNECTED') throw new Error('WhatsApp not connected');
  const bill = sqlite.prepare(`SELECT * FROM bills WHERE id = ?`).get(billId);
  if (!bill) throw new Error('Bill not found');
  const text = [
    `🌾 *AgriBill Pro — Tax Invoice*`,
    `Dear ${customerName || bill.customer_name},`,
    `Your invoice *${bill.bill_number}* is ready.`,
    `📅 Date: ${bill.bill_date}`,
    `💰 Total: ₹${(bill.total_amount / 100).toLocaleString('en-IN')}`,
    `✅ Paid: ₹${(bill.paid_amount / 100).toLocaleString('en-IN')}`,
    bill.due_amount > 0 ? `⚠️ Due: ₹${(bill.due_amount / 100).toLocaleString('en-IN')}` : '✅ Fully Paid',
    `Thank you for your business!`,
  ].join('\n');
  await waClient.sendMessage(normalizePhone(phone), text);
  logMessage(phone, 'BILL', text, 'SENT', billId);
}

async function sendDueReminder(phone, name, amount, shopName) {
  if (!waClient || waStatus !== 'CONNECTED') throw new Error('WhatsApp not connected');
  const amountRs = `₹${(amount / 100).toLocaleString('en-IN')}`;
  const text = [
    `🔔 *थकबाकी स्मरणपत्र*`,
    `नमस्कार ${name},`,
    `आपल्याकडे *${shopName || 'आमच्या दुकानात'}* येणे बाकी आहे: *${amountRs}*`,
    `कृपया लवकरात लवकर पेमेंट करावे.`,
    `धन्यवाद! 🙏`,
  ].join('\n');
  await waClient.sendMessage(normalizePhone(phone), text);
  logMessage(phone, 'REMINDER', text, 'SENT');
}

async function sendBulkMessage(recipients, message) {
  const results = [];
  for (const r of recipients) {
    try {
      await sendMessage(r.phone, message.replace('{name}', r.name || '').replace('{amount}', r.amount || ''));
      results.push({ phone: r.phone, status: 'SENT' });
    } catch (e) {
      results.push({ phone: r.phone, status: 'FAILED', error: e.message });
      logMessage(r.phone, 'CUSTOM', message, 'FAILED');
    }
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay to avoid ban
  }
  return results;
}

async function disconnect() {
  if (waClient) { await waClient.destroy(); waClient = null; }
  waStatus = 'DISCONNECTED'; waQR = null; waPhone = null;
}

function logMessage(phone, type, message, status, referenceId = null) {
  try {
    sqlite.prepare(
      `INSERT INTO whatsapp_messages (phone, message_type, message, status, reference_id, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).run(phone, type, message, status, referenceId);
  } catch (e) { /* ignore logging errors */ }
}

module.exports = { init, getStatus, sendMessage, sendBillMessage, sendDueReminder, sendBulkMessage, disconnect };

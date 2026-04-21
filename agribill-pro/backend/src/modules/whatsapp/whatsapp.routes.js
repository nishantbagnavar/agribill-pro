const router = require('express').Router();
const { verifyToken } = require('../auth/auth.middleware');
const wa = require('./whatsapp.service');

router.use(verifyToken);

router.get('/status', (req, res, next) => {
  try { res.json({ success: true, data: wa.getStatus() }); }
  catch (e) { next(e); }
});

router.post('/send-bill', async (req, res, next) => {
  try {
    const { phone, bill_id, customer_name } = req.body;
    await wa.sendBillMessage(phone, bill_id, customer_name);
    res.json({ success: true, message: 'Bill sent via WhatsApp' });
  } catch (e) { next(e); }
});

router.post('/send-reminder', async (req, res, next) => {
  try {
    const { phone, name, amount, shop_name } = req.body;
    await wa.sendDueReminder(phone, name, amount, shop_name);
    res.json({ success: true, message: 'Reminder sent' });
  } catch (e) { next(e); }
});

router.post('/bulk-send', async (req, res, next) => {
  try {
    const { recipients, message } = req.body;
    const results = await wa.sendBulkMessage(recipients, message);
    res.json({ success: true, data: results });
  } catch (e) { next(e); }
});

router.post('/disconnect', async (req, res, next) => {
  try { await wa.disconnect(); res.json({ success: true, message: 'Disconnected' }); }
  catch (e) { next(e); }
});

module.exports = router;

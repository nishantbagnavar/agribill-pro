const router = require('express').Router();
const ctrl = require('./billing.controller');
const { verifyToken } = require('../auth/auth.middleware');
const { requireFeature } = require('../license/feature.middleware');

router.use(verifyToken);
router.use(requireFeature('billing'));

router.get('/next-bill-number', ctrl.getNextBillNumber);
router.get('/bills', ctrl.getAll);
router.get('/bills/:id', ctrl.getById);
router.post('/bills', ctrl.create);
router.post('/bills/:id/payment', ctrl.recordPayment);
router.get('/bills/:id/pdf', ctrl.downloadPdf);
router.get('/bills/:id/thermal-pdf', ctrl.downloadThermalPdf);
router.get('/bills/:id/whatsapp-link', ctrl.getWhatsAppLink);

module.exports = router;

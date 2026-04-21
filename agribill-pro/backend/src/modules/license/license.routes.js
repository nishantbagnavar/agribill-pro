const router = require('express').Router();
const { verifyToken } = require('../auth/auth.middleware');
const ctrl = require('./license.controller');

router.get('/status', ctrl.status);
router.post('/activate', ctrl.activate);
router.post('/verify', verifyToken, ctrl.verify);
router.post('/reset-hwid', verifyToken, ctrl.resetHwidHandler);
router.get('/lan-qr', verifyToken, ctrl.lanQr);

module.exports = router;

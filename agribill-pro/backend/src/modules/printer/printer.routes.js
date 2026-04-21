const router = require('express').Router();
const ctrl = require('./printer.controller');
const { verifyToken } = require('../auth/auth.middleware');

router.use(verifyToken);

router.get('/config', ctrl.getConfig);
router.post('/config', ctrl.saveConfig);
router.delete('/config', ctrl.clearConfig);
router.get('/discover', ctrl.discover);
router.get('/os-printers', ctrl.getOsPrinters);
router.post('/test', ctrl.testPrint);
router.post('/print/:billId', ctrl.printBill);

module.exports = router;

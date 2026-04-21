const router = require('express').Router();
const ctrl = require('./inventory.controller');
const { verifyToken } = require('../auth/auth.middleware');

router.use(verifyToken);

router.get('/transactions', ctrl.getTransactions);
router.get('/summary', ctrl.getSummary);

module.exports = router;

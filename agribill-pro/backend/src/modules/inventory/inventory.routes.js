const router = require('express').Router();
const ctrl = require('./inventory.controller');
const { verifyToken } = require('../auth/auth.middleware');
const { requireFeature } = require('../license/feature.middleware');

router.use(verifyToken);
router.use(requireFeature('inventory'));

router.get('/transactions', ctrl.getTransactions);
router.get('/summary', ctrl.getSummary);

module.exports = router;

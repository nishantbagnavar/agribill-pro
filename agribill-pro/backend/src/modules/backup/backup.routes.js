const router = require('express').Router();
const ctrl = require('./backup.controller');
const { verifyToken } = require('../auth/auth.middleware');

router.use(verifyToken);

router.get('/status', ctrl.getStatus);
router.post('/snapshot', ctrl.createSnapshot);
router.get('/snapshots', ctrl.listSnapshots);
router.post('/restore', ctrl.restoreSnapshot);

module.exports = router;

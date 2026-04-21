const router = require('express').Router();
const ctrl = require('./reports.controller');
const { verifyToken } = require('../auth/auth.middleware');

router.use(verifyToken);

router.get('/gst-summary', ctrl.getGSTSummary);

module.exports = router;

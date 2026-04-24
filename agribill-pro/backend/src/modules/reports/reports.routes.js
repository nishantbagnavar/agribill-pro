const router = require('express').Router();
const ctrl = require('./reports.controller');
const { verifyToken } = require('../auth/auth.middleware');
const { requireFeature } = require('../license/feature.middleware');

router.use(verifyToken);
router.use(requireFeature('reports'));

router.get('/gst-summary', ctrl.getGSTSummary);

module.exports = router;

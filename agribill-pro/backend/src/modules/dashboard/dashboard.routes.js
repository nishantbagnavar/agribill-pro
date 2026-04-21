const router = require('express').Router();
const { verifyToken } = require('../auth/auth.middleware');
const { sendSuccess } = require('../../utils/response');
const dash = require('./dashboard.service');

router.use(verifyToken);

router.get('/summary', (req, res, next) => {
  try { res.json({ success: true, data: dash.getSummary() }); }
  catch (e) { next(e); }
});

router.get('/sales-chart', (req, res, next) => {
  try { res.json({ success: true, data: dash.getSalesChart(Number(req.query.days) || 30) }); }
  catch (e) { next(e); }
});

router.get('/top-products', (req, res, next) => {
  try { res.json({ success: true, data: dash.getTopProducts(Number(req.query.limit) || 10) }); }
  catch (e) { next(e); }
});

router.get('/category-breakdown', (req, res, next) => {
  try { res.json({ success: true, data: dash.getCategoryBreakdown() }); }
  catch (e) { next(e); }
});

router.get('/recent-bills', (req, res, next) => {
  try { res.json({ success: true, data: dash.getRecentBills(Number(req.query.limit) || 10) }); }
  catch (e) { next(e); }
});

router.get('/alerts', (req, res, next) => {
  try { res.json({ success: true, data: dash.getAlerts() }); }
  catch (e) { next(e); }
});

module.exports = router;

const router = require('express').Router();
const { verifyToken } = require('../auth/auth.middleware');
const svc = require('./reminder.service');

router.use(verifyToken);

router.get('/', (req, res, next) => {
  try {
    const result = svc.getNotifications(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (e) { next(e); }
});

router.post('/generate', (req, res, next) => {
  try {
    const low = svc.checkLowStock();
    const exp = svc.checkExpiry();
    res.json({ success: true, generated: { low_stock: low.length, expiry: exp.length } });
  } catch (e) { next(e); }
});

router.put('/read-all', (req, res, next) => {
  try { svc.markAllRead(); res.json({ success: true, message: 'All marked as read' }); }
  catch (e) { next(e); }
});

router.put('/:id/read', (req, res, next) => {
  try { svc.markRead(req.params.id); res.json({ success: true, message: 'Marked as read' }); }
  catch (e) { next(e); }
});

module.exports = router;

const router = require('express').Router();
const ctrl = require('./products.controller');
const { verifyToken } = require('../auth/auth.middleware');

router.use(verifyToken);

router.get('/low-stock', ctrl.getLowStock);
router.get('/expiring', ctrl.getExpiring);
router.put('/variants/:variantId', ctrl.updateVariant);
router.delete('/variants/:variantId', ctrl.deleteVariant);
router.post('/variants/:variantId/stock-adjust', ctrl.adjustVariantStock);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/stock-adjust', ctrl.adjustStock);
router.post('/:id/variants', ctrl.createVariant);

module.exports = router;

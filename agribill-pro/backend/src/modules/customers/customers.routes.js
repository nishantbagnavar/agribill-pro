const router = require('express').Router();
const ctrl = require('./customers.controller');
const { verifyToken } = require('../auth/auth.middleware');

router.use(verifyToken);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.get('/:id/ledger', ctrl.getLedger);

module.exports = router;

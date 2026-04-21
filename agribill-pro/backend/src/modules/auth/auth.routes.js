const router = require('express').Router();
const ctrl = require('./auth.controller');
const { verifyToken } = require('./auth.middleware');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/logout', verifyToken, ctrl.logout);
router.post('/refresh', ctrl.refreshToken);
router.get('/me', verifyToken, ctrl.getMe);

module.exports = router;

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/auth.middleware');
const { check, download, apply } = require('./updater.controller');

router.get('/check', verifyToken, check);
router.get('/download', verifyToken, download);
router.post('/apply', verifyToken, apply);

module.exports = router;

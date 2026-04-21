const router = require('express').Router();
const ctrl = require('./shop.controller');
const { verifyToken } = require('../auth/auth.middleware');
const multer = require('multer');
const path = require('path');

const logoStorage = multer.diskStorage({
  destination: path.join(__dirname, '../../../../uploads/logos'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo-${Date.now()}${ext}`);
  },
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG and WebP images are allowed'));
  },
});

router.get('/profile', verifyToken, ctrl.getProfile);
router.put('/profile', verifyToken, ctrl.updateProfile);
router.post('/logo', verifyToken, uploadLogo.single('logo'), ctrl.uploadLogo);

module.exports = router;

const shopService = require('./shop.service');
const { sendSuccess } = require('../../utils/response');

const getProfile = async (req, res, next) => {
  try {
    sendSuccess(res, await shopService.getProfile());
  } catch (e) { next(e); }
};

const updateProfile = async (req, res, next) => {
  try {
    sendSuccess(res, await shopService.updateProfile(req.body));
  } catch (e) { next(e); }
};

const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    sendSuccess(res, await shopService.uploadLogo(req.file.path));
  } catch (e) { next(e); }
};

module.exports = { getProfile, updateProfile, uploadLogo };

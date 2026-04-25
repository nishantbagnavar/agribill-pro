const { isLicenseValid } = require('./license.service');

// In development, skip the gate entirely
const isDev = process.env.NODE_ENV !== 'production';

function licenseGate(req, res, next) {
  if (isDev) return next();
  if (isLicenseValid()) return next();
  res.status(402).json({
    success: false,
    error: 'LICENSE_REQUIRED',
    message: 'Please activate your license in Settings → License to use AgriBill Pro.',
  });
}

module.exports = { licenseGate };

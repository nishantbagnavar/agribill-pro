const { getLicenseStatus } = require('./license.service');

const isDev = process.env.NODE_ENV !== 'production';

function requireFeature(featureKey) {
  return (req, res, next) => {
    if (isDev) return next(); // skip in development
    const status = getLicenseStatus();
    if (!status.activated) {
      return res.status(403).json({ success: false, error: 'License not activated' });
    }
    const features = status.features || {};
    if (features[featureKey] === false) {
      return res.status(403).json({ success: false, error: `'${featureKey}' feature is disabled by your admin` });
    }
    next();
  };
}

module.exports = { requireFeature };

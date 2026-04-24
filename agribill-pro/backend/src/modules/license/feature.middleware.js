const { getLicenseStatus } = require('./license.service');

function requireFeature(featureKey) {
  return (req, res, next) => {
    const status = getLicenseStatus();
    if (!status.activated) {
      return res.status(403).json({ success: false, error: 'License not activated' });
    }
    const features = status.features || {};
    // Default to enabled if key not present (backwards compat)
    if (features[featureKey] === false) {
      return res.status(403).json({ success: false, error: `'${featureKey}' feature is disabled by your admin` });
    }
    next();
  };
}

module.exports = { requireFeature };

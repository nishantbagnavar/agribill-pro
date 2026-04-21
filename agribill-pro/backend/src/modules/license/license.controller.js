const { activateLicense, verifyLicense, resetHwid, getLicenseStatus } = require('./license.service');
const { getLanQrBase64 } = require('./lan.service');

async function status(req, res, next) {
  try {
    res.json({ success: true, data: getLicenseStatus() });
  } catch (err) {
    next(err);
  }
}

async function activate(req, res, next) {
  try {
    const { licenseKey } = req.body;
    if (!licenseKey) return res.status(400).json({ success: false, error: 'licenseKey is required' });
    const data = await activateLicense(licenseKey.trim().toUpperCase());
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function verify(req, res, next) {
  try {
    const data = await verifyLicense();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function resetHwidHandler(req, res, next) {
  try {
    const { licenseKey } = req.body;
    if (!licenseKey) return res.status(400).json({ success: false, error: 'licenseKey is required' });
    const data = await resetHwid(licenseKey.trim().toUpperCase());
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function lanQr(req, res, next) {
  try {
    const port = process.env.PORT || 5000;
    const data = await getLanQrBase64(port);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { status, activate, verify, resetHwidHandler, lanQr };

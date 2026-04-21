const svc = require('./backup.service');

const getStatus = (req, res, next) => {
  try {
    res.json({ success: true, data: svc.getStatus() });
  } catch (e) { next(e); }
};

const createSnapshot = async (req, res, next) => {
  try {
    const result = await svc.createSnapshot(req.body.label);
    res.json({ success: true, data: result, message: 'Backup created successfully' });
  } catch (e) { next(e); }
};

const listSnapshots = async (req, res, next) => {
  try {
    const snapshots = await svc.listSnapshots();
    res.json({ success: true, data: snapshots });
  } catch (e) { next(e); }
};

const restoreSnapshot = async (req, res, next) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ success: false, error: 'Snapshot key is required' });
    const result = await svc.restoreSnapshot(key);
    res.json({ success: true, data: result, message: 'Restore initiated. App is restarting...' });
  } catch (e) { next(e); }
};

module.exports = { getStatus, createSnapshot, listSnapshots, restoreSnapshot };

const { checkForUpdate, downloadUpdate, applyUpdate, getPendingZipPath } = require('./updater.service');

async function check(req, res, next) {
  try {
    const info = await checkForUpdate();
    res.json({ success: true, data: info });
  } catch (err) {
    next(err);
  }
}

// SSE endpoint — streams download progress
function download(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  checkForUpdate()
    .then((info) => {
      if (!info.updateAvailable) {
        send('done', { message: 'Already up to date' });
        return res.end();
      }
      if (!info.downloadUrl) {
        send('error', { message: 'No download URL available' });
        return res.end();
      }

      send('start', { size: info.size, version: info.latestVersion });

      return downloadUpdate(info.downloadUrl, (percent, downloaded, total) => {
        send('progress', { percent, downloaded, total });
      }).then((zipPath) => {
        send('done', { zipPath, sha256: info.sha256, version: info.latestVersion });
        res.end();
      });
    })
    .catch((err) => {
      send('error', { message: err.message });
      res.end();
    });
}

async function apply(req, res, next) {
  try {
    const { sha256 } = req.body || {};
    const zipPath = getPendingZipPath();
    if (!zipPath) {
      return res.status(400).json({ success: false, error: 'No downloaded update found. Download first.' });
    }
    // applyUpdate calls process.exit(0) after extraction — respond before that
    res.json({ success: true, message: 'Applying update and restarting...' });
    applyUpdate(zipPath, sha256 || null);
  } catch (err) {
    next(err);
  }
}

module.exports = { check, download, apply };

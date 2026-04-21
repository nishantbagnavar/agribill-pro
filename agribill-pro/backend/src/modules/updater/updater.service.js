const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const AdmZip = require('adm-zip');
const semver = require('semver');
const { APP_VERSION } = require('../../config/version');

const APP_ROOT = path.resolve(__dirname, '../../../../../');
const UPDATE_DIR = path.join(APP_ROOT, 'agribill-pro', 'data', 'update');
const DEFAULT_MANIFEST_PATH = path.join(APP_ROOT, 'agribill-pro', 'update-manifest.json');

function getManifest() {
  const manifestUrl = process.env.UPDATE_MANIFEST_URL;
  if (manifestUrl && (manifestUrl.startsWith('http://') || manifestUrl.startsWith('https://'))) {
    return fetchRemoteManifest(manifestUrl);
  }
  const raw = fs.readFileSync(DEFAULT_MANIFEST_PATH, 'utf8');
  return Promise.resolve(JSON.parse(raw));
}

function fetchRemoteManifest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid manifest JSON')); }
      });
    }).on('error', reject);
  });
}

async function checkForUpdate() {
  const manifest = await getManifest();
  const current = APP_VERSION;
  const latest = manifest.latestVersion;
  const minVersion = manifest.minVersion;

  const updateAvailable = semver.gt(latest, current);
  const forceUpdate = semver.lt(current, minVersion);

  let deltaEntry = null;
  if (updateAvailable && manifest.deltaZips && manifest.deltaZips.length) {
    deltaEntry = manifest.deltaZips.find(
      (d) => semver.eq(d.fromVersion, current) && semver.eq(d.toVersion, latest)
    ) || null;
  }

  return {
    currentVersion: current,
    latestVersion: latest,
    minVersion,
    updateAvailable,
    forceUpdate,
    releaseNotes: manifest.releaseNotes || '',
    releaseDate: manifest.releaseDate || '',
    downloadUrl: deltaEntry ? deltaEntry.url : manifest.fullZipUrl || '',
    size: deltaEntry ? deltaEntry.size : manifest.fullSize || 0,
    sha256: deltaEntry ? deltaEntry.sha256 : manifest.sha256 || '',
    isDelta: !!deltaEntry,
  };
}

function downloadUpdate(url, onProgress) {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error('No download URL in manifest'));

    if (!fs.existsSync(UPDATE_DIR)) fs.mkdirSync(UPDATE_DIR, { recursive: true });

    const zipPath = path.join(UPDATE_DIR, 'pending-update.zip');
    const file = fs.createWriteStream(zipPath);
    const client = url.startsWith('https') ? https : http;

    client.get(url, (res) => {
      const total = parseInt(res.headers['content-length'] || '0', 10);
      let downloaded = 0;

      res.on('data', (chunk) => {
        downloaded += chunk.length;
        file.write(chunk);
        if (total > 0 && onProgress) {
          onProgress(Math.round((downloaded / total) * 100), downloaded, total);
        }
      });

      res.on('end', () => {
        file.end();
        resolve(zipPath);
      });
    }).on('error', (err) => {
      file.destroy();
      reject(err);
    });
  });
}

function sha256File(filePath) {
  const buffer = fs.readFileSync(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

function applyUpdate(zipPath, expectedSha256) {
  if (expectedSha256) {
    const actual = sha256File(zipPath);
    if (actual !== expectedSha256) {
      throw new Error(`SHA256 mismatch — expected ${expectedSha256}, got ${actual}`);
    }
  }

  const appDir = path.join(APP_ROOT, 'agribill-pro');
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(appDir, true);

  fs.unlinkSync(zipPath);

  // PM2 / process manager will restart the app
  setTimeout(() => process.exit(0), 500);
}

function getPendingZipPath() {
  const zipPath = path.join(UPDATE_DIR, 'pending-update.zip');
  return fs.existsSync(zipPath) ? zipPath : null;
}

module.exports = { checkForUpdate, downloadUpdate, applyUpdate, getPendingZipPath };

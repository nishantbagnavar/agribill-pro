const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');

const backendRoot  = path.resolve(__dirname, '../../..');
const dataDir      = path.join(backendRoot, 'data');
const dbPath       = path.join(dataDir, 'agribill.db');
const metaPath     = path.join(dataDir, '.backup_meta.json');

// Local backup folder — in AppData so it survives app reinstalls
const localBackupDir = path.join(
  process.env.LOCALAPPDATA || os.homedir(),
  'AgriBillPro', 'backups'
);
const LOCAL_MAX_BACKUPS = 30; // keep last 30 daily copies

// ── Helpers ──────────────────────────────────────────────────────────────────

function readMeta() {
  try { return JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch { return {}; }
}
function writeMeta(data) {
  fs.writeFileSync(metaPath, JSON.stringify({ ...readMeta(), ...data }, null, 2));
}

function getR2Config() {
  const { R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  return { endpoint: R2_ENDPOINT, bucket: R2_BUCKET, keyId: R2_ACCESS_KEY_ID, secret: R2_SECRET_ACCESS_KEY };
}
function isR2Configured() {
  const c = getR2Config();
  return !!(c.endpoint && c.bucket && c.keyId && c.secret);
}
function getR2Client() {
  const c = getR2Config();
  return new S3Client({ region: 'auto', endpoint: c.endpoint, credentials: { accessKeyId: c.keyId, secretAccessKey: c.secret } });
}

// ── Local backup ─────────────────────────────────────────────────────────────

function ensureLocalBackupDir() {
  if (!fs.existsSync(localBackupDir)) fs.mkdirSync(localBackupDir, { recursive: true });
}

function createLocalBackup(label) {
  if (!fs.existsSync(dbPath)) throw new Error('Database file not found');
  ensureLocalBackupDir();

  const now  = new Date();
  const ts   = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const name = `agribill_${ts}${label ? '_' + label : ''}.db`;
  const dest = path.join(localBackupDir, name);

  fs.copyFileSync(dbPath, dest);

  // Rotate — keep only last LOCAL_MAX_BACKUPS
  const files = fs.readdirSync(localBackupDir)
    .filter(f => f.endsWith('.db'))
    .map(f => ({ name: f, time: fs.statSync(path.join(localBackupDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  files.slice(LOCAL_MAX_BACKUPS).forEach(f => {
    try { fs.unlinkSync(path.join(localBackupDir, f.name)); } catch {}
  });

  const isoNow = now.toISOString();
  writeMeta({ last_local_backup: isoNow, last_local_backup_file: dest });
  console.log(`💾 Local backup: ${name}`);
  return { file: dest, size: fs.statSync(dest).size, created_at: isoNow };
}

function listLocalBackups() {
  ensureLocalBackupDir();
  return fs.readdirSync(localBackupDir)
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const full = path.join(localBackupDir, f);
      const stat = fs.statSync(full);
      return { file: full, name: f, size: stat.size, created_at: stat.mtime.toISOString() };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// ── Cloud backup (Cloudflare R2) ─────────────────────────────────────────────

async function createCloudBackup(label) {
  if (!isR2Configured()) throw new Error('R2 not configured');

  const now  = new Date();
  const ts   = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const key  = `backups/${ts}${label ? '_' + label.replace(/\s+/g, '_') : ''}.db`;
  const buf  = fs.readFileSync(dbPath);

  await getR2Client().send(new PutObjectCommand({
    Bucket: getR2Config().bucket,
    Key: key,
    Body: buf,
    ContentType: 'application/octet-stream',
    Metadata: { created_at: now.toISOString(), size: String(buf.length), label: label || 'manual' },
  }));

  const isoNow = now.toISOString();
  writeMeta({ last_backup: isoNow, last_backup_key: key });
  console.log(`☁️  Cloud backup: ${key}`);
  return { key, size: buf.length, created_at: isoNow };
}

async function listCloudSnapshots() {
  if (!isR2Configured()) throw new Error('R2 not configured');
  const res = await getR2Client().send(new ListObjectsV2Command({ Bucket: getR2Config().bucket, Prefix: 'backups/', MaxKeys: 50 }));
  return (res.Contents || [])
    .sort((a, b) => b.LastModified - a.LastModified)
    .map(obj => ({ key: obj.Key, size: obj.Size, last_modified: obj.LastModified, label: obj.Key.replace('backups/', '').replace('.db', '') }));
}

async function restoreCloudSnapshot(key) {
  if (!isR2Configured()) throw new Error('R2 not configured');
  if (!key) throw new Error('Snapshot key required');

  const res = await getR2Client().send(new GetObjectCommand({ Bucket: getR2Config().bucket, Key: key }));
  const tmpPath = path.join(dataDir, `agribill_restore_${Date.now()}.tmp`);
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  fs.writeFileSync(tmpPath, Buffer.concat(chunks));

  const prePath = path.join(dataDir, `agribill_pre_restore_${Date.now()}.db`);
  setImmediate(() => {
    try { require('../../config/db').sqlite.close(); } catch {}
    try { fs.renameSync(dbPath, prePath); fs.renameSync(tmpPath, dbPath); } catch (e) { console.error('Restore swap failed:', e.message); }
    setTimeout(() => process.exit(0), 300);
  });

  return { key, restored_at: new Date().toISOString() };
}

// ── Combined snapshot (local + cloud) ────────────────────────────────────────

async function createSnapshot(label) {
  const results = {};

  // Always do local backup
  try {
    results.local = createLocalBackup(label);
  } catch (e) {
    results.local_error = e.message;
    console.error('❌ Local backup failed:', e.message);
  }

  // Cloud backup if configured
  if (isR2Configured()) {
    try {
      results.cloud = await createCloudBackup(label);
    } catch (e) {
      results.cloud_error = e.message;
      console.error('❌ Cloud backup failed:', e.message);
    }
  }

  if (!results.local && !results.cloud) throw new Error('Both local and cloud backup failed');
  return results;
}

// ── Status ────────────────────────────────────────────────────────────────────

function getStatus() {
  const meta = readMeta();
  ensureLocalBackupDir();
  const localFiles = fs.readdirSync(localBackupDir).filter(f => f.endsWith('.db'));
  return {
    configured: isR2Configured(),
    cloud_configured: isR2Configured(),
    local_backup_dir: localBackupDir,
    local_backup_count: localFiles.length,
    last_backup: meta.last_backup || meta.last_local_backup || null,
    last_backup_key: meta.last_backup_key || null,
    last_local_backup: meta.last_local_backup || null,
    auto_backup: meta.auto_backup !== false,
    db_size_bytes: fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0,
  };
}

module.exports = {
  getStatus,
  createSnapshot,
  createLocalBackup,
  listLocalBackups,
  createCloudBackup,
  listSnapshots: listCloudSnapshots,
  restoreSnapshot: restoreCloudSnapshot,
};

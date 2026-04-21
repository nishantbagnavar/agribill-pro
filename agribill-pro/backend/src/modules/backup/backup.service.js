const fs = require('fs');
const path = require('path');
const os = require('os');
const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');

const backendRoot = path.resolve(__dirname, '../../..');
const dataDir = path.join(backendRoot, 'data');
const dbPath = path.join(dataDir, 'agribill.db');
const metaPath = path.join(dataDir, '.backup_meta.json');

function getR2Config() {
  const { R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  return { endpoint: R2_ENDPOINT, bucket: R2_BUCKET, keyId: R2_ACCESS_KEY_ID, secret: R2_SECRET_ACCESS_KEY };
}

function isR2Configured() {
  const c = getR2Config();
  return !!(c.endpoint && c.bucket && c.keyId && c.secret);
}

function getClient() {
  const c = getR2Config();
  return new S3Client({
    region: 'auto',
    endpoint: c.endpoint,
    credentials: { accessKeyId: c.keyId, secretAccessKey: c.secret },
  });
}

function readMeta() {
  try { return JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch { return {}; }
}

function writeMeta(data) {
  fs.writeFileSync(metaPath, JSON.stringify({ ...readMeta(), ...data }, null, 2));
}

function getStatus() {
  const meta = readMeta();
  return {
    configured: isR2Configured(),
    last_backup: meta.last_backup || null,
    last_backup_key: meta.last_backup_key || null,
    auto_backup: meta.auto_backup !== false,
    db_size_bytes: fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0,
  };
}

async function createSnapshot(label) {
  if (!isR2Configured()) throw new Error('R2 not configured. Add R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY to .env');

  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const key = `backups/${ts}${label ? '_' + label.replace(/\s+/g, '_') : ''}.db`;

  const client = getClient();
  const fileBuffer = fs.readFileSync(dbPath);

  await client.send(new PutObjectCommand({
    Bucket: getR2Config().bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: 'application/octet-stream',
    Metadata: {
      created_at: now.toISOString(),
      size: String(fileBuffer.length),
      label: label || 'manual',
    },
  }));

  const isoNow = now.toISOString();
  writeMeta({ last_backup: isoNow, last_backup_key: key });
  return { key, size: fileBuffer.length, created_at: isoNow };
}

async function listSnapshots() {
  if (!isR2Configured()) throw new Error('R2 not configured');

  const client = getClient();
  const res = await client.send(new ListObjectsV2Command({
    Bucket: getR2Config().bucket,
    Prefix: 'backups/',
    MaxKeys: 50,
  }));

  const items = (res.Contents || [])
    .sort((a, b) => b.LastModified - a.LastModified)
    .map((obj) => ({
      key: obj.Key,
      size: obj.Size,
      last_modified: obj.LastModified,
      label: obj.Key.replace('backups/', '').replace('.db', ''),
    }));

  return items;
}

async function restoreSnapshot(key) {
  if (!isR2Configured()) throw new Error('R2 not configured');
  if (!key) throw new Error('Snapshot key is required');

  const client = getClient();
  const res = await client.send(new GetObjectCommand({
    Bucket: getR2Config().bucket,
    Key: key,
  }));

  const tmpPath = path.join(dataDir, `agribill_restore_${Date.now()}.tmp`);

  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  const buf = Buffer.concat(chunks);
  fs.writeFileSync(tmpPath, buf);

  const preRestorePath = path.join(dataDir, `agribill_pre_restore_${Date.now()}.db`);

  // close DB, swap file, restart — must happen after response is sent
  setImmediate(() => {
    try {
      const { sqlite } = require('../../config/db');
      sqlite.close();
    } catch {}
    try {
      fs.renameSync(dbPath, preRestorePath);
      fs.renameSync(tmpPath, dbPath);
    } catch (e) {
      console.error('Restore file swap failed:', e.message);
    }
    setTimeout(() => process.exit(0), 300);
  });

  return { key, restored_at: new Date().toISOString() };
}

module.exports = { getStatus, createSnapshot, listSnapshots, restoreSnapshot };

#!/usr/bin/env node
/**
 * Creates a delta zip containing only files that changed between two versions.
 *
 * Usage:
 *   node scripts/create-delta.js --from <dir-or-git-ref> --to <dir> --out <output.zip> [--version 1.1.0]
 *
 * Examples:
 *   # Compare two directories:
 *   node scripts/create-delta.js --from ./release/1.0.0 --to ./release/1.1.0 --out delta-1.0.0-to-1.1.0.zip
 *
 *   # Compare git tags (exports both to temp dirs then diffs):
 *   node scripts/create-delta.js --from v1.0.0 --to HEAD --out delta.zip --git
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// adm-zip lives in backend/node_modules (the only place it's installed)
const BACKEND_MODULES = path.join(__dirname, '../backend/node_modules');
const AdmZip = require(path.join(BACKEND_MODULES, 'adm-zip'));

const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git\//,
  /data\/agribill\.db/,
  /data\/update\//,
  /\.env$/,
  /\.log$/,
  /frontend\/dist\//,  // frontend is built and embedded; ship only built artifacts
];

function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some((p) => p.test(filePath.replace(/\\/g, '/')));
}

function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function collectFiles(dir, base = dir) {
  const result = {};
  if (!fs.existsSync(dir)) return result;

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const rel = path.relative(base, full).replace(/\\/g, '/');
      if (shouldExclude(rel)) continue;
      if (entry.isDirectory()) { walk(full); }
      else { result[rel] = full; }
    }
  }
  walk(dir);
  return result;
}

function buildDelta(fromDir, toDir, outZip) {
  console.log(`\n📦 Building delta zip`);
  console.log(`   FROM: ${fromDir}`);
  console.log(`   TO:   ${toDir}`);
  console.log(`   OUT:  ${outZip}\n`);

  const fromFiles = collectFiles(fromDir);
  const toFiles = collectFiles(toDir);

  const changed = [];
  const added = [];

  for (const [rel, toPath] of Object.entries(toFiles)) {
    if (!fromFiles[rel]) {
      added.push({ rel, toPath });
    } else {
      const hashFrom = hashFile(fromFiles[rel]);
      const hashTo = hashFile(toPath);
      if (hashFrom !== hashTo) changed.push({ rel, toPath });
    }
  }

  const removed = Object.keys(fromFiles).filter((rel) => !toFiles[rel]);

  console.log(`  ✅ Added:   ${added.length} files`);
  console.log(`  📝 Changed: ${changed.length} files`);
  console.log(`  ❌ Removed: ${removed.length} files`);

  const zip = new AdmZip();

  for (const { rel, toPath } of [...added, ...changed]) {
    const buf = fs.readFileSync(toPath);
    zip.addFile(rel, buf);
  }

  // Write a manifest of removed files so the apply script can delete them
  if (removed.length) {
    zip.addFile('__delta_removed__.json', Buffer.from(JSON.stringify(removed, null, 2)));
  }

  zip.writeZip(outZip);

  const size = fs.statSync(outZip).size;
  const sha256 = hashFile(outZip);

  console.log(`\n✅ Delta zip written: ${outZip}`);
  console.log(`   Size:   ${(size / 1024).toFixed(1)} KB`);
  console.log(`   SHA256: ${sha256}`);
  console.log(`\nAdd this to your update-manifest.json deltaZips array:`);
  console.log(JSON.stringify({
    fromVersion: path.basename(fromDir).replace('v', ''),
    toVersion: path.basename(toDir).replace('v', ''),
    url: `https://updates.agribillpro.com/releases/${path.basename(outZip)}`,
    size,
    sha256,
  }, null, 2));

  return { size, sha256 };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}

const fromArg = getArg('--from');
const toArg = getArg('--to');
const outArg = getArg('--out') || 'delta.zip';

if (!fromArg || !toArg) {
  console.error('Usage: node scripts/create-delta.js --from <dir> --to <dir> --out <output.zip>');
  process.exit(1);
}

buildDelta(path.resolve(fromArg), path.resolve(toArg), path.resolve(outArg));

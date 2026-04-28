const Database = require('better-sqlite3');
const { drizzle } = require('drizzle-orm/better-sqlite3');
const fs = require('fs');
const path = require('path');
const env = require('./env');

// Resolve DB path from app root (3 levels up from backend/src/config/).
// Using __dirname keeps this independent of process.cwd() so the path is
// predictable whether the server is run from any working directory.
const appRoot = path.resolve(__dirname, '../../..');
const dbPath = path.isAbsolute(env.DB_PATH)
  ? env.DB_PATH
  : path.resolve(appRoot, env.DB_PATH);

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const db = drizzle(sqlite);

module.exports = { sqlite, db };

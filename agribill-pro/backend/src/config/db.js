const Database = require('better-sqlite3');
const { drizzle } = require('drizzle-orm/better-sqlite3');
const path = require('path');
const env = require('./env');

const backendRoot = path.resolve(__dirname, '../..');
const dbPath = path.resolve(backendRoot, env.DB_PATH);

const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const db = drizzle(sqlite);

module.exports = { sqlite, db };

const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const backendRoot = path.resolve(__dirname, '../..');
const dbPath = path.resolve(backendRoot, process.env.DB_PATH || './data/agribill.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(dbPath);

sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const tables = [
  {
    name: 'users',
    sql: `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('owner','staff')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
  {
    name: 'shop_profile',
    sql: `CREATE TABLE IF NOT EXISTS shop_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_name TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      phone TEXT,
      gstin TEXT,
      fssai_number TEXT,
      logo_path TEXT,
      upi_id TEXT,
      low_stock_threshold REAL NOT NULL DEFAULT 5,
      expiry_reminder_days INTEGER NOT NULL DEFAULT 30,
      whatsapp_enabled INTEGER NOT NULL DEFAULT 1,
      invoice_prefix TEXT NOT NULL DEFAULT 'AGR',
      invoice_counter INTEGER NOT NULL DEFAULT 0,
      terms_conditions TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
  {
    name: 'categories',
    sql: `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_hindi TEXT,
      description TEXT,
      icon TEXT,
      parent_id INTEGER REFERENCES categories(id),
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
  {
    name: 'products',
    sql: `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_hindi TEXT,
      sku TEXT UNIQUE,
      barcode TEXT,
      category_id INTEGER REFERENCES categories(id),
      description TEXT,
      brand TEXT,
      unit TEXT NOT NULL DEFAULT 'piece',
      purchase_price INTEGER NOT NULL DEFAULT 0,
      selling_price INTEGER NOT NULL DEFAULT 0,
      mrp INTEGER NOT NULL DEFAULT 0,
      gst_rate INTEGER NOT NULL DEFAULT 0,
      hsn_code TEXT,
      current_stock REAL NOT NULL DEFAULT 0,
      min_stock_alert REAL NOT NULL DEFAULT 5,
      expiry_date TEXT,
      batch_number TEXT,
      image_path TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
  {
    name: 'product_variants',
    sql: `CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      label TEXT NOT NULL,
      pack_size REAL NOT NULL,
      unit TEXT NOT NULL,
      sku TEXT UNIQUE,
      purchase_price INTEGER NOT NULL DEFAULT 0,
      selling_price INTEGER NOT NULL DEFAULT 0,
      mrp INTEGER NOT NULL DEFAULT 0,
      current_stock REAL NOT NULL DEFAULT 0,
      min_stock_alert REAL NOT NULL DEFAULT 5,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
  {
    name: 'stock_transactions',
    sql: `CREATE TABLE IF NOT EXISTS stock_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('IN','OUT','ADJUSTMENT','RETURN')),
      quantity REAL NOT NULL,
      previous_stock REAL NOT NULL,
      new_stock REAL NOT NULL,
      reference_id INTEGER,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
  {
    name: 'customers',
    sql: `CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      whatsapp_number TEXT,
      email TEXT,
      address TEXT,
      village TEXT,
      taluka TEXT,
      district TEXT,
      pincode TEXT,
      gstin TEXT,
      total_purchases INTEGER NOT NULL DEFAULT 0,
      total_due INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
  {
    name: 'bills',
    sql: `CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER REFERENCES customers(id),
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_address TEXT,
      customer_gstin TEXT,
      bill_date TEXT NOT NULL,
      due_date TEXT,
      subtotal INTEGER NOT NULL DEFAULT 0,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      discount_percent REAL NOT NULL DEFAULT 0,
      taxable_amount INTEGER NOT NULL DEFAULT 0,
      cgst_amount INTEGER NOT NULL DEFAULT 0,
      sgst_amount INTEGER NOT NULL DEFAULT 0,
      igst_amount INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL DEFAULT 0,
      paid_amount INTEGER NOT NULL DEFAULT 0,
      due_amount INTEGER NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK(payment_status IN ('PAID','PARTIAL','UNPAID')),
      payment_method TEXT NOT NULL DEFAULT 'CASH',
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
  {
    name: 'bill_items',
    sql: `CREATE TABLE IF NOT EXISTS bill_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL REFERENCES bills(id),
      product_id INTEGER REFERENCES products(id),
      product_name TEXT NOT NULL,
      hsn_code TEXT,
      unit TEXT NOT NULL,
      quantity REAL NOT NULL,
      rate INTEGER NOT NULL,
      mrp INTEGER,
      discount_percent REAL NOT NULL DEFAULT 0,
      taxable_amount INTEGER NOT NULL DEFAULT 0,
      gst_rate INTEGER NOT NULL DEFAULT 0,
      cgst INTEGER NOT NULL DEFAULT 0,
      sgst INTEGER NOT NULL DEFAULT 0,
      igst INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL DEFAULT 0
    )`,
  },
  {
    name: 'payments',
    sql: `CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL REFERENCES bills(id),
      customer_id INTEGER REFERENCES customers(id),
      amount INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      reference_number TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
  {
    name: 'notifications',
    sql: `CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('LOW_STOCK','EXPIRY','DUE_PAYMENT')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      reference_id INTEGER,
      reference_type TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
  {
    name: 'license_cache',
    sql: `CREATE TABLE IF NOT EXISTS license_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_key TEXT NOT NULL,
      hwid TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'basic',
      customer_name TEXT,
      expires_at TEXT,
      grace_token TEXT,
      activated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_verified_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
  {
    name: 'app_config',
    sql: `CREATE TABLE IF NOT EXISTS app_config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
  },
  {
    name: 'whatsapp_messages',
    sql: `CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id),
      phone TEXT NOT NULL,
      message_type TEXT NOT NULL CHECK(message_type IN ('BILL','REMINDER','CUSTOM')),
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('SENT','FAILED','PENDING')),
      reference_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
];

console.log('🚀 Running migrations...');

for (const table of tables) {
  try {
    sqlite.exec(table.sql);
    console.log(`  ✅ ${table.name}`);
  } catch (err) {
    console.error(`  ❌ ${table.name}:`, err.message);
    process.exit(1);
  }
}

// Idempotent ALTER TABLE for variant_id on bill_items
const alterStatements = [
  `ALTER TABLE bill_items ADD COLUMN variant_id INTEGER REFERENCES product_variants(id)`,
  `ALTER TABLE shop_profile ADD COLUMN state_code TEXT DEFAULT '27'`,
  `ALTER TABLE shop_profile ADD COLUMN printer_config TEXT`,
  `ALTER TABLE license_cache ADD COLUMN features TEXT DEFAULT '{}'`,
];
for (const stmt of alterStatements) {
  try {
    sqlite.exec(stmt);
    console.log(`  ✅ Applied: variant_id column added to bill_items`);
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log(`  ℹ️  variant_id column already exists, skipping.`);
    } else {
      console.error(`  ❌ Migration error:`, e.message);
      process.exit(1);
    }
  }
}

sqlite.close();
console.log('\n✅ All migrations complete. Database ready at:', dbPath);

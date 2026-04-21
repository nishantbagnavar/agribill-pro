const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const backendRoot = path.resolve(__dirname, '../..');
const dbPath = path.resolve(backendRoot, process.env.DB_PATH || './data/agribill.db');
const sqlite = new Database(dbPath);

sqlite.pragma('foreign_keys = ON');

const defaultCategories = [
  { name: 'Fertilizers',    name_hindi: 'Khaad',              icon: '🌿', sort_order: 1 },
  { name: 'Seeds',          name_hindi: 'Beej',               icon: '🌱', sort_order: 2 },
  { name: 'Pesticides',     name_hindi: 'Keetnaashak',        icon: '🐛', sort_order: 3 },
  { name: 'Fungicides',     name_hindi: 'Fungicide',          icon: '🍄', sort_order: 4 },
  { name: 'Herbicides',     name_hindi: 'Kharpatwaarnashak',  icon: '🌾', sort_order: 5 },
  { name: 'Micronutrients', name_hindi: 'Sukhshma Poshan',   icon: '⚗️', sort_order: 6 },
  { name: 'Farm Tools',     name_hindi: 'Krishi Upkaran',    icon: '🔧', sort_order: 7 },
  { name: 'Others',         name_hindi: 'Anya',               icon: '📦', sort_order: 8 },
];

const expiryOneYear = new Date();
expiryOneYear.setFullYear(expiryOneYear.getFullYear() + 1);
const expiryStr = expiryOneYear.toISOString().split('T')[0];

const demoProducts = [
  {
    name: 'Urea 50kg',
    name_hindi: 'Urea',
    sku: 'AGR-P-00001',
    category_idx: 0,
    brand: 'IFFCO',
    unit: 'bag',
    purchase_price: 87000,
    selling_price: 95000,
    mrp: 95000,
    gst_rate: 5,
    hsn_code: '31021000',
    current_stock: 100,
    min_stock_alert: 10,
    expiry_date: null,
  },
  {
    name: 'DAP Fertilizer 50kg',
    name_hindi: 'DAP Khaad',
    sku: 'AGR-P-00002',
    category_idx: 0,
    brand: 'IFFCO',
    unit: 'bag',
    purchase_price: 120000,
    selling_price: 135000,
    mrp: 140000,
    gst_rate: 5,
    hsn_code: '31052000',
    current_stock: 50,
    min_stock_alert: 5,
    expiry_date: null,
  },
  {
    name: 'Wheat Seeds',
    name_hindi: 'Gandum Beej',
    sku: 'AGR-P-00003',
    category_idx: 1,
    brand: 'Advanta',
    unit: 'kg',
    purchase_price: 8000,
    selling_price: 10000,
    mrp: 10000,
    gst_rate: 0,
    hsn_code: null,
    current_stock: 200,
    min_stock_alert: 20,
    expiry_date: null,
  },
  {
    name: 'Chlorpyrifos 20% EC 1L',
    name_hindi: null,
    sku: 'AGR-P-00004',
    category_idx: 2,
    brand: 'Bayer',
    unit: 'litre',
    purchase_price: 45000,
    selling_price: 55000,
    mrp: 55000,
    gst_rate: 18,
    hsn_code: '38089100',
    current_stock: 30,
    min_stock_alert: 5,
    expiry_date: expiryStr,
  },
  {
    name: 'Mancozeb 75% WP 500g',
    name_hindi: null,
    sku: 'AGR-P-00005',
    category_idx: 3,
    brand: 'UPL',
    unit: 'piece',
    purchase_price: 22000,
    selling_price: 28000,
    mrp: 28000,
    gst_rate: 18,
    hsn_code: null,
    current_stock: 40,
    min_stock_alert: 8,
    expiry_date: null,
  },
];

const insertCategory = sqlite.prepare(`
  INSERT OR IGNORE INTO categories (name, name_hindi, icon, sort_order)
  VALUES (@name, @name_hindi, @icon, @sort_order)
`);

const insertProduct = sqlite.prepare(`
  INSERT OR IGNORE INTO products
    (name, name_hindi, sku, category_id, brand, unit, purchase_price, selling_price, mrp,
     gst_rate, hsn_code, current_stock, min_stock_alert, expiry_date)
  VALUES
    (@name, @name_hindi, @sku, @category_id, @brand, @unit, @purchase_price, @selling_price,
     @mrp, @gst_rate, @hsn_code, @current_stock, @min_stock_alert, @expiry_date)
`);

console.log('🌱 Seeding database...\n');

// Seed categories
const seedAll = sqlite.transaction(() => {
  console.log('Categories:');
  for (const cat of defaultCategories) {
    insertCategory.run(cat);
    console.log(`  ✅ ${cat.name}`);
  }

  // Fetch category IDs
  const catRows = sqlite.prepare('SELECT id, name FROM categories ORDER BY sort_order').all();
  const catMap = catRows.reduce((acc, r) => { acc[r.name] = r.id; return acc; }, {});

  console.log('\nProducts:');
  for (const p of demoProducts) {
    const catNames = Object.keys(catMap);
    const categoryName = catNames[p.category_idx];
    insertProduct.run({
      name: p.name,
      name_hindi: p.name_hindi,
      sku: p.sku,
      category_id: catMap[categoryName],
      brand: p.brand,
      unit: p.unit,
      purchase_price: p.purchase_price,
      selling_price: p.selling_price,
      mrp: p.mrp,
      gst_rate: p.gst_rate,
      hsn_code: p.hsn_code,
      current_stock: p.current_stock,
      min_stock_alert: p.min_stock_alert,
      expiry_date: p.expiry_date,
    });
    console.log(`  ✅ ${p.name}`);
  }
});

seedAll();

sqlite.close();
console.log('\n✅ Seed complete.');

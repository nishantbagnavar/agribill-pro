const { sqlite } = require('../../config/db');

function checkLowStock() {
  const today = new Date().toISOString().slice(0, 10);
  const products = sqlite.prepare(
    `SELECT id, name, current_stock, min_stock_alert FROM products 
     WHERE is_active = 1 AND current_stock <= min_stock_alert`
  ).all();

  const insertNotif = sqlite.prepare(
    `INSERT INTO notifications (type, title, message, reference_id, reference_type, is_read, created_at)
     SELECT 'LOW_STOCK', ?, ?, ?, 'product', 0, datetime('now')
     WHERE NOT EXISTS (
       SELECT 1 FROM notifications 
       WHERE type = 'LOW_STOCK' AND reference_id = ? AND date(created_at) = ?
     )`
  );

  const insert = sqlite.transaction((products) => {
    for (const p of products) {
      insertNotif.run(
        `Low Stock: ${p.name}`,
        `${p.name} is low on stock. Only ${p.current_stock} ${p.current_stock === 1 ? 'unit' : 'units'} remaining (min: ${p.min_stock_alert}).`,
        p.id, p.id, today
      );
    }
  });
  insert(products);
  return products;
}

function checkExpiry() {
  const today = new Date().toISOString().slice(0, 10);
  const products = sqlite.prepare(
    `SELECT id, name, expiry_date, 
            CAST(julianday(expiry_date) - julianday('now') AS INTEGER) as days_left
     FROM products 
     WHERE is_active = 1 AND expiry_date IS NOT NULL 
       AND date(expiry_date) >= date('now') 
       AND date(expiry_date) <= date('now', '+30 days')`
  ).all();

  const insertNotif = sqlite.prepare(
    `INSERT INTO notifications (type, title, message, reference_id, reference_type, is_read, created_at)
     SELECT 'EXPIRY', ?, ?, ?, 'product', 0, datetime('now')
     WHERE NOT EXISTS (
       SELECT 1 FROM notifications 
       WHERE type = 'EXPIRY' AND reference_id = ? AND date(created_at) = ?
     )`
  );

  const insert = sqlite.transaction((products) => {
    for (const p of products) {
      insertNotif.run(
        `Expiring Soon: ${p.name}`,
        `${p.name} expires on ${p.expiry_date}. ${p.days_left} day(s) left.`,
        p.id, p.id, today
      );
    }
  });
  insert(products);
  return products;
}

function sendDueReminders() {
  const customers = sqlite.prepare(
    `SELECT id, name, phone FROM customers WHERE is_active = 1 AND total_due > 0`
  ).all();

  const insertNotif = sqlite.prepare(
    `INSERT INTO notifications (type, title, message, reference_id, reference_type, is_read, created_at)
     VALUES ('DUE_PAYMENT', ?, ?, ?, 'customer', 0, datetime('now'))`
  );

  for (const c of customers) {
    insertNotif.run(
      `Due Payment: ${c.name}`,
      `Customer ${c.name} (${c.phone}) has a pending due amount.`,
      c.id
    );
  }
  return customers;
}

function getNotifications({ is_read, type, page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  let where = [];
  let params = [];

  if (is_read !== undefined && is_read !== '') {
    where.push('is_read = ?');
    params.push(is_read === 'true' || is_read === '1' ? 1 : 0);
  }
  if (type) { where.push('type = ?'); params.push(type); }

  const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = sqlite.prepare(`SELECT COUNT(*) as count FROM notifications ${whereStr}`).get(...params).count;
  const rows = sqlite.prepare(
    `SELECT * FROM notifications ${whereStr} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return { data: rows, total, page: Number(page), limit: Number(limit) };
}

function markRead(id) {
  sqlite.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ?`).run(id);
}

function markAllRead() {
  sqlite.prepare(`UPDATE notifications SET is_read = 1 WHERE is_read = 0`).run();
}

module.exports = { checkLowStock, checkExpiry, sendDueReminders, getNotifications, markRead, markAllRead };

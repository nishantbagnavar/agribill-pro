const { sqlite } = require('../../config/db');

function getSummary() {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().slice(0, 10);
  const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
    .toISOString().slice(0, 10);
  const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0)
    .toISOString().slice(0, 10);

  const todaySales = sqlite.prepare(
    `SELECT COALESCE(SUM(total_amount),0) as total FROM bills WHERE bill_date = ?`
  ).get(today).total;

  const yesterdaySales = sqlite.prepare(
    `SELECT COALESCE(SUM(total_amount),0) as total FROM bills WHERE bill_date = ?`
  ).get(yesterday).total;

  const monthRevenue = sqlite.prepare(
    `SELECT COALESCE(SUM(total_amount),0) as total FROM bills WHERE bill_date >= ?`
  ).get(monthStart).total;

  const lastMonthRevenue = sqlite.prepare(
    `SELECT COALESCE(SUM(total_amount),0) as total FROM bills WHERE bill_date >= ? AND bill_date <= ?`
  ).get(lastMonthStart, lastMonthEnd).total;

  const stockValue = sqlite.prepare(
    `SELECT COALESCE(SUM(selling_price * current_stock),0) as total FROM products WHERE is_active = 1`
  ).get().total;

  const totalDue = sqlite.prepare(
    `SELECT COALESCE(SUM(total_due),0) as total FROM customers WHERE is_active = 1`
  ).get().total;

  const lowStockCount = sqlite.prepare(
    `SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND current_stock <= min_stock_alert`
  ).get().count;

  const expiringCount = sqlite.prepare(
    `SELECT COUNT(*) as count FROM products 
     WHERE is_active = 1 AND expiry_date IS NOT NULL 
     AND date(expiry_date) <= date('now', '+30 days') AND date(expiry_date) >= date('now')`
  ).get().count;

  const unpaidBillsCount = sqlite.prepare(
    `SELECT COUNT(*) as count FROM bills WHERE payment_status != 'PAID'`
  ).get().count;

  const productCount = sqlite.prepare(
    `SELECT COUNT(*) as count FROM products WHERE is_active = 1`
  ).get().count;

  const customersWithDue = sqlite.prepare(
    `SELECT COUNT(*) as count FROM customers WHERE is_active = 1 AND total_due > 0`
  ).get().count;

  const profitBase = `
    SELECT COALESCE(SUM(bi.taxable_amount - COALESCE(p.purchase_price,0)*bi.quantity),0) as profit
    FROM bill_items bi
    JOIN bills b ON b.id = bi.bill_id
    LEFT JOIN products p ON p.id = bi.product_id`;

  const todayProfit   = sqlite.prepare(profitBase + ` WHERE b.bill_date = ?`).get(today).profit;
  const monthlyProfit = sqlite.prepare(profitBase + ` WHERE b.bill_date >= ?`).get(monthStart).profit;
  const totalProfit   = sqlite.prepare(profitBase).get().profit;

  const pct = (curr, prev) => prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

  return {
    today_sales: todaySales,
    today_change: pct(todaySales, yesterdaySales),
    month_revenue: monthRevenue,
    month_change: pct(monthRevenue, lastMonthRevenue),
    stock_value: stockValue,
    total_due: totalDue,
    product_count: productCount,
    customers_with_due: customersWithDue,
    low_stock_count: lowStockCount,
    expiring_count: expiringCount,
    unpaid_bills_count: unpaidBillsCount,
    today_profit: todayProfit,
    month_profit: monthlyProfit,
    total_profit: totalProfit,
  };
}

function getSalesChart(days = 30) {
  const rows = sqlite.prepare(
    `SELECT bill_date as date, COALESCE(SUM(total_amount),0) as total
     FROM bills
     WHERE bill_date >= date('now', ? || ' days')
     GROUP BY bill_date
     ORDER BY bill_date ASC`
  ).all(`-${days}`);

  const profitRows = sqlite.prepare(`
    SELECT b.bill_date as date,
           COALESCE(SUM(bi.taxable_amount - COALESCE(p.purchase_price,0)*bi.quantity),0) as profit
    FROM bill_items bi
    JOIN bills b ON b.id = bi.bill_id
    LEFT JOIN products p ON p.id = bi.product_id
    WHERE b.bill_date >= date('now', ? || ' days')
    GROUP BY b.bill_date
  `).all(`-${days}`);

  // Fill missing days with 0
  const map = {};
  rows.forEach(r => { map[r.date] = Number(r.total); });
  const profitMap = {};
  profitRows.forEach(r => { profitMap[r.date] = Number(r.profit); });

  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    result.push({ date: d, total: map[d] || 0, profit: profitMap[d] || 0 });
  }
  return result;
}

function getTopProducts(limit = 10) {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().slice(0, 10);
  const rows = sqlite.prepare(
    `SELECT bi.product_name as name, c.name as category,
            COALESCE(SUM(bi.total_amount),0) as revenue,
            COALESCE(SUM(bi.quantity),0) as qty_sold
     FROM bill_items bi
     LEFT JOIN products p ON p.id = bi.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     JOIN bills b ON b.id = bi.bill_id
     WHERE b.bill_date >= ?
     GROUP BY bi.product_name
     ORDER BY revenue DESC
     LIMIT ?`
  ).all(monthStart, limit);
  return rows.map(r => ({ ...r, revenue: Number(r.revenue), qty_sold: Number(r.qty_sold) }));
}

function getCategoryBreakdown() {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().slice(0, 10);
  const rows = sqlite.prepare(
    `SELECT COALESCE(c.name, 'Uncategorized') as name,
            COALESCE(SUM(bi.total_amount),0) as value
     FROM bill_items bi
     LEFT JOIN products p ON p.id = bi.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     JOIN bills b ON b.id = bi.bill_id
     WHERE b.bill_date >= ?
     GROUP BY COALESCE(c.name, 'Uncategorized')
     ORDER BY value DESC`
  ).all(monthStart);
  return rows.map(r => ({ name: r.name, value: Number(r.value) })).filter(r => r.value > 0);
}

function getRecentBills(limit = 10) {
  return sqlite.prepare(
    `SELECT id, bill_number, bill_date, customer_name, total_amount, payment_status
     FROM bills ORDER BY id DESC LIMIT ?`
  ).all(limit);
}

function getAlerts() {
  const lowStockCount = sqlite.prepare(
    `SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND current_stock <= min_stock_alert`
  ).get().count;
  const expiringCount = sqlite.prepare(
    `SELECT COUNT(*) as count FROM products 
     WHERE is_active = 1 AND expiry_date IS NOT NULL 
     AND date(expiry_date) <= date('now', '+30 days') AND date(expiry_date) >= date('now')`
  ).get().count;
  const unpaidBillsCount = sqlite.prepare(
    `SELECT COUNT(*) as count FROM bills WHERE payment_status != 'PAID'`
  ).get().count;
  return { low_stock: lowStockCount, expiring_soon: expiringCount, unpaid_bills: unpaidBillsCount };
}

module.exports = { getSummary, getSalesChart, getTopProducts, getCategoryBreakdown, getRecentBills, getAlerts };

const { sqlite } = require('../../config/db');
const { generateBillPDF } = require('./pdf.generator');
const { NotFoundError } = require('../../utils/errors');

// ── Helpers ───────────────────────────────────────────────────────────────────

const getNextBillNumber = () => {
  const shop = sqlite.prepare('SELECT invoice_prefix, invoice_counter FROM shop_profile LIMIT 1').get();
  const prefix = shop?.invoice_prefix || 'AGR';
  const counter = (shop?.invoice_counter || 0) + 1;
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(counter).padStart(4, '0')}`;
};

const getBillById = (id) => {
  const bill = sqlite.prepare(`
    SELECT b.*, u.name as created_by_name
    FROM bills b
    LEFT JOIN users u ON b.created_by = u.id
    WHERE b.id = ?
  `).get(id);
  if (!bill) throw new NotFoundError('Bill');
  return bill;
};

const getBillItems = (billId) => {
  return sqlite.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(billId);
};

const getShop = () => {
  return sqlite.prepare('SELECT * FROM shop_profile LIMIT 1').get() || {};
};

// ── Calculate bill totals ────────────────────────────────────────────────────

const calcItem = (item) => {
  const rate = item.rate;
  const qty = item.quantity;
  const discPct = item.discount_percent || 0;

  const grossAmount = rate * qty;
  const discAmount = Math.round(grossAmount * discPct / 100);
  const taxableAmount = grossAmount - discAmount;
  const gstRate = item.gst_rate || 0;
  const totalGst = Math.round(taxableAmount * gstRate / 100);
  const cgst = Math.round(totalGst / 2);
  const sgst = totalGst - cgst;
  const totalAmount = taxableAmount + totalGst;

  return { ...item, taxable_amount: taxableAmount, cgst, sgst, igst: 0, total_amount: totalAmount };
};

// ── CRUD ─────────────────────────────────────────────────────────────────────

const getAll = (query = {}) => {
  const conditions = ['1=1'];
  const params = [];

  if (query.customer_id) { conditions.push('b.customer_id = ?'); params.push(Number(query.customer_id)); }
  const statusFilter = query.status || query.payment_status;
  if (statusFilter) { conditions.push('b.payment_status = ?'); params.push(statusFilter); }
  if (query.from_date || query.date_from) { conditions.push('b.bill_date >= ?'); params.push(query.from_date || query.date_from); }
  if (query.to_date || query.date_to) { conditions.push('b.bill_date <= ?'); params.push(query.to_date || query.date_to); }
  if (query.search) {
    conditions.push('(b.bill_number LIKE ? OR b.customer_name LIKE ?)');
    params.push(`%${query.search}%`, `%${query.search}%`);
  }

  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Number(query.limit || 20));
  const offset = (page - 1) * limit;

  const where = conditions.join(' AND ');
  const rows = sqlite.prepare(`
    SELECT b.*, COUNT(bi.id) as item_count
    FROM bills b
    LEFT JOIN bill_items bi ON b.id = bi.bill_id
    WHERE ${where}
    GROUP BY b.id
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const { total } = sqlite.prepare(`SELECT COUNT(*) as total FROM bills b WHERE ${where}`).get(...params);

  // Summary stats for filtered range
  const stats = sqlite.prepare(`
    SELECT
      COALESCE(SUM(total_amount), 0) as total_sales,
      COALESCE(SUM(paid_amount), 0) as total_collected,
      COALESCE(SUM(due_amount), 0) as total_due
    FROM bills b WHERE ${where}
  `).get(...params);

  return { rows, total, page, limit, stats };
};

const getById = (id) => {
  const bill = getBillById(id);
  const items = getBillItems(id);
  return { ...bill, items };
};

const create = (data, userId) => {
  const shop = getShop();
  const billNumber = data.bill_number || getNextBillNumber();

  const calcedItems = data.items.map(calcItem);
  const subtotal = calcedItems.reduce((s, i) => s + i.rate * i.quantity, 0);
  const discountAmount = data.discount_amount || 0;
  const taxableAmount = calcedItems.reduce((s, i) => s + i.taxable_amount, 0) - discountAmount;
  const cgstAmount = calcedItems.reduce((s, i) => s + i.cgst, 0);
  const sgstAmount = calcedItems.reduce((s, i) => s + i.sgst, 0);
  const totalAmount = taxableAmount + cgstAmount + sgstAmount;
  const paidAmount = data.paid_amount || (data.payment_method !== 'CREDIT' ? totalAmount : 0);
  const dueAmount = totalAmount - paidAmount;
  const paymentStatus = dueAmount <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

  const result = sqlite.transaction(() => {
    // Verify stock for each item (variant or product)
    for (const item of calcedItems) {
      if (item.variant_id) {
        const variant = sqlite.prepare('SELECT current_stock, id FROM product_variants WHERE id = ?').get(item.variant_id);
        if (!variant) throw Object.assign(new Error(`Variant ID ${item.variant_id} not found`), { statusCode: 404 });
        if (variant.current_stock < item.quantity) {
          throw Object.assign(new Error(`Insufficient stock for ${item.product_name}`), { statusCode: 400 });
        }
      } else {
        const product = sqlite.prepare('SELECT current_stock, name FROM products WHERE id = ?').get(item.product_id);
        if (!product) throw Object.assign(new Error(`Product ID ${item.product_id} not found`), { statusCode: 404 });
        if (product.current_stock < item.quantity) {
          throw Object.assign(new Error(`Insufficient stock for ${product.name}`), { statusCode: 400 });
        }
      }
    }

    // Insert bill
    const billResult = sqlite.prepare(`
      INSERT INTO bills (
        bill_number, customer_id, customer_name, customer_phone,
        customer_address, customer_gstin, bill_date, due_date,
        subtotal, discount_amount, discount_percent, taxable_amount,
        cgst_amount, sgst_amount, igst_amount, total_amount,
        paid_amount, due_amount, payment_status, payment_method,
        notes, created_by
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, 0, ?,
        ?, ?, ?, ?,
        ?, ?
      )
    `).run(
      billNumber,
      data.customer_id || null,
      data.customer_name,
      data.customer_phone || null,
      data.customer_address || null,
      data.customer_gstin || null,
      data.bill_date || new Date().toISOString().split('T')[0],
      data.due_date || null,
      subtotal, discountAmount, data.discount_percent || 0, taxableAmount,
      cgstAmount, sgstAmount, totalAmount,
      paidAmount, dueAmount, paymentStatus, data.payment_method || 'CASH',
      data.notes || null, userId || null
    );
    const billId = billResult.lastInsertRowid;

    // Insert bill items + deduct stock
    const insertItem = sqlite.prepare(`
      INSERT INTO bill_items (
        bill_id, product_id, variant_id, product_name, hsn_code, unit,
        quantity, rate, mrp, discount_percent,
        taxable_amount, gst_rate, cgst, sgst, igst, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);

    for (const item of calcedItems) {
      insertItem.run(
        billId, item.product_id, item.variant_id || null, item.product_name, item.hsn_code || null, item.unit,
        item.quantity, item.rate, item.mrp || null, item.discount_percent || 0,
        item.taxable_amount, item.gst_rate, item.cgst, item.sgst, item.total_amount
      );

      if (item.variant_id) {
        // Deduct variant stock
        const variant = sqlite.prepare('SELECT current_stock FROM product_variants WHERE id = ?').get(item.variant_id);
        const newStock = variant.current_stock - item.quantity;
        sqlite.prepare('UPDATE product_variants SET current_stock = ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(newStock, item.variant_id);
      } else {
        // Deduct product stock
        const product = sqlite.prepare('SELECT current_stock FROM products WHERE id = ?').get(item.product_id);
        const newStock = product.current_stock - item.quantity;
        sqlite.prepare('UPDATE products SET current_stock = ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(newStock, item.product_id);

        sqlite.prepare(`
          INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_stock, new_stock, reference_id, notes, created_by)
          VALUES (?, 'OUT', ?, ?, ?, ?, 'Bill sale', ?)
        `).run(item.product_id, item.quantity, product.current_stock, newStock, billId, userId || null);
      }
    }

    // Record payment if paid
    if (paidAmount > 0) {
      sqlite.prepare(`
        INSERT INTO payments (bill_id, customer_id, amount, payment_method, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(billId, data.customer_id || null, paidAmount, data.payment_method || 'CASH', 'Payment at bill creation');
    }

    // Update customer totals if linked
    if (data.customer_id) {
      sqlite.prepare(`
        UPDATE customers
        SET total_purchases = total_purchases + ?,
            total_due = total_due + ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(totalAmount, dueAmount, data.customer_id);
    }

    // Increment shop invoice counter
    sqlite.prepare('UPDATE shop_profile SET invoice_counter = invoice_counter + 1').run();

    return billId;
  })();

  return getById(Number(result));
};

const recordPayment = (billId, data, userId) => {
  const bill = getBillById(billId);
  if (bill.payment_status === 'PAID') {
    throw Object.assign(new Error('Bill is already fully paid'), { statusCode: 400 });
  }

  const maxPayable = bill.due_amount;
  const amount = Math.min(data.amount, maxPayable);

  sqlite.transaction(() => {
    sqlite.prepare(`
      INSERT INTO payments (bill_id, customer_id, amount, payment_method, reference_number, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(billId, bill.customer_id || null, amount, data.payment_method, data.reference_number || null, data.notes || null);

    const newPaid = bill.paid_amount + amount;
    const newDue = bill.total_amount - newPaid;
    const status = newDue <= 0 ? 'PAID' : 'PARTIAL';

    sqlite.prepare(`
      UPDATE bills SET paid_amount = ?, due_amount = ?, payment_status = ?, updated_at = datetime('now') WHERE id = ?
    `).run(newPaid, newDue, status, billId);

    if (bill.customer_id) {
      sqlite.prepare('UPDATE customers SET total_due = total_due - ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(amount, bill.customer_id);
    }
  })();

  return getBillById(billId);
};

const generatePdf = async (billId) => {
  const bill = getBillById(billId);
  const items = getBillItems(billId);
  const shop = getShop();
  return generateBillPDF(bill, items, shop);
};

const getWhatsAppLink = (billId) => {
  const bill = getBillById(billId);
  const shop = getShop();
  const phone = bill.customer_phone;
  if (!phone) throw Object.assign(new Error('No phone number on this bill'), { statusCode: 400 });
  const clean = `91${phone.replace(/\D/g, '').slice(-10)}`;
  const totalRs = (bill.total_amount / 100).toFixed(2);
  const dueRs = (bill.due_amount / 100).toFixed(2);
  const upiLine = shop.upi_id ? `\nPay via UPI: ${shop.upi_id}` : '';
  const message = `Dear ${bill.customer_name || 'Customer'},\n\nBill ${bill.bill_number} for ₹${totalRs}${bill.due_amount > 0 ? `\nDue: ₹${dueRs}` : ''}${upiLine}\n\nThank you!\n— ${shop.shop_name}`;
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  return { url, phone: clean, message };
};

module.exports = { getAll, getById, create, recordPayment, generatePdf, getNextBillNumber, getWhatsAppLink };

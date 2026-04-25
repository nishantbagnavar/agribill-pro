const { sqlite } = require('../../config/db');

const getMonthlySummary = (month) => {
  return sqlite.prepare(`
    SELECT
      COUNT(*) as total_bills,
      COALESCE(SUM(taxable_amount), 0) as total_taxable,
      COALESCE(SUM(cgst_amount), 0)    as total_cgst,
      COALESCE(SUM(sgst_amount), 0)    as total_sgst,
      COALESCE(SUM(igst_amount), 0)    as total_igst,
      COALESCE(SUM(total_amount), 0)   as total_sales
    FROM bills
    WHERE strftime('%Y-%m', bill_date) = ?
    AND payment_status != 'CANCELLED'
  `).get(month);
};

const getB2BInvoices = (month) => {
  return sqlite.prepare(`
    SELECT b.bill_number, b.bill_date,
           b.customer_name, b.customer_gstin,
           b.taxable_amount, b.cgst_amount, b.sgst_amount,
           b.igst_amount, b.total_amount
    FROM bills b
    WHERE strftime('%Y-%m', b.bill_date) = ?
    AND b.customer_gstin IS NOT NULL AND b.customer_gstin != ''
    AND b.payment_status != 'CANCELLED'
    ORDER BY b.bill_date
  `).all(month);
};

const getB2CSummary = (month) => {
  return sqlite.prepare(`
    SELECT COUNT(*) as bill_count,
           COALESCE(SUM(taxable_amount), 0) as taxable,
           COALESCE(SUM(cgst_amount), 0)    as cgst,
           COALESCE(SUM(sgst_amount), 0)    as sgst,
           COALESCE(SUM(total_amount), 0)   as total
    FROM bills
    WHERE strftime('%Y-%m', bill_date) = ?
    AND (customer_gstin IS NULL OR customer_gstin = '')
    AND payment_status != 'CANCELLED'
  `).get(month);
};

const getHSNSummary = (month) => {
  return sqlite.prepare(`
    SELECT bi.hsn_code, bi.gst_rate, bi.unit,
           SUM(bi.quantity)       as total_quantity,
           COALESCE(SUM(bi.taxable_amount), 0) as taxable_value,
           COALESCE(SUM(bi.cgst), 0)           as cgst,
           COALESCE(SUM(bi.sgst), 0)           as sgst,
           COALESCE(SUM(bi.igst), 0)           as igst,
           (SELECT bi2.product_name FROM bill_items bi2
            JOIN bills b2 ON bi2.bill_id = b2.id
            WHERE bi2.hsn_code = bi.hsn_code AND bi2.gst_rate = bi.gst_rate
            AND strftime('%Y-%m', b2.bill_date) = ?
            LIMIT 1) as description
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    WHERE strftime('%Y-%m', b.bill_date) = ?
    AND b.payment_status != 'CANCELLED'
    GROUP BY bi.hsn_code, bi.gst_rate
    ORDER BY taxable_value DESC
  `).all(month, month);
};

const getTaxByRate = (month) => {
  return sqlite.prepare(`
    SELECT bi.gst_rate,
           COALESCE(SUM(bi.taxable_amount), 0) as taxable,
           COALESCE(SUM(bi.cgst), 0) as cgst,
           COALESCE(SUM(bi.sgst), 0) as sgst,
           COALESCE(SUM(bi.igst), 0) as igst
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    WHERE strftime('%Y-%m', b.bill_date) = ?
    AND b.payment_status != 'CANCELLED'
    GROUP BY bi.gst_rate
    ORDER BY bi.gst_rate
  `).all(month);
};

const getShopProfile = () => {
  return sqlite.prepare('SELECT * FROM shop_profile LIMIT 1').get() || {};
};

const getFullReport = (month) => {
  const summary = getMonthlySummary(month);
  const b2bInvoices = getB2BInvoices(month);
  const b2cSummary = getB2CSummary(month);
  const hsnSummary = getHSNSummary(month);
  const taxByRate = getTaxByRate(month);
  const b2bCount = b2bInvoices.length;
  const b2cCount = b2cSummary.bill_count || 0;

  return { month, summary, b2bInvoices, b2cSummary, hsnSummary, taxByRate, b2bCount, b2cCount };
};

module.exports = { getMonthlySummary, getB2BInvoices, getB2CSummary, getHSNSummary, getTaxByRate, getShopProfile, getFullReport };

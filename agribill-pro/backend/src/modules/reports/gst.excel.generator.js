const ExcelJS = require('exceljs');

const fmt = (paise) => ((paise || 0) / 100);

const formatMonth = (month) => {
  const [year, m] = month.split('-');
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[parseInt(m, 10) - 1]} ${year}`;
};

const styleHeader = (row, fillColor = '1F6F5F') => {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + fillColor } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' },
    };
  });
  row.height = 18;
};

const styleDataRow = (row, isAlt) => {
  row.eachCell((cell) => {
    if (isAlt) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F7' } };
    cell.border = {
      top: { style: 'hair' }, left: { style: 'hair' },
      bottom: { style: 'hair' }, right: { style: 'hair' },
    };
    cell.font = { size: 9 };
  });
};

const generateGSTExcel = async (data, shop) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AgriBill Pro';
  wb.created = new Date();

  const period = formatMonth(data.month);
  const shopName = shop.shop_name || 'Shop';
  const gstin = shop.gstin || 'N/A';
  const stateCode = shop.state_code || '27';

  // ── Sheet 1: GST Summary ──────────────────────────────────────────────────────
  const s1 = wb.addWorksheet('GST Summary');
  s1.columns = [
    { key: 'a', width: 20 }, { key: 'b', width: 20 },
    { key: 'c', width: 16 }, { key: 'd', width: 16 },
    { key: 'e', width: 16 }, { key: 'f', width: 16 },
  ];

  const titleRow = s1.addRow([`${shopName} — GST Report — ${period}`]);
  titleRow.font = { bold: true, size: 13 };
  s1.mergeCells('A1:F1');
  titleRow.getCell(1).alignment = { horizontal: 'center' };

  s1.addRow([`GSTIN: ${gstin}   |   Period: ${period}   |   State Code: ${stateCode}`]);
  s1.mergeCells('A2:F2');
  s1.getCell('A2').alignment = { horizontal: 'center' };
  s1.getCell('A2').font = { size: 9, color: { argb: 'FF48484A' } };

  s1.addRow([]);

  // Overview stats
  const s = data.summary || {};
  const overviewHeader = s1.addRow(['Metric', 'Value']);
  styleHeader(overviewHeader, '2FA084');
  overviewHeader.getCell(1).alignment = { horizontal: 'left' };
  overviewHeader.getCell(2).alignment = { horizontal: 'right' };

  const overviewData = [
    ['Total Bills', s.total_bills || 0],
    ['B2B Bills', data.b2bCount || 0],
    ['B2C Bills', data.b2cCount || 0],
    ['Total Sales (₹)', fmt(s.total_sales)],
    ['Total Taxable Value (₹)', fmt(s.total_taxable)],
    ['Total CGST (₹)', fmt(s.total_cgst)],
    ['Total SGST (₹)', fmt(s.total_sgst)],
    ['Total IGST (₹)', fmt(s.total_igst)],
    ['Total Tax Collected (₹)', fmt((s.total_cgst || 0) + (s.total_sgst || 0) + (s.total_igst || 0))],
  ];
  overviewData.forEach((d, i) => {
    const row = s1.addRow(d);
    styleDataRow(row, i % 2 === 1);
    row.getCell(2).numFmt = '#,##0.00';
    row.getCell(2).alignment = { horizontal: 'right' };
  });

  s1.addRow([]);
  const rateHeader = s1.addRow(['Tax Rate', 'Taxable Value (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'Total Tax (₹)']);
  styleHeader(rateHeader);
  (data.taxByRate || []).forEach((r, i) => {
    const row = s1.addRow([
      `${r.gst_rate}%`,
      fmt(r.taxable), fmt(r.cgst), fmt(r.sgst), fmt(r.igst),
      fmt((r.cgst || 0) + (r.sgst || 0) + (r.igst || 0)),
    ]);
    styleDataRow(row, i % 2 === 1);
    ['B', 'C', 'D', 'E', 'F'].forEach((col) => {
      row.getCell(col).numFmt = '#,##0.00';
      row.getCell(col).alignment = { horizontal: 'right' };
    });
  });

  // ── Sheet 2: B2B Invoices (GSTR-1 ready) ─────────────────────────────────────
  const s2 = wb.addWorksheet('B2B Invoices (GSTR-1)');
  s2.columns = [
    { key: 'gstin', width: 18 }, { key: 'name', width: 28 },
    { key: 'bill_no', width: 16 }, { key: 'date', width: 14 },
    { key: 'value', width: 16 }, { key: 'pos', width: 10 },
    { key: 'taxable', width: 16 }, { key: 'cgst', width: 14 },
    { key: 'sgst', width: 14 }, { key: 'igst', width: 14 },
  ];

  s2.addRow([`${shopName} — B2B Invoices (GSTR-1 Format) — ${period}`]);
  s2.mergeCells('A1:J1');
  s2.getCell('A1').font = { bold: true, size: 11 };
  s2.getCell('A1').alignment = { horizontal: 'center' };
  s2.addRow([]);

  const b2bHeader = s2.addRow([
    'GSTIN of Recipient', 'Receiver Name', 'Invoice Number',
    'Invoice Date', 'Invoice Value (₹)', 'Place of Supply',
    'Taxable Value (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)',
  ]);
  styleHeader(b2bHeader);

  (data.b2bInvoices || []).forEach((inv, i) => {
    const row = s2.addRow([
      inv.customer_gstin, inv.customer_name, inv.bill_number,
      inv.bill_date, fmt(inv.total_amount), stateCode,
      fmt(inv.taxable_amount), fmt(inv.cgst_amount), fmt(inv.sgst_amount), fmt(inv.igst_amount),
    ]);
    styleDataRow(row, i % 2 === 1);
    ['E', 'G', 'H', 'I', 'J'].forEach((col) => {
      row.getCell(col).numFmt = '#,##0.00';
      row.getCell(col).alignment = { horizontal: 'right' };
    });
  });

  // ── Sheet 3: B2C Summary ──────────────────────────────────────────────────────
  const s3 = wb.addWorksheet('B2C Summary');
  s3.columns = [
    { key: 'a', width: 20 }, { key: 'b', width: 16 },
    { key: 'c', width: 16 }, { key: 'd', width: 16 },
    { key: 'e', width: 16 }, { key: 'f', width: 16 },
  ];

  s3.addRow([`${shopName} — B2C Summary — ${period}`]);
  s3.mergeCells('A1:F1');
  s3.getCell('A1').font = { bold: true, size: 11 };
  s3.getCell('A1').alignment = { horizontal: 'center' };
  s3.addRow([]);

  const b2cH = s3.addRow(['Category', 'Bill Count', 'Taxable Value (₹)', 'CGST (₹)', 'SGST (₹)', 'Total (₹)']);
  styleHeader(b2cH);
  const b2c = data.b2cSummary || {};
  const b2cRow = s3.addRow([
    'B2C Total', b2c.bill_count || 0,
    fmt(b2c.taxable), fmt(b2c.cgst), fmt(b2c.sgst), fmt(b2c.total),
  ]);
  styleDataRow(b2cRow, false);
  ['C', 'D', 'E', 'F'].forEach((col) => {
    b2cRow.getCell(col).numFmt = '#,##0.00';
    b2cRow.getCell(col).alignment = { horizontal: 'right' };
  });

  // ── Sheet 4: HSN Summary ──────────────────────────────────────────────────────
  const s4 = wb.addWorksheet('HSN Summary');
  s4.columns = [
    { key: 'hsn', width: 14 }, { key: 'unit', width: 12 },
    { key: 'qty', width: 12 }, { key: 'taxable', width: 18 },
    { key: 'rate', width: 10 }, { key: 'cgst', width: 14 },
    { key: 'sgst', width: 14 }, { key: 'igst', width: 14 },
  ];

  s4.addRow([`${shopName} — HSN Summary — ${period}`]);
  s4.mergeCells('A1:H1');
  s4.getCell('A1').font = { bold: true, size: 11 };
  s4.getCell('A1').alignment = { horizontal: 'center' };
  s4.addRow([]);

  const hsnH = s4.addRow(['HSN Code', 'UQC (Unit)', 'Total Qty', 'Taxable Value (₹)', 'Tax Rate', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)']);
  styleHeader(hsnH);

  (data.hsnSummary || []).forEach((h, i) => {
    const row = s4.addRow([
      h.hsn_code || 'N/A', h.unit || 'N/A', h.total_quantity || 0,
      fmt(h.taxable_value), `${h.gst_rate || 0}%`,
      fmt(h.cgst), fmt(h.sgst), fmt(h.igst),
    ]);
    styleDataRow(row, i % 2 === 1);
    ['D', 'F', 'G', 'H'].forEach((col) => {
      row.getCell(col).numFmt = '#,##0.00';
      row.getCell(col).alignment = { horizontal: 'right' };
    });
    row.getCell('C').alignment = { horizontal: 'right' };
  });

  return wb;
};

module.exports = { generateGSTExcel };

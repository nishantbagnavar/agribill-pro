const PDFDocument = require('pdfkit');

const C = {
  primary: '#1F6F5F',
  primaryLight: '#6FCF97',
  gold: '#D4A017',
  gray900: '#111111',
  gray600: '#48484A',
  gray300: '#C7C7CC',
  gray100: '#F2F2F7',
  white: '#FFFFFF',
};

const MARGIN = 40;
const PAGE_W = 595.28;
const CONTENT_W = PAGE_W - MARGIN * 2; // 515.28

// Use Rs. — Helvetica does not support the ₹ glyph
const fmt    = (paise) => 'Rs.' + ((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmtNum = (paise) => ((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const formatMonth = (month) => {
  const [year, m] = month.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1]} ${year}`;
};

const hline = (doc, y, color = C.gray300) => {
  doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).strokeColor(color).lineWidth(0.5).stroke();
};

const drawRect = (doc, x, y, w, h, fill) => {
  doc.rect(x, y, w, h);
  if (fill) doc.fillColor(fill).fill();
};

// Draw a table header row and return updated y
const tableHeader = (doc, y, cols, rowH = 16) => {
  drawRect(doc, MARGIN, y, CONTENT_W, rowH, C.primary);
  let cx = MARGIN;
  cols.forEach((col) => {
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7.5)
      .text(col.label, cx + 4, y + (rowH - 8) / 2, {
        width: col.w - 6,
        align: col.align || 'right',
        lineBreak: false,
      });
    cx += col.w;
  });
  return y + rowH;
};

// Draw one data row
const tableRow = (doc, y, cols, vals, rowH = 14, shade = false) => {
  if (shade) drawRect(doc, MARGIN, y, CONTENT_W, rowH, C.gray100);
  let cx = MARGIN;
  cols.forEach((col, ci) => {
    doc.fillColor(C.gray900).font('Helvetica').fontSize(7.5)
      .text(String(vals[ci] ?? ''), cx + 4, y + (rowH - 8) / 2, {
        width: col.w - 6,
        align: col.align || 'right',
        lineBreak: false,
        ellipsis: true,
      });
    cx += col.w;
  });
  return y + rowH;
};

const generateGSTPDF = (data, shop) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `GST Report ${data.month}` } });
      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end',  () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const period = formatMonth(data.month);
      let y = MARGIN;

      // ── PAGE 1 HEADER ───────────────────────────────────────────────────────
      drawRect(doc, 0, 0, PAGE_W, 80, C.primary);
      doc.fillColor(C.white).font('Helvetica-Bold').fontSize(16)
        .text(shop.shop_name || 'Shop', MARGIN, 15, { width: CONTENT_W, align: 'center' });
      doc.fillColor(C.primaryLight).font('Helvetica').fontSize(9)
        .text(`GST Report — ${period}${shop.gstin ? '   |   GSTIN: ' + shop.gstin : ''}`, MARGIN, 38, { width: CONTENT_W, align: 'center' });
      doc.fillColor(C.gold).font('Helvetica-Bold').fontSize(8)
        .text('GSTR-1 SUMMARY', MARGIN, 55, { width: CONTENT_W, align: 'center' });
      y = 96;

      // ── SALES OVERVIEW CARDS ────────────────────────────────────────────────
      const s = data.summary;
      const cards = [
        { label: 'Total Bills',  value: String(s.total_bills || 0) },
        { label: 'Total Sales',  value: fmt(s.total_sales) },
        { label: 'B2B Bills',    value: String(data.b2bCount) },
        { label: 'B2C Bills',    value: String(data.b2cCount) },
      ];
      const cardW = CONTENT_W / 4;
      cards.forEach((card, i) => {
        const cx = MARGIN + i * cardW;
        drawRect(doc, cx, y, cardW - 4, 42, C.gray100);
        doc.fillColor(C.gray600).font('Helvetica').fontSize(7)
          .text(card.label, cx + 6, y + 6, { width: cardW - 14 });
        doc.fillColor(C.gray900).font('Helvetica-Bold').fontSize(11)
          .text(card.value, cx + 6, y + 18, { width: cardW - 14 });
      });
      y += 54;

      // ── TAX BY RATE TABLE ───────────────────────────────────────────────────
      doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(9)
        .text('TAX COLLECTED BY RATE', MARGIN, y);
      y += 14;

      // Widths must sum to CONTENT_W (515.28) — using integers that sum to 515
      const rateCols = [
        { label: 'GST Rate',      w: 65,  align: 'center' },
        { label: 'Taxable Value', w: 110, align: 'right'  },
        { label: 'CGST',          w: 90,  align: 'right'  },
        { label: 'SGST',          w: 90,  align: 'right'  },
        { label: 'IGST',          w: 75,  align: 'right'  },
        { label: 'Total Tax',     w: 85,  align: 'right'  },
      ]; // total = 515

      y = tableHeader(doc, y, rateCols);

      const taxByRate = data.taxByRate || [];
      let totTaxable = 0, totCgst = 0, totSgst = 0, totIgst = 0;

      taxByRate.forEach((row, idx) => {
        const totalTax = (row.cgst || 0) + (row.sgst || 0) + (row.igst || 0);
        totTaxable += (row.taxable || 0);
        totCgst    += (row.cgst || 0);
        totSgst    += (row.sgst || 0);
        totIgst    += (row.igst || 0);
        const vals = [
          `${row.gst_rate}%`,
          fmtNum(row.taxable),
          fmtNum(row.cgst),
          fmtNum(row.sgst),
          fmtNum(row.igst),
          fmtNum(totalTax),
        ];
        y = tableRow(doc, y, rateCols, vals, 14, idx % 2 === 0);
      });

      // Totals row
      drawRect(doc, MARGIN, y, CONTENT_W, 16, '#2FA084');
      const totVals = ['TOTAL', fmtNum(totTaxable), fmtNum(totCgst), fmtNum(totSgst), fmtNum(totIgst), fmtNum(totCgst + totSgst + totIgst)];
      let cx = MARGIN;
      rateCols.forEach((col, ci) => {
        doc.fillColor(C.white).font('Helvetica-Bold').fontSize(8)
          .text(totVals[ci], cx + 4, y + 4, { width: col.w - 6, align: col.align || 'right', lineBreak: false });
        cx += col.w;
      });
      y += 26;

      // ── B2B INVOICES TABLE ──────────────────────────────────────────────────
      doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(9)
        .text('B2B INVOICE LIST', MARGIN, y);
      y += 14;

      const b2bCols = [
        { label: 'Bill No',   w: 80,  align: 'left'  },
        { label: 'Date',      w: 65,  align: 'left'  },
        { label: 'Customer',  w: 140, align: 'left'  },
        { label: 'GSTIN',     w: 105, align: 'left'  },
        { label: 'Taxable',   w: 65,  align: 'right' },
        { label: 'Amount',    w: 60,  align: 'right' },
      ]; // total = 515

      y = tableHeader(doc, y, b2bCols);

      const b2bInvoices = data.b2bInvoices || [];
      if (b2bInvoices.length === 0) {
        doc.fillColor(C.gray600).font('Helvetica').fontSize(8)
          .text('No B2B invoices for this period.', MARGIN + 4, y + 4);
        y += 20;
      } else {
        b2bInvoices.forEach((inv, idx) => {
          if (y > 750) { doc.addPage(); y = MARGIN; }
          const vals = [
            inv.bill_number,
            inv.bill_date,
            (inv.customer_name || '').substring(0, 25),
            (inv.customer_gstin || '').substring(0, 15),
            fmtNum(inv.taxable_amount),
            fmtNum(inv.total_amount),
          ];
          y = tableRow(doc, y, b2bCols, vals, 14, idx % 2 === 0);
        });
      }

      y += 10;

      // ── B2C SUMMARY BOX ─────────────────────────────────────────────────────
      doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(9)
        .text('B2C SUMMARY', MARGIN, y);
      y += 14;

      const b2c = data.b2cSummary || {};
      drawRect(doc, MARGIN, y, CONTENT_W, 36, C.gray100);
      const b2cItems = [
        { label: 'Bill Count',    value: String(b2c.bill_count || 0) },
        { label: 'Taxable Value', value: fmt(b2c.taxable) },
        { label: 'CGST',          value: fmt(b2c.cgst) },
        { label: 'SGST',          value: fmt(b2c.sgst) },
        { label: 'Total',         value: fmt(b2c.total) },
      ];
      const b2cW = CONTENT_W / b2cItems.length;
      b2cItems.forEach((item, i) => {
        const bx = MARGIN + i * b2cW + 6;
        doc.fillColor(C.gray600).font('Helvetica').fontSize(7)
          .text(item.label, bx, y + 6, { width: b2cW - 10 });
        doc.fillColor(C.gray900).font('Helvetica-Bold').fontSize(9)
          .text(item.value, bx, y + 18, { width: b2cW - 10 });
      });
      y += 48;

      // ── PAGE 2: HSN SUMMARY ─────────────────────────────────────────────────
      doc.addPage();
      y = MARGIN;

      drawRect(doc, 0, 0, PAGE_W, 60, C.primary);
      doc.fillColor(C.white).font('Helvetica-Bold').fontSize(14)
        .text(`HSN-WISE SUMMARY — ${period}`, MARGIN, 10, { width: CONTENT_W, align: 'center' });
      doc.fillColor(C.primaryLight).font('Helvetica').fontSize(8)
        .text(shop.shop_name || '', MARGIN, 32, { width: CONTENT_W, align: 'center' });
      doc.fillColor(C.gold).font('Helvetica').fontSize(7)
        .text('Mandatory annexure for GSTR-1 filing', MARGIN, 44, { width: CONTENT_W, align: 'center' });
      y = 76;

      const hsnCols = [
        { label: 'HSN Code',      w: 70,  align: 'left'   },
        { label: 'Description',   w: 145, align: 'left'   },
        { label: 'UQC (Unit)',    w: 60,  align: 'center' },
        { label: 'Total Qty',     w: 50,  align: 'right'  },
        { label: 'Taxable Value', w: 90,  align: 'right'  },
        { label: 'Tax Rate',      w: 50,  align: 'center' },
        { label: 'Tax Amount',    w: 50,  align: 'right'  },
      ]; // total = 515

      y = tableHeader(doc, y, hsnCols);

      const hsnSummary = data.hsnSummary || [];
      if (hsnSummary.length === 0) {
        doc.fillColor(C.gray600).font('Helvetica').fontSize(8)
          .text('No HSN data for this period.', MARGIN + 4, y + 4);
      } else {
        hsnSummary.forEach((row, idx) => {
          if (y > 750) { doc.addPage(); y = MARGIN; }
          const totalTax = (row.cgst || 0) + (row.sgst || 0) + (row.igst || 0);
          const vals = [
            row.hsn_code || '—',
            row.description || '—',
            row.unit || '—',
            String(row.total_quantity || 0),
            fmtNum(row.taxable_value),
            `${row.gst_rate || 0}%`,
            fmtNum(totalTax),
          ];
          y = tableRow(doc, y, hsnCols, vals, 14, idx % 2 === 0);
        });
      }

      y += 20;
      hline(doc, y);
      y += 8;
      doc.fillColor(C.gray600).font('Helvetica').fontSize(7)
        .text(
          'Generated by AgriBill Pro | This report is for reference only. Verify with GST portal before filing.',
          MARGIN, y, { width: CONTENT_W, align: 'center' }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateGSTPDF };

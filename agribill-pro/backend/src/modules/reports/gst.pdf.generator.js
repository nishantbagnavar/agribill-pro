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
const CONTENT_W = PAGE_W - MARGIN * 2;

// Amounts are stored in paise; divide by 100 for display
const fmt = (paise) => '₹' + ((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmtNum = (paise) => ((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const formatMonth = (month) => {
  const [year, m] = month.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1]} ${year}`;
};

const hline = (doc, y, color = C.gray300) => {
  doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).strokeColor(color).lineWidth(0.5).stroke();
};

const rect = (doc, x, y, w, h, fill) => {
  doc.rect(x, y, w, h);
  if (fill) doc.fillColor(fill).fill();
};

const generateGSTPDF = (data, shop) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `GST Report ${data.month}` } });
      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const period = formatMonth(data.month);
      let y = MARGIN;

      // ── PAGE 1 HEADER ─────────────────────────────────────────────────────────
      rect(doc, 0, 0, PAGE_W, 80, C.primary);
      doc.fillColor(C.white).font('Helvetica-Bold').fontSize(16)
        .text(shop.shop_name || 'Shop', MARGIN, 15, { width: CONTENT_W, align: 'center' });
      doc.fillColor(C.primaryLight).font('Helvetica').fontSize(9)
        .text(`GST Report — ${period}${shop.gstin ? '   |   GSTIN: ' + shop.gstin : ''}`, MARGIN, 38, { width: CONTENT_W, align: 'center' });
      doc.fillColor(C.gold).font('Helvetica-Bold').fontSize(8)
        .text('GSTR-1 SUMMARY', MARGIN, 55, { width: CONTENT_W, align: 'center' });

      y = 96;

      // ── SALES OVERVIEW CARDS ──────────────────────────────────────────────────
      const s = data.summary;
      const cards = [
        { label: 'Total Bills', value: String(s.total_bills || 0) },
        { label: 'Total Sales', value: fmt(s.total_sales) },
        { label: 'B2B Bills', value: String(data.b2bCount) },
        { label: 'B2C Bills', value: String(data.b2cCount) },
      ];
      const cardW = CONTENT_W / 4;
      cards.forEach((card, i) => {
        const cx = MARGIN + i * cardW;
        rect(doc, cx, y, cardW - 4, 42, C.gray100);
        doc.fillColor(C.gray600).font('Helvetica').fontSize(7).text(card.label, cx + 6, y + 6, { width: cardW - 12 });
        doc.fillColor(C.gray900).font('Helvetica-Bold').fontSize(11).text(card.value, cx + 6, y + 18, { width: cardW - 12 });
      });
      y += 54;

      // ── TAX BY RATE TABLE ─────────────────────────────────────────────────────
      doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(9).text('TAX COLLECTED BY RATE', MARGIN, y);
      y += 14;

      const rateCols = [
        { label: 'GST Rate', w: 70 },
        { label: 'Taxable Value', w: 120 },
        { label: 'CGST', w: 100 },
        { label: 'SGST', w: 100 },
        { label: 'IGST', w: 80 },
        { label: 'Total Tax', w: 95 },
      ];
      rect(doc, MARGIN, y, CONTENT_W, 16, C.primary);
      let cx = MARGIN + 4;
      rateCols.forEach((col) => {
        doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7.5)
          .text(col.label, cx, y + 4, { width: col.w - 4, align: 'right' });
        cx += col.w;
      });
      y += 16;

      const taxByRate = data.taxByRate || [];
      let totalTaxable = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;
      taxByRate.forEach((row, idx) => {
        if (idx % 2 === 0) rect(doc, MARGIN, y, CONTENT_W, 14, C.gray100);
        const totalTax = (row.cgst || 0) + (row.sgst || 0) + (row.igst || 0);
        totalTaxable += (row.taxable || 0);
        totalCgst += (row.cgst || 0);
        totalSgst += (row.sgst || 0);
        totalIgst += (row.igst || 0);
        const vals = [`${row.gst_rate}%`, fmtNum(row.taxable), fmtNum(row.cgst), fmtNum(row.sgst), fmtNum(row.igst), fmtNum(totalTax)];
        cx = MARGIN + 4;
        rateCols.forEach((col, ci) => {
          doc.fillColor(C.gray900).font('Helvetica').fontSize(7.5)
            .text(vals[ci], cx, y + 3, { width: col.w - 4, align: 'right' });
          cx += col.w;
        });
        y += 14;
      });

      // Totals row
      rect(doc, MARGIN, y, CONTENT_W, 16, '#2FA084');
      const totVals = ['TOTAL', fmtNum(totalTaxable), fmtNum(totalCgst), fmtNum(totalSgst), fmtNum(totalIgst), fmtNum(totalCgst + totalSgst + totalIgst)];
      cx = MARGIN + 4;
      rateCols.forEach((col, ci) => {
        doc.fillColor(C.white).font('Helvetica-Bold').fontSize(8)
          .text(totVals[ci], cx, y + 4, { width: col.w - 4, align: 'right' });
        cx += col.w;
      });
      y += 26;

      // ── B2B INVOICES TABLE ────────────────────────────────────────────────────
      doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(9).text('B2B INVOICE LIST', MARGIN, y);
      y += 14;

      const b2bCols = [
        { label: 'Bill No', w: 90 },
        { label: 'Date', w: 70 },
        { label: 'Customer', w: 140 },
        { label: 'GSTIN', w: 105 },
        { label: 'Taxable', w: 70 },
        { label: 'Amount', w: 80 },
      ];
      rect(doc, MARGIN, y, CONTENT_W, 16, C.primary);
      cx = MARGIN + 4;
      b2bCols.forEach((col) => {
        doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7.5)
          .text(col.label, cx, y + 4, { width: col.w - 4 });
        cx += col.w;
      });
      y += 16;

      const b2bInvoices = data.b2bInvoices || [];
      if (b2bInvoices.length === 0) {
        doc.fillColor(C.gray600).font('Helvetica').fontSize(8)
          .text('No B2B invoices for this period.', MARGIN, y + 4);
        y += 20;
      } else {
        b2bInvoices.forEach((inv, idx) => {
          if (y > 750) {
            doc.addPage();
            y = MARGIN;
          }
          if (idx % 2 === 0) rect(doc, MARGIN, y, CONTENT_W, 14, C.gray100);
          const vals = [
            inv.bill_number,
            inv.bill_date,
            (inv.customer_name || '').substring(0, 22),
            (inv.customer_gstin || '').substring(0, 16),
            fmtNum(inv.taxable_amount),
            fmtNum(inv.total_amount),
          ];
          cx = MARGIN + 4;
          b2bCols.forEach((col, ci) => {
            doc.fillColor(C.gray900).font('Helvetica').fontSize(7)
              .text(vals[ci], cx, y + 3, { width: col.w - 4, lineBreak: false });
            cx += col.w;
          });
          y += 14;
        });
      }

      y += 10;

      // ── B2C SUMMARY BOX ───────────────────────────────────────────────────────
      const b2c = data.b2cSummary || {};
      doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(9).text('B2C SUMMARY', MARGIN, y);
      y += 14;
      rect(doc, MARGIN, y, CONTENT_W, 32, C.gray100);
      const b2cItems = [
        { label: 'Bill Count', value: String(b2c.bill_count || 0) },
        { label: 'Taxable Value', value: fmt(b2c.taxable) },
        { label: 'CGST', value: fmt(b2c.cgst) },
        { label: 'SGST', value: fmt(b2c.sgst) },
        { label: 'Total', value: fmt(b2c.total) },
      ];
      const b2cW = CONTENT_W / b2cItems.length;
      b2cItems.forEach((item, i) => {
        const bx = MARGIN + i * b2cW + 6;
        doc.fillColor(C.gray600).font('Helvetica').fontSize(7).text(item.label, bx, y + 5, { width: b2cW - 8 });
        doc.fillColor(C.gray900).font('Helvetica-Bold').fontSize(9).text(item.value, bx, y + 16, { width: b2cW - 8 });
      });
      y += 44;

      // ── PAGE 2: HSN SUMMARY ───────────────────────────────────────────────────
      doc.addPage();
      y = MARGIN;

      rect(doc, 0, 0, PAGE_W, 60, C.primary);
      doc.fillColor(C.white).font('Helvetica-Bold').fontSize(14)
        .text(`HSN-WISE SUMMARY — ${period}`, MARGIN, 10, { width: CONTENT_W, align: 'center' });
      doc.fillColor(C.primaryLight).font('Helvetica').fontSize(8)
        .text(shop.shop_name || '', MARGIN, 32, { width: CONTENT_W, align: 'center' });
      doc.fillColor(C.gold).font('Helvetica').fontSize(7)
        .text('Mandatory annexure for GSTR-1 filing', MARGIN, 44, { width: CONTENT_W, align: 'center' });

      y = 76;

      const hsnCols = [
        { label: 'HSN Code', w: 75 },
        { label: 'Description', w: 140 },
        { label: 'UQC (Unit)', w: 70 },
        { label: 'Total Qty', w: 65 },
        { label: 'Taxable Value', w: 95 },
        { label: 'Tax Rate', w: 55 },
        { label: 'Tax Amount', w: 75 },
      ];
      rect(doc, MARGIN, y, CONTENT_W, 16, C.primary);
      cx = MARGIN + 4;
      hsnCols.forEach((col) => {
        doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7.5)
          .text(col.label, cx, y + 4, { width: col.w - 4, align: 'right' });
        cx += col.w;
      });
      y += 16;

      const hsnSummary = data.hsnSummary || [];
      if (hsnSummary.length === 0) {
        doc.fillColor(C.gray600).font('Helvetica').fontSize(8)
          .text('No HSN data for this period.', MARGIN, y + 4);
      } else {
        hsnSummary.forEach((row, idx) => {
          if (idx % 2 === 0) rect(doc, MARGIN, y, CONTENT_W, 14, C.gray100);
          const totalTax = (row.cgst || 0) + (row.sgst || 0) + (row.igst || 0);
          const vals = [
            row.hsn_code || '—',
            '',
            row.unit || '—',
            String(row.total_quantity || 0),
            fmtNum(row.taxable_value),
            `${row.gst_rate || 0}%`,
            fmtNum(totalTax),
          ];
          cx = MARGIN + 4;
          hsnCols.forEach((col, ci) => {
            doc.fillColor(C.gray900).font('Helvetica').fontSize(7.5)
              .text(vals[ci], cx, y + 3, { width: col.w - 4, align: 'right', lineBreak: false });
            cx += col.w;
          });
          y += 14;
        });
      }

      y += 20;
      hline(doc, y);
      y += 8;
      doc.fillColor(C.gray600).font('Helvetica').fontSize(7)
        .text('Generated by AgriBill Pro | This report is for reference only. Verify with GST portal before filing.', MARGIN, y, { width: CONTENT_W, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateGSTPDF };

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (paise) => '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmtNum = (paise) => (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const numberToWords = (amount) => {
  const paise = amount % 100;
  const rupees = Math.floor(amount / 100);
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const toWords = (n) => {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + ' ' + ones[n % 10] + ' ';
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + toWords(n % 100);
    if (n < 100000) return toWords(Math.floor(n / 1000)) + 'Thousand ' + toWords(n % 1000);
    if (n < 10000000) return toWords(Math.floor(n / 100000)) + 'Lakh ' + toWords(n % 100000);
    return toWords(Math.floor(n / 10000000)) + 'Crore ' + toWords(n % 10000000);
  };

  let words = toWords(rupees).trim();
  if (!words) words = 'Zero';
  if (paise > 0) words += ` and ${toWords(paise).trim()} Paise`;
  return 'Rupees ' + words + ' Only';
};

// ── Color palette ─────────────────────────────────────────────────────────────
const C = {
  primary: '#1F6F5F',
  primaryLight: '#6FCF97',
  gold: '#D4A017',
  gray900: '#111111',
  gray600: '#48484A',
  gray300: '#C7C7CC',
  gray100: '#F2F2F7',
  white: '#FFFFFF',
  danger: '#EF4444',
  success: '#10B981',
};

// ── Layout constants ──────────────────────────────────────────────────────────
const MARGIN = 40;
const PAGE_W = 595.28; // A4 width in points
const CONTENT_W = PAGE_W - MARGIN * 2;

// ── Drawing helpers ───────────────────────────────────────────────────────────

const hline = (doc, y, color = C.gray300) => {
  doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).strokeColor(color).lineWidth(0.5).stroke();
};

const rect = (doc, x, y, w, h, fill, stroke) => {
  doc.rect(x, y, w, h);
  if (fill) doc.fillColor(fill).fill();
  if (stroke) doc.strokeColor(stroke).lineWidth(0.5).stroke();
};

const text = (doc, str, x, y, opts = {}) => {
  doc.fillColor(opts.color || C.gray900)
    .font(opts.font || 'Helvetica')
    .fontSize(opts.size || 9)
    .text(str, x, y, { width: opts.width, align: opts.align || 'left', lineBreak: opts.lineBreak !== false });
};

// ── Main generator ────────────────────────────────────────────────────────────

const generateBillPDF = async (bill, items, shop) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `Invoice ${bill.bill_number}` } });
      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      let y = MARGIN;

      // ── HEADER ──────────────────────────────────────────────────────────────
      rect(doc, 0, 0, PAGE_W, 110, C.primary);

      // Logo (if exists)
      const logoPath = shop.logo_path ? path.resolve(process.cwd(), shop.logo_path) : null;
      if (logoPath && fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, MARGIN, 18, { width: 60, height: 60 });
        } catch { /* skip if image fails */ }
      }

      const shopX = logoPath && fs.existsSync(logoPath || '') ? MARGIN + 70 : MARGIN;

      doc.fillColor(C.white).font('Helvetica-Bold').fontSize(16).text(shop.shop_name || 'AgriBill Pro', shopX, 20);
      doc.fillColor(C.primaryLight).font('Helvetica').fontSize(8);
      const shopDetails = [
        shop.address ? [shop.address, shop.city, shop.state, shop.pincode].filter(Boolean).join(', ') : '',
        shop.phone ? `Phone: ${shop.phone}` : '',
        shop.gstin ? `GSTIN: ${shop.gstin}` : '',
        shop.fssai_number ? `FSSAI: ${shop.fssai_number}` : '',
      ].filter(Boolean);
      doc.text(shopDetails.join('  |  '), shopX, 40, { width: 320 });

      // TAX INVOICE title (right side)
      doc.fillColor(C.white).font('Helvetica-Bold').fontSize(14)
        .text('TAX INVOICE', PAGE_W - MARGIN - 130, 25, { width: 130, align: 'right' });
      doc.fillColor(C.gold).font('Helvetica').fontSize(8)
        .text(shop.gstin ? 'GST Registered' : 'Non-GST', PAGE_W - MARGIN - 130, 44, { width: 130, align: 'right' });

      y = 120;

      // ── BILL META ROW ────────────────────────────────────────────────────────
      rect(doc, MARGIN, y, CONTENT_W, 36, C.gray100);
      const metaItems = [
        { label: 'Invoice No.', value: bill.bill_number },
        { label: 'Invoice Date', value: bill.bill_date },
        { label: 'Due Date', value: bill.due_date || '—' },
        { label: 'Payment', value: bill.payment_method },
      ];
      const metaW = CONTENT_W / metaItems.length;
      metaItems.forEach((m, i) => {
        const mx = MARGIN + i * metaW + 8;
        doc.fillColor(C.gray600).font('Helvetica').fontSize(7).text(m.label, mx, y + 6);
        doc.fillColor(C.gray900).font('Helvetica-Bold').fontSize(8).text(m.value, mx, y + 17);
      });

      y += 50;

      // ── BILL TO / SHOP ADDRESS ────────────────────────────────────────────────
      const colW = CONTENT_W / 2 - 8;
      doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(8).text('BILL TO:', MARGIN, y);
      doc.fillColor(C.gray900).font('Helvetica-Bold').fontSize(10).text(bill.customer_name, MARGIN, y + 12);
      doc.fillColor(C.gray600).font('Helvetica').fontSize(8);
      const addrLines = [bill.customer_phone, bill.customer_address, bill.customer_gstin ? `GSTIN: ${bill.customer_gstin}` : ''].filter(Boolean);
      doc.text(addrLines.join('\n'), MARGIN, y + 24, { width: colW, lineBreak: true });

      y += 60;
      hline(doc, y);
      y += 10;

      // ── ITEMS TABLE ──────────────────────────────────────────────────────────
      const cols = [
        { label: '#',          w: 20,  align: 'center' },
        { label: 'Product',    w: 160, align: 'left' },
        { label: 'HSN',        w: 44,  align: 'center' },
        { label: 'Unit',       w: 30,  align: 'center' },
        { label: 'Qty',        w: 30,  align: 'center' },
        { label: 'Rate',       w: 55,  align: 'right' },
        { label: 'Disc%',      w: 34,  align: 'center' },
        { label: 'Taxable',    w: 60,  align: 'right' },
        { label: 'GST%',       w: 30,  align: 'center' },
        { label: 'CGST',       w: 42,  align: 'right' },
        { label: 'SGST',       w: 42,  align: 'right' },
        { label: 'Amount',     w: 58,  align: 'right' },
      ];

      // Header row
      rect(doc, MARGIN, y, CONTENT_W, 18, C.primary);
      let cx = MARGIN + 4;
      cols.forEach((col) => {
        doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7)
          .text(col.label, cx, y + 5, { width: col.w - 4, align: col.align });
        cx += col.w;
      });
      y += 18;

      // Item rows
      items.forEach((item, idx) => {
        const rowH = 16;
        if (idx % 2 === 1) rect(doc, MARGIN, y, CONTENT_W, rowH, C.gray100);

        const vals = [
          String(idx + 1),
          item.product_name,
          item.hsn_code || '—',
          item.unit,
          String(item.quantity),
          fmtNum(item.rate),
          item.discount_percent ? `${item.discount_percent}%` : '—',
          fmtNum(item.taxable_amount),
          item.gst_rate ? `${item.gst_rate}%` : '0%',
          fmtNum(item.cgst),
          fmtNum(item.sgst),
          fmtNum(item.total_amount),
        ];

        cx = MARGIN + 4;
        cols.forEach((col, ci) => {
          doc.fillColor(C.gray900).font('Helvetica').fontSize(7.5)
            .text(vals[ci], cx, y + 4, { width: col.w - 4, align: col.align, lineBreak: false });
          cx += col.w;
        });
        y += rowH;
      });

      hline(doc, y, C.gray300);
      y += 8;

      // ── GST SUMMARY TABLE ────────────────────────────────────────────────────
      const gstGroups = {};
      items.forEach((item) => {
        const rate = item.gst_rate;
        if (!gstGroups[rate]) gstGroups[rate] = { taxable: 0, cgst: 0, sgst: 0 };
        gstGroups[rate].taxable += item.taxable_amount;
        gstGroups[rate].cgst += item.cgst;
        gstGroups[rate].sgst += item.sgst;
      });

      const gstRates = Object.keys(gstGroups).map(Number).filter((r) => r > 0);
      if (gstRates.length > 0) {
        const gstX = MARGIN;
        const gstW = CONTENT_W / 2 - 10;
        rect(doc, gstX, y, gstW, 14, C.primary);
        ['HSN/Rate', 'Taxable Value', 'CGST%', 'CGST Amt', 'SGST%', 'SGST Amt'].forEach((h, i) => {
          doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7)
            .text(h, gstX + i * (gstW / 6) + 2, y + 3, { width: gstW / 6 - 2, align: 'center' });
        });
        y += 14;

        gstRates.forEach((rate, idx) => {
          const g = gstGroups[rate];
          if (idx % 2 === 0) rect(doc, gstX, y, gstW, 13, C.gray100);
          [
            `GST ${rate}%`, fmtNum(g.taxable),
            `${rate / 2}%`, fmtNum(g.cgst),
            `${rate / 2}%`, fmtNum(g.sgst),
          ].forEach((v, i) => {
            doc.fillColor(C.gray900).font('Helvetica').fontSize(7.5)
              .text(v, gstX + i * (gstW / 6) + 2, y + 2, { width: gstW / 6 - 2, align: 'center' });
          });
          y += 13;
        });
        y += 6;
      }

      // ── TOTALS BOX ───────────────────────────────────────────────────────────
      const totX = PAGE_W - MARGIN - 180;
      const totW = 180;
      let totY = y - (gstRates.length > 0 ? (gstRates.length * 13 + 20 + 6) : 0);

      const totRows = [
        { label: 'Subtotal',       value: fmt(bill.subtotal) },
        { label: 'Discount',       value: bill.discount_amount > 0 ? `-${fmt(bill.discount_amount)}` : '—' },
        { label: 'Taxable Amount', value: fmt(bill.taxable_amount) },
        { label: 'Total CGST',     value: fmt(bill.cgst_amount) },
        { label: 'Total SGST',     value: fmt(bill.sgst_amount) },
      ];

      rect(doc, totX, totY, totW, totRows.length * 16 + 28, null, C.gray300);
      totRows.forEach((row) => {
        doc.fillColor(C.gray600).font('Helvetica').fontSize(8).text(row.label, totX + 6, totY + 4, { width: 100 });
        doc.fillColor(C.gray900).font('Helvetica').fontSize(8).text(row.value, totX + 6, totY + 4, { width: totW - 12, align: 'right' });
        totY += 16;
      });

      // Grand total row
      rect(doc, totX, totY, totW, 26, C.primary);
      doc.fillColor(C.white).font('Helvetica-Bold').fontSize(9).text('GRAND TOTAL', totX + 6, totY + 7, { width: 80 });
      doc.fillColor(C.white).font('Helvetica-Bold').fontSize(11).text(fmt(bill.total_amount), totX + 6, totY + 6, { width: totW - 12, align: 'right' });
      totY += 26;

      // Payment row
      rect(doc, totX, totY, totW, 14, C.gray100);
      doc.fillColor(C.gray600).font('Helvetica').fontSize(7.5).text('Amount Paid', totX + 6, totY + 3, { width: 80 });
      doc.fillColor(C.success).font('Helvetica-Bold').fontSize(8).text(fmt(bill.paid_amount), totX + 6, totY + 3, { width: totW - 12, align: 'right' });
      totY += 14;

      if (bill.due_amount > 0) {
        rect(doc, totX, totY, totW, 14, null);
        doc.fillColor(C.gray600).font('Helvetica').fontSize(7.5).text('Balance Due', totX + 6, totY + 3, { width: 80 });
        doc.fillColor(C.danger).font('Helvetica-Bold').fontSize(8).text(fmt(bill.due_amount), totX + 6, totY + 3, { width: totW - 12, align: 'right' });
      }

      // Adjust y to below both sections
      y = Math.max(y, totY) + 14;

      // ── AMOUNT IN WORDS ──────────────────────────────────────────────────────
      doc.fillColor(C.gray600).font('Helvetica').fontSize(7.5).text('Amount in words: ', MARGIN, y);
      doc.fillColor(C.gray900).font('Helvetica-Bold').fontSize(7.5)
        .text(numberToWords(bill.total_amount), MARGIN + 90, y, { width: CONTENT_W - 200 });
      y += 20;

      // ── UPI QR CODE ──────────────────────────────────────────────────────────
      if (shop.upi_id) {
        try {
          const upiString = `upi://pay?pa=${shop.upi_id}&pn=${encodeURIComponent(shop.shop_name || '')}&cu=INR`;
          const qrDataUrl = await QRCode.toDataURL(upiString, { width: 80, margin: 1 });
          const qrBuf = Buffer.from(qrDataUrl.split(',')[1], 'base64');
          doc.image(qrBuf, PAGE_W - MARGIN - 80, y - 20, { width: 80 });
          doc.fillColor(C.gray600).font('Helvetica').fontSize(7)
            .text(`UPI: ${shop.upi_id}`, PAGE_W - MARGIN - 80, y + 62, { width: 80, align: 'center' });
        } catch { /* skip QR on error */ }
      }

      // ── SIGNATURE BOX ────────────────────────────────────────────────────────
      doc.rect(MARGIN, y, 130, 45).strokeColor(C.gray300).lineWidth(0.5).stroke();
      doc.fillColor(C.gray600).font('Helvetica').fontSize(7.5).text('Authorized Signature', MARGIN + 5, y + 32);
      doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(7.5).text(shop.shop_name || '', MARGIN + 5, y + 5);
      y += 55;

      // ── FOOTER ───────────────────────────────────────────────────────────────
      hline(doc, y);
      y += 6;

      if (shop.terms_conditions) {
        doc.fillColor(C.gray600).font('Helvetica').fontSize(7).text('Terms & Conditions:', MARGIN, y);
        doc.fillColor(C.gray600).font('Helvetica').fontSize(7)
          .text(shop.terms_conditions, MARGIN, y + 10, { width: CONTENT_W });
        y += 20;
      }

      doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(8)
        .text('Thank you for your business!', MARGIN, y + 6, { width: CONTENT_W, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateBillPDF };

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// ── 58mm paper constants ────────────────────────────────────────────────────
// 1 point = 0.3528mm  →  58mm ≈ 164.4 pt
// Margins: 6pt each side  →  content width ≈ 152.4 pt
const PW   = 164.4;          // page width in pt
const ML   = 7;              // margin left
const MR   = 7;              // margin right
const CW   = PW - ML - MR;  // content width ≈ 150.4 pt
const FS_TITLE  = 8.5;       // shop name font size
const FS_NORMAL = 6.5;       // normal body text
const FS_SMALL  = 5.5;       // small labels
const FS_BIG    = 10;        // grand total
const LH = 9;                // standard line height

// ── Helpers ─────────────────────────────────────────────────────────────────
const rupee  = (paise) => 'Rs.' + (paise / 100).toFixed(2);
const fmtNum = (paise) => (paise / 100).toFixed(2);

const numberToWords = (amount) => {
  const paise = amount % 100;
  const rupees = Math.floor(amount / 100);
  const ones  = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens  = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const toWords = (n) => {
    if (n === 0)       return '';
    if (n < 20)        return ones[n] + ' ';
    if (n < 100)       return tens[Math.floor(n / 10)] + ' ' + ones[n % 10] + ' ';
    if (n < 1000)      return ones[Math.floor(n / 100)] + ' Hundred ' + toWords(n % 100);
    if (n < 100000)    return toWords(Math.floor(n / 1000)) + 'Thousand ' + toWords(n % 1000);
    if (n < 10000000)  return toWords(Math.floor(n / 100000)) + 'Lakh ' + toWords(n % 100000);
    return toWords(Math.floor(n / 10000000)) + 'Crore ' + toWords(n % 10000000);
  };

  let words = toWords(rupees).trim() || 'Zero';
  if (paise > 0) words += ` and ${toWords(paise).trim()} Paise`;
  return 'Rupees ' + words + ' Only';
};

// ── Low-level drawing helpers ────────────────────────────────────────────────
const hline = (doc, y, full = true) => {
  const x1 = full ? 0 : ML;
  const x2 = full ? PW : PW - MR;
  doc.moveTo(x1, y).lineTo(x2, y).strokeColor('#888888').lineWidth(0.3).stroke();
};

const dashed = (doc, y) => {
  doc.moveTo(0, y).lineTo(PW, y).strokeColor('#AAAAAA').lineWidth(0.3).dash(2, { space: 2 }).stroke().undash();
};

const textL = (doc, str, x, y, opts = {}) => {
  doc.fillColor(opts.color || '#111111')
    .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(opts.size || FS_NORMAL)
    .text(str, x, y, {
      width: opts.width || (PW - x - MR),
      align: opts.align || 'left',
      lineBreak: opts.lineBreak !== false,
      ellipsis: opts.ellipsis !== false,
    });
  return doc.y;
};

const textR = (doc, str, y, opts = {}) => {
  doc.fillColor(opts.color || '#111111')
    .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(opts.size || FS_NORMAL)
    .text(str, ML, y, { width: CW, align: 'right', lineBreak: false });
};

const row = (doc, label, value, y, opts = {}) => {
  doc.fillColor(opts.labelColor || '#555555')
    .font('Helvetica').fontSize(opts.size || FS_NORMAL)
    .text(label, ML, y, { width: CW * 0.58, lineBreak: false });
  doc.fillColor(opts.valueColor || '#111111')
    .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(opts.size || FS_NORMAL)
    .text(value, ML, y, { width: CW, align: 'right', lineBreak: false });
  return y + LH;
};

// ── Main 58mm generator ──────────────────────────────────────────────────────
const generateThermalPDF = async (bill, items, shop) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Generous single-page height — all content must fit without overflow
      const estimatedH = 600 + items.length * 50 + (shop.upi_id ? 100 : 0) + (shop.terms_conditions ? 60 : 0);

      const doc = new PDFDocument({
        size: [PW, estimatedH],
        margin: 0,
        info: { Title: `Receipt ${bill.bill_number}` },
        autoFirstPage: true,
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      let y = 8;

      // ── HEADER ─────────────────────────────────────────────────────────────

      // Logo (small, centered — optional)
      const logoPath = shop.logo_path ? path.resolve(process.cwd(), shop.logo_path) : null;
      if (logoPath && fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, PW / 2 - 18, y, { width: 36, height: 36 });
          y += 40;
        } catch { /* skip */ }
      }

      // Shop name — centered, bold, larger
      doc.fillColor('#1F6F5F').font('Helvetica-Bold').fontSize(FS_TITLE)
        .text(shop.shop_name || 'AgriBill Pro', 0, y, { width: PW, align: 'center', lineBreak: false });
      y += 11;

      // Shop address + contact — centered, small
      const shopLines = [
        shop.address,
        [shop.city, shop.state, shop.pincode].filter(Boolean).join(', '),
        shop.phone ? `Ph: ${shop.phone}` : null,
        shop.gstin ? `GSTIN: ${shop.gstin}` : null,
        shop.fssai_number ? `FSSAI: ${shop.fssai_number}` : null,
      ].filter(Boolean);

      shopLines.forEach((line) => {
        doc.fillColor('#444444').font('Helvetica').fontSize(FS_SMALL)
          .text(line, 0, y, { width: PW, align: 'center', lineBreak: false });
        y += 7.5;
      });

      y += 2;
      hline(doc, y);
      y += 5;

      // ── BILL TYPE TITLE ────────────────────────────────────────────────────
      doc.fillColor('#1F6F5F').font('Helvetica-Bold').fontSize(7.5)
        .text('TAX INVOICE', 0, y, { width: PW, align: 'center', lineBreak: false });
      y += 10;
      dashed(doc, y);
      y += 5;

      // ── META BLOCK ─────────────────────────────────────────────────────────
      y = row(doc, 'Invoice No.', bill.bill_number, y, { bold: true });
      y = row(doc, 'Date', new Date(bill.bill_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), y);
      if (bill.due_date) {
        y = row(doc, 'Due Date', new Date(bill.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), y);
      }
      y = row(doc, 'Payment', bill.payment_method, y);

      y += 3;
      dashed(doc, y);
      y += 5;

      // ── BILL TO ────────────────────────────────────────────────────────────
      doc.fillColor('#888888').font('Helvetica').fontSize(FS_SMALL)
        .text('BILL TO', ML, y, { lineBreak: false });
      y += 8;

      doc.fillColor('#111111').font('Helvetica-Bold').fontSize(FS_NORMAL)
        .text(bill.customer_name, ML, y, { width: CW, lineBreak: false });
      y += 9;

      const customerLines = [
        bill.customer_phone,
        bill.customer_address,
        bill.customer_gstin ? `GSTIN: ${bill.customer_gstin}` : null,
      ].filter(Boolean);

      customerLines.forEach((line) => {
        doc.fillColor('#555555').font('Helvetica').fontSize(FS_SMALL)
          .text(line, ML, y, { width: CW, lineBreak: false });
        y += 7.5;
      });

      y += 3;
      hline(doc, y);
      y += 4;

      // ── ITEMS TABLE ────────────────────────────────────────────────────────

      // Column widths (must sum to CW ≈ 150.4)
      // Product name gets the most space, qty/rate/amount are narrow
      const C_QTY   = 18;   // Qty
      const C_RATE  = 32;   // Rate
      const C_AMT   = 34;   // Amount
      const C_NAME  = CW - C_QTY - C_RATE - C_AMT; // ≈ 66

      // Header row
      doc.fillColor('#555555').font('Helvetica-Bold').fontSize(FS_SMALL);
      doc.text('Item',   ML,                              y, { width: C_NAME, lineBreak: false });
      doc.text('Qty',    ML + C_NAME,                    y, { width: C_QTY,  align: 'center', lineBreak: false });
      doc.text('Rate',   ML + C_NAME + C_QTY,            y, { width: C_RATE, align: 'right',  lineBreak: false });
      doc.text('Amt',    ML + C_NAME + C_QTY + C_RATE,   y, { width: C_AMT,  align: 'right',  lineBreak: false });
      y += 7;
      hline(doc, y, false);
      y += 3;

      // Item rows
      items.forEach((item, idx) => {
        // Alternate row shading (very light on thermal)
        if (idx % 2 === 0) {
          doc.rect(0, y - 1, PW, 20).fillColor('#F7F7F7').fill();
        }

        // Product name (may wrap to 2 lines for long names)
        const nameX     = ML;
        const qtyX      = ML + C_NAME;
        const rateX     = ML + C_NAME + C_QTY;
        const amtX      = ML + C_NAME + C_QTY + C_RATE;

        // Name — allow wrapping
        const nameBefore = doc.y;
        doc.fillColor('#111111').font('Helvetica-Bold').fontSize(FS_SMALL)
          .text(item.product_name, nameX, y, {
            width: C_NAME - 2,
            lineBreak: true,
            ellipsis: true,
          });
        const nameAfter = doc.y;
        const rowH = Math.max(nameAfter - nameBefore + 4, 16);

        // Unit below product name  
        if (item.unit) {
          doc.fillColor('#888888').font('Helvetica').fontSize(FS_SMALL - 0.5)
            .text(item.unit, nameX, nameAfter + 0.5, { width: C_NAME - 2, lineBreak: false });
        }

        // Discount badge if applicable
        if (item.discount_percent > 0) {
          doc.fillColor('#D4A017').font('Helvetica').fontSize(FS_SMALL - 1)
            .text(`-${item.discount_percent}%`, nameX, y + 9, { width: C_NAME - 2, lineBreak: false });
        }

        // HSN (if present, show as subscript-like)
        if (item.hsn_code) {
          const hsnY = item.discount_percent > 0 ? y + 16 : nameAfter + (item.unit ? 7.5 : 0.5);
          doc.fillColor('#AAAAAA').font('Helvetica').fontSize(FS_SMALL - 1)
            .text(`HSN:${item.hsn_code}`, nameX, hsnY, { width: C_NAME - 2, lineBreak: false });
        }

        // Qty, Rate, Amount — vertically centered in row
        const midY = y + (rowH - LH) / 2;
        doc.fillColor('#333333').font('Helvetica').fontSize(FS_SMALL)
          .text(String(item.quantity), qtyX, midY, { width: C_QTY, align: 'center', lineBreak: false });
        doc.fillColor('#555555').font('Helvetica').fontSize(FS_SMALL)
          .text(fmtNum(item.rate), rateX, midY, { width: C_RATE, align: 'right', lineBreak: false });
        doc.fillColor('#111111').font('Helvetica-Bold').fontSize(FS_NORMAL)
          .text(fmtNum(item.total_amount), amtX, midY, { width: C_AMT, align: 'right', lineBreak: false });

        // GST info below amount (compact: 18%=9+9)
        if (item.gst_rate > 0) {
          doc.fillColor('#AAAAAA').font('Helvetica').fontSize(FS_SMALL - 1)
            .text(`GST ${item.gst_rate}%`, amtX, midY + 8, { width: C_AMT, align: 'right', lineBreak: false });
        }

        y += rowH + 6;
      });

      hline(doc, y, false);
      y += 5;

      // ── GST SUMMARY ────────────────────────────────────────────────────────
      const gstGroups = {};
      let hasGst = false;
      items.forEach((item) => {
        if (item.gst_rate > 0) {
          hasGst = true;
          const rate = item.gst_rate;
          if (!gstGroups[rate]) gstGroups[rate] = { taxable: 0, cgst: 0, sgst: 0 };
          gstGroups[rate].taxable += item.taxable_amount;
          gstGroups[rate].cgst   += item.cgst;
          gstGroups[rate].sgst   += item.sgst;
        }
      });

      if (hasGst) {
        doc.fillColor('#888888').font('Helvetica').fontSize(FS_SMALL)
          .text('GST SUMMARY', 0, y, { width: PW, align: 'center', lineBreak: false });
        y += 8;

        // GST table header
        doc.fillColor('#666666').font('Helvetica-Bold').fontSize(FS_SMALL - 0.5);
        doc.text('Rate',    ML,          y, { width: 22, lineBreak: false });
        doc.text('Taxable', ML + 22,     y, { width: 38, align: 'right', lineBreak: false });
        doc.text('CGST',    ML + 62,     y, { width: 30, align: 'right', lineBreak: false });
        doc.text('SGST',    ML + 94,     y, { width: 30, align: 'right', lineBreak: false });
        doc.text('Total',   ML + 126,    y, { width: CW - 126, align: 'right', lineBreak: false });
        y += 7;
        dashed(doc, y);
        y += 3;

        Object.keys(gstGroups).map(Number).sort().forEach((rate) => {
          const g = gstGroups[rate];
          doc.fillColor('#333333').font('Helvetica').fontSize(FS_SMALL - 0.5);
          doc.text(`${rate}%`,          ML,       y, { width: 22, lineBreak: false });
          doc.text(fmtNum(g.taxable),   ML + 22,  y, { width: 38, align: 'right', lineBreak: false });
          doc.text(fmtNum(g.cgst),      ML + 62,  y, { width: 30, align: 'right', lineBreak: false });
          doc.text(fmtNum(g.sgst),      ML + 94,  y, { width: 30, align: 'right', lineBreak: false });
          doc.text(fmtNum(g.cgst + g.sgst), ML + 126, y, { width: CW - 126, align: 'right', lineBreak: false });
          y += 7.5;
        });

        dashed(doc, y);
        y += 5;
      }

      // ── TOTALS ─────────────────────────────────────────────────────────────
      y = row(doc, 'Subtotal',       rupee(bill.subtotal),      y);
      if (bill.discount_amount > 0) {
        y = row(doc, `Discount (${bill.discount_percent || 0}%)`, `-${rupee(bill.discount_amount)}`, y, { valueColor: '#EF4444' });
      }
      if (bill.taxable_amount !== bill.subtotal) {
        y = row(doc, 'Taxable Amount', rupee(bill.taxable_amount), y);
      }
      if (bill.cgst_amount > 0) {
        y = row(doc, `CGST`,     rupee(bill.cgst_amount),   y);
        y = row(doc, `SGST`,     rupee(bill.sgst_amount),   y);
      }

      // Grand Total — bold, larger, boxed
      y += 2;
      doc.rect(0, y, PW, 16).fillColor('#1F6F5F').fill();
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7)
        .text('GRAND TOTAL', ML, y + 4, { width: CW * 0.5, lineBreak: false });
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(FS_BIG)
        .text(rupee(bill.total_amount), ML, y + 2, { width: CW, align: 'right', lineBreak: false });
      y += 18;

      // Paid / Balance
      if (bill.paid_amount > 0) {
        y = row(doc, 'Amount Paid', rupee(bill.paid_amount),   y, { valueColor: '#10B981', bold: true });
        const due = bill.due_amount || 0;
        y = row(doc, 'Balance Due', rupee(due), y, {
          valueColor: due > 0 ? '#EF4444' : '#10B981',
          bold: true,
        });
      }

      y += 4;
      dashed(doc, y);
      y += 5;

      // ── AMOUNT IN WORDS ─────────────────────────────────────────────────────
      doc.fillColor('#888888').font('Helvetica').fontSize(FS_SMALL)
        .text('Amount in words:', ML, y, { lineBreak: false });
      y += 7.5;
      doc.fillColor('#333333').font('Helvetica').fontSize(FS_SMALL)
        .text(numberToWords(bill.total_amount), ML, y, { width: CW, lineBreak: true });
      y = doc.y + 4;

      // ── NOTES ───────────────────────────────────────────────────────────────
      if (bill.notes) {
        dashed(doc, y);
        y += 5;
        doc.fillColor('#888888').font('Helvetica').fontSize(FS_SMALL)
          .text('Note:', ML, y, { lineBreak: false });
        y += 7.5;
        doc.fillColor('#555555').font('Helvetica').fontSize(FS_SMALL)
          .text(bill.notes, ML, y, { width: CW, lineBreak: true });
        y = doc.y + 4;
      }

      // ── UPI QR CODE ─────────────────────────────────────────────────────────
      if (shop.upi_id) {
        try {
          dashed(doc, y);
          y += 6;

          const upiString = `upi://pay?pa=${shop.upi_id}&pn=${encodeURIComponent(shop.shop_name || '')}&am=${(bill.due_amount || 0) / 100}&cu=INR`;
          const qrDataUrl = await QRCode.toDataURL(upiString, { width: 120, margin: 1 });
          const qrBuf = Buffer.from(qrDataUrl.split(',')[1], 'base64');
          const qrW = 55; // 55pt wide = ~19mm QR on 58mm paper

          doc.image(qrBuf, PW / 2 - qrW / 2, y, { width: qrW });
          y += qrW + 3;

          doc.fillColor('#1F6F5F').font('Helvetica-Bold').fontSize(FS_SMALL)
            .text('Scan to Pay', 0, y, { width: PW, align: 'center', lineBreak: false });
          y += 7.5;
          doc.fillColor('#555555').font('Helvetica').fontSize(FS_SMALL - 0.5)
            .text(shop.upi_id, 0, y, { width: PW, align: 'center', lineBreak: false });
          y += 9;
        } catch { /* skip on error */ }
      }

      // ── TERMS & CONDITIONS ──────────────────────────────────────────────────
      if (shop.terms_conditions) {
        dashed(doc, y);
        y += 5;
        doc.fillColor('#888888').font('Helvetica').fontSize(FS_SMALL - 0.5)
          .text('Terms & Conditions:', ML, y, { lineBreak: false });
        y += 7;
        doc.fillColor('#777777').font('Helvetica').fontSize(FS_SMALL - 0.5)
          .text(shop.terms_conditions, ML, y, { width: CW, lineBreak: true });
        y = doc.y + 4;
      }

      // ── FOOTER ─────────────────────────────────────────────────────────────
      hline(doc, y);
      y += 5;

      doc.fillColor('#1F6F5F').font('Helvetica-Bold').fontSize(6.5)
        .text('Thank you for your business!', 0, y, { width: PW, align: 'center', lineBreak: false });
      y += 8;

      doc.fillColor('#AAAAAA').font('Helvetica').fontSize(5.5)
        .text('Powered by AgriBill Pro', 0, y, { width: PW, align: 'center', lineBreak: false });
      y += 8;

      // Feed 5mm of blank paper at end for tear-off
      y += 14;

      // Resize page to actual content height
      // PDFKit doesn't support dynamic page resize after creation,
      // but we set a large enough estimate above — the content just ends naturally.

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateThermalPDF };

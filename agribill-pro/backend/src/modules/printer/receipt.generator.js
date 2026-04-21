const { ThermalPrinter, PrinterTypes, CharacterSet } = require('node-thermal-printer');

const PAD = 48; // 80mm paper default char width

function pad(str, len, align = 'left') {
  const s = String(str ?? '');
  if (s.length >= len) return s.slice(0, len);
  const spaces = ' '.repeat(len - s.length);
  return align === 'right' ? spaces + s : s + spaces;
}

function rupees(paise) {
  return `Rs.${(paise / 100).toFixed(2)}`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}-${d.toLocaleString('en-IN',{month:'short'})}-${d.getFullYear()}`;
}

function buildReceipt(printer, shop, bill, items, paperWidth) {
  const W = paperWidth === 58 ? 32 : 48;

  const divider = () => printer.drawLine();
  const center = (text) => { printer.alignCenter(); printer.println(text); printer.alignLeft(); };

  // ── Header ──────────────────────────────────────────────────────────────────
  printer.bold(true);
  center(shop.shop_name || 'AgriBill Pro');
  printer.bold(false);

  if (shop.address) center(shop.address);
  if (shop.city && shop.state) center(`${shop.city} - ${shop.pincode || ''}, ${shop.state}`);
  if (shop.phone) center(`Ph: ${shop.phone}`);
  if (shop.gstin) center(`GSTIN: ${shop.gstin}`);
  if (shop.fssai_number) center(`FSSAI: ${shop.fssai_number}`);

  divider();

  // ── Bill info ───────────────────────────────────────────────────────────────
  printer.println(`Bill No : ${bill.bill_number}`);
  printer.println(`Date    : ${formatDate(bill.bill_date || bill.created_at)}`);
  printer.println(`Pay Mode: ${bill.payment_method || 'CASH'}`);

  if (bill.customer_name) {
    printer.println(`Customer: ${bill.customer_name}`);
    if (bill.customer_phone) printer.println(`Phone   : ${bill.customer_phone}`);
    if (bill.customer_gstin) printer.println(`GSTIN   : ${bill.customer_gstin}`);
  }

  divider();

  // ── Items header ─────────────────────────────────────────────────────────────
  const nameW = W - 18;
  printer.bold(true);
  printer.println(pad('ITEM', nameW) + pad('QTY', 5, 'right') + pad('RATE', 7, 'right') + pad('AMT', 8, 'right'));
  printer.bold(false);

  divider();

  // ── Items ────────────────────────────────────────────────────────────────────
  for (const item of items) {
    const name = pad(item.product_name, nameW);
    const qty = pad(String(item.quantity), 5, 'right');
    const rate = pad(rupees(item.rate), 7, 'right');
    const amt = pad(rupees(item.total_amount), 8, 'right');
    printer.println(name + qty + rate + amt);

    if (item.discount_percent > 0) {
      printer.println(pad(`  Disc: ${item.discount_percent}%`, W));
    }
    if (item.hsn_code) {
      printer.println(pad(`  HSN: ${item.hsn_code} | GST: ${item.gst_rate || 0}%`, W));
    }
  }

  divider();

  // ── Totals ───────────────────────────────────────────────────────────────────
  const rLine = (label, val, bold = false) => {
    if (bold) printer.bold(true);
    printer.println(pad(label, W - 12) + pad(val, 12, 'right'));
    if (bold) printer.bold(false);
  };

  rLine('Subtotal', rupees(bill.subtotal));
  if (bill.discount_amount > 0) rLine(`Discount (${bill.discount_percent}%)`, `-${rupees(bill.discount_amount)}`);

  const cgst = bill.cgst_amount || 0;
  const sgst = bill.sgst_amount || 0;
  const igst = bill.igst_amount || 0;
  if (cgst > 0) rLine('CGST', rupees(cgst));
  if (sgst > 0) rLine('SGST', rupees(sgst));
  if (igst > 0) rLine('IGST', rupees(igst));

  divider();
  rLine('TOTAL', rupees(bill.total_amount), true);
  divider();

  rLine(`Paid (${bill.payment_method || 'CASH'})`, rupees(bill.paid_amount));

  if (bill.due_amount > 0) {
    printer.bold(true);
    rLine('DUE AMOUNT', rupees(bill.due_amount));
    printer.bold(false);
  }

  divider();

  // ── Footer ───────────────────────────────────────────────────────────────────
  if (shop.terms_conditions) {
    printer.alignLeft();
    printer.println(shop.terms_conditions.slice(0, W * 2));
    divider();
  }

  if (shop.upi_id) center(`UPI: ${shop.upi_id}`);
  center('** Thank you for your business! **');
  center('Powered by AgriBill Pro');

  printer.newLine();
  printer.cut();
}

async function printReceipt({ printerInterface, paperWidth = 80, shop, bill, items }) {
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: printerInterface,
    characterSet: CharacterSet.PC437_USA,
    removeSpecialCharacters: true,
    options: { timeout: 6000 },
  });

  const connected = await printer.isPrinterConnected();
  if (!connected) throw new Error(`Printer not reachable at ${printerInterface}`);

  buildReceipt(printer, shop, bill, items, paperWidth);
  await printer.execute();
}

module.exports = { printReceipt };

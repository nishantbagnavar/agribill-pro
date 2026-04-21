const os = require('os');
const path = require('path');
const fs = require('fs');
const { sqlite } = require('../../config/db');
const { discoverNetworkPrinters, discoverUsbPrinters } = require('./printer.discovery');
const { printReceipt } = require('./receipt.generator');
const { generateBillPDF } = require('../billing/pdf.generator');
const { NotFoundError } = require('../../utils/errors');

function getConfig() {
  const row = sqlite.prepare('SELECT printer_config FROM shop_profile LIMIT 1').get();
  if (!row || !row.printer_config) return null;
  try { return JSON.parse(row.printer_config); } catch { return null; }
}

function saveConfig(config) {
  sqlite.prepare('UPDATE shop_profile SET printer_config = ? WHERE id = (SELECT id FROM shop_profile LIMIT 1)')
    .run(JSON.stringify(config));
}

function clearConfig() {
  sqlite.prepare('UPDATE shop_profile SET printer_config = NULL WHERE id = (SELECT id FROM shop_profile LIMIT 1)').run();
}

async function discover() {
  const [network, usb] = await Promise.all([
    discoverNetworkPrinters(),
    Promise.resolve(discoverUsbPrinters()),
  ]);
  return [...network, ...usb];
}

async function getOsPrinters() {
  if (process.platform === 'win32') {
    const { getPrinters } = require('pdf-to-printer');
    const list = await getPrinters();
    return list.map((p) => ({ name: p.name, deviceId: p.deviceId }));
  }
  const { getPrinters } = require('unix-print');
  const list = await getPrinters();
  return list.map((name) => ({ name }));
}

async function testPrint(config) {
  const { ThermalPrinter, PrinterTypes, CharacterSet } = require('node-thermal-printer');

  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: config.interface,
    characterSet: CharacterSet.PC437_USA,
    removeSpecialCharacters: true,
    options: { timeout: 6000 },
  });

  const connected = await printer.isPrinterConnected();
  if (!connected) throw new Error(`Printer not reachable at ${config.interface}`);

  const W = config.paper_width === 58 ? 32 : 48;
  printer.alignCenter();
  printer.bold(true);
  printer.println('AgriBill Pro');
  printer.bold(false);
  printer.println('Thermal Printer Test Page');
  printer.drawLine();
  printer.println(`Interface : ${config.interface}`);
  printer.println(`Paper     : ${config.paper_width || 80}mm`);
  printer.drawLine();
  printer.println('12345678901234567890123456789012345678901234567890');
  printer.println('The quick brown fox jumps over the lazy dog');
  printer.drawLine();
  printer.alignCenter();
  printer.println('** Printer is working correctly! **');
  printer.newLine();
  printer.cut();

  await printer.execute();
}

async function printBillViaOS(billId, printerName, paperSize) {
  const bill = sqlite.prepare(`
    SELECT b.*, u.name as created_by_name
    FROM bills b
    LEFT JOIN users u ON b.created_by = u.id
    WHERE b.id = ?
  `).get(billId);
  if (!bill) throw new NotFoundError('Bill');

  const items = sqlite.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(billId);
  const shop = sqlite.prepare('SELECT * FROM shop_profile LIMIT 1').get() || {};

  const pdfBuffer = await generateBillPDF(bill, items, shop);
  const tmpFile = path.join(os.tmpdir(), `agribill_${billId}_${Date.now()}.pdf`);

  try {
    fs.writeFileSync(tmpFile, pdfBuffer);

    if (process.platform === 'win32') {
      const { print } = require('pdf-to-printer');
      await print(tmpFile, { printer: printerName });
    } else {
      const { print } = require('unix-print');
      await print(tmpFile, printerName);
    }
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

async function printBill(billId) {
  const config = getConfig();
  if (!config) throw new Error('No printer configured. Set up printer in Settings.');

  if (config.mode === 'os') {
    if (!config.os_printer_name) throw new Error('No OS printer selected. Configure printer in Settings.');
    return printBillViaOS(billId, config.os_printer_name, config.paper_size || 'A4');
  }

  if (!config.interface) throw new Error('No thermal printer interface configured.');

  const bill = sqlite.prepare(`
    SELECT b.*, u.name as created_by_name
    FROM bills b
    LEFT JOIN users u ON b.created_by = u.id
    WHERE b.id = ?
  `).get(billId);
  if (!bill) throw new NotFoundError('Bill');

  const items = sqlite.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(billId);
  const shop = sqlite.prepare('SELECT * FROM shop_profile LIMIT 1').get() || {};

  await printReceipt({
    printerInterface: config.interface,
    paperWidth: config.paper_width || 80,
    shop,
    bill,
    items,
  });
}

module.exports = { getConfig, saveConfig, clearConfig, discover, getOsPrinters, testPrint, printBill };

const svc = require('./printer.service');

const getConfig = (req, res, next) => {
  try {
    const config = svc.getConfig();
    res.json({ success: true, data: config });
  } catch (e) { next(e); }
};

const saveConfig = (req, res, next) => {
  try {
    const { interface: iface, paper_width, label, type, mode, os_printer_name, paper_size } = req.body;

    if (mode === 'os') {
      if (!os_printer_name) return res.status(400).json({ success: false, error: 'os_printer_name is required' });
      svc.saveConfig({ mode: 'os', os_printer_name, paper_size: paper_size || 'A4', label: os_printer_name });
    } else {
      if (!iface) return res.status(400).json({ success: false, error: 'interface is required' });
      svc.saveConfig({ mode: 'thermal', interface: iface, paper_width: Number(paper_width) || 80, label: label || iface, type: type || 'tcp' });
    }

    res.json({ success: true, message: 'Printer config saved' });
  } catch (e) { next(e); }
};

const clearConfig = (req, res, next) => {
  try {
    svc.clearConfig();
    res.json({ success: true, message: 'Printer config cleared' });
  } catch (e) { next(e); }
};

const discover = async (req, res, next) => {
  try {
    const printers = await svc.discover();
    res.json({ success: true, data: printers });
  } catch (e) { next(e); }
};

const getOsPrinters = async (req, res, next) => {
  try {
    const printers = await svc.getOsPrinters();
    res.json({ success: true, data: printers });
  } catch (e) { next(e); }
};

const testPrint = async (req, res, next) => {
  try {
    const config = req.body.config || svc.getConfig();
    if (!config || !config.interface) {
      return res.status(400).json({ success: false, error: 'No thermal printer config provided' });
    }
    await svc.testPrint(config);
    res.json({ success: true, message: 'Test page sent to printer' });
  } catch (e) { next(e); }
};

const printBill = async (req, res, next) => {
  try {
    await svc.printBill(Number(req.params.billId));
    res.json({ success: true, message: 'Bill sent to printer' });
  } catch (e) { next(e); }
};

module.exports = { getConfig, saveConfig, clearConfig, discover, getOsPrinters, testPrint, printBill };

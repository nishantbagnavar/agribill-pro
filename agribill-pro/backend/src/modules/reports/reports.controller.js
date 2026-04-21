const service = require('./reports.service');
const { generateGSTPDF } = require('./gst.pdf.generator');
const { generateGSTExcel } = require('./gst.excel.generator');

const getGSTSummary = async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const format = req.query.format || 'json';

    const shop = service.getShopProfile();
    const data = service.getFullReport(month);

    if (format === 'json') {
      return res.json({ success: true, data });
    }

    if (format === 'pdf') {
      const buffer = await generateGSTPDF(data, shop);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="GST-Report-${month}.pdf"`);
      return res.send(buffer);
    }

    if (format === 'excel') {
      const wb = await generateGSTExcel(data, shop);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="GST-Report-${month}.xlsx"`);
      await wb.xlsx.write(res);
      return res.end();
    }

    return res.status(400).json({ success: false, error: 'Invalid format. Use json, pdf, or excel.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getGSTSummary };

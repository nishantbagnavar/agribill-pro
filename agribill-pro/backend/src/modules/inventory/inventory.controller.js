const service = require('./inventory.service');
const { sendSuccess, sendPaginated } = require('../../utils/response');

const getTransactions = async (req, res, next) => {
  try {
    const { rows, total, page, limit } = await service.getTransactions(req.query);
    sendPaginated(res, rows, total, page, limit);
  } catch (e) { next(e); }
};

const getSummary = async (req, res, next) => {
  try {
    const data = await service.getSummary();
    sendSuccess(res, data);
  } catch (e) { next(e); }
};

module.exports = { getTransactions, getSummary };

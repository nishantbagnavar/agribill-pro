const service = require('./products.service');
const { createSchema, updateSchema, stockAdjustSchema } = require('./products.validator');
const { sendSuccess, sendError, sendPaginated } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const { rows, total, page, limit } = await service.getAll(req.query);
    sendPaginated(res, rows, total, page, limit);
  } catch (e) { next(e); }
};

const getById = async (req, res, next) => {
  try {
    const data = await service.getById(Number(req.params.id));
    sendSuccess(res, data);
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    const data = await service.create(parsed.data);
    sendSuccess(res, data, 'Product created', 201);
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    const data = await service.update(Number(req.params.id), parsed.data);
    sendSuccess(res, data, 'Product updated');
  } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(Number(req.params.id));
    sendSuccess(res, null, 'Product deleted');
  } catch (e) { next(e); }
};

const adjustStock = async (req, res, next) => {
  try {
    const parsed = stockAdjustSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    const data = await service.adjustStock(Number(req.params.id), parsed.data, req.user.id);
    sendSuccess(res, data, 'Stock adjusted');
  } catch (e) { next(e); }
};

const getLowStock = async (req, res, next) => {
  try {
    const data = await service.getLowStock();
    sendSuccess(res, data);
  } catch (e) { next(e); }
};

const getExpiring = async (req, res, next) => {
  try {
    const days = Number(req.query.days || 30);
    const data = await service.getExpiring(days);
    sendSuccess(res, data);
  } catch (e) { next(e); }
};

const createVariant = async (req, res, next) => {
  try {
    const data = await service.createVariant(Number(req.params.id), req.body);
    sendSuccess(res, data, 'Variant created', 201);
  } catch (e) { next(e); }
};

const updateVariant = async (req, res, next) => {
  try {
    const data = await service.updateVariant(Number(req.params.variantId), req.body);
    sendSuccess(res, data, 'Variant updated');
  } catch (e) { next(e); }
};

const deleteVariant = async (req, res, next) => {
  try {
    await service.deleteVariant(Number(req.params.variantId));
    sendSuccess(res, null, 'Variant deleted');
  } catch (e) { next(e); }
};

const adjustVariantStock = async (req, res, next) => {
  try {
    const data = await service.adjustVariantStock(Number(req.params.variantId), req.body, req.user.id);
    sendSuccess(res, data, 'Variant stock adjusted');
  } catch (e) { next(e); }
};

module.exports = { getAll, getById, create, update, remove, adjustStock, getLowStock, getExpiring, createVariant, updateVariant, deleteVariant, adjustVariantStock };

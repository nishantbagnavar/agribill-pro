const { z } = require('zod');
const service = require('./customers.service');
const { sendSuccess, sendError, sendPaginated } = require('../../utils/response');

const schema = z.object({
  name: z.string().min(1).max(150),
  phone: z.string().min(10).max(15),
  whatsapp_number: z.string().min(10).max(15).optional(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(300).optional(),
  village: z.string().max(100).optional(),
  taluka: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  pincode: z.string().max(10).optional(),
  gstin: z.string().max(15).optional().nullable(),
  notes: z.string().max(500).optional(),
});

const getAll = async (req, res, next) => {
  try {
    const { rows, total, page, limit } = await service.getAll(req.query);
    sendPaginated(res, rows, total, page, limit);
  } catch (e) { next(e); }
};

const getById = async (req, res, next) => {
  try {
    sendSuccess(res, await service.getById(Number(req.params.id)));
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    sendSuccess(res, await service.create(parsed.data), 'Customer created', 201);
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try {
    const parsed = schema.partial().safeParse(req.body);
    if (!parsed.success) return sendError(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    sendSuccess(res, await service.update(Number(req.params.id), parsed.data), 'Customer updated');
  } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(Number(req.params.id));
    sendSuccess(res, null, 'Customer deleted');
  } catch (e) { next(e); }
};

const getLedger = async (req, res, next) => {
  try {
    sendSuccess(res, await service.getLedger(Number(req.params.id)));
  } catch (e) { next(e); }
};

module.exports = { getAll, getById, create, update, remove, getLedger };

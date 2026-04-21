const service = require('./categories.service');
const { sendSuccess, sendError } = require('../../utils/response');
const { z } = require('zod');

const createSchema = z.object({
  name: z.string().min(1).max(100),
  name_hindi: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional(),
  parent_id: z.number().int().positive().optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
});

const updateSchema = createSchema.partial();

const getAll = async (req, res, next) => {
  try {
    const data = await service.getAll();
    sendSuccess(res, data);
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
    sendSuccess(res, data, 'Category created', 201);
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    const data = await service.update(Number(req.params.id), parsed.data);
    sendSuccess(res, data, 'Category updated');
  } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(Number(req.params.id));
    sendSuccess(res, null, 'Category deleted');
  } catch (e) { next(e); }
};

module.exports = { getAll, getById, create, update, remove };

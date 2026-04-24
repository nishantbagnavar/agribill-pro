const { z } = require('zod');
const service = require('./billing.service');
const { sendSuccess, sendError, sendPaginated } = require('../../utils/response');

const billItemSchema = z.object({
  product_id: z.number().int().positive(),
  product_name: z.string().min(1),
  hsn_code: z.string().optional(),
  unit: z.string().min(1),
  quantity: z.number().positive(),
  rate: z.number().int().min(0),
  mrp: z.number().int().min(0).optional(),
  discount_percent: z.number().min(0).max(100).optional().default(0),
  gst_rate: z.number().int().min(0).optional().default(0),
});

const createBillSchema = z.object({
  customer_id: z.number().int().positive().optional().nullable(),
  customer_name: z.string().min(1).max(150),
  customer_phone: z.string().optional(),
  customer_address: z.string().optional(),
  customer_gstin: z.string().optional(),
  bill_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  bill_number: z.string().optional(),
  discount_amount: z.number().int().min(0).optional().default(0),
  discount_percent: z.number().min(0).max(100).optional().default(0),
  paid_amount: z.number().int().min(0).optional(),
  payment_method: z.enum(['CASH', 'UPI', 'CARD', 'CHEQUE', 'CREDIT']).default('CASH'),
  notes: z.string().optional(),
  items: z.array(billItemSchema).min(1),
});

const paymentSchema = z.object({
  amount: z.number().int().positive(),
  payment_method: z.enum(['CASH', 'UPI', 'CARD', 'CHEQUE', 'CREDIT']).default('CASH'),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

const getAll = (req, res, next) => {
  try {
    const { rows, total, page, limit, stats } = service.getAll(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }, stats });
  } catch (e) { next(e); }
};

const getById = (req, res, next) => {
  try {
    sendSuccess(res, service.getById(Number(req.params.id)));
  } catch (e) { next(e); }
};

const create = (req, res, next) => {
  try {
    const parsed = createBillSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    const bill = service.create(parsed.data, req.user.id);
    sendSuccess(res, bill, 'Bill created', 201);
  } catch (e) { next(e); }
};

const recordPayment = (req, res, next) => {
  try {
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    sendSuccess(res, service.recordPayment(Number(req.params.id), parsed.data, req.user.id), 'Payment recorded');
  } catch (e) { next(e); }
};

const downloadPdf = async (req, res, next) => {
  try {
    const buffer = await service.generatePdf(Number(req.params.id));
    const bill = service.getById(Number(req.params.id));
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${bill.bill_number}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  } catch (e) { next(e); }
};

const downloadThermalPdf = async (req, res, next) => {
  try {
    const buffer = await service.generateThermalPdf(Number(req.params.id));
    const bill = service.getById(Number(req.params.id));
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${bill.bill_number}-58mm.pdf"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  } catch (e) { next(e); }
};

const getNextBillNumber = (req, res, next) => {
  try {
    sendSuccess(res, { bill_number: service.getNextBillNumber() });
  } catch (e) { next(e); }
};

const getWhatsAppLink = (req, res, next) => {
  try {
    sendSuccess(res, service.getWhatsAppLink(Number(req.params.id)));
  } catch (e) { next(e); }
};

module.exports = { getAll, getById, create, recordPayment, downloadPdf, downloadThermalPdf, getNextBillNumber, getWhatsAppLink };

const { z } = require('zod');

const UNITS = ['kg', 'litre', 'bag', 'bottle', 'piece', 'gram', 'ml', 'packet', 'box'];
const GST_RATES = [0, 5, 12, 18, 28];

const createSchema = z.object({
  name: z.string().min(1).max(200),
  name_hindi: z.string().max(200).optional(),
  sku: z.string().max(50).optional(),
  barcode: z.string().max(50).optional(),
  category_id: z.number().int().positive().optional().nullable(),
  description: z.string().max(1000).optional(),
  brand: z.string().max(100).optional(),
  unit: z.enum(UNITS).default('piece'),
  purchase_price: z.number().int().min(0),  // stored as paise
  selling_price: z.number().int().min(0),
  mrp: z.number().int().min(0),
  gst_rate: z.number().refine((v) => GST_RATES.includes(v), { message: 'Invalid GST rate' }).default(0),
  hsn_code: z.string().max(20).optional(),
  current_stock: z.number().min(0).default(0),
  min_stock_alert: z.number().min(0).default(5),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  batch_number: z.string().max(50).optional(),
});

const updateSchema = createSchema.partial();

const stockAdjustSchema = z.object({
  transaction_type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'RETURN']),
  quantity: z.number().positive(),
  notes: z.string().max(500).optional(),
  reference_id: z.number().int().optional(),
});

module.exports = { createSchema, updateSchema, stockAdjustSchema };

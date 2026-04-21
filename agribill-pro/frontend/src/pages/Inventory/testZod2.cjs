const { z } = require('zod');

const safeNum = (min = 0, dflt = 0) => z.preprocess(
  (v) => {
    if (v === '' || v === null || v === undefined) return dflt;
    const n = typeof v === 'number' ? v : Number(v);
    return isNaN(n) ? dflt : n;
  },
  z.number().min(min)
);

const schema = z.object({
  name:             z.string().min(2, 'Product name required'),
  name_hindi:       z.string().nullable().optional(),
  sku:              z.string().nullable().optional(),
  barcode:          z.string().nullable().optional(),
  category_id:      z.coerce.number({ required_error: 'Category required' }).positive('Category required'),
  brand:            z.string().nullable().optional(),
  unit:             z.string().min(1, 'Unit required'),
  purchase_price:   safeNum(0),
  selling_price:    safeNum(0),
  mrp:              safeNum(0),
  gst_rate:         z.preprocess((val) => val === '' || val === null || Number.isNaN(Number(val)) ? 0 : Number(val), z.number().default(0)),
  hsn_code:         z.string().nullable().optional(),
  current_stock:    z.preprocess((val) => val === '' || val === null || Number.isNaN(Number(val)) ? 0 : Number(val), z.number().min(0).default(0)),
  min_stock_alert:  z.preprocess((val) => val === '' || val === null || Number.isNaN(Number(val)) ? 5 : Number(val), z.number().min(0).default(5)),
  expiry_date:      z.string().nullable().optional().or(z.literal('')),
  batch_number:     z.string().nullable().optional(),
  description:      z.string().nullable().optional(),
});

console.log("Testing with valid strings");
const result = schema.safeParse({
  name: 'Urea',
  category_id: "1",
  unit: 'bag',
  purchase_price: "5050",
  selling_price: "60",
  mrp: "70"
});

console.log(result.success ? "Success" : result.error.errors);

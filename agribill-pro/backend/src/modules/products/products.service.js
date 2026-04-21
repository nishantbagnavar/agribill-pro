const { eq, like, and, or, lte, sql, asc, desc } = require('drizzle-orm');
const { db, sqlite } = require('../../config/db');
const { products, categories, stockTransactions, productVariants } = require('../../db/schema');
const { NotFoundError } = require('../../utils/errors');

const generateSku = () => 'SKU-' + Date.now().toString(36).toUpperCase();

const buildFilters = (query) => {
  const filters = [eq(products.is_active, true)];

  if (query.search) {
    const term = `%${query.search}%`;
    filters.push(
      or(
        like(products.name, term),
        like(products.sku, term),
        like(products.brand, term),
        like(products.barcode, term)
      )
    );
  }

  if (query.category_id) {
    filters.push(eq(products.category_id, Number(query.category_id)));
  }

  if (query.low_stock === 'true') {
    filters.push(sql`${products.current_stock} <= ${products.min_stock_alert}`);
  }

  if (query.expiring_soon === 'true') {
    // Use shop's reminder_days setting; default 30
    const days = Number(query.expiry_days || 30);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    filters.push(
      and(
        sql`${products.expiry_date} IS NOT NULL`,
        sql`${products.expiry_date} <= ${cutoffStr}`
      )
    );
  }

  return filters;
};

const getAll = async (query = {}) => {
  const filters = buildFilters(query);
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Number(query.limit || 20));
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      name_hindi: products.name_hindi,
      sku: products.sku,
      barcode: products.barcode,
      category_id: products.category_id,
      category_name: categories.name,
      category_icon: categories.icon,
      brand: products.brand,
      unit: products.unit,
      purchase_price: products.purchase_price,
      selling_price: products.selling_price,
      mrp: products.mrp,
      gst_rate: products.gst_rate,
      hsn_code: products.hsn_code,
      current_stock: products.current_stock,
      min_stock_alert: products.min_stock_alert,
      expiry_date: products.expiry_date,
      batch_number: products.batch_number,
      image_path: products.image_path,
      is_active: products.is_active,
      created_at: products.created_at,
      updated_at: products.updated_at,
    })
    .from(products)
    .leftJoin(categories, eq(products.category_id, categories.id))
    .where(and(...filters))
    .orderBy(asc(products.name))
    .limit(limit)
    .offset(offset);

  // Attach variant counts
  const variantCounts = sqlite.prepare(
    'SELECT product_id, COUNT(*) as count FROM product_variants WHERE is_active=1 GROUP BY product_id'
  ).all();
  const countMap = {};
  variantCounts.forEach(r => { countMap[r.product_id] = r.count; });
  const rowsWithVariants = rows.map(r => ({ ...r, variant_count: countMap[r.id] || 0 }));

  const [{ total }] = await db
    .select({ total: sql`count(*)`.as('total') })
    .from(products)
    .where(and(...filters));

  return { rows: rowsWithVariants, total: Number(total), page, limit };
};

const getById = async (id) => {
  const [row] = await db
    .select({
      id: products.id,
      name: products.name,
      name_hindi: products.name_hindi,
      sku: products.sku,
      barcode: products.barcode,
      category_id: products.category_id,
      category_name: categories.name,
      brand: products.brand,
      description: products.description,
      unit: products.unit,
      purchase_price: products.purchase_price,
      selling_price: products.selling_price,
      mrp: products.mrp,
      gst_rate: products.gst_rate,
      hsn_code: products.hsn_code,
      current_stock: products.current_stock,
      min_stock_alert: products.min_stock_alert,
      expiry_date: products.expiry_date,
      batch_number: products.batch_number,
      image_path: products.image_path,
      is_active: products.is_active,
      created_at: products.created_at,
      updated_at: products.updated_at,
    })
    .from(products)
    .leftJoin(categories, eq(products.category_id, categories.id))
    .where(eq(products.id, id))
    .limit(1);

  if (!row) throw new NotFoundError('Product not found');

  const variants = await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.product_id, id), eq(productVariants.is_active, true)))
    .orderBy(asc(productVariants.pack_size));

  return { ...row, variants };
};

const create = async (data) => {
  if (!data.sku) data.sku = generateSku();

  const [row] = await db
    .insert(products)
    .values({
      name: data.name,
      name_hindi: data.name_hindi || null,
      sku: data.sku,
      barcode: data.barcode || null,
      category_id: data.category_id || null,
      description: data.description || null,
      brand: data.brand || null,
      unit: data.unit,
      purchase_price: data.purchase_price,
      selling_price: data.selling_price,
      mrp: data.mrp,
      gst_rate: data.gst_rate,
      hsn_code: data.hsn_code || null,
      current_stock: data.current_stock,
      min_stock_alert: data.min_stock_alert,
      expiry_date: data.expiry_date || null,
      batch_number: data.batch_number || null,
    })
    .returning();

  // Record initial stock-in if stock > 0
  if (data.current_stock > 0) {
    await db.insert(stockTransactions).values({
      product_id: row.id,
      transaction_type: 'IN',
      quantity: data.current_stock,
      previous_stock: 0,
      new_stock: data.current_stock,
      notes: 'Initial stock on product creation',
    });
  }

  return row;
};

const update = async (id, data) => {
  const existing = await getById(id);
  const now = new Date().toISOString();

  const [row] = await db
    .update(products)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.name_hindi !== undefined && { name_hindi: data.name_hindi }),
      ...(data.sku !== undefined && { sku: data.sku }),
      ...(data.barcode !== undefined && { barcode: data.barcode }),
      ...(data.category_id !== undefined && { category_id: data.category_id }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.brand !== undefined && { brand: data.brand }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(data.purchase_price !== undefined && { purchase_price: data.purchase_price }),
      ...(data.selling_price !== undefined && { selling_price: data.selling_price }),
      ...(data.mrp !== undefined && { mrp: data.mrp }),
      ...(data.gst_rate !== undefined && { gst_rate: data.gst_rate }),
      ...(data.hsn_code !== undefined && { hsn_code: data.hsn_code }),
      ...(data.min_stock_alert !== undefined && { min_stock_alert: data.min_stock_alert }),
      ...(data.expiry_date !== undefined && { expiry_date: data.expiry_date }),
      ...(data.batch_number !== undefined && { batch_number: data.batch_number }),
      updated_at: now,
    })
    .where(eq(products.id, id))
    .returning();

  return row;
};

const remove = async (id) => {
  await getById(id);
  await db.update(products).set({ is_active: false }).where(eq(products.id, id));
  await db.update(productVariants).set({ is_active: false }).where(eq(productVariants.product_id, id));
};

const adjustStock = async (id, data, userId) => {
  const product = await getById(id);
  const previousStock = product.current_stock;
  let newStock;

  if (data.transaction_type === 'IN' || data.transaction_type === 'RETURN') {
    newStock = previousStock + data.quantity;
  } else if (data.transaction_type === 'OUT') {
    newStock = previousStock - data.quantity;
    if (newStock < 0) {
      throw Object.assign(new Error('Insufficient stock'), { statusCode: 400 });
    }
  } else {
    // ADJUSTMENT — set directly
    newStock = data.quantity;
  }

  await db
    .update(products)
    .set({ current_stock: newStock, updated_at: new Date().toISOString() })
    .where(eq(products.id, id));

  await db.insert(stockTransactions).values({
    product_id: id,
    transaction_type: data.transaction_type,
    quantity: data.quantity,
    previous_stock: previousStock,
    new_stock: newStock,
    reference_id: data.reference_id || null,
    notes: data.notes || null,
    created_by: userId || null,
  });

  return { ...product, current_stock: newStock, previous_stock: previousStock };
};

const getLowStock = async () => {
  return db
    .select()
    .from(products)
    .where(
      and(
        eq(products.is_active, true),
        sql`${products.current_stock} <= ${products.min_stock_alert}`
      )
    )
    .orderBy(asc(products.current_stock));
};

const getExpiring = async (days = 30) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  return db
    .select()
    .from(products)
    .where(
      and(
        eq(products.is_active, true),
        sql`${products.expiry_date} IS NOT NULL`,
        sql`${products.expiry_date} <= ${cutoffStr}`
      )
    )
    .orderBy(asc(products.expiry_date));
};

const createVariant = async (productId, data) => {
  await getById(productId); // validates product exists
  const [row] = await db.insert(productVariants).values({
    product_id: productId,
    label: data.label,
    pack_size: data.pack_size,
    unit: data.unit,
    sku: data.sku || null,
    purchase_price: data.purchase_price || 0,
    selling_price: data.selling_price || 0,
    mrp: data.mrp || 0,
    current_stock: data.current_stock || 0,
    min_stock_alert: data.min_stock_alert || 5,
  }).returning();
  return row;
};

const updateVariant = async (variantId, data) => {
  const [existing] = await db.select().from(productVariants).where(eq(productVariants.id, variantId)).limit(1);
  if (!existing) throw new NotFoundError('Variant not found');
  const now = new Date().toISOString();
  const [row] = await db.update(productVariants).set({
    ...(data.label !== undefined && { label: data.label }),
    ...(data.pack_size !== undefined && { pack_size: data.pack_size }),
    ...(data.unit !== undefined && { unit: data.unit }),
    ...(data.sku !== undefined && { sku: data.sku }),
    ...(data.purchase_price !== undefined && { purchase_price: data.purchase_price }),
    ...(data.selling_price !== undefined && { selling_price: data.selling_price }),
    ...(data.mrp !== undefined && { mrp: data.mrp }),
    ...(data.min_stock_alert !== undefined && { min_stock_alert: data.min_stock_alert }),
    updated_at: now,
  }).where(eq(productVariants.id, variantId)).returning();
  return row;
};

const deleteVariant = async (variantId) => {
  const [existing] = await db.select().from(productVariants).where(eq(productVariants.id, variantId)).limit(1);
  if (!existing) throw new NotFoundError('Variant not found');
  await db.update(productVariants).set({ is_active: false }).where(eq(productVariants.id, variantId));
};

const adjustVariantStock = async (variantId, data, userId) => {
  const [variant] = await db.select().from(productVariants).where(eq(productVariants.id, variantId)).limit(1);
  if (!variant) throw new NotFoundError('Variant not found');
  const previousStock = variant.current_stock;
  let newStock;
  if (data.transaction_type === 'IN' || data.transaction_type === 'RETURN') {
    newStock = previousStock + data.quantity;
  } else if (data.transaction_type === 'OUT') {
    newStock = previousStock - data.quantity;
    if (newStock < 0) throw Object.assign(new Error('Insufficient stock'), { statusCode: 400 });
  } else {
    newStock = data.quantity;
  }
  await db.update(productVariants).set({ current_stock: newStock, updated_at: new Date().toISOString() }).where(eq(productVariants.id, variantId));
  return { ...variant, current_stock: newStock, previous_stock: previousStock };
};

module.exports = { getAll, getById, create, update, remove, adjustStock, getLowStock, getExpiring, createVariant, updateVariant, deleteVariant, adjustVariantStock };

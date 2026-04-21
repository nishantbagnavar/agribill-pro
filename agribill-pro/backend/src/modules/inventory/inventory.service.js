const { eq, and, desc, sql, gte, lte } = require('drizzle-orm');
const { db } = require('../../config/db');
const { stockTransactions, products, categories, users } = require('../../db/schema');

const getTransactions = async (query = {}) => {
  const filters = [];
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Number(query.limit || 30));
  const offset = (page - 1) * limit;

  if (query.product_id) filters.push(eq(stockTransactions.product_id, Number(query.product_id)));
  if (query.transaction_type) filters.push(eq(stockTransactions.transaction_type, query.transaction_type));
  if (query.from_date) filters.push(gte(stockTransactions.created_at, query.from_date));
  if (query.to_date) filters.push(lte(stockTransactions.created_at, query.to_date + 'T23:59:59'));

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const rows = await db
    .select({
      id: stockTransactions.id,
      product_id: stockTransactions.product_id,
      product_name: products.name,
      product_unit: products.unit,
      transaction_type: stockTransactions.transaction_type,
      quantity: stockTransactions.quantity,
      previous_stock: stockTransactions.previous_stock,
      new_stock: stockTransactions.new_stock,
      reference_id: stockTransactions.reference_id,
      notes: stockTransactions.notes,
      created_by_name: users.name,
      created_at: stockTransactions.created_at,
    })
    .from(stockTransactions)
    .leftJoin(products, eq(stockTransactions.product_id, products.id))
    .leftJoin(users, eq(stockTransactions.created_by, users.id))
    .where(whereClause)
    .orderBy(desc(stockTransactions.created_at))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: sql`count(*)`.as('total') })
    .from(stockTransactions)
    .where(whereClause);

  return { rows, total: Number(total), page, limit };
};

const getSummary = async () => {
  // Current stock summary grouped by category
  const rows = await db
    .select({
      category_id: products.category_id,
      category_name: categories.name,
      category_icon: categories.icon,
      product_count: sql`count(${products.id})`.as('product_count'),
      total_stock_value: sql`sum(${products.current_stock} * ${products.purchase_price})`.as('total_stock_value'),
      low_stock_count: sql`sum(case when ${products.current_stock} <= ${products.min_stock_alert} then 1 else 0 end)`.as('low_stock_count'),
      out_of_stock_count: sql`sum(case when ${products.current_stock} = 0 then 1 else 0 end)`.as('out_of_stock_count'),
    })
    .from(products)
    .leftJoin(categories, eq(products.category_id, categories.id))
    .where(eq(products.is_active, true))
    .groupBy(products.category_id, categories.name, categories.icon);

  const [totals] = await db
    .select({
      total_products: sql`count(*)`.as('total_products'),
      total_stock_value: sql`sum(${products.current_stock} * ${products.purchase_price})`.as('total_stock_value'),
      total_retail_value: sql`sum(${products.current_stock} * ${products.selling_price})`.as('total_retail_value'),
      low_stock_count: sql`sum(case when ${products.current_stock} <= ${products.min_stock_alert} then 1 else 0 end)`.as('low_stock_count'),
      out_of_stock_count: sql`sum(case when ${products.current_stock} = 0 then 1 else 0 end)`.as('out_of_stock_count'),
    })
    .from(products)
    .where(eq(products.is_active, true));

  return {
    by_category: rows.map((r) => ({
      ...r,
      total_stock_value: Number(r.total_stock_value || 0),
      product_count: Number(r.product_count || 0),
      low_stock_count: Number(r.low_stock_count || 0),
      out_of_stock_count: Number(r.out_of_stock_count || 0),
    })),
    totals: {
      total_products: Number(totals.total_products || 0),
      total_stock_value: Number(totals.total_stock_value || 0),
      total_retail_value: Number(totals.total_retail_value || 0),
      low_stock_count: Number(totals.low_stock_count || 0),
      out_of_stock_count: Number(totals.out_of_stock_count || 0),
    },
  };
};

module.exports = { getTransactions, getSummary };

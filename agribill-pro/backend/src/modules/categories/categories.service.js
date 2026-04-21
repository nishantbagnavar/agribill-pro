const { eq, sql, isNull } = require('drizzle-orm');
const { db } = require('../../config/db');
const { categories, products } = require('../../db/schema');
const { NotFoundError } = require('../../utils/errors');

const getAll = async () => {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      name_hindi: categories.name_hindi,
      description: categories.description,
      icon: categories.icon,
      parent_id: categories.parent_id,
      is_active: categories.is_active,
      sort_order: categories.sort_order,
      created_at: categories.created_at,
    })
    .from(categories)
    .where(eq(categories.is_active, true))
    .orderBy(categories.sort_order, categories.name);

  // Attach product counts
  const counts = await db
    .select({
      category_id: products.category_id,
      count: sql`count(*)`.as('count'),
    })
    .from(products)
    .where(eq(products.is_active, true))
    .groupBy(products.category_id);

  const countMap = {};
  for (const c of counts) countMap[c.category_id] = Number(c.count);

  return rows.map((r) => ({ ...r, product_count: countMap[r.id] || 0 }));
};

const getById = async (id) => {
  const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!row) throw new NotFoundError('Category not found');
  return row;
};

const create = async (data) => {
  const [row] = await db
    .insert(categories)
    .values({
      name: data.name,
      name_hindi: data.name_hindi || null,
      description: data.description || null,
      icon: data.icon || null,
      parent_id: data.parent_id || null,
      sort_order: data.sort_order || 0,
    })
    .returning();
  return row;
};

const update = async (id, data) => {
  await getById(id);
  const [row] = await db
    .update(categories)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.name_hindi !== undefined && { name_hindi: data.name_hindi }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.parent_id !== undefined && { parent_id: data.parent_id }),
      ...(data.sort_order !== undefined && { sort_order: data.sort_order }),
    })
    .where(eq(categories.id, id))
    .returning();
  return row;
};

const remove = async (id) => {
  await getById(id);
  // Check if products are assigned to this category
  const [productCheck] = await db
    .select({ count: sql`count(*)`.as('count') })
    .from(products)
    .where(eq(products.category_id, id));

  if (Number(productCheck.count) > 0) {
    throw Object.assign(new Error('Cannot delete category with assigned products'), { statusCode: 409 });
  }

  await db.update(categories).set({ is_active: false }).where(eq(categories.id, id));
};

module.exports = { getAll, getById, create, update, remove };

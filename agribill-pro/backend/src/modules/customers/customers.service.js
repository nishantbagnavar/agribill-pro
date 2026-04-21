const { eq, like, and, or, sql, asc, desc, gt } = require('drizzle-orm');
const { db } = require('../../config/db');
const { customers, bills, payments } = require('../../db/schema');
const { NotFoundError } = require('../../utils/errors');

const getAll = async (query = {}) => {
  const filters = [eq(customers.is_active, true)];
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Number(query.limit || 20));
  const offset = (page - 1) * limit;

  if (query.search) {
    const term = `%${query.search}%`;
    filters.push(
      or(
        like(customers.name, term),
        like(customers.phone, term),
        like(customers.village, term),
        like(customers.district, term)
      )
    );
  }

  if (query.has_due === 'true') {
    filters.push(gt(customers.total_due, 0));
  }

  const rows = await db
    .select()
    .from(customers)
    .where(and(...filters))
    .orderBy(asc(customers.name))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: sql`count(*)`.as('total') })
    .from(customers)
    .where(and(...filters));

  return { rows, total: Number(total), page, limit };
};

const getById = async (id) => {
  const [row] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.is_active, true)))
    .limit(1);
  if (!row) throw new NotFoundError('Customer');
  return row;
};

const create = async (data) => {
  const [row] = await db
    .insert(customers)
    .values({
      name: data.name,
      phone: data.phone,
      whatsapp_number: data.whatsapp_number || data.phone,
      email: data.email || null,
      address: data.address || null,
      village: data.village || null,
      taluka: data.taluka || null,
      district: data.district || null,
      pincode: data.pincode || null,
      gstin: data.gstin || null,
      notes: data.notes || null,
    })
    .returning();
  return row;
};

const update = async (id, data) => {
  await getById(id);
  const now = new Date().toISOString();
  const [row] = await db
    .update(customers)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.whatsapp_number !== undefined && { whatsapp_number: data.whatsapp_number }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.village !== undefined && { village: data.village }),
      ...(data.taluka !== undefined && { taluka: data.taluka }),
      ...(data.district !== undefined && { district: data.district }),
      ...(data.pincode !== undefined && { pincode: data.pincode }),
      ...(data.gstin !== undefined && { gstin: data.gstin }),
      ...(data.notes !== undefined && { notes: data.notes }),
      updated_at: now,
    })
    .where(eq(customers.id, id))
    .returning();
  return row;
};

const remove = async (id) => {
  await getById(id);
  await db.update(customers).set({ is_active: false }).where(eq(customers.id, id));
};

const getLedger = async (customerId) => {
  await getById(customerId);

  const customerBills = await db
    .select({
      id: bills.id,
      bill_number: bills.bill_number,
      bill_date: bills.bill_date,
      total_amount: bills.total_amount,
      paid_amount: bills.paid_amount,
      due_amount: bills.due_amount,
      payment_status: bills.payment_status,
      payment_method: bills.payment_method,
      created_at: bills.created_at,
    })
    .from(bills)
    .where(eq(bills.customer_id, customerId))
    .orderBy(desc(bills.bill_date));

  const customerPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.customer_id, customerId))
    .orderBy(desc(payments.created_at));

  const [stats] = await db
    .select({
      bill_count: sql`count(*)`.as('bill_count'),
      total_billed: sql`sum(${bills.total_amount})`.as('total_billed'),
      total_paid: sql`sum(${bills.paid_amount})`.as('total_paid'),
      total_due: sql`sum(${bills.due_amount})`.as('total_due'),
    })
    .from(bills)
    .where(eq(bills.customer_id, customerId));

  return {
    bills: customerBills,
    payments: customerPayments,
    stats: {
      bill_count: Number(stats.bill_count || 0),
      total_billed: Number(stats.total_billed || 0),
      total_paid: Number(stats.total_paid || 0),
      total_due: Number(stats.total_due || 0),
    },
  };
};

module.exports = { getAll, getById, create, update, remove, getLedger };

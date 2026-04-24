import { create } from 'zustand';

const calculateItemTotals = (item) => {
  const qty = item.quantity;
  const rate = item.rate; // in paise
  const discountPct = item.discount_percent || 0;
  const gstRate = item.gst_rate || 0;

  const grossAmount = qty * rate;
  const discountAmount = Math.round(grossAmount * discountPct / 100);
  const taxableAmount = grossAmount - discountAmount;
  const gstAmount = Math.round(taxableAmount * gstRate / 100);
  const cgst = Math.round(gstAmount / 2);
  const sgst = gstAmount - cgst;
  const totalAmount = taxableAmount + gstAmount;

  return { ...item, grossAmount, discountAmount, taxableAmount, cgst, sgst, totalAmount };
};

export const useCartStore = create((set, get) => ({
  items: [],
  customer: null,
  billNumber: '',
  billDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  paymentMethod: 'CASH',
  amountPaid: null, // null = blank (fully paid assumed), 0 = explicitly Not Paid
  notes: '',

  addItem: (product) => {
    const { items } = get();
    const key = `p-${product.id}`;
    const existing = items.find((i) => i._key === key);
    if (existing) {
      set({ items: items.map((i) => i._key === key ? calculateItemTotals({ ...i, quantity: i.quantity + 1 }) : i) });
    } else {
      const newItem = calculateItemTotals({
        _key: key,
        product_id: product.id,
        variant_id: null,
        product_name: product.name,
        hsn_code: product.hsn_code || '',
        unit: product.unit,
        quantity: 1,
        rate: product.selling_price,
        mrp: product.mrp,
        discount_percent: 0,
        gst_rate: product.gst_rate || 0,
      });
      set({ items: [...items, newItem] });
    }
  },

  addVariant: (product, variant) => {
    const { items } = get();
    const key = `v-${variant.id}`;
    const existing = items.find((i) => i._key === key);
    if (existing) {
      set({ items: items.map((i) => i._key === key ? calculateItemTotals({ ...i, quantity: i.quantity + 1 }) : i) });
    } else {
      const newItem = calculateItemTotals({
        _key: key,
        product_id: product.id,
        variant_id: variant.id,
        product_name: `${product.name} · ${variant.label}`,
        hsn_code: product.hsn_code || '',
        unit: variant.unit,
        quantity: 1,
        rate: variant.selling_price,
        mrp: variant.mrp,
        discount_percent: 0,
        gst_rate: product.gst_rate || 0,
      });
      set({ items: [...items, newItem] });
    }
  },

  updateItem: (key, field, value) => {
    set({ items: get().items.map((i) => i._key === key ? calculateItemTotals({ ...i, [field]: value }) : i) });
  },

  removeItem: (key) => {
    set({ items: get().items.filter((i) => i._key !== key) });
  },

  setCustomer: (customer) => set({ customer }),
  setBillNumber: (billNumber) => set({ billNumber }),
  setBillDate: (billDate) => set({ billDate }),
  setDueDate: (dueDate) => set({ dueDate }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setAmountPaid: (amountPaid) => set({ amountPaid }),
  setNotes: (notes) => set({ notes }),

  getTotals: () => {
    const { items, amountPaid } = get();
    const subtotal = items.reduce((s, i) => s + i.grossAmount, 0);
    const totalDiscount = items.reduce((s, i) => s + i.discountAmount, 0);
    const taxableAmount = items.reduce((s, i) => s + i.taxableAmount, 0);
    const totalCgst = items.reduce((s, i) => s + i.cgst, 0);
    const totalSgst = items.reduce((s, i) => s + i.sgst, 0);
    const totalAmount = items.reduce((s, i) => s + i.totalAmount, 0);
    const dueAmount = amountPaid === null ? 0 : totalAmount - amountPaid;
    return { subtotal, totalDiscount, taxableAmount, totalCgst, totalSgst, totalAmount, dueAmount };
  },

  clearCart: () =>
    set({
      items: [],
      customer: null,
      billNumber: '',
      billDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      paymentMethod: 'CASH',
      amountPaid: null,
      notes: '',
    }),
}));

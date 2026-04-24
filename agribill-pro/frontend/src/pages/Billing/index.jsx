import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Plus, Minus, Loader2, User, FileText, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../../store/cart.store.js';
import { useCreateBill, useNextBillNumber } from '../../hooks/useBilling.js';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts.js';
import { productsApi } from '../../api/products.api.js';
import { customersApi } from '../../api/customers.api.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { value: 'CASH',   label: '💵 Cash' },
  { value: 'UPI',    label: '📱 UPI' },
  { value: 'CARD',   label: '💳 Card' },
  { value: 'CHEQUE', label: '📄 Cheque' },
  { value: 'CREDIT', label: '📋 Credit' },
];

/* ─── Product search autocomplete with keyboard navigation ─── */
function ProductSearch({ onAdd, onAddVariant, inputRef }) {
  const [query, setQuery]           = useState('');
  const [open, setOpen]             = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [highlighted, setHighlighted] = useState(-1);
  const ref = useRef(null);
  const { t } = useTranslation();

  const { data: results } = useQuery({
    queryKey: ['product-search', query],
    queryFn: () => productsApi.getAll({ search: query, limit: 8 }).then((r) => r.data.data),
    enabled: query.length >= 1,
    staleTime: 10_000,
  });

  const { data: expandedProduct } = useQuery({
    queryKey: ['products', expandedId],
    queryFn: () => productsApi.getById(expandedId).then((r) => r.data.data),
    enabled: !!expandedId,
    staleTime: 30_000,
  });

  useEffect(() => {
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) { setOpen(false); setExpandedId(null); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset highlight when results change
  useEffect(() => { setHighlighted(-1); }, [results]);

  const select = (product) => {
    if (product.variant_count > 0) {
      setExpandedId(expandedId === product.id ? null : product.id);
      return;
    }
    if (product.current_stock <= 0) {
      toast.error(t('billing.outOfStock', { name: product.name }));
      return;
    }
    onAdd(product);
    setQuery('');
    setOpen(false);
    setExpandedId(null);
    setHighlighted(-1);
  };

  const selectVariant = (product, variant) => {
    if (variant.current_stock <= 0) {
      toast.error(t('billing.outOfStock', { name: `${product.name} · ${variant.label}` }));
      return;
    }
    onAddVariant(product, variant);
    setQuery('');
    setOpen(false);
    setExpandedId(null);
    setHighlighted(-1);
  };

  const handleKeyDown = (e) => {
    const len = results?.length || 0;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open && len) { setOpen(true); setHighlighted(0); return; }
      setHighlighted((h) => Math.min(h + 1, len - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && open && highlighted >= 0 && highlighted < len) {
      e.preventDefault();
      select(results[highlighted]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setHighlighted(-1);
      inputRef?.current?.focus();
    }
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--gray-400)' }} />
        <input
          ref={inputRef}
          autoFocus
          type="text"
          placeholder={t('billing.searchProduct')}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setExpandedId(null); setHighlighted(-1); }}
          onFocus={() => query && setOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full h-11 pl-10 pr-4 rounded-xl border text-sm font-body outline-none transition-all"
          style={{ borderColor: 'var(--gray-200)' }}
        />
      </div>

      {open && results?.length > 0 && (
        <div
          className="absolute z-20 top-full left-0 right-0 mt-1 rounded-xl overflow-hidden"
          style={{ background: 'white', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--gray-200)' }}
        >
          {results.map((product, idx) => (
            <div key={product.id}>
              <button
                onClick={() => select(product)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{ background: highlighted === idx ? 'var(--green-50)' : undefined }}
                onMouseEnter={() => setHighlighted(idx)}
              >
                <span className="text-xl">{product.category?.icon || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display font-600 text-sm truncate" style={{ color: 'var(--gray-900)' }}>{product.name}</p>
                    {product.variant_count > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-600 font-display" style={{ background: 'var(--green-100)', color: 'var(--primary-dark)' }}>
                        {product.variant_count} sizes
                      </span>
                    )}
                  </div>
                  <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>
                    {product.brand} · {product.current_stock} {product.unit} available
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono font-700 text-sm" style={{ color: 'var(--gray-900)' }}>
                    {formatCurrency(product.selling_price, { decimals: 0 })}
                  </p>
                  {product.variant_count > 0
                    ? <ChevronDown size={12} className={`ml-auto transition-transform ${expandedId === product.id ? 'rotate-180' : ''}`} style={{ color: 'var(--gray-400)' }} />
                    : <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>/{product.unit}</p>
                  }
                </div>
              </button>

              {expandedId === product.id && expandedProduct?.variants?.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => selectVariant(expandedProduct, variant)}
                  className="w-full flex items-center gap-3 px-6 py-2.5 text-left transition-colors hover:bg-blue-50 border-t"
                  style={{ borderColor: 'var(--gray-100)', background: 'var(--gray-50)' }}
                >
                  <span className="text-sm">↳</span>
                  <div className="flex-1">
                    <p className="font-display font-600 text-xs" style={{ color: 'var(--gray-800)' }}>{variant.label}</p>
                    <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>Stock: {variant.current_stock} {variant.unit}</p>
                  </div>
                  <p className="font-mono font-700 text-sm" style={{ color: 'var(--gray-900)' }}>
                    {formatCurrency(variant.selling_price, { decimals: 0 })}
                  </p>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Customer search with keyboard navigation ─── */
function CustomerSearch({ value, onChange }) {
  const [query, setQuery]             = useState('');
  const [open, setOpen]               = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const ref = useRef(null);
  const { t } = useTranslation();

  const { data: results } = useQuery({
    queryKey: ['customer-search', query],
    queryFn: () => customersApi.getAll({ search: query, limit: 6 }).then((r) => r.data.data),
    enabled: query.length >= 1,
    staleTime: 10_000,
  });

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setHighlighted(-1); }, [results]);

  const handleKeyDown = (e) => {
    const len = results?.length || 0;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open && len) { setOpen(true); setHighlighted(0); return; }
      setHighlighted((h) => Math.min(h + 1, len - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && open && highlighted >= 0 && highlighted < len) {
      e.preventDefault();
      onChange(results[highlighted]);
      setQuery('');
      setOpen(false);
      setHighlighted(-1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setHighlighted(-1);
    }
  };

  if (value) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
        style={{ background: 'var(--green-50)', border: '1px solid var(--green-200)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-display font-700 text-sm text-white flex-shrink-0"
          style={{ background: 'var(--primary-dark)' }}
        >
          {value.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-600 text-sm truncate" style={{ color: 'var(--gray-900)' }}>{value.name}</p>
          <p className="font-body text-xs" style={{ color: 'var(--gray-500)' }}>{value.phone}</p>
        </div>
        <button onClick={() => onChange(null)} className="p-1 hover:bg-green-100 rounded-lg">
          <X size={14} style={{ color: 'var(--gray-500)' }} />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--gray-400)' }} />
        <input
          type="text"
          placeholder={t('billing.searchCustomer')}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full h-10 pl-9 pr-4 rounded-xl border text-sm font-body outline-none"
          style={{ borderColor: 'var(--gray-200)' }}
        />
      </div>
      {open && results?.length > 0 && (
        <div
          className="absolute z-20 top-full left-0 right-0 mt-1 rounded-xl overflow-hidden"
          style={{ background: 'white', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--gray-200)' }}
        >
          {results.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => { onChange(c); setQuery(''); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
              style={{ background: highlighted === idx ? 'var(--green-50)' : undefined }}
              onMouseEnter={() => setHighlighted(idx)}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-display font-700 text-xs text-white flex-shrink-0"
                style={{ background: 'var(--primary)' }}
              >
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-600 text-sm truncate">{c.name}</p>
                <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>{c.phone} · {c.village || c.district}</p>
              </div>
              {c.total_due > 0 && (
                <span className="text-xs font-mono font-600" style={{ color: 'var(--color-warning)' }}>
                  Due {formatCurrency(c.total_due, { decimals: 0 })}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Cart item row ─── */
function CartRow({ item, onUpdate, onRemove }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
      <td className="py-3 pl-4 pr-2">
        <p className="font-display font-600 text-xs leading-tight" style={{ color: 'var(--gray-900)' }}>{item.product_name}</p>
        <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>{item.unit} · GST {item.gst_rate}%</p>
      </td>
      <td className="py-3 px-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => item.quantity > 1 && onUpdate(item._key, 'quantity', item.quantity - 1)}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <Minus size={10} style={{ color: 'var(--gray-600)' }} />
          </button>
          <input
            data-qty-key={item._key}
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => onUpdate(item._key, 'quantity', Number(e.target.value))}
            className="w-10 h-7 text-center rounded border text-xs font-mono outline-none"
            style={{ borderColor: 'var(--gray-200)' }}
          />
          <button
            onClick={() => onUpdate(item._key, 'quantity', item.quantity + 1)}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <Plus size={10} style={{ color: 'var(--gray-600)' }} />
          </button>
        </div>
      </td>
      <td className="py-3 px-2">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-mono" style={{ color: 'var(--gray-400)' }}>₹</span>
          <input
            type="number"
            min="0"
            value={item.rate / 100}
            onChange={(e) => onUpdate(item._key, 'rate', Math.round(Number(e.target.value) * 100))}
            className="w-20 h-7 pl-5 rounded border text-xs font-mono outline-none"
            style={{ borderColor: 'var(--gray-200)' }}
          />
        </div>
      </td>
      <td className="py-3 px-2">
        <div className="flex items-center gap-0.5">
          <input
            type="number"
            min="0"
            max="100"
            value={item.discount_percent}
            onChange={(e) => onUpdate(item._key, 'discount_percent', Number(e.target.value))}
            className="w-12 h-7 text-center rounded border text-xs font-mono outline-none"
            style={{ borderColor: 'var(--gray-200)' }}
          />
          <span className="text-xs" style={{ color: 'var(--gray-400)' }}>%</span>
        </div>
      </td>
      <td className="py-3 px-2">
        <p className="font-mono text-xs" style={{ color: 'var(--gray-600)' }}>
          {formatCurrency(item.cgst)} + {formatCurrency(item.sgst)}
        </p>
      </td>
      <td className="py-3 px-2 pr-4">
        <p className="font-mono font-700 text-sm" style={{ color: 'var(--gray-900)' }}>
          {formatCurrency(item.totalAmount, { decimals: 0 })}
        </p>
      </td>
      <td className="py-3 pr-4">
        <button onClick={() => onRemove(item._key)} className="p-1 rounded hover:bg-red-50 transition-colors">
          <X size={13} style={{ color: 'var(--color-danger)' }} />
        </button>
      </td>
    </tr>
  );
}

/* ─── Totals summary ─── */
function TotalsSummary({ totals }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      {[
        { label: t('billing.subtotal'),      value: totals.subtotal },
        { label: t('billing.discount'),      value: -totals.totalDiscount, color: 'var(--color-danger)' },
        { label: t('billing.taxableAmount'), value: totals.taxableAmount },
        { label: 'CGST',                     value: totals.totalCgst },
        { label: 'SGST',                     value: totals.totalSgst },
      ].map(({ label, value, color }) => (
        <div key={label} className="flex justify-between">
          <span className="font-body text-xs" style={{ color: 'var(--gray-500)' }}>{label}</span>
          <span className="font-mono text-xs font-600" style={{ color: color || 'var(--gray-700)' }}>
            {value < 0 ? '-' : ''}{formatCurrency(Math.abs(value), { decimals: 0 })}
          </span>
        </div>
      ))}
      <div className="flex justify-between pt-2 mt-2" style={{ borderTop: '2px solid var(--gray-200)' }}>
        <span className="font-display font-700 text-sm" style={{ color: 'var(--gray-900)' }}>{t('billing.total')}</span>
        <span className="font-mono font-700 text-xl" style={{ color: 'var(--gray-900)' }}>
          {formatCurrency(totals.totalAmount, { decimals: 0 })}
        </span>
      </div>
    </div>
  );
}

/* ─── Main POS Page ─── */
export default function Billing() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    items, customer, billNumber, billDate, dueDate,
    paymentMethod, amountPaid, notes,
    addItem, addVariant, updateItem, removeItem,
    setCustomer, setBillNumber, setBillDate, setDueDate,
    setPaymentMethod, setAmountPaid, setNotes,
    getTotals, clearCart,
  } = useCartStore();

  const { data: nextBill } = useNextBillNumber();
  const createBill         = useCreateBill();
  const totals             = getTotals();

  // Refs for keyboard shortcut targets
  const productSearchRef  = useRef(null);
  const amountPaidRef     = useRef(null);
  const generateRef       = useRef(null);

  // Track last-added item key to auto-focus its quantity input
  const [lastAddedKey, setLastAddedKey] = useState(null);

  useEffect(() => {
    if (nextBill?.bill_number && !billNumber) setBillNumber(nextBill.bill_number);
  }, [nextBill, billNumber, setBillNumber]);

  // Focus the quantity input of the last-added cart item
  useEffect(() => {
    if (!lastAddedKey) return;
    const input = document.querySelector(`[data-qty-key="${lastAddedKey}"]`);
    if (input) input.focus();
  }, [lastAddedKey, items.length]);

  const handleAddItem = (product) => {
    addItem(product);
    setLastAddedKey(`p-${product.id}`);
  };

  const handleAddVariant = (product, variant) => {
    addVariant(product, variant);
    setLastAddedKey(`v-${variant.id}`);
  };

  const handleGenerate = async () => {
    if (items.length === 0) { toast.error(t('billing.addAtLeastOne')); return; }

    const payload = {
      customer_id:      customer?.id || null,
      customer_name:    customer?.name || 'Walk-in Customer',
      customer_phone:   customer?.phone || '',
      customer_address: customer?.address || '',
      bill_number:      billNumber,
      bill_date:        billDate,
      due_date:         dueDate || null,
      payment_method:   paymentMethod,
      paid_amount:      paymentMethod === 'CREDIT' ? 0 : (amountPaid === null ? null : Math.round(Number(amountPaid) * 100)),
      notes,
      items: items.map((item) => ({
        product_id:       item.product_id,
        variant_id:       item.variant_id || null,
        product_name:     item.product_name,
        hsn_code:         item.hsn_code,
        unit:             item.unit,
        quantity:         item.quantity,
        rate:             item.rate,
        mrp:              item.mrp,
        discount_percent: item.discount_percent,
        taxable_amount:   item.taxableAmount,
        gst_rate:         item.gst_rate,
        cgst:             item.cgst,
        sgst:             item.sgst,
        igst:             0,
        total_amount:     item.totalAmount,
      })),
    };

    try {
      const bill = await createBill.mutateAsync(payload);
      toast.success(`Bill ${bill.bill_number} created!`);
      clearCart();
      navigate(`/billing/${bill.id}/preview`);
    } catch {
      // error handled in hook
    }
  };

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    F2: () => {
      const idx = PAYMENT_METHODS.findIndex((m) => m.value === paymentMethod);
      setPaymentMethod(PAYMENT_METHODS[(idx + 1) % PAYMENT_METHODS.length].value);
    },
    F4:  () => amountPaidRef.current?.focus(),
    F10: () => { if (!createBill.isPending) handleGenerate(); },
  });

  // null = blank (fully paid), 0 = not paid, >0 = partial
  const effectivePaid = paymentMethod === 'CREDIT' ? 0 : (amountPaid === null ? totals.totalAmount : Math.round(Number(amountPaid) * 100));
  const dueAmount = totals.totalAmount - effectivePaid;

  return (
    <div className="page-enter h-full">
      <div className="flex flex-col lg:flex-row gap-4 h-full">

        {/* ── LEFT PANEL: Product Search + Cart ── */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-700 text-xl" style={{ color: 'var(--gray-900)' }}>{t('billing.newBill')}</h1>
              <p className="font-body text-xs mt-0.5" style={{ color: 'var(--gray-400)' }}>
                F2 = Payment · F4 = Amount · F10 = Generate
              </p>
            </div>
            {items.length > 0 && (
              <button
                onClick={() => { if (window.confirm(t('billing.clearCartConfirm'))) clearCart(); }}
                className="h-8 px-3 rounded-lg text-xs font-display font-500 transition-all hover:bg-red-50"
                style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger-border)' }}
              >
                {t('billing.clearCart')}
              </button>
            )}
          </div>

          {/* Product search */}
          <div className="rounded-xl p-4" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
            <ProductSearch
              onAdd={handleAddItem}
              onAddVariant={handleAddVariant}
              inputRef={productSearchRef}
            />
          </div>

          {/* Cart */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <FileText size={40} style={{ color: 'var(--gray-200)' }} />
                <p className="font-display font-600 text-sm" style={{ color: 'var(--gray-500)' }}>{t('billing.cartEmpty')}</p>
                <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>{t('billing.cartEmptyHint')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: 600 }}>
                  <thead>
                    <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                      {[t('billing.product'), t('billing.qty'), t('billing.rate'), t('billing.disc'), t('billing.gst'), t('billing.amount'), ''].map((h) => (
                        <th
                          key={h}
                          className="py-2.5 px-2 text-left font-display font-600 text-xs first:pl-4 last:pr-4"
                          style={{ color: 'var(--gray-500)' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <CartRow
                        key={item._key}
                        item={item}
                        onUpdate={updateItem}
                        onRemove={removeItem}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Bill Details + Totals ── */}
        <div
          className="lg:w-80 xl:w-96 rounded-xl p-5 space-y-5 flex-shrink-0 self-start"
          style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}
        >
          {/* Customer */}
          <div>
            <p className="font-display font-600 text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--gray-400)' }}>{t('billing.customer')}</p>
            <CustomerSearch value={customer} onChange={setCustomer} />
          </div>

          {/* Bill details */}
          <div>
            <p className="font-display font-600 text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--gray-400)' }}>{t('billing.billDetails')}</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="font-body text-xs w-20 flex-shrink-0" style={{ color: 'var(--gray-500)' }}>{t('billing.billNumber')}</label>
                <input
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="flex-1 h-8 px-2 rounded-lg border text-xs font-mono outline-none"
                  style={{ borderColor: 'var(--gray-200)' }}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="font-body text-xs w-20 flex-shrink-0" style={{ color: 'var(--gray-500)' }}>{t('billing.billDate')}</label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="flex-1 h-8 px-2 rounded-lg border text-xs font-body outline-none"
                  style={{ borderColor: 'var(--gray-200)' }}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="font-body text-xs w-20 flex-shrink-0" style={{ color: 'var(--gray-500)' }}>{t('billing.dueDate')}</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="flex-1 h-8 px-2 rounded-lg border text-xs font-body outline-none"
                  style={{ borderColor: 'var(--gray-200)' }}
                />
              </div>
            </div>
          </div>

          {/* Payment method — F2 cycles through methods */}
          <div>
            <p className="font-display font-600 text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--gray-400)' }}>
              {t('billing.paymentMethod')}
              <kbd className="ml-2 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-mono font-400" style={{ color: 'var(--gray-500)' }}>F2</kbd>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setPaymentMethod(value)}
                  className="h-8 px-2.5 rounded-lg text-xs font-display font-600 transition-all"
                  style={
                    paymentMethod === value
                      ? { background: 'var(--primary-dark)', color: 'white' }
                      : { background: 'var(--gray-100)', color: 'var(--gray-600)' }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount paid — F4 focuses this */}
          {paymentMethod !== 'CREDIT' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-display font-600 text-xs uppercase tracking-wider" style={{ color: 'var(--gray-400)' }}>
                  {t('billing.amountPaid')}
                  <kbd className="ml-2 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-mono font-400" style={{ color: 'var(--gray-500)' }}>F4</kbd>
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAmountPaid(0)}
                    className="text-[10px] font-display font-600 px-2 py-0.5 rounded-md border transition-all"
                    style={
                      amountPaid === 0
                        ? { background: '#FEE2E2', borderColor: '#FCA5A5', color: '#DC2626' }
                        : { background: 'var(--gray-100)', borderColor: 'var(--gray-200)', color: 'var(--gray-500)' }
                    }
                  >
                    Not Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountPaid(null)}
                    className="text-[10px] font-display font-600 px-2 py-0.5 rounded-md border transition-all"
                    style={
                      amountPaid === null
                        ? { background: '#DCFCE7', borderColor: '#86EFAC', color: '#16A34A' }
                        : { background: 'var(--gray-100)', borderColor: 'var(--gray-200)', color: 'var(--gray-500)' }
                    }
                  >
                    Full Paid
                  </button>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm" style={{ color: 'var(--gray-400)' }}>₹</span>
                <input
                  ref={amountPaidRef}
                  type="number"
                  min="0"
                  value={amountPaid === null ? '' : amountPaid}
                  placeholder="Leave blank = fully paid"
                  onChange={(e) => setAmountPaid(e.target.value === '' ? null : Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="w-full h-10 pl-7 pr-3 rounded-xl border font-mono text-sm outline-none"
                  style={{ borderColor: 'var(--gray-200)' }}
                />
              </div>
            </div>
          )}

          {/* Totals */}
          {items.length > 0 && (
            <div
              className="rounded-xl p-4"
              style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}
            >
              <TotalsSummary totals={totals} />
              {dueAmount > 0 && (
                <div className="flex justify-between pt-2 mt-2" style={{ borderTop: '1px dashed var(--gray-300)' }}>
                  <span className="font-body text-xs" style={{ color: 'var(--gray-500)' }}>{t('billing.due')}</span>
                  <span className="font-mono font-700 text-sm" style={{ color: 'var(--color-danger)' }}>
                    {formatCurrency(dueAmount, { decimals: 0 })}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="font-display font-600 text-xs uppercase tracking-wider block mb-2" style={{ color: 'var(--gray-400)' }}>
              {t('billing.notes')}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('billing.notesPlaceholder')}
              className="w-full px-3 py-2 rounded-xl border text-xs font-body outline-none resize-none"
              style={{ borderColor: 'var(--gray-200)' }}
            />
          </div>

          {/* Generate bill button — F10 */}
          <button
            ref={generateRef}
            onClick={handleGenerate}
            disabled={items.length === 0 || createBill.isPending}
            className="w-full h-12 rounded-xl font-display font-700 text-base text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-98 disabled:opacity-50"
            style={{ background: 'var(--primary-dark)' }}
          >
            {createBill.isPending ? (
              <><Loader2 size={18} className="animate-spin" /> {t('billing.generating')}</>
            ) : (
              <>
                <FileText size={18} />
                {t('billing.generateBill')}
                <kbd className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded font-mono font-400">F10</kbd>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Calculator, Plus, Trash2 } from 'lucide-react';
import { useProduct, useCategories, useCreateProduct, useUpdateProduct, useCreateVariant, useDeleteVariant } from '../../hooks/useProducts.js';
import { formatCurrency } from '../../utils/formatCurrency.js';

const UNITS  = ['kg', 'gram', 'litre', 'ml', 'bag', 'bottle', 'piece', 'box', 'packet'];
const GST_RATES = [0, 5, 12, 18, 28];

const safeNum = (min = 0, dflt = 0) => z.preprocess(
  (v) => {
    if (v === '' || v === null || v === undefined) return dflt;
    const n = typeof v === 'number' ? v : Number(v);
    return isNaN(n) ? dflt : n;
  },
  z.number().min(min)
);

const maybeNumber = z.preprocess((val) => val === '' || Number.isNaN(Number(val)) ? undefined : Number(val), z.number().min(0, 'Required'));

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

function Field({ label, error, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block font-display font-500 text-xs mb-1.5" style={{ color: 'var(--gray-700)' }}>{label}</label>
      {children}
      {error && <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>}
    </div>
  );
}

import React from 'react';

const Input = React.forwardRef(({ hasError, className, style, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={`w-full h-10 px-3 rounded-lg border text-sm font-body outline-none transition-all focus:border-brand-500 ${className || ''}`}
      style={{ borderColor: hasError ? 'var(--color-danger)' : 'var(--gray-200)', ...style }}
      {...props}
    />
  );
});

Input.displayName = 'Input';

function SectionHeader({ title }) {
  return (
    <p className="font-display font-600 text-xs uppercase tracking-widest pt-2 pb-1" style={{ color: 'var(--gray-400)' }}>
      {title}
    </p>
  );
}

function GstPreview({ sellingPrice, gstRate }) {
  const selling = Number(sellingPrice) || 0;
  const rate = Number(gstRate) || 0;
  // sellingPrice assumed inclusive of GST (common in retail)
  const taxableAmount = Math.round(selling / (1 + rate / 100));
  const gstAmount = selling - taxableAmount;
  const cgst = Math.round(gstAmount / 2);
  const sgst = gstAmount - cgst;

  if (!selling || !rate) return null;

  return (
    <div
      className="rounded-xl p-4 mt-3"
      style={{ background: 'var(--green-50)', border: '1px solid var(--green-200)' }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Calculator size={12} style={{ color: 'var(--primary)' }} />
        <span className="font-display font-600 text-xs uppercase tracking-wide" style={{ color: 'var(--primary)' }}>GST Preview</span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Taxable', value: formatCurrency(taxableAmount * 100, { decimals: 2 }) },
          { label: `CGST ${rate / 2}%`, value: formatCurrency(cgst * 100, { decimals: 2 }) },
          { label: `SGST ${rate / 2}%`, value: formatCurrency(sgst * 100, { decimals: 2 }) },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="font-mono font-600 text-sm" style={{ color: 'var(--gray-800)' }}>{value}</p>
            <p className="font-body text-xs" style={{ color: 'var(--gray-500)' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const EMPTY_VARIANT = { label: '', pack_size: '', unit: 'ml', purchase_price: '', selling_price: '', mrp: '', current_stock: '', min_stock_alert: '5' };

function PackSizes({ productId, variants = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_VARIANT);
  const createVariant = useCreateVariant();
  const deleteVariant = useDeleteVariant();

  const handleAdd = () => {
    if (!form.label || !form.pack_size || !form.selling_price) return;
    createVariant.mutate({
      productId,
      data: {
        label: form.label,
        pack_size: Number(form.pack_size),
        unit: form.unit,
        purchase_price: Math.round(Number(form.purchase_price || 0) * 100),
        selling_price: Math.round(Number(form.selling_price) * 100),
        mrp: Math.round(Number(form.mrp || 0) * 100),
        current_stock: Number(form.current_stock || 0),
        min_stock_alert: Number(form.min_stock_alert || 5),
      },
    }, {
      onSuccess: () => { setForm(EMPTY_VARIANT); setShowForm(false); },
    });
  };

  return (
    <div className="rounded-xl p-6 space-y-4" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between">
        <SectionHeader title="Pack Sizes / Variants" />
        <button type="button" onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 text-xs font-600 font-display px-3 h-7 rounded-lg border transition-colors"
          style={{ color: 'var(--primary)', borderColor: 'var(--green-200)', background: 'var(--green-50)' }}>
          <Plus size={12} /> Add Size
        </button>
      </div>

      {variants.length === 0 && !showForm && (
        <p className="text-xs font-body" style={{ color: 'var(--gray-400)' }}>No pack sizes added. Click "Add Size" to create variants like 50ml, 500ml, 1L.</p>
      )}

      {variants.map((v) => (
        <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: 'var(--gray-100)', background: 'var(--gray-50)' }}>
          <div className="flex-1 min-w-0">
            <p className="font-display font-600 text-sm" style={{ color: 'var(--gray-900)' }}>{v.label}</p>
            <p className="font-body text-xs mt-0.5" style={{ color: 'var(--gray-500)' }}>
              {v.pack_size} {v.unit} · Stock: {v.current_stock} · Selling: {formatCurrency(v.selling_price)}
            </p>
          </div>
          <button type="button" onClick={() => deleteVariant.mutate(v.id)}
            className="p-1.5 rounded transition-colors" style={{ color: 'var(--color-danger)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-danger-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {showForm && (
        <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: 'var(--green-200)', background: 'var(--green-50)' }}>
          <p className="font-display font-600 text-xs uppercase tracking-wider" style={{ color: 'var(--primary)' }}>New Pack Size</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-600 mb-1" style={{ color: 'var(--gray-700)' }}>Label *</label>
              <input className="w-full h-9 px-3 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--gray-200)' }} placeholder="e.g. 500ml" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-600 mb-1" style={{ color: 'var(--gray-700)' }}>Pack Size</label>
              <input type="number" className="w-full h-9 px-3 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--gray-200)' }} placeholder="500" value={form.pack_size} onChange={e => setForm(f => ({ ...f, pack_size: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-600 mb-1" style={{ color: 'var(--gray-700)' }}>Unit</label>
              <select className="w-full h-9 px-3 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--gray-200)' }} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-600 mb-1" style={{ color: 'var(--gray-700)' }}>Purchase Price (₹)</label>
              <input type="number" className="w-full h-9 px-3 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--gray-200)' }} placeholder="0" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-600 mb-1" style={{ color: 'var(--gray-700)' }}>Selling Price (₹) *</label>
              <input type="number" className="w-full h-9 px-3 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--gray-200)' }} placeholder="0" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-600 mb-1" style={{ color: 'var(--gray-700)' }}>Initial Stock</label>
              <input type="number" className="w-full h-9 px-3 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--gray-200)' }} placeholder="0" value={form.current_stock} onChange={e => setForm(f => ({ ...f, current_stock: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_VARIANT); }}
              className="h-8 px-4 rounded-lg border text-xs font-600 font-display" style={{ borderColor: 'var(--gray-200)', color: 'var(--gray-600)' }}>
              Cancel
            </button>
            <button type="button" onClick={handleAdd} disabled={createVariant.isPending}
              className="h-8 px-4 rounded-lg text-xs font-600 font-display text-white flex items-center gap-1"
              style={{ background: 'var(--primary-dark)' }}>
              {createVariant.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Save Size
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { data: product, isLoading: productLoading } = useProduct(id);
  const { data: categories, isLoading: catLoading }  = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      unit: 'kg', gst_rate: 0, current_stock: 0, min_stock_alert: 5,
      purchase_price: '', selling_price: '', mrp: '',
    },
  });

  // Populate form for edit
  useEffect(() => {
    if (product) {
      reset({
        ...product,
        // Convert paise → rupees for display
        purchase_price: product.purchase_price / 100,
        selling_price:  product.selling_price / 100,
        mrp:            product.mrp / 100,
        expiry_date:    product.expiry_date?.split('T')[0] || '',
      });
    }
  }, [product, reset]);

  const sellingPrice = watch('selling_price');
  const gstRate      = watch('gst_rate');

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      // Convert rupees → paise
      purchase_price: Math.round(data.purchase_price * 100),
      selling_price:  Math.round(data.selling_price * 100),
      mrp:            Math.round(data.mrp * 100),
    };
    if (isEdit) {
      await updateProduct.mutateAsync({ id, data: payload });
    } else {
      await createProduct.mutateAsync(payload);
    }
    navigate('/inventory');
  };

  if (isEdit && productLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div className="page-enter max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={16} style={{ color: 'var(--gray-500)' }} />
        </button>
        <div>
          <h1 className="font-display font-700 text-xl" style={{ color: 'var(--gray-900)' }}>
            {isEdit ? 'Edit Product' : 'Add Product'}
          </h1>
          <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>
            {isEdit ? `Editing: ${product?.name}` : 'Fill in the product details below'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Basic Info */}
        <div className="rounded-xl p-6 space-y-4" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
          <SectionHeader title="Basic Info" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Product Name *" error={errors.name?.message} className="col-span-2">
              <Input placeholder="e.g. DAP Fertilizer 50kg" hasError={!!errors.name} {...register('name')} />
            </Field>
            <Field label="Hindi Name" error={errors.name_hindi?.message}>
              <Input placeholder="e.g. डीएपी खाद" {...register('name_hindi')} />
            </Field>
            <Field label="Brand" error={errors.brand?.message}>
              <Input placeholder="e.g. IFFCO" {...register('brand')} />
            </Field>
            <Field label="Category *" error={errors.category_id?.message}>
              <select
                className="w-full h-10 px-3 rounded-lg border text-sm font-body outline-none"
                style={{ borderColor: errors.category_id ? 'var(--color-danger)' : 'var(--gray-200)' }}
                {...register('category_id')}
              >
                <option value="">Select category...</option>
                {(categories || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Unit *" error={errors.unit?.message}>
              <select
                className="w-full h-10 px-3 rounded-lg border text-sm font-body outline-none"
                style={{ borderColor: 'var(--gray-200)' }}
                {...register('unit')}
              >
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SKU" error={errors.sku?.message}>
              <Input placeholder="Auto-generated if empty" {...register('sku')} />
            </Field>
            <Field label="Barcode" error={errors.barcode?.message}>
              <Input placeholder="EAN / custom barcode" {...register('barcode')} />
            </Field>
          </div>
          <Field label="Description" error={errors.description?.message}>
            <textarea
              rows={2}
              placeholder="Optional product description"
              className="w-full px-3 py-2 rounded-lg border text-sm font-body outline-none resize-none"
              style={{ borderColor: 'var(--gray-200)' }}
              {...register('description')}
            />
          </Field>
        </div>

        {/* Pricing */}
        <div className="rounded-xl p-6 space-y-4" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
          <SectionHeader title="Pricing" />
          <div className="grid grid-cols-3 gap-4">
            <Field label="Purchase Price (₹) *" error={errors.purchase_price?.message}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono" style={{ color: 'var(--gray-400)' }}>₹</span>
                <Input hasError={!!errors.purchase_price} className="pl-7" type="text" inputMode="decimal" placeholder="0.00" {...register('purchase_price', { setValueAs: (v) => v === '' ? '' : v })} style={{ paddingLeft: '1.75rem' }} />
              </div>
            </Field>
            <Field label="Selling Price (₹) *" error={errors.selling_price?.message}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono" style={{ color: 'var(--gray-400)' }}>₹</span>
                <Input hasError={!!errors.selling_price} type="text" inputMode="decimal" placeholder="0.00" {...register('selling_price', { setValueAs: (v) => v === '' ? '' : v })} style={{ paddingLeft: '1.75rem' }} />
              </div>
            </Field>
            <Field label="MRP (₹) *" error={errors.mrp?.message}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono" style={{ color: 'var(--gray-400)' }}>₹</span>
                <Input hasError={!!errors.mrp} type="text" inputMode="decimal" placeholder="0.00" {...register('mrp', { setValueAs: (v) => v === '' ? '' : v })} style={{ paddingLeft: '1.75rem' }} />
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="GST Rate" error={errors.gst_rate?.message}>
              <select
                className="w-full h-10 px-3 rounded-lg border text-sm font-body outline-none"
                style={{ borderColor: 'var(--gray-200)' }}
                {...register('gst_rate')}
              >
                {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
              </select>
            </Field>
            <Field label="HSN Code" error={errors.hsn_code?.message}>
              <Input placeholder="e.g. 3105" {...register('hsn_code')} />
            </Field>
          </div>

          <GstPreview sellingPrice={sellingPrice} gstRate={gstRate} />
        </div>

        {/* Stock */}
        <div className="rounded-xl p-6 space-y-4" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
          <SectionHeader title="Stock" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Current Stock" error={errors.current_stock?.message}>
              <Input type="text" inputMode="numeric" placeholder="0" hasError={!!errors.current_stock} {...register('current_stock', { setValueAs: (v) => v === '' ? 0 : v })} />
            </Field>
            <Field label="Min Stock Alert" error={errors.min_stock_alert?.message}>
              <Input type="text" inputMode="numeric" placeholder="5" hasError={!!errors.min_stock_alert} {...register('min_stock_alert', { setValueAs: (v) => v === '' ? 5 : v })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Expiry Date" error={errors.expiry_date?.message}>
              <Input type="date" hasError={!!errors.expiry_date} {...register('expiry_date')} />
            </Field>
            <Field label="Batch Number" error={errors.batch_number?.message}>
              <Input placeholder="e.g. BATCH-2024-01" {...register('batch_number')} />
            </Field>
          </div>
        </div>

        {/* Pack Sizes — edit mode only */}
        {isEdit && product && <PackSizes productId={Number(id)} variants={product.variants || []} />}

        {/* Actions */}
        <div className="flex gap-3 pb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 h-11 rounded-xl border font-display font-500 text-sm transition-all hover:bg-gray-50"
            style={{ borderColor: 'var(--gray-200)', color: 'var(--gray-700)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createProduct.isPending || updateProduct.isPending}
            className="flex-1 h-11 rounded-xl font-display font-600 text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: 'var(--primary-dark)' }}
          >
            {(isSubmitting || createProduct.isPending || updateProduct.isPending) && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </form>
    </div>
  );
}

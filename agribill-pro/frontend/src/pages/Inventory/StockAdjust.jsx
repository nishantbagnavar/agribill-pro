import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { useProduct, useAdjustStock } from '../../hooks/useProducts.js';
import { formatCurrency } from '../../utils/formatCurrency.js';

const schema = z.object({
  transaction_type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  notes: z.string().optional(),
  reference: z.string().optional(),
});

const TYPE_CONFIG = {
  IN:         { label: 'Stock In',    icon: TrendingUp,   color: 'var(--color-success)',  bg: 'var(--color-success-bg)' },
  OUT:        { label: 'Stock Out',   icon: TrendingDown, color: 'var(--color-danger)',   bg: 'var(--color-danger-bg)' },
  ADJUSTMENT: { label: 'Adjustment', icon: RefreshCw,    color: 'var(--color-info)',     bg: 'var(--color-info-bg)' },
};

export default function StockAdjust() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(id);
  const adjustStock = useAdjustStock();

  const { register, watch, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { transaction_type: 'IN', quantity: 1 },
  });

  const type = watch('transaction_type');
  const qty = watch('quantity') || 0;
  const currentStock = product?.current_stock ?? 0;

  const newStock =
    type === 'IN'         ? currentStock + Number(qty)
    : type === 'OUT'      ? Math.max(0, currentStock - Number(qty))
    : Number(qty); // ADJUSTMENT sets directly

  const onSubmit = async (data) => {
    await adjustStock.mutateAsync({ id, data });
    navigate('/inventory');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div className="page-enter max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={16} style={{ color: 'var(--gray-500)' }} />
        </button>
        <div>
          <h1 className="font-display font-700 text-xl" style={{ color: 'var(--gray-900)' }}>Adjust Stock</h1>
          <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>{product?.name}</p>
        </div>
      </div>

      {/* Current stock info */}
      <div
        className="rounded-xl p-5 flex items-center gap-5"
        style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="text-3xl">{product?.category?.icon || '📦'}</div>
        <div className="flex-1">
          <p className="font-display font-600 text-sm" style={{ color: 'var(--gray-900)' }}>{product?.name}</p>
          <p className="font-body text-xs mt-0.5" style={{ color: 'var(--gray-500)' }}>
            {product?.brand} · {product?.unit}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono font-700 text-xl" style={{ color: 'var(--gray-900)' }}>{currentStock}</p>
          <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>current stock</p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-xl p-6 space-y-5"
        style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}
      >
        {/* Transaction type */}
        <div>
          <label className="block font-display font-500 text-xs mb-2" style={{ color: 'var(--gray-700)' }}>
            Transaction Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(TYPE_CONFIG).map(([value, cfg]) => {
              const Icon = cfg.icon;
              return (
                <label
                  key={value}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all"
                  style={{
                    borderColor: type === value ? cfg.color : 'var(--gray-200)',
                    background: type === value ? cfg.bg : 'transparent',
                  }}
                >
                  <input type="radio" value={value} {...register('transaction_type')} className="hidden" />
                  <Icon size={16} style={{ color: cfg.color }} />
                  <span className="font-display font-600 text-xs" style={{ color: type === value ? cfg.color : 'var(--gray-600)' }}>
                    {cfg.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="block font-display font-500 text-xs mb-1.5" style={{ color: 'var(--gray-700)' }}>
            {type === 'ADJUSTMENT' ? 'New Stock Quantity' : 'Quantity'}
          </label>
          <input
            type="number"
            min="1"
            placeholder="0"
            className="w-full h-10 px-3 rounded-lg border text-sm font-mono outline-none transition-all"
            style={{ borderColor: errors.quantity ? 'var(--color-danger)' : 'var(--gray-200)' }}
            {...register('quantity')}
          />
          {errors.quantity && <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{errors.quantity.message}</p>}
        </div>

        {/* Stock preview */}
        <div
          className="flex items-center justify-between p-4 rounded-xl"
          style={{ background: 'var(--gray-50)', border: '1px dashed var(--gray-300)' }}
        >
          <div className="text-center">
            <p className="font-mono font-700 text-lg" style={{ color: 'var(--gray-700)' }}>{currentStock}</p>
            <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>Current</p>
          </div>
          <div style={{ color: 'var(--gray-400)', fontSize: 20 }}>→</div>
          <div className="text-center">
            <p
              className="font-mono font-700 text-lg"
              style={{ color: newStock < (product?.min_stock_alert ?? 0) ? 'var(--color-danger)' : 'var(--color-success)' }}
            >
              {newStock}
            </p>
            <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>New Stock</p>
          </div>
        </div>

        {/* Reference */}
        <div>
          <label className="block font-display font-500 text-xs mb-1.5" style={{ color: 'var(--gray-700)' }}>
            Reference (Invoice / Purchase No.)
          </label>
          <input
            placeholder="e.g. PO-2024-001"
            className="w-full h-10 px-3 rounded-lg border text-sm font-body outline-none"
            style={{ borderColor: 'var(--gray-200)' }}
            {...register('reference')}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block font-display font-500 text-xs mb-1.5" style={{ color: 'var(--gray-700)' }}>Notes</label>
          <textarea
            rows={2}
            placeholder="Optional notes..."
            className="w-full px-3 py-2 rounded-lg border text-sm font-body outline-none resize-none"
            style={{ borderColor: 'var(--gray-200)' }}
            {...register('notes')}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 h-10 rounded-lg border font-display font-500 text-sm transition-all hover:bg-gray-50"
            style={{ borderColor: 'var(--gray-200)', color: 'var(--gray-700)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || adjustStock.isPending}
            className="flex-1 h-10 rounded-lg font-display font-600 text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: 'var(--primary-dark)' }}
          >
            {(isSubmitting || adjustStock.isPending) && <Loader2 size={14} className="animate-spin" />}
            Update Stock
          </button>
        </div>
      </form>
    </div>
  );
}

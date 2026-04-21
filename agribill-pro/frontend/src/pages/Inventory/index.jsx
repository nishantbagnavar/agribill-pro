import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, Plus, LayoutGrid, LayoutList, AlertTriangle,
  Clock, Pencil, TrendingUp, Trash2, Tag, Filter,
} from 'lucide-react';
import { useProducts, useCategories, useDeleteProduct } from '../../hooks/useProducts.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { daysUntil, formatDate } from '../../utils/formatDate.js';

/* ─── Stock bar ─── */
function StockBar({ current, min }) {
  const pct = min > 0 ? Math.min(100, (current / (min * 3)) * 100) : 100;
  const color =
    current < min       ? 'var(--color-danger)'
    : current < min * 2 ? 'var(--color-warning)'
    : 'var(--color-success)';
  return (
    <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--gray-100)' }}>
      <div
        className="h-1.5 rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

/* ─── Expiry badge ─── */
function ExpiryBadge({ expiryDate }) {
  const { t } = useTranslation();
  if (!expiryDate) return null;
  const days = daysUntil(expiryDate);
  if (days === null || days > 60) return null;
  const color = days < 30 ? 'var(--color-danger)' : 'var(--color-warning)';
  const bg    = days < 30 ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)';
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-display font-600"
      style={{ background: bg, color }}
    >
      {days <= 0 ? t('inventory.expired') : t('inventory.daysLeft', { days })}
    </span>
  );
}

/* ─── Product Card (grid view) ─── */
function ProductCard({ product, onDelete }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { current_stock: stock, min_stock_alert: min } = product;
  const stockColor =
    stock < min       ? 'var(--color-danger)'
    : stock < min * 2 ? 'var(--color-warning)'
    : 'var(--color-success)';

  return (
    <div
      className="rounded-xl overflow-hidden group transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: 'white', border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-xs)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--green-300)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--gray-200)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}
    >
      {/* Image placeholder */}
      <div
        className="h-28 flex items-center justify-center text-4xl"
        style={{ background: 'var(--green-50)' }}
      >
        {product.category?.icon || '📦'}
      </div>

      <div className="p-4 space-y-3">
        {/* Category + expiry */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs font-display font-500 px-2 py-0.5 rounded-full truncate"
            style={{ background: 'var(--green-50)', color: 'var(--primary-dark)' }}
          >
            {product.category?.name || '—'}
          </span>
          <div className="flex items-center gap-1">
            <ExpiryBadge expiryDate={product.expiry_date} />
            {product.variant_count > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-600 font-display" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
                {product.variant_count} sizes
              </span>
            )}
          </div>
        </div>

        {/* Name + brand */}
        <div>
          <p className="font-display font-600 text-sm leading-tight truncate" style={{ color: 'var(--gray-900)' }}>
            {product.name}
          </p>
          {product.name_hindi && (
            <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>{product.name_hindi}</p>
          )}
          <p className="font-body text-xs mt-0.5" style={{ color: 'var(--gray-400)' }}>
            {[product.unit, product.brand].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Stock bar */}
        <div>
          <StockBar current={stock} min={min} />
          <p className="font-mono text-xs mt-1" style={{ color: stockColor }}>
            {stock} {product.unit} {t('inventory.available')}
          </p>
        </div>

        {/* Price + GST */}
        <div className="flex items-center justify-between">
          <p className="font-mono font-700 text-sm" style={{ color: 'var(--gray-900)' }}>
            {formatCurrency(product.selling_price, { decimals: 0 })}
            <span className="font-body font-400 text-xs" style={{ color: 'var(--gray-400)' }}>
              {' '}/ {product.unit}
            </span>
          </p>
          {product.gst_rate > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}
            >
              {product.gst_rate}%
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => navigate(`/inventory/product/${product.id}/edit`)}
            className="flex-1 h-8 rounded-lg text-xs font-display font-600 flex items-center justify-center gap-1 transition-all hover:opacity-90"
            style={{ background: 'var(--green-50)', color: 'var(--primary-dark)', border: '1px solid var(--green-200)' }}
          >
            <Pencil size={11} /> {t('inventory.edit')}
          </button>
          <button
            onClick={() => navigate(`/inventory/product/${product.id}/stock`)}
            className="flex-1 h-8 rounded-lg text-xs font-display font-600 flex items-center justify-center gap-1 transition-all hover:opacity-90"
            style={{ background: 'var(--green-50)', color: 'var(--primary-dark)', border: '1px solid var(--green-200)' }}
          >
            <TrendingUp size={11} /> {t('inventory.stock')}
          </button>
          <button
            onClick={() => onDelete(product)}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-all hover:bg-red-50"
            style={{ border: '1px solid var(--gray-200)' }}
          >
            <Trash2 size={12} style={{ color: 'var(--color-danger)' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Product Row (table view) ─── */
function ProductRow({ product, onDelete }) {
  const navigate = useNavigate();
  const { current_stock: stock, min_stock_alert: min } = product;
  const stockColor =
    stock < min       ? 'var(--color-danger)'
    : stock < min * 2 ? 'var(--color-warning)'
    : 'var(--color-success)';

  return (
    <tr
      className="transition-colors"
      style={{ borderBottom: '1px solid var(--gray-100)' }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <td className="py-3 px-4">
        <div>
          <p className="font-display font-600 text-sm" style={{ color: 'var(--gray-900)' }}>{product.name}</p>
          {product.brand && <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>{product.brand}</p>}
        </div>
      </td>
      <td className="py-3 px-4">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-display font-500"
          style={{ background: 'var(--green-50)', color: 'var(--primary-dark)' }}
        >
          {product.category?.name || '—'}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-600" style={{ color: stockColor }}>{stock}</span>
          <span className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>{product.unit}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <p className="font-mono text-sm font-600" style={{ color: 'var(--gray-900)' }}>
          {formatCurrency(product.selling_price, { decimals: 0 })}
        </p>
      </td>
      <td className="py-3 px-4">
        <span className="font-mono text-xs" style={{ color: 'var(--gray-600)' }}>
          {product.gst_rate}%
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1">
          <ExpiryBadge expiryDate={product.expiry_date} />
          {product.variant_count > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-600 font-display" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
              {product.variant_count} sizes
            </span>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(`/inventory/product/${product.id}/edit`)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title="Edit"
          >
            <Pencil size={13} style={{ color: 'var(--gray-500)' }} />
          </button>
          <button
            onClick={() => navigate(`/inventory/product/${product.id}/stock`)}
            className="p-1.5 rounded-lg hover:bg-green-50 transition-colors"
            title="Adjust Stock"
          >
            <TrendingUp size={13} style={{ color: 'var(--primary)' }} />
          </button>
          <button
            onClick={() => onDelete(product)}
            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 size={13} style={{ color: 'var(--color-danger)' }} />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ─── Main Page ─── */
export default function Inventory() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [search, setSearch]         = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [lowStock, setLowStock]     = useState(false);
  const [expiring, setExpiring]     = useState(false);
  const [viewMode, setViewMode]     = useState('grid'); // 'grid' | 'table'

  const params = useMemo(() => ({
    search: search || undefined,
    category_id: categoryId || undefined,
    low_stock: lowStock || undefined,
    expiring_soon: expiring || undefined,
  }), [search, categoryId, lowStock, expiring]);

  const { data: products, isLoading } = useProducts(params);
  const { data: categories }          = useCategories();
  const deleteProduct                  = useDeleteProduct();

  const handleDelete = (product) => {
    if (!window.confirm(t('inventory.deleteConfirm', { name: product.name }))) return;
    deleteProduct.mutate(product.id);
  };

  const toggleChip = (active, setter) => setter(!active);

  return (
    <div className="page-enter space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-700 text-xl" style={{ color: 'var(--gray-900)' }}>{t('inventory.title')}</h1>
          <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>
            {products?.length ?? 0} products
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/inventory/categories"
            className="h-9 px-3 rounded-lg font-display font-500 text-sm flex items-center gap-1.5 transition-all hover:bg-gray-100"
            style={{ color: 'var(--gray-600)', border: '1px solid var(--gray-200)' }}
          >
            <Tag size={14} />
            Categories
          </Link>
          <Link
            to="/inventory/product/new"
            className="h-9 px-4 rounded-lg font-display font-600 text-sm text-white flex items-center gap-1.5 transition-all hover:opacity-90"
            style={{ background: 'var(--primary-dark)' }}
          >
            <Plus size={14} />
            {t('inventory.addProduct')}
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--gray-400)' }} />
          <input
            type="text"
            placeholder={t('inventory.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border text-sm font-body outline-none transition-all"
            style={{ borderColor: 'var(--gray-200)' }}
          />
        </div>

        {/* Category filter */}
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-9 px-3 rounded-lg border text-sm font-body outline-none transition-all"
          style={{ borderColor: 'var(--gray-200)', color: 'var(--gray-700)', minWidth: 140 }}
        >
          <option value="">{t('inventory.allCategories')}</option>
          {(categories || []).map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>

        {/* Toggle chips */}
        {[
          { label: `⚠ ${t('inventory.lowStock')}`, active: lowStock, setter: setLowStock },
          { label: `📅 ${t('inventory.expiringSoon')}`, active: expiring, setter: setExpiring },
        ].map(({ label, active, setter }) => (
          <button
            key={label}
            onClick={() => toggleChip(active, setter)}
            className="h-9 px-3 rounded-lg text-sm font-display font-500 transition-all"
            style={
              active
                ? { background: 'var(--primary-dark)', color: 'white' }
                : { background: 'white', color: 'var(--gray-600)', border: '1px solid var(--gray-200)' }
            }
          >
            {label}
          </button>
        ))}

        {/* View toggle */}
        <div
          className="flex rounded-lg overflow-hidden ml-auto"
          style={{ border: '1px solid var(--gray-200)' }}
        >
          {[
            { mode: 'grid',  Icon: LayoutGrid },
            { mode: 'table', Icon: LayoutList },
          ].map(({ mode, Icon }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="h-9 w-9 flex items-center justify-center transition-all"
              style={{
                background: viewMode === mode ? 'var(--primary-dark)' : 'white',
                color: viewMode === mode ? 'white' : 'var(--gray-500)',
              }}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-72 rounded-xl animate-pulse" style={{ background: 'var(--gray-200)' }} />
          ))}
        </div>
      ) : !products?.length ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="text-5xl">🌱</div>
          <p className="font-display font-600 text-base" style={{ color: 'var(--gray-700)' }}>
            {search || categoryId || lowStock || expiring ? 'No products match your filters' : 'Your shelf is empty'}
          </p>
          <p className="font-body text-sm" style={{ color: 'var(--gray-400)' }}>
            {search || categoryId || lowStock || expiring
              ? 'Try adjusting your filters'
              : 'Add your first product to get started'}
          </p>
          {!search && !categoryId && !lowStock && !expiring && (
            <Link
              to="/inventory/product/new"
              className="mt-2 h-9 px-4 rounded-lg font-display font-600 text-sm text-white"
              style={{ background: 'var(--primary-dark)' }}
            >
              + Add First Product
            </Link>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
                {[t('billing.product'), t('inventory.category'), t('inventory.stock'), t('inventory.price'), 'GST', t('inventory.expiry'), t('inventory.actions')].map((h) => (
                  <th
                    key={h}
                    className="py-2.5 px-4 text-left font-display font-600 text-xs"
                    style={{ color: 'var(--gray-500)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <ProductRow key={p.id} product={p} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow, format, isPast, addDays } from 'date-fns';
import { Store, Plus, RefreshCw, AlertTriangle, TrendingUp, Ban, Clock } from 'lucide-react';
import { useShops, useShopStats, useUpdateShop } from '../hooks/useShops.js';
import StatusBadge from '../components/StatusBadge.jsx';

const FILTERS = ['all', 'active', 'offline', 'suspended', 'trial', 'expired'];

function resolveStatus(shop) {
  if (shop.status === 'suspended') return 'suspended';
  if (shop.status === 'expired') return 'expired';
  if (shop.status === 'trial') return 'trial';
  if (shop.last_seen_at) {
    const diff = Date.now() - new Date(shop.last_seen_at).getTime();
    if (diff > 3 * 86_400_000) return 'offline';
  }
  return shop.status ?? 'offline';
}

export default function ShopsOverview() {
  const [filter, setFilter] = useState('all');
  const { data: shops = [], isLoading, refetch } = useShops(filter);
  const { data: stats } = useShopStats();
  const update = useUpdateShop();

  const quickSuspend = (shop) => update.mutate({ id: shop.id, status: 'suspended' });
  const quickActivate = (shop) => update.mutate({ id: shop.id, status: 'active' });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-700 text-2xl text-gray-900">Shops</h1>
          <p className="text-sm text-gray-500 mt-0.5">All AgriBill Pro installations</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-sm font-display transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <Link
            to="/new-shop"
            className="flex items-center gap-2 px-4 h-9 rounded-lg text-white text-sm font-display font-500 transition-colors"
            style={{ background: '#1F6F5F' }}
          >
            <Plus size={14} />
            New Shop
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Shops', value: stats.total, icon: Store, color: '#1F6F5F', bg: '#edfaf5' },
            { label: 'Active Today', value: stats.active, icon: TrendingUp, color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Expiring Soon', value: stats.expiringThisMonth, icon: Clock, color: '#d97706', bg: '#fffbeb' },
            { label: 'Suspended', value: stats.suspended, icon: Ban, color: '#dc2626', bg: '#fef2f2' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-display font-500 text-gray-500">{label}</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                  <Icon size={14} style={{ color }} />
                </div>
              </div>
              <p className="text-2xl font-display font-700" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 bg-white rounded-xl p-1 border border-gray-100 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 h-8 rounded-lg text-xs font-display font-500 capitalize transition-colors ${
              filter === f
                ? 'text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
            style={filter === f ? { background: '#1F6F5F' } : {}}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : shops.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Store size={32} className="mb-2 opacity-40" />
            <p className="text-sm font-display">No shops found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Shop', 'City', 'Status', 'Plan', 'Last Seen', 'Bills Today', 'Version', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-display font-600 text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shops.map((shop) => {
                const st = resolveStatus(shop);
                const expiringSoon = shop.expires_at && !isPast(new Date(shop.expires_at)) &&
                  new Date(shop.expires_at) <= addDays(new Date(), 30);

                return (
                  <tr key={shop.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/shops/${shop.id}`} className="font-display font-500 text-sm text-gray-900 hover:text-brand-600 transition-colors">
                        {shop.shop_name}
                      </Link>
                      {shop.owner_name && (
                        <p className="text-xs text-gray-400 mt-0.5">{shop.owner_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{shop.city || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={st} />
                      {expiringSoon && (
                        <span className="ml-1 inline-flex items-center gap-1 text-xs text-orange-600">
                          <AlertTriangle size={10} /> expiring
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-display font-500 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">
                        {shop.plan || 'basic'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {shop.last_seen_at
                        ? formatDistanceToNow(new Date(shop.last_seen_at), { addSuffix: true })
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{shop.bills_count ?? 0}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{shop.app_version || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/shops/${shop.id}`}
                          className="text-xs font-display font-500 px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Details
                        </Link>
                        {st === 'active' || st === 'trial' ? (
                          <button
                            onClick={() => quickSuspend(shop)}
                            disabled={update.isPending}
                            className="text-xs font-display font-500 px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Suspend
                          </button>
                        ) : st === 'suspended' || st === 'expired' ? (
                          <button
                            onClick={() => quickActivate(shop)}
                            disabled={update.isPending}
                            className="text-xs font-display font-500 px-2.5 py-1 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
                          >
                            Activate
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

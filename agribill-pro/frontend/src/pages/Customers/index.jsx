import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, MessageCircle, Edit2, Trash2, BookOpen, Users, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useCustomers, useDeleteCustomer } from '../../hooks/useCustomers.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { whatsappApi } from '../../api/whatsapp.api.js';
import toast from 'react-hot-toast';

function Avatar({ name }) {
  const initials = name
    ? name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  const colors = [
    ['#EDF8F2', '#1F6F5F'],
    ['#FFF8E6', '#D97706'],
    ['#EFF6FF', '#2563EB'],
    ['#FDF2F8', '#9333EA'],
    ['#FFF1F2', '#E11D48'],
  ];
  const idx = (name?.charCodeAt(0) || 0) % colors.length;
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-display font-700 text-sm"
      style={{ background: colors[idx][0], color: colors[idx][1] }}
    >
      {initials}
    </div>
  );
}

function DeleteModal({ customer, onConfirm, onClose, isPending }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'white', boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-danger-bg)' }}>
            <AlertCircle size={20} style={{ color: 'var(--color-danger)' }} />
          </div>
          <div>
            <h3 className="font-display font-700 text-base" style={{ color: 'var(--gray-900)' }}>Remove Customer?</h3>
            <p className="font-body text-xs" style={{ color: 'var(--gray-500)' }}>{customer.name} · {customer.phone}</p>
          </div>
        </div>
        <p className="font-body text-sm mb-5" style={{ color: 'var(--gray-600)' }}>
          This customer will be marked inactive. Their bill history will be preserved.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-lg border font-display font-500 text-sm"
            style={{ borderColor: 'var(--gray-200)', color: 'var(--gray-700)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 h-10 rounded-lg font-display font-600 text-sm text-white disabled:opacity-60"
            style={{ background: 'var(--color-danger)' }}
          >
            {isPending ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Customers() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [hasDue, setHasDue] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [sendingId, setSendingId] = useState(null);

  const params = useMemo(() => ({
    search: search || undefined,
    has_due: hasDue ? 'true' : undefined,
    limit: 100,
  }), [search, hasDue]);

  const { data, isLoading } = useCustomers(params);
  const deleteCustomer = useDeleteCustomer();
  const { data: waStatus } = useQuery({
    queryKey: ['wa-status'],
    queryFn: () => whatsappApi.getStatus().then(r => r.data?.data),
    staleTime: 30000,
  });
  const waConnected = waStatus?.status === 'CONNECTED';

  const customers = data?.rows || [];
  const total = data?.total ?? customers.length;

  const sendWhatsApp = async (customer) => {
    if (sendingId) return;
    if (!customer.total_due || customer.total_due <= 0) {
      toast('No pending due for ' + customer.name, { icon: 'ℹ️' });
      return;
    }
    if (!waConnected) {
      toast.error('WhatsApp not connected. Go to WhatsApp settings to connect.');
      return;
    }
    setSendingId(customer.id);
    try {
      await whatsappApi.sendReminder({
        phone: customer.whatsapp_number || customer.phone,
        name: customer.name,
        amount: customer.total_due,
      });
      toast.success(`Reminder sent to ${customer.name}`);
    } catch {
      toast.error('Failed to send. Please try again.');
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteCustomer.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="page-enter space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-700 text-xl" style={{ color: 'var(--gray-900)' }}>{t('customers.title')}</h1>
          <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>{total} registered customers</p>
        </div>
        <Link
          to="/customers/new"
          className="h-9 px-4 rounded-lg font-display font-600 text-sm text-white flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          style={{ background: 'var(--primary-dark)' }}
        >
          <Plus size={14} /> {t('customers.addCustomer')}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--gray-400)' }} />
          <input
            type="text"
            placeholder={t('customers.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border text-sm font-body outline-none"
            style={{ borderColor: 'var(--gray-200)' }}
          />
        </div>
        <button
          onClick={() => setHasDue((v) => !v)}
          className="h-9 px-3 rounded-lg border text-sm font-display font-500 flex items-center gap-1.5 transition-all"
          style={hasDue
            ? { background: 'var(--color-danger-bg)', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }
            : { borderColor: 'var(--gray-200)', color: 'var(--gray-600)' }
          }
        >
          <AlertCircle size={13} /> Has Due
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--gray-200)' }} />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Users size={48} style={{ color: 'var(--gray-300)' }} />
          <p className="font-display font-600 text-base" style={{ color: 'var(--gray-700)' }}>
            {search || hasDue ? 'No customers match your filters' : 'No customers yet'}
          </p>
          {!search && !hasDue && (
            <Link
              to="/customers/new"
              className="mt-2 h-9 px-4 rounded-lg font-display font-600 text-sm text-white"
              style={{ background: 'var(--primary-dark)' }}
            >
              Add First Customer
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
                {['Customer', 'Phone', 'Location', 'Total Billed', 'Due Amount', 'Actions'].map((h) => (
                  <th key={h} className="py-2.5 px-4 text-left font-display font-600 text-xs" style={{ color: 'var(--gray-500)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="transition-colors cursor-pointer"
                  style={{ borderBottom: '1px solid var(--gray-100)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  onClick={() => navigate(`/customers/${c.id}/ledger`)}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} />
                      <div>
                        <p className="font-display font-600 text-sm" style={{ color: 'var(--gray-900)' }}>{c.name}</p>
                        {c.gstin && (
                          <p className="font-mono text-xs" style={{ color: 'var(--gray-400)' }}>GST: {c.gstin}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-mono text-sm" style={{ color: 'var(--gray-700)' }}>{c.phone}</p>
                    {c.whatsapp_number && c.whatsapp_number !== c.phone && (
                      <p className="font-mono text-xs" style={{ color: 'var(--gray-400)' }}>WA: {c.whatsapp_number}</p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-body text-sm" style={{ color: 'var(--gray-600)' }}>
                      {[c.village, c.taluka, c.district].filter(Boolean).join(', ') || '—'}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-mono font-600 text-sm" style={{ color: 'var(--gray-900)' }}>
                      {formatCurrency(c.total_purchases, { decimals: 0 })}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <p
                      className="font-mono font-700 text-sm"
                      style={{ color: c.total_due > 0 ? 'var(--color-danger)' : 'var(--gray-400)' }}
                    >
                      {c.total_due > 0 ? formatCurrency(c.total_due, { decimals: 0 }) : '—'}
                    </p>
                  </td>
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/customers/${c.id}/ledger`)}
                        title="View Ledger"
                        className="p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                      >
                        <BookOpen size={13} style={{ color: 'var(--primary)' }} />
                      </button>
                      <button
                        onClick={() => sendWhatsApp(c)}
                        title={!waConnected ? 'WhatsApp not connected' : c.total_due > 0 ? 'Send due reminder' : 'No pending due'}
                        disabled={sendingId === c.id}
                        className="p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ color: !waConnected || !c.total_due ? 'var(--gray-400)' : '#25D366' }}
                        onMouseEnter={(e) => { if (waConnected && c.total_due > 0) e.currentTarget.style.background = '#f0fdf4'; }}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <MessageCircle size={13} />
                      </button>
                      <button
                        onClick={() => navigate(`/customers/${c.id}/edit`)}
                        title="Edit"
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Edit2 size={13} style={{ color: 'var(--gray-500)' }} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        title="Remove"
                        className="p-1.5 rounded-lg transition-colors"
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-danger-bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <Trash2 size={13} style={{ color: 'var(--color-danger)' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <DeleteModal
          customer={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          isPending={deleteCustomer.isPending}
        />
      )}
    </div>
  );
}

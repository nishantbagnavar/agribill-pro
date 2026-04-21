import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, MessageCircle, Plus, Loader2, Receipt, CreditCard } from 'lucide-react';
import { useCustomer, useCustomerLedger } from '../../hooks/useCustomers.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { formatDate, timeAgo } from '../../utils/formatDate.js';
import { whatsappApi } from '../../api/whatsapp.api.js';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  PAID:    { bg: 'var(--color-success-bg)',  color: 'var(--color-success)',  label: 'Paid'    },
  PARTIAL: { bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)',  label: 'Partial' },
  UNPAID:  { bg: 'var(--color-danger-bg)',   color: 'var(--color-danger)',   label: 'Unpaid'  },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.UNPAID;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-display font-600"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function StatCard({ label, value, valueColor, sub }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
      <p className="font-body text-xs mb-1" style={{ color: 'var(--gray-500)' }}>{label}</p>
      <p className="font-mono font-700 text-lg" style={{ color: valueColor || 'var(--gray-900)' }}>{value}</p>
      {sub && <p className="font-body text-xs mt-0.5" style={{ color: 'var(--gray-400)' }}>{sub}</p>}
    </div>
  );
}

function Avatar({ name }) {
  const initials = name
    ? name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  return (
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center font-display font-700 text-xl flex-shrink-0"
      style={{ background: 'var(--green-100)', color: 'var(--primary-dark)' }}
    >
      {initials}
    </div>
  );
}

export default function CustomerLedger() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: customer, isLoading: loadingCustomer } = useCustomer(id);
  const { data: ledger, isLoading: loadingLedger } = useCustomerLedger(id);

  const isLoading = loadingCustomer || loadingLedger;

  const sendDueReminder = async () => {
    if (!customer) return;
    try {
      const amount = formatCurrency(customer.total_due, { decimals: 0 });
      const msg = `Dear ${customer.name}, you have a pending due of ${amount} at our agri shop. Please settle at your earliest convenience. Thank you!`;
      await whatsappApi.sendReminder({
        customer_id: customer.id,
        phone: customer.whatsapp_number || customer.phone,
        message: msg,
      });
      toast.success('Due reminder sent via WhatsApp');
    } catch {
      toast.error('WhatsApp not connected or failed to send');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="font-display font-600 text-base" style={{ color: 'var(--gray-700)' }}>Customer not found</p>
        <Link to="/customers" className="font-600 text-sm" style={{ color: 'var(--primary)' }}>Back to Customers</Link>
      </div>
    );
  }

  const stats = ledger?.stats;
  const bills = ledger?.bills || [];
  const payments = ledger?.payments || [];

  return (
    <div className="page-enter space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <button
          onClick={() => navigate('/customers')}
          className="w-9 h-9 rounded-lg border flex items-center justify-center hover:bg-gray-50 transition-colors mt-1 flex-shrink-0"
          style={{ borderColor: 'var(--gray-200)' }}
        >
          <ArrowLeft size={16} style={{ color: 'var(--gray-600)' }} />
        </button>

        <div className="flex-1 min-w-0">
          {/* Customer card */}
          <div className="rounded-2xl p-5 flex items-center gap-4 flex-wrap" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
            <Avatar name={customer.name} />
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-700 text-xl" style={{ color: 'var(--gray-900)' }}>{customer.name}</h1>
              <p className="font-mono text-sm" style={{ color: 'var(--gray-500)' }}>{customer.phone}</p>
              {[customer.village, customer.taluka, customer.district].filter(Boolean).length > 0 && (
                <p className="font-body text-xs mt-0.5" style={{ color: 'var(--gray-400)' }}>
                  {[customer.village, customer.taluka, customer.district].filter(Boolean).join(', ')}
                </p>
              )}
              {customer.gstin && (
                <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--gray-400)' }}>GSTIN: {customer.gstin}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {customer.total_due > 0 && (
                <button
                  onClick={sendDueReminder}
                  className="h-8 px-3 rounded-lg text-xs font-display font-600 flex items-center gap-1.5 transition-all"
                  style={{ background: '#f0fdf4', color: '#25D366', border: '1px solid #bbf7d0' }}
                >
                  <MessageCircle size={12} /> Send Reminder
                </button>
              )}
              <Link
                to={`/customers/${id}/edit`}
                className="h-8 px-3 rounded-lg border text-xs font-display font-500 flex items-center gap-1.5 hover:bg-gray-50 transition-colors"
                style={{ borderColor: 'var(--gray-200)', color: 'var(--gray-600)' }}
              >
                <Edit2 size={12} /> Edit
              </Link>
              <Link
                to="/billing"
                className="h-8 px-3 rounded-lg text-xs font-display font-600 text-white flex items-center gap-1.5 hover:opacity-90"
                style={{ background: 'var(--primary-dark)' }}
              >
                <Plus size={12} /> New Bill
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Total Bills"
            value={stats.bill_count}
            sub={`${bills.length} transactions`}
          />
          <StatCard
            label="Total Billed"
            value={formatCurrency(stats.total_billed, { decimals: 0 })}
            valueColor="var(--primary)"
          />
          <StatCard
            label="Total Paid"
            value={formatCurrency(stats.total_paid, { decimals: 0 })}
            valueColor="var(--color-success)"
          />
          <StatCard
            label="Outstanding Due"
            value={formatCurrency(stats.total_due, { decimals: 0 })}
            valueColor={stats.total_due > 0 ? 'var(--color-danger)' : 'var(--gray-400)'}
            sub={stats.total_due > 0 ? 'Pending payment' : 'All clear'}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bills table */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <Receipt size={15} style={{ color: 'var(--primary)' }} />
            <h2 className="font-display font-600 text-sm" style={{ color: 'var(--gray-800)' }}>Bill History</h2>
            <span
              className="ml-auto px-2 py-0.5 rounded-full text-xs font-mono font-600"
              style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}
            >
              {bills.length}
            </span>
          </div>

          {bills.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <p className="font-body text-sm" style={{ color: 'var(--gray-400)' }}>No bills for this customer yet</p>
              <Link to="/billing" className="text-xs font-600" style={{ color: 'var(--primary)' }}>Create a bill</Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)' }}>
                  {['Bill No.', 'Date', 'Total', 'Paid', 'Due', 'Status'].map((h) => (
                    <th key={h} className="py-2 px-4 text-left font-display font-600 text-xs" style={{ color: 'var(--gray-500)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr
                    key={bill.id}
                    className="transition-colors cursor-pointer"
                    style={{ borderBottom: '1px solid var(--gray-100)' }}
                    onClick={() => navigate(`/billing/${bill.id}/preview`)}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="py-3 px-4">
                      <p className="font-mono font-600 text-xs" style={{ color: 'var(--primary-dark)' }}>{bill.bill_number}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-body text-xs" style={{ color: 'var(--gray-600)' }}>{formatDate(bill.bill_date)}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-mono font-700 text-xs" style={{ color: 'var(--gray-900)' }}>
                        {formatCurrency(bill.total_amount, { decimals: 0 })}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-mono text-xs" style={{ color: 'var(--color-success)' }}>
                        {formatCurrency(bill.paid_amount, { decimals: 0 })}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p
                        className="font-mono font-700 text-xs"
                        style={{ color: bill.due_amount > 0 ? 'var(--color-danger)' : 'var(--gray-300)' }}
                      >
                        {bill.due_amount > 0 ? formatCurrency(bill.due_amount, { decimals: 0 }) : '—'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={bill.payment_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Payments log */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <CreditCard size={15} style={{ color: 'var(--color-success)' }} />
            <h2 className="font-display font-600 text-sm" style={{ color: 'var(--gray-800)' }}>Payments Received</h2>
          </div>

          {payments.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="font-body text-sm" style={{ color: 'var(--gray-400)' }}>No payments recorded</p>
            </div>
          ) : (
            <div className="divide-y" style={{ '--tw-divide-opacity': 1 }}>
              {payments.map((p) => (
                <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono font-600 text-sm" style={{ color: 'var(--color-success)' }}>
                      {formatCurrency(p.amount, { decimals: 0 })}
                    </p>
                    <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>
                      {p.payment_method} · {timeAgo(p.created_at)}
                    </p>
                    {p.reference_number && (
                      <p className="font-mono text-xs" style={{ color: 'var(--gray-400)' }}>Ref: {p.reference_number}</p>
                    )}
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-display font-500 flex-shrink-0"
                    style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}
                  >
                    {p.payment_method}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {customer.notes && (
        <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
          <h2 className="font-display font-600 text-sm mb-2" style={{ color: 'var(--gray-700)' }}>Notes</h2>
          <p className="font-body text-sm" style={{ color: 'var(--gray-600)' }}>{customer.notes}</p>
        </div>
      )}
    </div>
  );
}

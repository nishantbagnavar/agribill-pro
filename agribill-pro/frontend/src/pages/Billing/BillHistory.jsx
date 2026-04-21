import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Download, Eye, Plus, CreditCard, Filter, Printer, MessageCircle } from 'lucide-react';
import { billingApi } from '../../api/billing.api.js';
import { useBills, useRecordPayment } from '../../hooks/useBilling.js';
import { usePrintBill } from '../../hooks/usePrinter.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { formatDate } from '../../utils/formatDate.js';

const STATUS_MAP = {
  PAID:    { bg: 'var(--color-success-bg)',  color: 'var(--color-success)',  label: 'Paid'    },
  PARTIAL: { bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)',  label: 'Partial' },
  UNPAID:  { bg: 'var(--color-danger-bg)',   color: 'var(--color-danger)',   label: 'Unpaid'  },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.UNPAID;
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-display font-600" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function PaymentModal({ bill, onClose }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const recordPayment = useRecordPayment();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await recordPayment.mutateAsync({ id: bill.id, data: { amount: Math.round(Number(amount) * 100), payment_method: method } });
    onClose();
  };

  const due = (bill.due_amount || 0) / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'white', boxShadow: 'var(--shadow-lg)' }}>
        <h3 className="font-display font-700 text-base mb-1" style={{ color: 'var(--gray-900)' }}>Record Payment</h3>
        <p className="font-body text-xs mb-5" style={{ color: 'var(--gray-500)' }}>
          Bill {bill.bill_number} · Due: {formatCurrency(bill.due_amount, { decimals: 0 })}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-display font-500 text-xs mb-1.5" style={{ color: 'var(--gray-700)' }}>Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm" style={{ color: 'var(--gray-400)' }}>₹</span>
              <input
                type="number"
                min="1"
                max={due}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={due.toString()}
                className="w-full h-10 pl-7 pr-3 rounded-lg border font-mono text-sm outline-none"
                style={{ borderColor: 'var(--gray-200)' }}
                required
              />
            </div>
            <button
              type="button"
              onClick={() => setAmount(due.toString())}
              className="mt-1 text-xs font-600"
              style={{ color: 'var(--primary)' }}
            >
              Pay full due ({formatCurrency(bill.due_amount, { decimals: 0 })})
            </button>
          </div>
          <div>
            <label className="block font-display font-500 text-xs mb-2" style={{ color: 'var(--gray-700)' }}>Method</label>
            <div className="flex flex-wrap gap-1.5">
              {['CASH','UPI','CARD','CHEQUE'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className="h-8 px-3 rounded-lg text-xs font-display font-600 transition-all"
                  style={method === m
                    ? { background: 'var(--primary-dark)', color: 'white' }
                    : { background: 'var(--gray-100)', color: 'var(--gray-600)' }
                  }
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-lg border font-display font-500 text-sm"
              style={{ borderColor: 'var(--gray-200)', color: 'var(--gray-700)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={recordPayment.isPending}
              className="flex-1 h-10 rounded-lg font-display font-600 text-sm text-white disabled:opacity-60"
              style={{ background: 'var(--primary-dark)' }}
            >
              {recordPayment.isPending ? 'Saving...' : 'Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BillHistory() {
  const navigate = useNavigate();
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [dateFrom, setFrom]   = useState('');
  const [dateTo, setTo]       = useState('');
  const [payModal, setPayModal] = useState(null);

  const params = useMemo(() => ({
    search: search || undefined,
    status: status || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }), [search, status, dateFrom, dateTo]);

  const { data, isLoading } = useBills(params);
  const bills = data?.data || [];
  const summary = data?.stats;
  const printBill = usePrintBill();

  const downloadPdf = (bill) => {
    window.open(`/api/billing/bills/${bill.id}/pdf`, '_blank');
  };

  const sendWhatsApp = async (bill) => {
    try {
      const { data: res } = await billingApi.getWhatsAppLink(bill.id);
      window.open(res.data.url, '_blank');
    } catch {
      // no phone on bill — button is hidden anyway
    }
  };

  return (
    <div className="page-enter space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-700 text-xl" style={{ color: 'var(--gray-900)' }}>Bill History</h1>
          <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>{bills.length} bills</p>
        </div>
        <Link
          to="/billing"
          className="h-9 px-4 rounded-lg font-display font-600 text-sm text-white flex items-center gap-1.5 hover:opacity-90"
          style={{ background: 'var(--primary-dark)' }}
        >
          <Plus size={14} /> New Bill
        </Link>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Sales',     value: summary.total_sales,     color: 'var(--primary)' },
            { label: 'Total Collected', value: summary.total_collected,  color: 'var(--color-success)' },
            { label: 'Total Due',       value: summary.total_due,        color: 'var(--color-warning)' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-xl p-4"
              style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}
            >
              <p className="font-body text-xs mb-1" style={{ color: 'var(--gray-500)' }}>{label}</p>
              <p className="font-mono font-700 text-lg" style={{ color }}>{formatCurrency(value, { decimals: 0 })}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-44">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--gray-400)' }} />
          <input
            type="text"
            placeholder="Bill no. or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border text-sm font-body outline-none"
            style={{ borderColor: 'var(--gray-200)' }}
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 px-3 rounded-lg border text-sm font-body outline-none"
          style={{ borderColor: 'var(--gray-200)', color: 'var(--gray-700)' }}
        >
          <option value="">All Status</option>
          <option value="PAID">Paid</option>
          <option value="PARTIAL">Partial</option>
          <option value="UNPAID">Unpaid</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setFrom(e.target.value)}
          className="h-9 px-3 rounded-lg border text-sm font-body outline-none"
          style={{ borderColor: 'var(--gray-200)', color: 'var(--gray-700)' }}
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setTo(e.target.value)}
          className="h-9 px-3 rounded-lg border text-sm font-body outline-none"
          style={{ borderColor: 'var(--gray-200)', color: 'var(--gray-700)' }}
          placeholder="To"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--gray-200)' }} />
          ))}
        </div>
      ) : bills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="text-5xl">🧾</div>
          <p className="font-display font-600 text-base" style={{ color: 'var(--gray-700)' }}>No bills yet today</p>
          <Link to="/billing" className="mt-2 h-9 px-4 rounded-lg font-display font-600 text-sm text-white" style={{ background: 'var(--primary-dark)' }}>
            Create First Bill
          </Link>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
                {['Bill No.', 'Date', 'Customer', 'Items', 'Total', 'Paid', 'Due', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="py-2.5 px-4 text-left font-display font-600 text-xs" style={{ color: 'var(--gray-500)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr
                  key={bill.id}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid var(--gray-100)' }}
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
                    <p className="font-display font-600 text-xs" style={{ color: 'var(--gray-800)' }}>
                      {bill.customer_name || 'Walk-in'}
                    </p>
                    {bill.customer_phone && (
                      <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>{bill.customer_phone}</p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs" style={{ color: 'var(--gray-600)' }}>{bill.item_count ?? '—'}</span>
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
                      style={{ color: bill.due_amount > 0 ? 'var(--color-danger)' : 'var(--gray-400)' }}
                    >
                      {bill.due_amount > 0 ? formatCurrency(bill.due_amount, { decimals: 0 }) : '—'}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={bill.payment_status} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/billing/${bill.id}/preview`)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="View"
                      >
                        <Eye size={13} style={{ color: 'var(--gray-500)' }} />
                      </button>
                      <button
                        onClick={() => downloadPdf(bill)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Download PDF"
                      >
                        <Download size={13} style={{ color: 'var(--gray-500)' }} />
                      </button>
                      <button
                        onClick={() => printBill.mutate(bill.id)}
                        disabled={printBill.isPending}
                        className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                        title="Print Receipt"
                      >
                        <Printer size={13} style={{ color: '#3b82f6' }} />
                      </button>
                      {bill.customer_phone && (
                        <button
                          onClick={() => sendWhatsApp(bill)}
                          className="p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                          title="Send via WhatsApp"
                        >
                          <MessageCircle size={13} style={{ color: '#25D366' }} />
                        </button>
                      )}
                      {bill.due_amount > 0 && (
                        <button
                          onClick={() => setPayModal(bill)}
                          className="p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                          title="Record Payment"
                        >
                          <CreditCard size={13} style={{ color: 'var(--primary)' }} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {payModal && <PaymentModal bill={payModal} onClose={() => setPayModal(null)} />}
    </div>
  );
}

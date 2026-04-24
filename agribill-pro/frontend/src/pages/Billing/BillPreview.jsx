import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, Download, CheckCircle, Clock, AlertCircle, Thermometer } from 'lucide-react';
import { useBill } from '../../hooks/useBilling.js';
import { shopApi } from '../../api/shop.api.js';
import { billingApi } from '../../api/billing.api.js';
import { formatCurrency, amountInWords } from '../../utils/formatCurrency.js';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  PAID:    { icon: CheckCircle, color: 'var(--color-success)',  bg: '#f0fdf4', label: 'Paid' },
  PARTIAL: { icon: Clock,       color: 'var(--color-warning)',  bg: '#fffbeb', label: 'Partial' },
  UNPAID:  { icon: AlertCircle, color: 'var(--color-danger)',   bg: '#fef2f2', label: 'Unpaid' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.UNPAID;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-600"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <Icon size={13} />
      {cfg.label}
    </span>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="font-body text-xs w-28 flex-shrink-0" style={{ color: 'var(--gray-400)' }}>{label}</span>
      <span className="font-body text-xs" style={{ color: 'var(--gray-700)' }}>{value}</span>
    </div>
  );
}

export default function BillPreview() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { data: bill, isLoading, isError } = useBill(id);
  const { data: shopRes } = useQuery({
    queryKey: ['shop-profile'],
    queryFn: () => shopApi.getProfile().then((r) => r.data.data),
    staleTime: 60_000,
  });
  const shop = shopRes || {};

  const handleDownloadPdf = async () => {
    try {
      const res = await billingApi.downloadPdf(id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `${bill?.bill_number || 'bill'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  const handleDownloadThermal = async () => {
    try {
      toast.loading('Generating 58mm receipt...', { id: 'thermal' });
      const res = await billingApi.downloadThermalPdf(id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `${bill?.bill_number || 'bill'}-58mm.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('58mm receipt downloaded!', { id: 'thermal' });
    } catch {
      toast.error('Failed to generate 58mm receipt', { id: 'thermal' });
    }
  };

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)' }} />
      </div>
    );
  }

  if (isError || !bill) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle size={40} style={{ color: 'var(--color-danger)' }} />
        <p className="font-display font-600" style={{ color: 'var(--gray-700)' }}>Bill not found</p>
        <button onClick={() => navigate('/billing')} className="text-sm font-display font-600" style={{ color: 'var(--primary)' }}>
          Back to Billing
        </button>
      </div>
    );
  }

  const items = bill.items || [];

  return (
    <div className="page-enter max-w-4xl mx-auto space-y-4">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between print:hidden flex-wrap gap-2">
        <button
          onClick={() => navigate('/billing')}
          className="flex items-center gap-2 h-9 px-3 rounded-xl text-sm font-display font-600 transition-colors hover:bg-gray-100"
          style={{ color: 'var(--gray-600)' }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-display font-600 transition-all hover:opacity-90"
            style={{ background: 'var(--gray-100)', color: 'var(--gray-700)' }}
          >
            <Printer size={15} /> Print A4
          </button>
          <button
            onClick={handleDownloadThermal}
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-display font-600 transition-all hover:opacity-90"
            style={{ background: '#065f46', color: 'white' }}
            title="Download optimised 58mm thermal receipt PDF"
          >
            <Thermometer size={15} /> 58mm Receipt
          </button>
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-display font-600 text-white transition-all hover:opacity-90"
            style={{ background: 'var(--primary-dark)' }}
          >
            <Download size={15} /> Download PDF
          </button>
        </div>
      </div>

      {/* ── Invoice Card ── */}
      <div
        id="bill-print-area"
        className="rounded-2xl overflow-hidden"
        style={{ background: 'white', boxShadow: 'var(--shadow-card)', border: '1px solid var(--gray-100)' }}
      >

        {/* Header */}
        <div className="px-8 py-6" style={{ background: 'var(--primary-dark)' }}>
          <div className="flex items-start justify-between">
            <div>
              {shop.logo_url && (
                <img src={shop.logo_url} alt="logo" className="h-10 mb-2 object-contain" />
              )}
              <h1 className="font-display font-800 text-xl text-white">{shop.shop_name || 'AgriBill Pro'}</h1>
              {shop.tagline && <p className="font-body text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{shop.tagline}</p>}
              <div className="mt-2 space-y-0.5">
                {shop.address && <p className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>{shop.address}</p>}
                {shop.city && <p className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>{[shop.city, shop.state, shop.pincode].filter(Boolean).join(', ')}</p>}
                {shop.phone && <p className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>Ph: {shop.phone}</p>}
                {shop.gstin && <p className="font-body text-xs font-mono" style={{ color: 'rgba(255,255,255,0.8)' }}>GSTIN: {shop.gstin}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="font-body text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Tax Invoice</p>
              <p className="font-mono font-700 text-lg text-white">{bill.bill_number}</p>
              <p className="font-body text-xs mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {new Date(bill.bill_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <div className="mt-2">
                <StatusBadge status={bill.payment_status} />
              </div>
            </div>
          </div>
        </div>

        {/* Bill To + Bill Details */}
        <div className="grid grid-cols-2 gap-6 px-8 py-5" style={{ borderBottom: '1px solid var(--gray-100)' }}>
          <div>
            <p className="font-display font-700 text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--gray-400)' }}>Bill To</p>
            <p className="font-display font-700 text-base" style={{ color: 'var(--gray-900)' }}>{bill.customer_name}</p>
            {bill.customer_phone && <p className="font-body text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>{bill.customer_phone}</p>}
            {bill.customer_address && <p className="font-body text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>{bill.customer_address}</p>}
            {bill.customer_gstin && (
              <p className="font-mono text-xs mt-1" style={{ color: 'var(--gray-500)' }}>GSTIN: {bill.customer_gstin}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <p className="font-display font-700 text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--gray-400)' }}>Details</p>
            <InfoRow label="Bill Number"   value={bill.bill_number} />
            <InfoRow label="Bill Date"     value={new Date(bill.bill_date).toLocaleDateString('en-IN')} />
            {bill.due_date && (
              <InfoRow label="Due Date" value={new Date(bill.due_date).toLocaleDateString('en-IN')} />
            )}
            <InfoRow label="Payment Mode"  value={bill.payment_method} />
            {bill.created_by_name && <InfoRow label="Billed By" value={bill.created_by_name} />}
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 640 }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                {['#', 'Product', 'HSN', 'Qty', 'Rate', 'Disc%', 'Taxable', 'GST%', 'CGST', 'SGST', 'Amount'].map((h) => (
                  <th
                    key={h}
                    className="py-3 px-3 text-left font-display font-600 text-xs first:pl-8 last:pr-8"
                    style={{ color: 'var(--gray-500)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <td className="py-3 pl-8 pr-3 font-mono text-xs" style={{ color: 'var(--gray-400)' }}>{idx + 1}</td>
                  <td className="py-3 px-3">
                    <p className="font-display font-600 text-xs" style={{ color: 'var(--gray-900)' }}>{item.product_name}</p>
                    <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>{item.unit}</p>
                  </td>
                  <td className="py-3 px-3 font-mono text-xs" style={{ color: 'var(--gray-500)' }}>{item.hsn_code || '—'}</td>
                  <td className="py-3 px-3 font-mono text-xs font-600" style={{ color: 'var(--gray-700)' }}>{item.quantity}</td>
                  <td className="py-3 px-3 font-mono text-xs" style={{ color: 'var(--gray-700)' }}>{formatCurrency(item.rate, { decimals: 0 })}</td>
                  <td className="py-3 px-3 font-mono text-xs" style={{ color: 'var(--gray-600)' }}>{item.discount_percent || 0}%</td>
                  <td className="py-3 px-3 font-mono text-xs" style={{ color: 'var(--gray-700)' }}>{formatCurrency(item.taxable_amount, { decimals: 0 })}</td>
                  <td className="py-3 px-3 font-mono text-xs" style={{ color: 'var(--gray-600)' }}>{item.gst_rate}%</td>
                  <td className="py-3 px-3 font-mono text-xs" style={{ color: 'var(--gray-600)' }}>{formatCurrency(item.cgst, { decimals: 0 })}</td>
                  <td className="py-3 px-3 font-mono text-xs" style={{ color: 'var(--gray-600)' }}>{formatCurrency(item.sgst, { decimals: 0 })}</td>
                  <td className="py-3 px-3 pr-8 font-mono font-700 text-sm" style={{ color: 'var(--gray-900)' }}>
                    {formatCurrency(item.total_amount, { decimals: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals + Amount in Words */}
        <div className="grid grid-cols-2 gap-6 px-8 py-6" style={{ borderTop: '1px solid var(--gray-100)' }}>
          {/* Amount in words + Notes */}
          <div className="space-y-3">
            <div className="rounded-xl p-3" style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
              <p className="font-body text-xs mb-1" style={{ color: 'var(--gray-400)' }}>Amount in Words</p>
              <p className="font-display font-600 text-xs leading-relaxed" style={{ color: 'var(--gray-700)' }}>
                {amountInWords(bill.total_amount)}
              </p>
            </div>
            {bill.notes && (
              <div className="rounded-xl p-3" style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
                <p className="font-body text-xs mb-1" style={{ color: 'var(--gray-400)' }}>Notes</p>
                <p className="font-body text-xs" style={{ color: 'var(--gray-600)' }}>{bill.notes}</p>
              </div>
            )}
          </div>

          {/* Totals */}
          <div>
            <div className="space-y-2">
              {[
                { label: 'Subtotal',       value: bill.subtotal },
                bill.discount_amount > 0 && { label: `Discount (${bill.discount_percent || 0}%)`, value: -bill.discount_amount, color: 'var(--color-danger)' },
                { label: 'Taxable Amount', value: bill.taxable_amount },
                { label: 'CGST',           value: bill.cgst_amount },
                { label: 'SGST',           value: bill.sgst_amount },
              ].filter(Boolean).map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="font-body text-xs" style={{ color: 'var(--gray-500)' }}>{label}</span>
                  <span className="font-mono text-xs font-600" style={{ color: color || 'var(--gray-700)' }}>
                    {value < 0 ? '-' : ''}{formatCurrency(Math.abs(value), { decimals: 0 })}
                  </span>
                </div>
              ))}
            </div>

            <div
              className="flex justify-between items-center mt-3 pt-3"
              style={{ borderTop: '2px solid var(--gray-200)' }}
            >
              <span className="font-display font-700 text-sm" style={{ color: 'var(--gray-900)' }}>Total</span>
              <span className="font-mono font-800 text-2xl" style={{ color: 'var(--primary-dark)' }}>
                {formatCurrency(bill.total_amount, { decimals: 0 })}
              </span>
            </div>

            {bill.paid_amount > 0 && (
              <div className="mt-2 space-y-1.5 pt-3" style={{ borderTop: '1px dashed var(--gray-200)' }}>
                <div className="flex justify-between">
                  <span className="font-body text-xs" style={{ color: 'var(--gray-500)' }}>Paid</span>
                  <span className="font-mono text-xs font-600" style={{ color: 'var(--color-success)' }}>
                    {formatCurrency(bill.paid_amount, { decimals: 0 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body text-xs" style={{ color: 'var(--gray-500)' }}>Balance Due</span>
                  <span
                    className="font-mono text-sm font-700"
                    style={{ color: bill.due_amount > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}
                  >
                    {formatCurrency(bill.due_amount, { decimals: 0 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-8 py-4 text-center"
          style={{ background: 'var(--gray-50)', borderTop: '1px solid var(--gray-100)' }}
        >
          <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>
            Thank you for your business! · {shop.shop_name || 'AgriBill Pro'}
            {shop.email ? ` · ${shop.email}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

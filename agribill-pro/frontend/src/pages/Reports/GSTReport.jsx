import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useGSTSummary } from '../../hooks/useReports.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import api from '../../api/axios.js';
import toast from 'react-hot-toast';

const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_NAMES_MR = ['जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून',
  'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'];

const getMonthLabel = (month, lang) => {
  const [year, m] = month.split('-');
  const names = lang === 'mr' ? MONTH_NAMES_MR : MONTH_NAMES_EN;
  return `${names[parseInt(m, 10) - 1]} ${year}`;
};

const addMonths = (month, delta) => {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(year, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

function KpiCard({ label, value, accent }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--gray-200)' }}>
      <p className="text-xs font-body mb-1" style={{ color: 'var(--gray-500)' }}>{label}</p>
      <p className="text-xl font-display font-700" style={{ color: accent || 'var(--gray-900)' }}>{value}</p>
    </div>
  );
}

function TableHeader({ cols }) {
  return (
    <tr>
      {cols.map((col) => (
        <th
          key={col}
          className="px-3 py-2 text-left text-xs font-display font-600 uppercase tracking-wide"
          style={{ background: 'var(--primary)', color: '#fff' }}
        >
          {col}
        </th>
      ))}
    </tr>
  );
}

export default function GSTReport() {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(currentMonth());
  const [downloading, setDownloading] = useState('');

  const { data, isLoading, isError } = useGSTSummary(month);

  const monthLabel = getMonthLabel(month, i18n.language);

  const handleDownload = async (format) => {
    setDownloading(format);
    try {
      const response = await api.get(`/reports/gst-summary?month=${month}&format=${format}`, {
        responseType: 'blob',
      });
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GST-Report-${month}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} downloaded`);
    } catch {
      toast.error(t('reports.loadFailed'));
    } finally {
      setDownloading('');
    }
  };

  const s = data?.summary || {};
  const taxByRate = data?.taxByRate || [];
  const b2bInvoices = data?.b2bInvoices || [];
  const b2cSummary = data?.b2cSummary || {};
  const hsnSummary = data?.hsnSummary || [];

  const totalTaxCollected = (s.total_cgst || 0) + (s.total_sgst || 0) + (s.total_igst || 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-700 text-2xl" style={{ color: 'var(--gray-900)' }}>{t('reports.title')}</h1>
          <p className="text-sm font-body mt-0.5" style={{ color: 'var(--gray-500)' }}>
            {t('reports.subtitle')}
          </p>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth((m) => addMonths(m, -1))}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100"
            style={{ border: '1px solid var(--gray-200)' }}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-display font-600 text-base min-w-[140px] text-center" style={{ color: 'var(--gray-900)' }}>
            {monthLabel}
          </span>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100"
            style={{ border: '1px solid var(--gray-200)' }}
            disabled={month >= currentMonth()}
          >
            <ChevronRight size={16} style={{ opacity: month >= currentMonth() ? 0.3 : 1 }} />
          </button>
        </div>
      </div>

      {/* Download buttons */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => handleDownload('pdf')}
          disabled={!!downloading || isLoading}
          className="flex items-center gap-2 px-4 h-9 rounded-lg font-display font-600 text-sm text-white transition-opacity disabled:opacity-50"
          style={{ background: 'var(--primary-dark)' }}
        >
          {downloading === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          {t('reports.downloadPDF')}
        </button>
        <button
          onClick={() => handleDownload('excel')}
          disabled={!!downloading || isLoading}
          className="flex items-center gap-2 px-4 h-9 rounded-lg font-display font-600 text-sm text-white transition-opacity disabled:opacity-50"
          style={{ background: '#217346' }}
        >
          {downloading === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
          {t('reports.downloadExcel')}
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      )}

      {isError && (
        <div className="rounded-xl p-6 text-center" style={{ background: 'var(--surface-card)', border: '1px solid var(--gray-200)' }}>
          <p style={{ color: 'var(--gray-500)' }}>{t('reports.loadFailed')}</p>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label={t('reports.totalSales')} value={formatCurrency(s.total_sales)} accent="var(--primary)" />
            <KpiCard label={t('reports.taxCollected')} value={formatCurrency(totalTaxCollected)} accent="var(--gold-500)" />
            <KpiCard label={t('reports.b2bBills')} value={data?.b2bCount ?? 0} />
            <KpiCard label={t('reports.b2cBills')} value={data?.b2cCount ?? 0} />
          </div>

          {/* Tax Breakdown by Rate */}
          {taxByRate.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--gray-200)' }}>
              <div className="px-4 py-3" style={{ background: 'var(--surface-card)', borderBottom: '1px solid var(--gray-200)' }}>
                <h2 className="font-display font-600 text-sm" style={{ color: 'var(--gray-900)' }}>{t('reports.taxBreakdown')}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <TableHeader cols={['Rate', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax']} />
                  </thead>
                  <tbody>
                    {taxByRate.map((row, i) => (
                      <tr key={row.gst_rate} style={{ background: i % 2 === 0 ? 'var(--surface-card)' : 'var(--gray-50)' }}>
                        <td className="px-3 py-2 font-display font-600">{row.gst_rate}%</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(row.taxable)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(row.cgst)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(row.sgst)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(row.igst)}</td>
                        <td className="px-3 py-2 text-right font-mono font-600">{formatCurrency((row.cgst || 0) + (row.sgst || 0) + (row.igst || 0))}</td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--primary)', color: '#fff' }}>
                      <td className="px-3 py-2 font-display font-700">TOTAL</td>
                      <td className="px-3 py-2 text-right font-mono font-600">{formatCurrency(s.total_taxable)}</td>
                      <td className="px-3 py-2 text-right font-mono font-600">{formatCurrency(s.total_cgst)}</td>
                      <td className="px-3 py-2 text-right font-mono font-600">{formatCurrency(s.total_sgst)}</td>
                      <td className="px-3 py-2 text-right font-mono font-600">{formatCurrency(s.total_igst)}</td>
                      <td className="px-3 py-2 text-right font-mono font-700">{formatCurrency(totalTaxCollected)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* B2B Invoices */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--gray-200)' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--surface-card)', borderBottom: '1px solid var(--gray-200)' }}>
              <h2 className="font-display font-600 text-sm" style={{ color: 'var(--gray-900)' }}>{t('reports.b2bList')}</h2>
              <span className="text-xs font-body px-2 py-0.5 rounded-full" style={{ background: 'var(--green-100)', color: 'var(--primary)' }}>
                {t('reports.invoices', { count: b2bInvoices.length })}
              </span>
            </div>
            <div className="overflow-x-auto">
              {b2bInvoices.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm font-body" style={{ color: 'var(--gray-500)' }}>
                  {t('reports.noB2B', { month: monthLabel })}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <TableHeader cols={['Bill No', 'Date', 'Customer', 'GSTIN', 'Taxable', 'Amount']} />
                  </thead>
                  <tbody>
                    {b2bInvoices.map((inv, i) => (
                      <tr key={inv.bill_number} style={{ background: i % 2 === 0 ? 'var(--surface-card)' : 'var(--gray-50)' }}>
                        <td className="px-3 py-2 font-mono text-xs">{inv.bill_number}</td>
                        <td className="px-3 py-2 font-body text-xs">{inv.bill_date}</td>
                        <td className="px-3 py-2 font-body">{inv.customer_name}</td>
                        <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--gray-500)' }}>{inv.customer_gstin}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(inv.taxable_amount)}</td>
                        <td className="px-3 py-2 text-right font-mono font-600">{formatCurrency(inv.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* HSN Summary */}
          {hsnSummary.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--gray-200)' }}>
              <div className="px-4 py-3" style={{ background: 'var(--surface-card)', borderBottom: '1px solid var(--gray-200)' }}>
                <h2 className="font-display font-600 text-sm" style={{ color: 'var(--gray-900)' }}>{t('reports.hsnSummary')}</h2>
                <p className="text-xs font-body mt-0.5" style={{ color: 'var(--gray-500)' }}>{t('reports.hsnSubtitle')}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <TableHeader cols={['HSN Code', 'Unit', 'Total Qty', 'Taxable Value', 'Tax Rate', 'CGST', 'SGST', 'Tax Amount']} />
                  </thead>
                  <tbody>
                    {hsnSummary.map((row, i) => (
                      <tr key={`${row.hsn_code}-${row.gst_rate}`} style={{ background: i % 2 === 0 ? 'var(--surface-card)' : 'var(--gray-50)' }}>
                        <td className="px-3 py-2 font-mono text-xs font-600">{row.hsn_code || '—'}</td>
                        <td className="px-3 py-2 font-body text-xs">{row.unit || '—'}</td>
                        <td className="px-3 py-2 text-right font-mono">{row.total_quantity}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(row.taxable_value)}</td>
                        <td className="px-3 py-2 text-center">{row.gst_rate}%</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(row.cgst)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(row.sgst)}</td>
                        <td className="px-3 py-2 text-right font-mono font-600">{formatCurrency((row.cgst || 0) + (row.sgst || 0) + (row.igst || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* B2C Summary */}
          <div className="rounded-xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--gray-200)' }}>
            <h2 className="font-display font-600 text-sm mb-3" style={{ color: 'var(--gray-900)' }}>{t('reports.b2cSummary')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
              {[
                { label: 'Bill Count', value: String(b2cSummary.bill_count || 0) },
                { label: 'Taxable Value', value: formatCurrency(b2cSummary.taxable) },
                { label: 'CGST', value: formatCurrency(b2cSummary.cgst) },
                { label: 'SGST', value: formatCurrency(b2cSummary.sgst) },
                { label: 'Total', value: formatCurrency(b2cSummary.total) },
              ].map((item) => (
                <div key={item.label}>
                  <p className="font-body text-xs" style={{ color: 'var(--gray-500)' }}>{item.label}</p>
                  <p className="font-display font-600 mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* No data state */}
          {s.total_bills === 0 && (
            <div className="rounded-xl p-8 text-center" style={{ background: 'var(--surface-card)', border: '1px solid var(--gray-200)' }}>
              <p className="font-display font-600 text-base" style={{ color: 'var(--gray-700)' }}>{t('reports.noBills', { month: monthLabel })}</p>
              <p className="text-sm font-body mt-1" style={{ color: 'var(--gray-500)' }}>{t('reports.noBillsHint')}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

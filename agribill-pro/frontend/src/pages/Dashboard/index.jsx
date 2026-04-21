import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Package, FileText, Users,
  Bell, AlertTriangle, Clock, Plus, MessageCircle,
  ArrowRight, ChevronRight, BarChart2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useDashboardSummary, useSalesChart, useTopProducts,
  useCategoryBreakdown, useRecentBills, useDashboardAlerts,
} from '../../hooks/useDashboard.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { formatDate } from '../../utils/formatDate.js';
import { useLangStore } from '../../store/lang.store.js';

/* ─── Color palette for charts ─── */
const CHART_COLORS = ['#2FA084', '#D4A017', '#4CB896', '#E8B82A', '#6FCF97', '#F4C430'];
const PIE_COLORS  = ['#1F6F5F', '#2FA084', '#4CB896', '#6FCF97', '#A8E0C0', '#D4A017', '#E8B82A', '#F4C430'];

/* ─── Count-up animation hook ─── */
function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    if (!target) return;
    const start = performance.now();
    const animate = (now) => {
      const elapsed = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - elapsed, 3);
      setValue(Math.round(target * ease));
      if (elapsed < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}

/* ─── Skeleton loader ─── */
function Skeleton({ className, style }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className || ''}`}
      style={{ background: 'var(--gray-200)', ...style }}
    />
  );
}

/* ─── KPI Card ─── */
function KpiCard({ label, sublabel, value, change, accentColor, loading }) {
  const animated = useCountUp(loading ? 0 : value);

  if (loading) {
    return (
      <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
        <Skeleton className="w-24 h-3 mb-3" />
        <Skeleton className="w-32 h-7 mb-2" />
        <Skeleton className="w-20 h-3" />
      </div>
    );
  }

  const isUp = change >= 0;

  return (
    <div
      className="rounded-xl p-5 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: 'white', boxShadow: 'var(--shadow-card)', borderLeft: `4px solid ${accentColor}` }}
    >
      <p className="font-body text-xs mb-1" style={{ color: 'var(--gray-500)' }}>{label}</p>
      <p className="font-mono font-700 text-2xl mb-1" style={{ color: 'var(--gray-900)' }}>
        {formatCurrency(animated)}
      </p>
      <div className="flex items-center gap-2">
        {change !== undefined && (
          <span
            className="flex items-center gap-0.5 text-xs font-mono font-600"
            style={{ color: isUp ? 'var(--color-success)' : 'var(--color-danger)' }}
          >
            {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {isUp ? '+' : ''}{change}%
          </span>
        )}
        <span className="text-xs font-body" style={{ color: 'var(--gray-400)' }}>{sublabel}</span>
      </div>
    </div>
  );
}

/* ─── Alert chip ─── */
function AlertChip({ count, label, color, bg, to }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl flex-1 min-w-0 transition-all hover:-translate-y-0.5"
      style={{ background: bg, border: `1px solid ${color}30` }}
    >
      <span className="font-mono font-700 text-lg" style={{ color }}>{count ?? '—'}</span>
      <span className="font-body text-sm truncate" style={{ color: 'var(--gray-700)' }}>{label}</span>
      <ChevronRight size={14} className="ml-auto flex-shrink-0" style={{ color }} />
    </Link>
  );
}

/* ─── Custom chart tooltip ─── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-lg text-xs font-mono"
      style={{ background: 'var(--gray-900)', color: 'white', boxShadow: 'var(--shadow-md)' }}
    >
      <p className="font-body mb-1 opacity-70">{label}</p>
      {payload.map((p) => (
        <p key={p.name}>
          {p.name}: <strong>{formatCurrency(p.value)}</strong>
        </p>
      ))}
    </div>
  );
}

/* ─── Payment status badge ─── */
function StatusBadge({ status }) {
  const { t } = useTranslation();
  const map = {
    PAID:    { bg: 'var(--color-success-bg)',  color: 'var(--color-success)',  label: t('status.paid') },
    PARTIAL: { bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)',  label: t('status.partial') },
    UNPAID:  { bg: 'var(--color-danger-bg)',   color: 'var(--color-danger)',   label: t('status.unpaid') },
  };
  const s = map[status] || map.UNPAID;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-display font-500"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

/* ─── Dashboard Page ─── */
export default function Dashboard() {
  const { t } = useTranslation();
  const { language } = useLangStore();
  const { data: summary, isLoading: sumLoading }   = useDashboardSummary();
  const { data: salesData, isLoading: salesLoading } = useSalesChart();
  const { data: topProds, isLoading: prodsLoading }  = useTopProducts();
  const { data: catData, isLoading: catLoading }     = useCategoryBreakdown();
  const { data: recentBills, isLoading: billsLoading } = useRecentBills();
  const { data: alerts }                             = useDashboardAlerts();
  const navigate = useNavigate();

  const dateLocale = language === 'mr' ? 'mr-IN' : 'en-IN';

  return (
    <div className="page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-700 text-xl" style={{ color: 'var(--gray-900)' }}>{t('dashboard.title')}</h1>
          <p className="font-body text-xs mt-0.5" style={{ color: 'var(--gray-400)' }}>
            {new Date().toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link
          to="/billing/new"
          className="h-9 px-4 rounded-lg font-display font-600 text-sm text-white flex items-center gap-1.5 transition-all hover:opacity-90"
          style={{ background: 'var(--primary-dark)' }}
        >
          <Plus size={15} />
          {t('dashboard.newBill')}
        </Link>
      </div>

      {/* ── Row 1: KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t('dashboard.todaySales')}
          sublabel={t('dashboard.vsYesterday')}
          value={summary?.today_sales ?? 0}
          change={summary?.today_change}
          accentColor="var(--primary)"
          loading={sumLoading}
        />
        <KpiCard
          label={t('dashboard.monthlyRevenue')}
          sublabel={t('dashboard.vsLastMonth')}
          value={summary?.month_revenue ?? 0}
          change={summary?.month_change}
          accentColor="var(--gold-500)"
          loading={sumLoading}
        />
        <KpiCard
          label={t('dashboard.stockValue')}
          sublabel={`${summary?.product_count ?? 0} ${t('dashboard.products')}`}
          value={summary?.stock_value ?? 0}
          accentColor="var(--color-info)"
          loading={sumLoading}
        />
        <KpiCard
          label={t('dashboard.totalDues')}
          sublabel={`${summary?.customers_with_due ?? 0} ${t('dashboard.customers')}`}
          value={summary?.total_due ?? 0}
          accentColor="var(--color-warning)"
          loading={sumLoading}
        />
      </div>

      {/* ── Row 1b: Profit KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label={t('dashboard.todayProfit')}
          sublabel={t('dashboard.grossProfitToday')}
          value={summary?.today_profit ?? 0}
          accentColor="var(--color-success)"
          loading={sumLoading}
        />
        <KpiCard
          label={t('dashboard.monthProfit')}
          sublabel={t('dashboard.grossProfitMonth')}
          value={summary?.month_profit ?? 0}
          accentColor="var(--color-success)"
          loading={sumLoading}
        />
        <KpiCard
          label={t('dashboard.totalProfit')}
          sublabel={t('dashboard.allTimeProfit')}
          value={summary?.total_profit ?? 0}
          accentColor="#7C3AED"
          loading={sumLoading}
        />
      </div>

      {/* ── Row 2: Alert Chips ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <AlertChip
          count={alerts?.low_stock ?? 0}
          label={t('dashboard.lowStock')}
          color="var(--color-danger)"
          bg="var(--color-danger-bg)"
          to="/reminders"
        />
        <AlertChip
          count={alerts?.expiring_soon ?? 0}
          label={t('dashboard.expiringSoon')}
          color="var(--color-warning)"
          bg="var(--color-warning-bg)"
          to="/reminders"
        />
        <AlertChip
          count={alerts?.unpaid_bills ?? 0}
          label={t('dashboard.unpaidBills')}
          color="var(--color-info)"
          bg="var(--color-info-bg)"
          to="/billing/history"
        />
      </div>

      {/* ── Row 3: Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Sales & Profit Trend — 3 cols */}
        <div
          className="lg:col-span-3 rounded-xl p-5"
          style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}
        >
          <p className="font-display font-500 text-sm mb-4" style={{ color: 'var(--gray-700)' }}>
            {t('dashboard.salesTrend')}
          </p>
          {salesLoading ? (
            <Skeleton style={{ height: 200 }} />
          ) : salesData?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={salesData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2FA084" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#2FA084" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--gray-400)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--gray-400)' }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `₹${(v / 100).toLocaleString('en-IN', { notation: 'compact' })}`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'Noto Sans' }} />
                <Area
                  type="monotone"
                  dataKey="total"
                  name={t('dashboard.sales')}
                  stroke="#2FA084"
                  strokeWidth={2}
                  fill="url(#salesGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#1F6F5F' }}
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name={t('dashboard.profit')}
                  stroke="#7C3AED"
                  strokeWidth={1.5}
                  fill="url(#profitGrad)"
                  dot={false}
                  activeDot={{ r: 3, fill: '#6D28D9' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center gap-2">
              <BarChart2 size={32} style={{ color: 'var(--gray-300)' }} />
              <p className="font-body text-sm" style={{ color: 'var(--gray-400)' }}>{t('dashboard.noSalesData')}</p>
              <Link to="/billing/new" className="text-xs font-600" style={{ color: 'var(--primary)' }}>
                {t('dashboard.createFirstBill')}
              </Link>
            </div>
          )}
        </div>

        {/* Category Breakdown — 2 cols */}
        <div
          className="lg:col-span-2 rounded-xl p-5"
          style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}
        >
          <p className="font-display font-500 text-sm mb-4" style={{ color: 'var(--gray-700)' }}>
            {t('dashboard.categoryBreakdown')}
          </p>
          {catLoading ? (
            <Skeleton style={{ height: 200 }} />
          ) : catData?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={catData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={3}
                >
                  {catData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => formatCurrency(v)}
                  contentStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                />
                <Legend
                  iconSize={8}
                  wrapperStyle={{ fontSize: 10, fontFamily: 'Noto Sans' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center gap-2">
              <Package size={32} style={{ color: 'var(--gray-300)' }} />
              <p className="font-body text-sm" style={{ color: 'var(--gray-400)' }}>{t('dashboard.noCategoryData')}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 4: Top Products + Recent Bills ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Top Products horizontal bar — 3 cols */}
        <div
          className="lg:col-span-3 rounded-xl p-5"
          style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}
        >
          <p className="font-display font-500 text-sm mb-4" style={{ color: 'var(--gray-700)' }}>
            {t('dashboard.topProducts')}
          </p>
          {prodsLoading ? (
            <Skeleton style={{ height: 220 }} />
          ) : topProds?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={topProds.slice(0, 8)}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: 'var(--gray-400)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${(v / 100).toLocaleString('en-IN', { notation: 'compact' })}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: 'var(--gray-600)' }}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                  tickFormatter={(v) => v.length > 14 ? v.slice(0, 13) + '…' : v}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="revenue" name={t('dashboard.revenue')} radius={[0, 4, 4, 0]} fill="#2FA084" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center gap-2">
              <Package size={32} style={{ color: 'var(--gray-300)' }} />
              <p className="font-body text-sm" style={{ color: 'var(--gray-400)' }}>{t('dashboard.noProductSales')}</p>
            </div>
          )}
        </div>

        {/* Recent Bills — 2 cols */}
        <div
          className="lg:col-span-2 rounded-xl p-5"
          style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="font-display font-500 text-sm" style={{ color: 'var(--gray-700)' }}>{t('dashboard.recentBills')}</p>
            <Link to="/billing/history" className="text-xs font-600 flex items-center gap-0.5" style={{ color: 'var(--primary)' }}>
              {t('dashboard.viewAll')} <ArrowRight size={11} />
            </Link>
          </div>

          {billsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} style={{ height: 36 }} />
              ))}
            </div>
          ) : recentBills?.length ? (
            <div className="space-y-1">
              {recentBills.slice(0, 7).map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-all"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/billing/history?id=${bill.id}`)}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-500 text-xs truncate" style={{ color: 'var(--gray-800)' }}>
                      {bill.bill_number}
                    </p>
                    <p className="font-body text-xs truncate" style={{ color: 'var(--gray-400)' }}>
                      {bill.customer_name || 'Walk-in'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-xs font-600" style={{ color: 'var(--gray-800)' }}>
                      {formatCurrency(bill.total_amount, { decimals: 0 })}
                    </p>
                    <StatusBadge status={bill.payment_status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center gap-2">
              <FileText size={32} style={{ color: 'var(--gray-300)' }} />
              <p className="font-body text-sm" style={{ color: 'var(--gray-400)' }}>{t('dashboard.noBillsToday')}</p>
              <Link to="/billing/new" className="text-xs font-600" style={{ color: 'var(--primary)' }}>
                {t('dashboard.createFirstBillLink')}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 5: Quick Actions ── */}
      <div
        className="rounded-xl p-5"
        style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}
      >
        <p className="font-display font-500 text-xs uppercase tracking-wider mb-4" style={{ color: 'var(--gray-400)' }}>
          {t('dashboard.quickActions')}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { labelKey: 'billing.newBill', icon: FileText, to: '/billing', primary: true },
            { labelKey: 'dashboard.addProduct', icon: Package, to: '/inventory' },
            { labelKey: 'dashboard.addCustomer', icon: Users, to: '/customers' },
            { labelKey: 'nav.whatsapp', icon: MessageCircle, to: '/whatsapp' },
          ].map(({ labelKey, icon: Icon, to, primary }) => (
            <Link
              key={labelKey}
              to={to}
              className="h-11 rounded-xl flex items-center justify-center gap-2 font-display font-600 text-sm transition-all hover:opacity-90 active:scale-95"
              style={
                primary
                  ? { background: 'var(--primary-dark)', color: 'white' }
                  : { background: 'var(--green-50)', color: 'var(--primary-dark)', border: '1px solid var(--green-200)' }
              }
            >
              <Icon size={15} />
              {t(labelKey)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

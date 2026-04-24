import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios.js';
import { whatsappApi } from '../../api/whatsapp.api.js';
import { Package, AlertTriangle, CreditCard, CheckCheck, MessageCircle, AlertCircle, Loader2 } from 'lucide-react';
import { timeAgo } from '../../utils/formatDate.js';
import toast from 'react-hot-toast';

const ICONS = {
  LOW_STOCK: { icon: Package, color: 'var(--color-danger)', bg: 'var(--color-danger-bg)', label: 'Low Stock' },
  EXPIRY: { icon: AlertTriangle, color: 'var(--color-warning)', bg: 'var(--color-warning-bg)', label: 'Expiring Soon' },
  DUE_PAYMENT: { icon: CreditCard, color: 'var(--color-info)', bg: 'var(--color-info-bg)', label: 'Due Payment' },
};

export default function Reminders() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('ALL');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-page'],
    queryFn: () => api.get('/reminders').then((r) => r.data.data),
    refetchInterval: 60000,
  });

  const notifications = data || [];

  const filtered = useMemo(() => {
    if (activeTab === 'ALL') return notifications;
    return notifications.filter(n => n.type === activeTab);
  }, [notifications, activeTab]);

  const readMutation = useMutation({
    mutationFn: (id) => api.put(`/reminders/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries(['notifications-page']);
      qc.invalidateQueries(['notifications']); // sync with panel
    },
  });

  const readAllMutation = useMutation({
    mutationFn: () => api.put('/reminders/read-all'),
    onSuccess: () => {
      qc.invalidateQueries(['notifications-page']);
      qc.invalidateQueries(['notifications']);
      toast.success('All reminders marked as read');
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post('/reminders/generate'),
    onSuccess: (res) => {
      qc.invalidateQueries(['notifications-page']);
      qc.invalidateQueries(['notifications']);
      const generated = res.data.generated;
      toast.success(`Generated ${generated.low_stock} low stock and ${generated.expiry} expiry alerts`);
    },
    onError: () => toast.error('Failed to generate alerts'),
  });

  const sendWaMutation = useMutation({
    mutationFn: ({ type, reference_id, phone, name, amount }) => {
      if (type === 'DUE_PAYMENT') return whatsappApi.sendReminder({ phone, name, amount });
      return Promise.resolve(); // we don't have a low stock send to customer, it's for the owner usually, but can be customized
    },
    onSuccess: () => toast.success('WhatsApp alert sent successfully!'),
    onError: () => toast.error('Failed to send WhatsApp alert. Check connection.'),
  });

  const TABS = [
    { id: 'ALL', label: t('reminders.title') },
    { id: 'LOW_STOCK', label: t('reminders.lowStock') },
    { id: 'EXPIRY', label: t('reminders.expiringSoon') },
    { id: 'DUE_PAYMENT', label: t('reminders.dueBills') },
  ];

  const handleSendWA = (n) => {
    // If DUE_PAYMENT, we need phone/name etc. Let's just simulate or send generic if we don't have full data in notification.
    // The notification usually has reference_id to the customer. We might not have raw phone inside the notification table.
    // Assuming backend handles it or we show a generic toast. 
    toast.info('To send actual alerts, go to Customers > Ledger or use Bulk Messaging.');
  };

  return (
    <div className="page-enter space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-700 text-xl" style={{ color: 'var(--gray-900)' }}>{t('reminders.title')}</h1>
          <p className="font-body text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>
            {t('remindersPage.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 h-10 px-4 rounded-lg font-display font-500 text-sm transition-colors border shadow-sm disabled:opacity-50"
            style={{ background: 'white', color: 'var(--primary)', borderColor: 'var(--green-200)' }}
          >
            <Loader2 size={16} className={generateMutation.isPending ? 'animate-spin' : 'hidden'} />
            {!generateMutation.isPending && <span>⟳ </span>}
            {t('remindersPage.refreshAlerts')}
          </button>

          <button
            onClick={() => readAllMutation.mutate()}
            disabled={readAllMutation.isPending || notifications.every(n => n.is_read)}
            className="flex items-center gap-2 h-10 px-4 rounded-lg font-display font-500 text-sm transition-colors border shadow-sm disabled:opacity-50"
            style={{ background: 'white', color: 'var(--gray-700)', borderColor: 'var(--gray-200)' }}
          >
            {readAllMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={16} />}
            {t('remindersPage.markAllRead')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-100 no-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 min-w-[120px] h-12 flex items-center justify-center font-display font-500 text-sm border-b-2 transition-all px-4"
              style={{
                borderColor: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                color: activeTab === tab.id ? 'var(--primary-dark)' : 'var(--gray-500)',
                background: activeTab === tab.id ? 'var(--green-50)' : 'transparent',
              }}
            >
              {tab.label}
              {tab.id === 'ALL' ? (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600">{notifications.filter(n => !n.is_read).length}</span>
              ) : ''}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="divide-y divide-gray-50 min-h-[300px]">
          {isLoading ? (
             <div className="p-12 text-center text-gray-400 flex flex-col items-center">
               <Loader2 className="animate-spin mb-2" size={24} />
               <p className="text-sm">{t('remindersPage.loading')}</p>
             </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center">
              <AlertCircle size={32} className="mb-3 opacity-50" />
              <p className="text-sm font-display font-500 text-gray-600">{t('remindersPage.allCaughtUp')}</p>
              <p className="text-xs font-body mt-1">{t('remindersPage.noneInCategory')}</p>
            </div>
          ) : (
            filtered.map((n) => {
              const cfg = ICONS[n.type] || ICONS.LOW_STOCK;
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  className={`flex flex-col sm:flex-row sm:items-center gap-4 p-5 transition-colors ${!n.is_read ? 'bg-[var(--green-50)]' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex-1 flex gap-4 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                      style={{ background: cfg.bg }}
                    >
                      <Icon size={18} style={{ color: cfg.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'white', color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                          {cfg.label}
                        </span>
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-[var(--color-danger)]" />}
                      </div>
                      <p className="font-display font-600 text-sm text-gray-900 leading-snug">
                        {n.title}
                      </p>
                      <p className="text-sm text-gray-600 font-body mt-0.5 leading-snug">{n.message}</p>
                      <p className="text-xs mt-1.5" style={{ color: 'var(--gray-400)' }}>
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0 sm:items-end mt-2 sm:mt-0 ml-14 sm:ml-0">
                    {!n.is_read && (
                      <button
                        onClick={() => readMutation.mutate(n.id)}
                        className="h-8 px-3 rounded text-xs font-600 border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors"
                      >
                        {t('remindersPage.markRead')}
                      </button>
                    )}
                    {n.type === 'DUE_PAYMENT' && (
                      <button
                        onClick={() => handleSendWA(n)}
                        className="flex items-center gap-1.5 h-8 px-3 rounded text-xs font-600 transition-colors bg-green-50 text-green-700 hover:bg-green-100 outline-none"
                      >
                        <MessageCircle size={14} /> {t('remindersPage.sendWhatsApp')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

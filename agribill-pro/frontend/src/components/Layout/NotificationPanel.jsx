import { useEffect } from 'react';
import { X, Package, AlertTriangle, CreditCard, CheckCheck } from 'lucide-react';
import { useNotificationStore } from '../../store/notification.store.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios.js';
import { timeAgo } from '../../utils/formatDate.js';

const ICONS = {
  LOW_STOCK: { icon: Package, color: 'var(--color-danger)', bg: 'var(--color-danger-bg)' },
  EXPIRY: { icon: AlertTriangle, color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  DUE_PAYMENT: { icon: CreditCard, color: 'var(--color-info)', bg: 'var(--color-info-bg)' },
};

export default function NotificationPanel() {
  const { isOpen, closePanel, setNotifications, notifications, markRead, markAllRead } =
    useNotificationStore();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/reminders').then((r) => r.data.data),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (data) setNotifications(data);
  }, [data, setNotifications]);

  const readMutation = useMutation({
    mutationFn: (id) => api.put(`/reminders/${id}/read`),
    onSuccess: (_, id) => { markRead(id); qc.invalidateQueries(['notifications']); },
  });

  const readAllMutation = useMutation({
    mutationFn: () => api.put('/reminders/read-all'),
    onSuccess: () => { markAllRead(); qc.invalidateQueries(['notifications']); },
  });

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={closePanel} />
      <div
        className="fixed right-4 top-[68px] w-96 rounded-xl z-50 overflow-hidden"
        style={{ background: 'white', boxShadow: 'var(--shadow-lg)', maxHeight: '80vh' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-display font-600 text-base text-gray-900">Notifications</h3>
          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.is_read) && (
              <button
                onClick={() => readAllMutation.mutate()}
                className="flex items-center gap-1 text-xs font-display font-500 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--primary)' }}
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
            <button onClick={closePanel} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 56px)' }}>
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-400 font-body text-sm">No notifications</p>
            </div>
          ) : (
            notifications.map((n) => {
              const cfg = ICONS[n.type] || ICONS.LOW_STOCK;
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 border-b border-gray-50 transition-colors ${
                    n.is_read ? 'opacity-60' : ''
                  }`}
                  style={!n.is_read ? { background: 'var(--green-50)' } : {}}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: cfg.bg }}
                  >
                    <Icon size={15} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-500 text-sm text-gray-900 leading-snug">
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 font-body mt-0.5 leading-snug">{n.message}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--gray-400)' }}>
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => readMutation.mutate(n.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

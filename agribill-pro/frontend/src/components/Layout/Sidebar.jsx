import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Receipt, Users, Bell,
  MessageCircle, Settings, ChevronLeft, ChevronRight, LogOut, Leaf, FileText,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store.js';
import { useNotificationStore } from '../../store/notification.store.js';
import { authApi } from '../../api/auth.api.js';
import toast from 'react-hot-toast';

export default function Sidebar({ collapsed, onToggle, waConnected, whatsappEnabled, mobileOpen, isMobile, onMobileClose }) {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const NAV = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/inventory', icon: Package, label: t('nav.inventory') },
    { to: '/billing', icon: Receipt, label: t('nav.billing') },
    { to: '/customers', icon: Users, label: t('nav.customers') },
    { to: '/reminders', icon: Bell, label: t('nav.reminders'), badge: 'notifications' },
    ...(whatsappEnabled ? [{ to: '/whatsapp', icon: MessageCircle, label: t('nav.whatsapp'), waStatus: true }] : []),
    { to: '/reports/gst', icon: FileText, label: 'GST Reports' },
    { to: '/settings', icon: Settings, label: t('nav.settings') },
  ];

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
      navigate('/login');
      toast.success('Logged out');
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <aside
      className="sidebar fixed left-0 top-0 h-full flex flex-col z-40 transition-all duration-300"
      style={{
        width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        background: 'var(--surface-sidebar)',
        transform: isMobile && !mobileOpen ? 'translateX(-100%)' : 'translateX(0)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-[60px] border-b border-white/10 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-brand-300/20 flex items-center justify-center flex-shrink-0">
          <Leaf size={18} className="text-brand-300" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-white font-display font-600 text-sm leading-tight truncate">
              AgriBill Pro
            </p>
            <p className="text-brand-300 text-xs truncate font-body">
              {user?.shop_name || 'Agri Shop'}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {NAV.map(({ to, icon: Icon, label, badge, waStatus }) => {
          const badgeCount = badge === 'notifications' ? unreadCount : 0;

          return (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              onClick={() => isMobile && onMobileClose?.()}
              className={({ isActive }) =>
                `relative flex items-center gap-3 mx-2 mb-1 px-3 h-10 rounded-md transition-all duration-150 group ${
                  isActive
                    ? 'bg-white/12 text-white before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-[3px] before:rounded-r before:bg-brand-300'
                    : 'text-gray-300 hover:bg-white/8 hover:text-white'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && (
                <span className="font-display font-500 text-sm flex-1 truncate">{label}</span>
              )}
              {!collapsed && badgeCount > 0 && (
                <span
                  className="font-mono text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--gold-500)', color: '#1C1C1E' }}
                >
                  {badgeCount}
                </span>
              )}
              {!collapsed && waStatus && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: waConnected ? 'var(--color-success)' : '#EF4444' }}
                  title={waConnected ? 'WhatsApp Connected' : 'WhatsApp Disconnected'}
                />
              )}
              {collapsed && badgeCount > 0 && (
                <span
                  className="absolute top-1 right-1 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-mono"
                  style={{ background: 'var(--gold-500)', color: '#1C1C1E' }}
                >
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User + toggle */}
      <div className="border-t border-white/10 p-3 flex-shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-display font-600 text-xs flex-shrink-0"
            style={{ background: 'var(--primary)' }}
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-white font-display font-500 text-sm truncate">{user?.name}</p>
              <p className="text-brand-300 text-xs capitalize">{user?.role}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              title={t('auth.logout')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center h-8 rounded-md text-gray-400 hover:text-white hover:bg-white/8 transition-all"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}

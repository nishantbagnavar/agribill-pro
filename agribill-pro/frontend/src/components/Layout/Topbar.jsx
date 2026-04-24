import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Wifi, WifiOff, ChevronDown, LogOut, User, Menu } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store.js';
import { useNotificationStore } from '../../store/notification.store.js';
import { useLangStore } from '../../store/lang.store.js';
import { authApi } from '../../api/auth.api.js';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export default function Topbar({ waConnected, onMobileMenuToggle, isMobile }) {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { unreadCount, togglePanel } = useNotificationStore();
  const { language, toggleLanguage } = useLangStore();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  const PAGE_TITLE_KEYS = {
    '/dashboard': 'nav.dashboard',
    '/inventory': 'nav.inventory',
    '/billing':   'nav.billing',
    '/customers': 'nav.customers',
    '/reminders': 'nav.reminders',
    '/whatsapp':  'nav.whatsapp',
    '/settings':  'nav.settings',
    '/reports':   'nav.reports',
  };

  const titleKey = Object.entries(PAGE_TITLE_KEYS).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1];
  const title = titleKey ? t(titleKey) : 'AgriBill Pro';

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const handleLogout = async () => {
    try { await authApi.logout(); } finally {
      logout();
      navigate('/login');
      toast.success('Logged out');
    }
  };

  const handleToggleLang = () => {
    const next = language === 'en' ? 'mr' : 'en';
    toggleLanguage();
    i18n.changeLanguage(next);
  };

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header
      className="topbar fixed right-0 top-0 z-20 flex items-center justify-between px-6"
      style={{
        height: 'var(--topbar-height)',
        background: 'var(--surface-topbar)',
        borderBottom: '1px solid var(--gray-200)',
        left: isMobile ? '0px' : 'var(--sidebar-current-width, 260px)',
        transition: 'left 0.3s',
      }}
    >
      <div className="flex items-center gap-2">
        {isMobile && (
          <button
            onClick={onMobileMenuToggle}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <Menu size={20} className="text-gray-600" />
          </button>
        )}
        <h1 className="font-display font-600 text-lg text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Language toggle */}
        <button
          onClick={handleToggleLang}
          className="h-8 px-3 rounded-lg font-display font-700 text-xs transition-all hover:bg-gray-100"
          style={{ color: 'var(--gray-700)', border: '1px solid var(--gray-200)' }}
          title={language === 'en' ? 'Switch to Marathi' : 'Switch to English'}
        >
          {language === 'en' ? 'मर' : 'EN'}
        </button>

        {/* WA status */}
        <div className="flex items-center gap-1.5 text-sm" title={waConnected ? 'WhatsApp Connected' : 'WhatsApp Disconnected'}>
          {waConnected
            ? <Wifi size={16} className="text-green-500" />
            : <WifiOff size={16} className="text-red-400" />}
          {waConnected && (
            <span className="text-xs text-green-600 hidden sm:block">{t('whatsapp.connected')}</span>
          )}
        </div>

        {/* Notifications bell */}
        <button
          onClick={togglePanel}
          className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-gray-100"
        >
          <Bell size={18} className="text-gray-600" />
          {unreadCount > 0 && (
            <span
              className="absolute top-1 right-1 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-mono text-white"
              style={{ background: 'var(--color-danger)' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu((v) => !v)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-all"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white font-display font-600 text-xs"
              style={{ background: 'var(--primary)' }}
            >
              {initials}
            </div>
            <span className="hidden sm:block font-display font-500 text-sm text-gray-700 max-w-[120px] truncate">
              {user?.shop_name || user?.name}
            </span>
            <ChevronDown size={14} className="text-gray-500" />
          </button>

          {showUserMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden z-50"
              style={{ background: 'white', boxShadow: 'var(--shadow-lg)' }}
            >
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="font-display font-600 text-sm text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User size={15} /> {t('auth.profile')}
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors"
                style={{ color: 'var(--color-danger)' }}
              >
                <LogOut size={15} /> {t('auth.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

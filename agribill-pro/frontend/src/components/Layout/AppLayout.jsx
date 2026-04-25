import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import NotificationPanel from './NotificationPanel.jsx';
import UpdateBanner from '../UpdateBanner.jsx';
import ForceUpdateScreen from '../ForceUpdateScreen.jsx';
import LicenseGate from '../LicenseGate.jsx';
import { whatsappApi } from '../../api/whatsapp.api.js';
import { authApi } from '../../api/auth.api.js';
import { shopApi } from '../../api/shop.api.js';
import { useAuthStore } from '../../store/auth.store.js';
import { useLicenseStatus } from '../../hooks/useLicense.js';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const updateUser = useAuthStore((s) => s.updateUser);

  // Fetch full user profile (includes shop_name) on app load
  useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const r = await authApi.me();
      const data = r.data.data;
      // data is now { user: {...} } from the fixed getMe
      const user = data?.user ?? data;
      if (user) updateUser(user);
      return user;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = (e) => {
      setIsMobile(e.matches);
      if (!e.matches) setMobileOpen(false);
    };
    media.addEventListener('change', update);
    setIsMobile(media.matches);
    return () => media.removeEventListener('change', update);
  }, []);

  const { data: shopProfile } = useQuery({
    queryKey: ['shop-profile'],
    queryFn: () => shopApi.getProfile().then((r) => r.data.data),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const { data: waStatus } = useQuery({
    queryKey: ['wa-status'],
    queryFn: () => whatsappApi.getStatus().then((r) => r.data.data),
    refetchInterval: 30_000,
    retry: false,
  });

  const { data: licenseStatus } = useLicenseStatus();
  const features = licenseStatus?.features || {};

  const waConnected = waStatus?.status === 'CONNECTED';
  const sidebarWidth = collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)';

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-current-width', isMobile ? '0px' : sidebarWidth);
  }, [sidebarWidth, isMobile]);

  return (
    <LicenseGate>
    <div className="min-h-screen" style={{ background: 'var(--surface-page)' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        waConnected={waConnected}
        whatsappEnabled={shopProfile?.whatsapp_enabled !== false}
        features={features}
        mobileOpen={mobileOpen}
        isMobile={isMobile}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        className="transition-all duration-300"
        style={{ marginLeft: isMobile ? 0 : sidebarWidth }}
      >
        <UpdateBanner />

        <Topbar
          waConnected={waConnected}
          onMobileMenuToggle={() => setMobileOpen((v) => !v)}
          isMobile={isMobile}
        />

        <main
          className="page-enter"
          style={{
            marginTop: 'var(--topbar-height)',
            padding: '24px',
            minHeight: 'calc(100vh - var(--topbar-height))',
          }}
        >
          <Outlet />
        </main>
      </div>

      <NotificationPanel />
      <ForceUpdateScreen />
    </div>
    </LicenseGate>
  );
}

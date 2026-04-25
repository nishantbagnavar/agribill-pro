import { ShieldCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLicenseStatus } from '../hooks/useLicense';

export default function LicenseGate({ children }) {
  const { data: status, isLoading } = useLicenseStatus();

  // In dev mode (Vite), never block
  if (import.meta.env.DEV) return children;
  if (isLoading) return children;
  if (status?.activated) return children;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8"
      style={{ background: 'var(--surface-page)' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--primary)' }}>
        <ShieldCheck size={30} className="text-white" />
      </div>
      <div className="text-center max-w-sm">
        <h2 className="font-display font-700 text-xl mb-2" style={{ color: 'var(--gray-900)' }}>
          License Required
        </h2>
        <p className="font-body text-sm mb-1" style={{ color: 'var(--gray-500)' }}>
          AgriBill Pro is not activated on this device.
        </p>
        <p className="font-body text-sm" style={{ color: 'var(--gray-400)' }}>
          Please enter your license key to continue.
        </p>
      </div>
      <Link
        to="/settings?tab=license"
        className="flex items-center gap-2 h-11 px-6 rounded-xl font-display font-600 text-sm text-white"
        style={{ background: 'var(--primary)' }}
      >
        Activate License
        <ArrowRight size={16} />
      </Link>
      <p className="text-xs" style={{ color: 'var(--gray-400)' }}>
        Contact support: 9545886312 | bagnavarnishant@gmail.com
      </p>
    </div>
  );
}

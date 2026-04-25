import { useState } from 'react';
import { ShieldCheck, Loader2, RefreshCw } from 'lucide-react';
import { useLicenseStatus, useActivateLicense, useVerifyLicense } from '../hooks/useLicense';
import toast from 'react-hot-toast';

export default function LicenseGate({ children }) {
  const { data: status, isLoading, refetch, isFetching } = useLicenseStatus();
  const activate = useActivateLicense();
  const verify = useVerifyLicense();
  const [keyInput, setKeyInput] = useState('');

  // Dev mode — never block
  if (import.meta.env.DEV) return children;
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-page)' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--primary)' }} />
    </div>
  );
  if (status?.activated) return children;

  const handleActivate = () => {
    if (!keyInput.trim()) return toast.error('Enter your license key');
    activate.mutate(keyInput.trim().toUpperCase(), {
      onSuccess: () => { toast.success('License activated!'); refetch(); },
      onError: (e) => toast.error(e.response?.data?.error || 'Invalid license key'),
    });
  };

  const handleSyncNow = () => {
    verify.mutate(undefined, {
      onSuccess: () => refetch(),
      onError: () => refetch(),
    });
  };

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
        <p className="font-body text-sm" style={{ color: 'var(--gray-500)' }}>
          AgriBill Pro is not activated on this device.
          Enter your license key below to continue.
        </p>
      </div>

      {/* Activation form */}
      <div className="w-full max-w-sm space-y-3">
        <input
          value={keyInput}
          onChange={e => setKeyInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleActivate()}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          className="w-full h-11 px-4 rounded-xl border text-sm font-mono outline-none text-center tracking-widest"
          style={{ borderColor: 'var(--gray-300)', background: 'white' }}
          autoFocus
        />
        <button
          onClick={handleActivate}
          disabled={activate.isPending}
          className="w-full h-11 rounded-xl font-display font-600 text-sm text-white flex items-center justify-center gap-2"
          style={{ background: 'var(--primary)', opacity: activate.isPending ? 0.7 : 1 }}
        >
          {activate.isPending ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          {activate.isPending ? 'Activating...' : 'Activate License'}
        </button>

        <button
          onClick={handleSyncNow}
          disabled={isFetching || verify.isPending}
          className="w-full h-9 rounded-xl font-display font-500 text-xs flex items-center justify-center gap-2"
          style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }}
        >
          {(isFetching || verify.isPending)
            ? <Loader2 size={13} className="animate-spin" />
            : <RefreshCw size={13} />}
          {(isFetching || verify.isPending) ? 'Checking...' : 'Already activated? Sync Now'}
        </button>
      </div>

      <p className="text-xs" style={{ color: 'var(--gray-400)' }}>
        Support: 9545886312 | bagnavarnishant@gmail.com
      </p>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, ArrowRight, Phone } from 'lucide-react';

const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE || '9876543210';

export default function Home() {
  const navigate = useNavigate();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = key.trim().toUpperCase();
    if (!trimmed) { setError('Please enter your license key.'); return; }
    if (!/^AGR-\d{4}-[A-Z0-9]+$/.test(trimmed)) {
      setError('Invalid format. License keys look like: AGR-2024-PUNE123');
      return;
    }
    navigate(`/portal/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#F0F4F2' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#1F6F5F' }}>
            <Leaf size={28} className="text-white" />
          </div>
          <h1 className="font-display font-700 text-2xl text-gray-900">AgriBill Pro</h1>
          <p className="text-gray-500 text-sm mt-1">Customer Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h2 className="font-display font-600 text-lg text-gray-800 mb-1">Check Your License</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your license key to view status, plan details, and manage your device.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-display font-500 text-gray-600 mb-1.5">License Key</label>
              <input
                value={key}
                onChange={(e) => { setKey(e.target.value); setError(''); }}
                placeholder="AGR-2024-PUNE123"
                autoFocus
                className="w-full border border-gray-200 rounded-xl px-4 h-12 font-mono text-sm text-brand-700 tracking-wide focus:outline-none focus:ring-2 focus:ring-brand-600/20 placeholder:text-gray-300 placeholder:font-body placeholder:tracking-normal uppercase"
              />
              {error && <p className="text-xs text-red-500 mt-1.5 font-display">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full h-12 rounded-xl text-white font-display font-600 text-sm flex items-center justify-center gap-2 transition-colors hover:opacity-90"
              style={{ background: '#1F6F5F' }}
            >
              View Status
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        {/* Support */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">Don't know your key?</p>
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="inline-flex items-center gap-1.5 text-sm font-display font-500 mt-1 transition-colors hover:opacity-80"
            style={{ color: '#1F6F5F' }}
          >
            <Phone size={14} />
            Call Support: {SUPPORT_PHONE}
          </a>
        </div>
      </div>
    </div>
  );
}

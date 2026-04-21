import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useCreateShop } from '../hooks/useShops.js';
import toast from 'react-hot-toast';

function generateLicenseKey(shopName, city) {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900 + 100);
  const tag = (city || shopName || 'SHOP').replace(/\s+/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X');
  return `AGR-${year}-${tag}${rand}`;
}

const TRIAL_OPTIONS = [
  { label: '14 days', days: 14 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'Custom date', days: null },
];

const DEFAULT_FEATURES = { billing: true, inventory: true, whatsapp: false, reports: true };

export default function NewShop() {
  const navigate = useNavigate();
  const create = useCreateShop();

  const [form, setForm] = useState({
    shop_name: '', owner_name: '', email: '', phone: '', city: '',
    plan: 'basic', trial_days: 30, custom_expiry: '',
  });
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const expiryDate = () => {
    if (form.trial_days === null) {
      return form.custom_expiry ? new Date(form.custom_expiry).toISOString() : null;
    }
    const d = new Date();
    d.setDate(d.getDate() + form.trial_days);
    return d.toISOString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const key = generatedKey || generateLicenseKey(form.shop_name, form.city);
    const expiry = expiryDate();
    const shopData = {
      license_key: key,
      shop_name: form.shop_name,
      owner_name: form.owner_name,
      owner_email: form.email || null,
      phone: form.phone || null,
      city: form.city || null,
      plan: form.plan,
      status: form.plan === 'basic' ? 'trial' : 'active',
      expires_at: expiry,
      features: JSON.stringify(DEFAULT_FEATURES),
      bills_count: 0,
      hwid_reset_count: 0,
      hwid_reset_year: new Date().getFullYear(),
      hwid_reset_history: '[]',
    };

    create.mutate(shopData, {
      onSuccess: (data) => {
        setGeneratedKey(key);
        navigator.clipboard.writeText(key).catch(() => {});
        toast.success(`Shop created! License key copied.`);
        navigate(`/shops/${data.id}`);
      },
    });
  };

  const previewKey = () => {
    if (!form.shop_name && !form.city) return '';
    const k = generateLicenseKey(form.shop_name, form.city);
    setGeneratedKey(k);
    return k;
  };

  const copyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-xl">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors font-display">
        <ArrowLeft size={14} />
        All Shops
      </Link>

      <h1 className="font-display font-700 text-2xl text-gray-900 mb-1">Register New Shop</h1>
      <p className="text-sm text-gray-500 mb-6">Creates a license key and adds the shop to Supabase.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-display font-600 text-sm text-gray-700">Shop Details</h2>

          <div>
            <label className="block text-xs font-display font-500 text-gray-600 mb-1">Shop Name *</label>
            <input
              required
              value={form.shop_name}
              onChange={(e) => { set('shop_name', e.target.value); setGeneratedKey(''); }}
              className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm font-body focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              placeholder="Ravi Agro Store"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-display font-500 text-gray-600 mb-1">Owner Name *</label>
              <input
                required
                value={form.owner_name}
                onChange={(e) => set('owner_name', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm font-body focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                placeholder="Ravi Patel"
              />
            </div>
            <div>
              <label className="block text-xs font-display font-500 text-gray-600 mb-1">City</label>
              <input
                value={form.city}
                onChange={(e) => { set('city', e.target.value); setGeneratedKey(''); }}
                className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm font-body focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                placeholder="Pune"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-display font-500 text-gray-600 mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm font-body focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                placeholder="9876543210"
              />
            </div>
            <div>
              <label className="block text-xs font-display font-500 text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm font-body focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                placeholder="ravi@example.com"
              />
            </div>
          </div>
        </div>

        {/* Plan */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-display font-600 text-sm text-gray-700 mb-3">Plan</h2>
          <div className="flex gap-3">
            {['basic', 'pro'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => set('plan', p)}
                className={`flex-1 h-10 rounded-xl border-2 capitalize font-display font-500 text-sm transition-all ${
                  form.plan === p ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Trial period */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-display font-600 text-sm text-gray-700 mb-3">Trial Period</h2>
          <div className="flex flex-wrap gap-2">
            {TRIAL_OPTIONS.map(({ label, days }) => (
              <button
                key={label}
                type="button"
                onClick={() => set('trial_days', days)}
                className={`px-3 h-8 rounded-xl border-2 font-display font-500 text-xs transition-all ${
                  form.trial_days === days ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {form.trial_days === null && (
            <div className="mt-3">
              <label className="block text-xs font-display font-500 text-gray-600 mb-1">Custom Expiry Date</label>
              <input
                type="date"
                value={form.custom_expiry}
                onChange={(e) => set('custom_expiry', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm font-body focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              />
            </div>
          )}
        </div>

        {/* License key preview */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-display font-600 text-sm text-gray-700 mb-3">License Key</h2>
          {generatedKey ? (
            <div className="flex items-center gap-3">
              <code className="flex-1 font-mono text-sm bg-gray-50 rounded-xl px-4 py-2.5 text-brand-700 font-700 tracking-wide">
                {generatedKey}
              </code>
              <button type="button" onClick={copyKey} className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-gray-200 text-xs font-display text-gray-600 hover:bg-gray-50 transition-colors">
                {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={previewKey}
              disabled={!form.shop_name}
              className="w-full h-9 rounded-xl border-2 border-dashed border-gray-200 text-xs font-display text-gray-400 hover:border-brand-400 hover:text-brand-600 transition-colors disabled:opacity-40"
            >
              Preview key (auto-generated on save)
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={create.isPending}
          className="w-full h-11 rounded-xl text-white font-display font-600 text-sm transition-colors disabled:opacity-50"
          style={{ background: '#1F6F5F' }}
        >
          {create.isPending ? 'Creating…' : 'Create Shop & Generate License'}
        </button>
      </form>
    </div>
  );
}

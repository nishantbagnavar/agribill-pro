import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, differenceInDays, isPast } from 'date-fns';
import {
  ArrowLeft, CheckCircle2, XCircle, Leaf, Smartphone,
  Calendar, ShieldCheck, Phone, Mail, RotateCcw, AlertTriangle, Clock,
} from 'lucide-react';
import { fetchShopByKey, selfResetHWID } from '../lib/supabase.js';
import toast from 'react-hot-toast';

const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE || '9876543210';
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'support@agribill.in';

const FEATURE_LABELS = {
  billing: 'Billing',
  inventory: 'Inventory',
  whatsapp: 'WhatsApp',
  reports: 'GST Reports',
};

const STATUS_CONFIG = {
  active:    { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e', label: 'Active' },
  trial:     { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', dot: '#60a5fa', label: 'Trial' },
  suspended: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#f87171', label: 'Suspended' },
  expired:   { color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#fbbf24', label: 'Expired' },
};

export default function PortalDashboard() {
  const { key } = useParams();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  useEffect(() => {
    fetchShopByKey(key)
      .then(setShop)
      .catch(() => setError('License key not found. Please check and try again.'))
      .finally(() => setLoading(false));
  }, [key]);

  const handleReset = async () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    setResetLoading(true);
    try {
      const result = await selfResetHWID(key);
      setResetResult(result);
      if (result.allowed) {
        toast.success('Device reset successful! You can now activate on your new device.');
        setShop((s) => ({ ...s, hwid_reset_count: (s.hwid_reset_count ?? 0) + 1 }));
      }
    } catch (e) {
      toast.error('Reset failed. Please contact support.');
    } finally {
      setResetLoading(false);
      setConfirmReset(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0F4F2' }}>
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#F0F4F2' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#1F6F5F' }}>
          <Leaf size={28} className="text-white" />
        </div>
        <p className="font-display font-600 text-lg text-gray-900 mb-2">License Not Found</p>
        <p className="text-sm text-gray-500 text-center mb-6">{error}</p>
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-display font-500 text-brand-600 hover:underline">
          <ArrowLeft size={14} />
          Try again
        </Link>
      </div>
    );
  }

  const features = (() => { try { return JSON.parse(shop.features || '{}'); } catch { return {}; } })();
  const statusConf = STATUS_CONFIG[shop.status] ?? STATUS_CONFIG.suspended;
  const expiryDate = shop.expires_at ? new Date(shop.expires_at) : null;
  const daysLeft = expiryDate ? differenceInDays(expiryDate, new Date()) : null;
  const isExpired = expiryDate ? isPast(expiryDate) : false;
  const currentYear = new Date().getFullYear();
  const resetsUsed = shop.hwid_reset_year === currentYear ? (shop.hwid_reset_count ?? 0) : 0;
  const resetsLeft = Math.max(0, 2 - resetsUsed);

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: '#F0F4F2' }}>
      <div className="max-w-md mx-auto space-y-4">

        {/* Back */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors font-display mb-2"
        >
          <ArrowLeft size={14} />
          Back
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#1F6F5F' }}>
              <Leaf size={22} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-700 text-xl text-gray-900 truncate">{shop.shop_name}</h1>
              {shop.city && <p className="text-sm text-gray-500 mt-0.5">{shop.city}</p>}
              <code className="text-xs font-mono text-gray-400 mt-1 block">{key}</code>
            </div>
          </div>

          {/* Status badge */}
          <div
            className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 border"
            style={{ background: statusConf.bg, borderColor: statusConf.border }}
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: statusConf.dot }} />
            <span className="font-display font-600 text-sm" style={{ color: statusConf.color }}>
              {statusConf.label}
            </span>
            {shop.status === 'suspended' && (
              <span className="text-xs ml-auto" style={{ color: statusConf.color }}>Contact support to reactivate</span>
            )}
          </div>
        </div>

        {/* Plan & Expiry */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-display font-600 text-sm text-gray-700 mb-4 flex items-center gap-2">
            <ShieldCheck size={14} className="text-brand-600" />
            Plan Details
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Plan</span>
              <span className="font-display font-600 text-sm text-gray-900 capitalize">{shop.plan || 'Basic'}</span>
            </div>
            {expiryDate && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Expires</span>
                  <span className="font-display font-500 text-sm text-gray-900">
                    {format(expiryDate, 'dd MMMM yyyy')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  {isExpired ? (
                    <span className="text-sm font-display font-600 text-red-600">Expired</span>
                  ) : (
                    <span className={`text-sm font-display font-500 ${daysLeft <= 30 ? 'text-orange-600' : 'text-green-700'}`}>
                      {daysLeft} days remaining
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {(isExpired || (daysLeft !== null && daysLeft <= 30)) && (
            <div className="mt-4 flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-xl p-3">
              <AlertTriangle size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-display text-orange-700">
                {isExpired
                  ? 'Your license has expired. Contact support to renew.'
                  : `Your license expires soon. Contact support to renew before ${format(expiryDate, 'dd MMM yyyy')}.`}
              </p>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-display font-600 text-sm text-gray-700 mb-4">Included Features</h2>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(FEATURE_LABELS).map(([key, label]) => (
              <div
                key={key}
                className={`flex items-center gap-2 p-2.5 rounded-xl border ${
                  features[key]
                    ? 'bg-brand-50 border-brand-100'
                    : 'bg-gray-50 border-gray-100'
                }`}
              >
                {features[key]
                  ? <CheckCircle2 size={14} className="text-brand-600 flex-shrink-0" />
                  : <XCircle size={14} className="text-gray-300 flex-shrink-0" />
                }
                <span className={`text-xs font-display font-500 ${features[key] ? 'text-brand-700' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* HWID Reset */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-display font-600 text-sm text-gray-700 mb-1 flex items-center gap-2">
            <Smartphone size={14} className="text-gray-400" />
            Device Changed?
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            If you got a new computer or reinstalled Windows, reset your device link here.
          </p>

          <div className="flex items-center gap-2 mb-4">
            <Clock size={13} className="text-gray-400" />
            <span className="text-xs text-gray-600 font-display">
              Self-service resets used this year: <strong>{resetsUsed} of 2</strong>
            </span>
          </div>

          {resetResult ? (
            resetResult.allowed ? (
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 size={15} className="text-green-600" />
                  <span className="font-display font-600 text-sm text-green-700">Device reset successful!</span>
                </div>
                <p className="text-xs text-green-600">
                  Open AgriBill Pro on your new device and activate with your license key.
                  Resets remaining this year: <strong>{resetResult.resetsRemaining}</strong>.
                </p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <p className="text-sm font-display font-600 text-red-700 mb-1">Reset limit reached</p>
                <p className="text-xs text-red-600">{resetResult.message}</p>
                <a
                  href={`tel:${SUPPORT_PHONE}`}
                  className="inline-flex items-center gap-1.5 text-xs font-display font-500 mt-3 text-brand-600 hover:underline"
                >
                  <Phone size={12} />
                  Call {SUPPORT_PHONE}
                </a>
              </div>
            )
          ) : resetsLeft === 0 ? (
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600 font-display">No self-service resets remaining this year.</p>
              <a
                href={`tel:${SUPPORT_PHONE}`}
                className="inline-flex items-center gap-1.5 text-sm font-display font-500 mt-2 text-brand-600 hover:underline"
              >
                <Phone size={13} />
                Contact support for manual reset
              </a>
            </div>
          ) : confirmReset ? (
            <div className="space-y-3">
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                <p className="text-xs font-display text-orange-700">
                  <strong>Are you sure?</strong> This will unlink your current device. You'll need to re-activate AgriBill Pro on your new device.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  disabled={resetLoading}
                  className="flex-1 h-10 rounded-xl font-display font-600 text-sm text-white bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {resetLoading ? 'Resetting…' : 'Yes, Reset Device'}
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 h-10 rounded-xl font-display font-500 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-brand-600 text-brand-600 font-display font-600 text-sm hover:bg-brand-50 transition-colors"
            >
              <RotateCcw size={15} />
              Reset Device Link ({resetsLeft} remaining)
            </button>
          )}
        </div>

        {/* Support */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-display font-600 text-sm text-gray-700 mb-4">Need Help?</h2>
          <div className="space-y-2">
            <a
              href={`tel:${SUPPORT_PHONE}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1F6F5F' }}>
                <Phone size={14} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-display">Call / WhatsApp</p>
                <p className="text-sm font-display font-600 text-gray-900">{SUPPORT_PHONE}</p>
              </div>
            </a>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1F6F5F' }}>
                <Mail size={14} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-display">Email</p>
                <p className="text-sm font-display font-600 text-gray-900">{SUPPORT_EMAIL}</p>
              </div>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

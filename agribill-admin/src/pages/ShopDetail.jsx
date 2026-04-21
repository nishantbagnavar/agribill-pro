import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft, ShieldCheck, Cpu, Calendar, CheckCircle2,
  XCircle, AlertTriangle, RotateCcw, Clock, ChevronDown, ChevronUp, Save,
} from 'lucide-react';
import { useShop, useUpdateShop, useResetHWID, useExtendLicense } from '../hooks/useShops.js';
import StatusBadge from '../components/StatusBadge.jsx';
import toast from 'react-hot-toast';

const STATUSES = ['active', 'trial', 'suspended', 'expired'];
const PLANS = ['basic', 'pro'];

const FEATURE_LABELS = {
  billing: 'Billing',
  inventory: 'Inventory',
  whatsapp: 'WhatsApp',
  reports: 'GST Reports',
};

export default function ShopDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: shop, isLoading } = useShop(id);
  const update = useUpdateShop();
  const resetHwid = useResetHWID();
  const extend = useExtendLicense();

  const [notes, setNotes] = useState('');
  const [notesEdited, setNotesEdited] = useState(false);
  const [showHwidHistory, setShowHwidHistory] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [expiryEdit, setExpiryEdit] = useState('');
  const [expiryEdited, setExpiryEdited] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!shop) return <div className="p-6 text-gray-500">Shop not found</div>;

  const features = (() => {
    try { return JSON.parse(shop.features || '{}'); } catch { return {}; }
  })();

  const hwidHistory = (() => {
    try { return JSON.parse(shop.hwid_reset_history || '[]'); } catch { return []; }
  })();

  const handleStatusChange = (status) => update.mutate({ id: shop.id, status });
  const handlePlanChange = (plan) => update.mutate({ id: shop.id, plan });

  const handleFeatureToggle = (key) => {
    const updated = { ...features, [key]: !features[key] };
    update.mutate({ id: shop.id, features: JSON.stringify(updated) });
  };

  const handleSaveNotes = () => {
    update.mutate({ id: shop.id, notes }, {
      onSuccess: () => setNotesEdited(false),
    });
  };

  const handleSaveExpiry = () => {
    update.mutate({ id: shop.id, expires_at: new Date(expiryEdit).toISOString() }, {
      onSuccess: () => setExpiryEdited(false),
    });
  };

  const handleHwidReset = () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    resetHwid.mutate({
      id: shop.id,
      currentHwid: shop.hwid,
      history: shop.hwid_reset_history,
    });
    setConfirmReset(false);
  };

  return (
    <div className="p-6 max-w-5xl">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors font-display">
        <ArrowLeft size={14} />
        All Shops
      </Link>

      {/* Title row */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display font-700 text-2xl text-gray-900">{shop.shop_name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={shop.status} />
            <span className="text-sm text-gray-400">{shop.city}</span>
            <span className="font-mono text-xs text-gray-400">{shop.license_key}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={update.isPending || shop.status === s}
              className={`px-3 h-8 rounded-lg text-xs font-display font-500 capitalize border transition-colors disabled:opacity-40 ${
                shop.status === s
                  ? 'border-brand-600 text-brand-700 bg-brand-50'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left col — 2/3 */}
        <div className="col-span-2 space-y-5">

          {/* Shop Info */}
          <section className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-display font-600 text-sm text-gray-700 mb-4">Shop Info</h2>
            <dl className="grid grid-cols-2 gap-3">
              {[
                ['Owner', shop.owner_name],
                ['Phone', shop.phone],
                ['Email', shop.owner_email],
                ['City', shop.city],
                ['Version', shop.app_version],
                ['Created', shop.created_at ? format(new Date(shop.created_at), 'dd MMM yyyy') : '—'],
                ['Last Seen', shop.last_seen_at ? formatDistanceToNow(new Date(shop.last_seen_at), { addSuffix: true }) : 'Never'],
                ['Bills Count', shop.bills_count ?? 0],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-gray-400 font-display">{label}</dt>
                  <dd className="text-sm text-gray-800 font-display font-500 mt-0.5">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* License */}
          <section className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-600 text-sm text-gray-700 flex items-center gap-2">
                <ShieldCheck size={14} className="text-brand-600" />
                License
              </h2>
              <div className="flex items-center gap-2">
                {PLANS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePlanChange(p)}
                    disabled={update.isPending || shop.plan === p}
                    className={`px-3 h-7 rounded-lg text-xs font-display font-500 capitalize border transition-colors disabled:opacity-40 ${
                      shop.plan === p
                        ? 'border-brand-600 text-brand-700 bg-brand-50'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiry */}
            <div className="flex items-center gap-3 mb-4">
              <Calendar size={14} className="text-gray-400" />
              {expiryEdited ? (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={expiryEdit}
                    onChange={(e) => setExpiryEdit(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 h-8 text-sm font-display focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                  />
                  <button onClick={handleSaveExpiry} className="text-xs font-display font-500 px-3 h-8 rounded-lg text-white transition-colors" style={{ background: '#1F6F5F' }}>Save</button>
                  <button onClick={() => setExpiryEdited(false)} className="text-xs font-display text-gray-500 px-2 h-8 hover:text-gray-800">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 font-display">
                    Expires: {shop.expires_at ? format(new Date(shop.expires_at), 'dd MMM yyyy') : 'No expiry'}
                  </span>
                  <button
                    onClick={() => {
                      setExpiryEdit(shop.expires_at ? format(new Date(shop.expires_at), 'yyyy-MM-dd') : '');
                      setExpiryEdited(true);
                    }}
                    className="text-xs text-brand-600 hover:underline font-display"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Quick extend */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-display">Quick extend:</span>
              {[30, 90, 180, 365].map((days) => (
                <button
                  key={days}
                  onClick={() => extend.mutate({ id: shop.id, currentExpiry: shop.expires_at, days })}
                  disabled={extend.isPending}
                  className="text-xs font-display font-500 px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  +{days}d
                </button>
              ))}
            </div>
          </section>

          {/* Features */}
          <section className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-display font-600 text-sm text-gray-700 mb-4">Feature Toggles</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => handleFeatureToggle(key)}
                  disabled={update.isPending}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    features[key]
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  {features[key]
                    ? <CheckCircle2 size={16} className="text-brand-600 flex-shrink-0" />
                    : <XCircle size={16} className="text-gray-300 flex-shrink-0" />
                  }
                  <span className={`text-sm font-display font-500 ${features[key] ? 'text-brand-700' : 'text-gray-500'}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Right col — 1/3 */}
        <div className="space-y-5">

          {/* HWID */}
          <section className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-display font-600 text-sm text-gray-700 flex items-center gap-2 mb-4">
              <Cpu size={14} className="text-gray-400" />
              Hardware ID
            </h2>
            <div className="mb-3">
              <p className="text-xs text-gray-400 font-display mb-1">Current HWID</p>
              <p className="font-mono text-xs text-gray-700 break-all bg-gray-50 rounded-lg p-2">
                {shop.hwid || <span className="text-gray-400 italic">Not bound</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 font-display mb-4">
              <Clock size={12} />
              Resets this year: <strong>{shop.hwid_reset_count ?? 0} / 2</strong>
            </div>

            {confirmReset ? (
              <div className="space-y-2">
                <p className="text-xs text-red-600 font-display flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Are you sure? This clears the HWID.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleHwidReset}
                    disabled={resetHwid.isPending}
                    className="flex-1 h-8 rounded-lg bg-red-600 text-white text-xs font-display font-500 transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 h-8 rounded-lg border border-gray-200 text-gray-600 text-xs font-display transition-colors hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleHwidReset}
                disabled={!shop.hwid}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-gray-200 text-gray-600 text-xs font-display font-500 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCcw size={13} />
                Reset HWID (Manual)
              </button>
            )}

            {hwidHistory.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setShowHwidHistory((v) => !v)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 font-display transition-colors"
                >
                  {showHwidHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  History ({hwidHistory.length})
                </button>
                {showHwidHistory && (
                  <div className="mt-2 space-y-1.5">
                    {hwidHistory.slice(-5).reverse().map((h, i) => (
                      <div key={i} className="text-xs bg-gray-50 rounded-lg p-2">
                        <p className="font-mono text-gray-600 truncate">{h.hwid?.slice(0, 16)}…</p>
                        <p className="text-gray-400 mt-0.5">
                          {h.type} · {h.reset_at ? format(new Date(h.reset_at), 'dd MMM yyyy') : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Notes */}
          <section className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-display font-600 text-sm text-gray-700 mb-3">Private Notes</h2>
            <textarea
              rows={5}
              value={notesEdited ? notes : (shop.notes || '')}
              onChange={(e) => { setNotes(e.target.value); setNotesEdited(true); }}
              placeholder="e.g. Follow up in July…"
              className="w-full text-sm border border-gray-200 rounded-xl p-3 font-body resize-none focus:outline-none focus:ring-2 focus:ring-brand-600/20 text-gray-700 placeholder-gray-300"
            />
            {notesEdited && (
              <button
                onClick={handleSaveNotes}
                disabled={update.isPending}
                className="mt-2 w-full flex items-center justify-center gap-2 h-8 rounded-lg text-white text-xs font-display font-500 transition-colors disabled:opacity-50"
                style={{ background: '#1F6F5F' }}
              >
                <Save size={12} />
                Save Notes
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

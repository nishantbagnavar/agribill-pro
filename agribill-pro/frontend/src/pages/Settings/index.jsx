import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { shopApi } from '../../api/shop.api.js';
import {
  usePrinterConfig, useSavePrinterConfig, useClearPrinterConfig,
  useDiscoverPrinters, useTestPrint, useOsPrinters,
} from '../../hooks/usePrinter.js';
import { Store, Save, Loader2, UploadCloud, FileText, Printer, Search, X, CheckCircle2, Wifi, Usb, RefreshCw, Monitor, Database, CloudUpload, AlertTriangle, Clock, ShieldCheck, QrCode, RotateCcw, BadgeCheck, BadgeX, ArrowUpCircle } from 'lucide-react';
import UpdatesTab from './UpdatesTab.jsx';
import toast from 'react-hot-toast';
import { useBackupStatus, useCreateSnapshot } from '../../hooks/useBackup.js';
import RestoreWizard from './RestoreWizard.jsx';
import { useLicenseStatus, useActivateLicense, useVerifyLicense, useResetHwid, useLanQr } from '../../hooks/useLicense.js';

const schema = z.object({
  shop_name: z.string().min(1, 'Shop name is required'),
  owner_name: z.string().min(1, 'Owner name is required'),
  phone: z.string().min(10, 'Valid phone number required'),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  pincode: z.string().nullable().optional(),
  gstin: z.string().nullable().optional(),
  fssai_number: z.string().nullable().optional(),
  upi_id: z.string().nullable().optional(),
  invoice_prefix: z.string().min(1, 'Invoice prefix required'),
  terms_conditions: z.string().nullable().optional(),
  low_stock_threshold: z.coerce.number().min(1, 'Must be at least 1').default(5),
  expiry_reminder_days: z.coerce.number().min(1, 'Must be at least 1').default(30),
});

/* ─── Printer Tab ──────────────────────────────────────────────────────────── */
function PrinterSettings() {
  const { data: config } = usePrinterConfig();
  const saveConfig = useSavePrinterConfig();
  const clearConfig = useClearPrinterConfig();
  const discover = useDiscoverPrinters();
  const testPrint = useTestPrint();
  const fetchOsPrinters = useOsPrinters();

  const [mode, setMode] = useState('thermal');
  const [discovered, setDiscovered] = useState([]);
  const [selected, setSelected] = useState(null);
  const [manualIface, setManualIface] = useState('');
  const [paperWidth, setPaperWidth] = useState(80);
  const [osPrinters, setOsPrinters] = useState([]);
  const [selectedOsPrinter, setSelectedOsPrinter] = useState('');
  const [paperSize, setPaperSize] = useState('A4');

  useEffect(() => {
    if (config) {
      const m = config.mode || 'thermal';
      setMode(m);
      if (m === 'os') {
        setSelectedOsPrinter(config.os_printer_name || '');
        setPaperSize(config.paper_size || 'A4');
      } else {
        setPaperWidth(config.paper_width || 80);
      }
    }
  }, [config]);

  const handleDiscover = async () => {
    const printers = await discover.mutateAsync();
    setDiscovered(printers || []);
    if (printers?.length === 0) toast('No printers found on network', { icon: 'ℹ️' });
  };

  const handleFetchOsPrinters = async () => {
    const printers = await fetchOsPrinters.mutateAsync();
    setOsPrinters(printers || []);
    if (printers?.length === 0) toast('No system printers found', { icon: 'ℹ️' });
  };

  const handleSave = () => {
    if (mode === 'os') {
      if (!selectedOsPrinter) return toast.error('Select a system printer');
      saveConfig.mutate({ mode: 'os', os_printer_name: selectedOsPrinter, paper_size: paperSize });
    } else {
      const iface = selected?.interface || manualIface.trim();
      if (!iface) return toast.error('Select a printer or enter interface manually');
      saveConfig.mutate({
        mode: 'thermal',
        interface: iface,
        paper_width: paperWidth,
        label: selected?.label || iface,
        type: selected?.type || (iface.startsWith('tcp') ? 'tcp' : 'usb'),
      });
    }
  };

  const handleTest = () => {
    const iface = config?.interface || selected?.interface || manualIface.trim();
    if (!iface) return toast.error('Configure a thermal printer first');
    testPrint.mutate({ interface: iface, paper_width: paperWidth });
  };

  const canSave = mode === 'os' ? !!selectedOsPrinter : !!(selected || manualIface.trim());

  return (
    <div className="space-y-5">
      {/* Current status */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-600 text-sm text-gray-700">Current Printer</h3>
          {config && (
            <button onClick={() => clearConfig.mutate()} className="text-xs text-red-500 hover:underline flex items-center gap-1">
              <X size={12} /> Disconnect
            </button>
          )}
        </div>
        {config ? (
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
            <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-600 text-green-800 truncate">{config.label || config.os_printer_name || config.interface}</p>
              <p className="text-xs text-green-600 capitalize">{config.mode === 'os' ? `Standard Printer · ${config.paper_size || 'A4'}` : `Thermal · ${config.paper_width || 80}mm`}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Printer size={18} className="text-gray-400" />
            <p className="text-sm text-gray-400">No printer configured</p>
          </div>
        )}
      </div>

      {/* Mode toggle */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <h3 className="font-display font-600 text-sm text-gray-700 mb-3">Printer Mode</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode('thermal')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
              mode === 'thermal' ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Printer size={22} className={mode === 'thermal' ? 'text-[var(--primary)]' : 'text-gray-400'} />
            <span className={`text-sm font-600 ${mode === 'thermal' ? 'text-[var(--primary)]' : 'text-gray-600'}`}>Thermal Receipt</span>
            <span className="text-[10px] text-gray-400 text-center">ESC/POS · 58mm / 80mm roll</span>
          </button>
          <button
            onClick={() => setMode('os')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
              mode === 'os' ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Monitor size={22} className={mode === 'os' ? 'text-[var(--primary)]' : 'text-gray-400'} />
            <span className={`text-sm font-600 ${mode === 'os' ? 'text-[var(--primary)]' : 'text-gray-600'}`}>Standard Printer</span>
            <span className="text-[10px] text-gray-400 text-center">HP · Canon · Brother · Any OS printer</span>
          </button>
        </div>
      </div>

      {/* Thermal mode UI */}
      {mode === 'thermal' && (
        <>
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-600 text-sm text-gray-700">Auto-Discover Printers</h3>
              <button
                onClick={handleDiscover}
                disabled={discover.isPending}
                className="flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
              >
                {discover.isPending ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                {discover.isPending ? 'Scanning...' : 'Scan Network'}
              </button>
            </div>
            <p className="text-xs text-gray-400">Scans your local network for ESC/POS printers on port 9100, and lists USB printer paths.</p>
            {discovered.length > 0 && (
              <div className="space-y-2">
                {discovered.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelected(p); setManualIface(''); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      selected?.interface === p.interface ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {p.type === 'tcp' ? <Wifi size={16} className="text-blue-500 flex-shrink-0" /> : <Usb size={16} className="text-purple-500 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-600 text-gray-800 truncate">{p.label}</p>
                      <p className="text-xs text-gray-400 font-mono truncate">{p.interface}</p>
                    </div>
                    {selected?.interface === p.interface && <CheckCircle2 size={16} className="text-[var(--primary)] ml-auto flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-display font-600 text-sm text-gray-700">Manual Configuration</h3>
            <div>
              <label className="block text-xs font-600 text-gray-600 mb-1">Printer Interface</label>
              <input
                value={manualIface}
                onChange={(e) => { setManualIface(e.target.value); setSelected(null); }}
                placeholder="tcp://192.168.1.100:9100  or  //./USB001  or  /dev/usb/lp0"
                className="w-full h-10 px-3 rounded-lg border text-sm font-mono outline-none focus:border-[var(--primary)]"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                TCP: <code>tcp://IP:9100</code> · Win USB: <code>//./USB001</code> · Linux USB: <code>/dev/usb/lp0</code>
              </p>
            </div>
            <div>
              <label className="block text-xs font-600 text-gray-600 mb-1">Paper Width</label>
              <div className="flex gap-3">
                {[58, 80].map((w) => (
                  <button
                    key={w}
                    onClick={() => setPaperWidth(w)}
                    className={`flex-1 h-10 rounded-lg border text-sm font-600 transition-colors ${
                      paperWidth === w ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {w}mm
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* OS mode UI */}
      {mode === 'os' && (
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-600 text-sm text-gray-700">System Printers</h3>
            <button
              onClick={handleFetchOsPrinters}
              disabled={fetchOsPrinters.isPending}
              className="flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
            >
              {fetchOsPrinters.isPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {fetchOsPrinters.isPending ? 'Loading...' : 'Refresh Printers'}
            </button>
          </div>
          <p className="text-xs text-gray-400">Lists all printers installed in Windows. Click Refresh to load them.</p>

          {osPrinters.length > 0 && (
            <div className="space-y-2">
              {osPrinters.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedOsPrinter(p.name)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    selectedOsPrinter === p.name ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Monitor size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-800 truncate flex-1">{p.name}</span>
                  {selectedOsPrinter === p.name && <CheckCircle2 size={16} className="text-[var(--primary)] flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {selectedOsPrinter && osPrinters.length === 0 && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-700 font-600">{selectedOsPrinter}</p>
              <p className="text-[10px] text-blue-500 mt-0.5">Saved printer — click Refresh Printers to reload list</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-600 text-gray-600 mb-1">Paper Size</label>
            <div className="flex gap-3">
              {['A4', 'Letter'].map((s) => (
                <button
                  key={s}
                  onClick={() => setPaperSize(s)}
                  className={`flex-1 h-10 rounded-lg border text-sm font-600 transition-colors ${
                    paperSize === s ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {mode === 'thermal' && (
          <button
            onClick={handleTest}
            disabled={testPrint.isPending || (!config && !selected && !manualIface)}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border border-gray-300 text-sm font-600 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {testPrint.isPending ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
            Test Print
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saveConfig.isPending || !canSave}
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-[var(--primary)] text-white text-sm font-600 hover:bg-[var(--primary-dark)] disabled:opacity-50"
        >
          {saveConfig.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save Printer
        </button>
      </div>
    </div>
  );
}

/* ─── Backup Tab ─────────────────────────────────────────────────────────────── */
function BackupSettings() {
  const { data: status, isLoading } = useBackupStatus();
  const createSnapshot = useCreateSnapshot();
  const [showWizard, setShowWizard] = useState(false);

  const handleBackupNow = () => {
    createSnapshot.mutate('manual', {
      onSuccess: () => toast.success('Backup created successfully'),
      onError: (e) => toast.error(e.response?.data?.error || 'Backup failed'),
    });
  };

  const lastBackup = status?.last_backup
    ? new Date(status.last_backup).toLocaleString('en-IN')
    : 'Never';
  const dbSizeMB = status?.db_size_bytes
    ? (status.db_size_bytes / (1024 * 1024)).toFixed(2)
    : '—';

  return (
    <div className="space-y-5">

      {/* Local Backup — always active */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <h3 className="font-display font-600 text-sm text-gray-700 mb-4">Local Backup</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-green-50 border border-green-100">
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-sm font-600 text-green-800">Always Active</span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Local Copies</p>
            <div className="flex items-center gap-2">
              <Database size={13} className="text-gray-400" />
              <span className="text-sm font-600 text-gray-800">{status?.local_backup_count ?? '—'} files (last 30 kept)</span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Last Backup</p>
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-gray-400" />
              <span className="text-sm font-600 text-gray-800">{lastBackup}</span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Database Size</p>
            <div className="flex items-center gap-2">
              <Database size={13} className="text-gray-400" />
              <span className="text-sm font-600 text-gray-800">{dbSizeMB} MB</span>
            </div>
          </div>
        </div>
        {status?.local_backup_dir && (
          <p className="text-[11px] text-gray-400 mt-3">
            Saved to: <code className="bg-gray-100 px-1 rounded">{status.local_backup_dir}</code>
          </p>
        )}
        <p className="text-[11px] text-gray-400 mt-1">Backup runs on every startup + daily at 2:00 AM automatically.</p>
      </div>

      {/* Cloud Backup */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <h3 className="font-display font-600 text-sm text-gray-700 mb-4">Cloud Backup (Cloudflare R2)</h3>
        <div className="flex items-center gap-3 p-3 rounded-xl border mb-4"
          style={{ background: status?.cloud_configured ? '#F0FDF4' : '#FFFBEB', borderColor: status?.cloud_configured ? '#BBF7D0' : '#FDE68A' }}>
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${status?.cloud_configured ? 'bg-green-500' : 'bg-yellow-400'}`} />
          <div>
            <p className="text-sm font-600" style={{ color: status?.cloud_configured ? '#166534' : '#92400E' }}>
              {status?.cloud_configured ? 'Connected to Cloudflare R2' : 'Not configured (optional)'}
            </p>
            {!status?.cloud_configured && (
              <p className="text-xs text-yellow-700 mt-0.5">
                Add <code>R2_ENDPOINT</code>, <code>R2_BUCKET</code>, <code>R2_ACCESS_KEY_ID</code>, <code>R2_SECRET_ACCESS_KEY</code> to <code>.env</code> to enable cloud backup.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleBackupNow}
            disabled={createSnapshot.isPending}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-[var(--primary)] text-white text-sm font-600 hover:bg-[var(--primary-dark)] disabled:opacity-50"
          >
            {createSnapshot.isPending ? <Loader2 size={15} className="animate-spin" /> : <CloudUpload size={15} />}
            {createSnapshot.isPending ? 'Backing up...' : 'Backup Now'}
          </button>
          <button
            onClick={() => setShowWizard(true)}
            disabled={!status?.cloud_configured}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border border-gray-300 text-sm font-600 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            title={!status?.cloud_configured ? 'Configure R2 to enable cloud restore' : ''}
          >
            <Database size={15} />
            Restore from Cloud
          </button>
        </div>
      </div>

      {showWizard && <RestoreWizard onClose={() => setShowWizard(false)} />}
    </div>
  );
}

const FEATURE_LABELS = {
  billing: 'Billing',
  inventory: 'Inventory',
  whatsapp: 'WhatsApp',
  reports: 'GST Reports',
};

/* ─── License Tab ─────────────────────────────────────────────────────────── */
function LicenseSettings() {
  const { data: status, isLoading, refetch, isFetching } = useLicenseStatus();
  const activate = useActivateLicense();
  const verify = useVerifyLicense();
  const resetHwidMutation = useResetHwid();
  const { data: lanData, refetch: refetchQr, isFetching: qrFetching } = useLanQr();

  const [keyInput, setKeyInput] = useState('');
  const [resetKeyInput, setResetKeyInput] = useState('');
  const [showReset, setShowReset] = useState(false);

  const handleActivate = () => {
    if (!keyInput.trim()) return toast.error('Enter a license key');
    activate.mutate(keyInput.trim(), {
      onSuccess: () => { toast.success('License activated!'); setKeyInput(''); },
      onError: (e) => toast.error(e.response?.data?.error || 'Activation failed'),
    });
  };

  const handleVerify = () => {
    verify.mutate(undefined, {
      onSuccess: (d) => {
        toast.success(d.online ? 'License verified online' : 'Grace period valid (offline)');
        refetch();
      },
      onError: (e) => toast.error(e.response?.data?.error || 'Verification failed'),
    });
  };

  const handleReset = () => {
    if (!resetKeyInput.trim()) return toast.error('Enter the license key to reset');
    resetHwidMutation.mutate(resetKeyInput.trim(), {
      onSuccess: (d) => {
        toast.success(`HWID reset. ${d.resetsRemaining} reset(s) remaining.`);
        setResetKeyInput('');
        setShowReset(false);
      },
      onError: (e) => toast.error(e.response?.data?.error || 'Reset failed'),
    });
  };

  const handleSyncNow = () => {
    verify.mutate(undefined, {
      onSuccess: () => { toast.success('Synced with server'); refetch(); },
      onError: () => { refetch(); toast('Offline — showing cached status', { icon: 'ℹ️' }); },
    });
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-400" /></div>;

  const features = status?.features || {};

  return (
    <div className="space-y-5">
      {/* Status card */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-600 text-sm text-gray-700">License Status</h3>
          <button
            onClick={handleSyncNow}
            disabled={verify.isPending || isFetching}
            className="flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {(verify.isPending || isFetching) ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Sync Now
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <div className="flex items-center gap-2">
              {status?.activated ? (
                <BadgeCheck size={14} className="text-green-500" />
              ) : (
                <BadgeX size={14} className="text-red-400" />
              )}
              <span className={`text-sm font-600 ${status?.activated ? 'text-green-700' : 'text-red-600'}`}>
                {status?.activated ? 'Active' : 'Not Activated'}
              </span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Plan</p>
            <span className="text-sm font-600 text-gray-800 capitalize">{status?.plan || '—'}</span>
          </div>
          {status?.customerName && (
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Registered To</p>
              <span className="text-sm font-600 text-gray-800">{status.customerName}</span>
            </div>
          )}
          {status?.expiresAt && (
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Expires</p>
              <span className="text-sm font-600 text-gray-800">{new Date(status.expiresAt).toLocaleDateString('en-IN')}</span>
            </div>
          )}
          {status?.lastVerified && (
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Last Synced</p>
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-gray-400" />
                <span className="text-sm font-600 text-gray-800">{new Date(status.lastVerified).toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}
          {status?.hwid && (
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Device ID</p>
              <span className="font-mono text-xs text-gray-600">{status.hwid}</span>
            </div>
          )}
        </div>
      </div>

      {/* Feature toggles (read-only — managed from admin portal) */}
      {status?.activated && (
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-display font-600 text-sm text-gray-700 mb-3">Enabled Features</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(FEATURE_LABELS).map(([key, label]) => {
              const enabled = features[key] !== false; // default true if not explicitly false
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 ${
                    enabled ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  {enabled
                    ? <BadgeCheck size={16} className="text-[var(--primary)] flex-shrink-0" />
                    : <BadgeX size={16} className="text-gray-300 flex-shrink-0" />
                  }
                  <span className={`text-sm font-600 ${enabled ? 'text-[var(--primary)]' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-400 mt-3">Features are managed by your admin. Changes sync automatically every 5 minutes.</p>
        </div>
      )}

      {/* Activate / verify */}
      {!status?.activated ? (
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-display font-600 text-sm text-gray-700 mb-3">Activate License</h3>
          <div className="flex gap-2">
            <input
              value={keyInput}
              onChange={e => setKeyInput(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="flex-1 h-10 px-3 rounded-lg border text-sm font-mono outline-none focus:border-[var(--primary)]"
            />
            <button
              onClick={handleActivate}
              disabled={activate.isPending}
              className="flex items-center gap-2 px-4 h-10 rounded-lg bg-[var(--primary)] text-white text-sm font-600 hover:bg-[var(--primary-dark)] disabled:opacity-50"
            >
              {activate.isPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              Activate
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Your license key was provided at purchase. Contact support if you lost it.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-display font-600 text-sm text-gray-700 mb-3">Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleVerify}
              disabled={verify.isPending}
              className="flex items-center gap-2 px-4 h-10 rounded-lg bg-[var(--primary)] text-white text-sm font-600 hover:bg-[var(--primary-dark)] disabled:opacity-50"
            >
              {verify.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Verify Now
            </button>
            <button
              onClick={() => setShowReset(v => !v)}
              className="flex items-center gap-2 px-4 h-10 rounded-lg border border-gray-300 text-sm font-600 text-gray-700 hover:bg-gray-50"
            >
              <RotateCcw size={14} />
              Reset Device Binding
            </button>
          </div>
          {showReset && (
            <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200 space-y-3">
              <p className="text-xs text-red-700 font-600">⚠ This removes the hardware binding. You have a maximum of 2 resets per license.</p>
              <div className="flex gap-2">
                <input
                  value={resetKeyInput}
                  onChange={e => setResetKeyInput(e.target.value.toUpperCase())}
                  placeholder="Re-enter license key to confirm"
                  className="flex-1 h-10 px-3 rounded-lg border border-red-200 text-sm font-mono outline-none focus:border-red-400"
                />
                <button
                  onClick={handleReset}
                  disabled={resetHwidMutation.isPending}
                  className="flex items-center gap-2 px-4 h-10 rounded-lg bg-red-600 text-white text-sm font-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {resetHwidMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Confirm Reset
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LAN QR */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-display font-600 text-sm text-gray-700">LAN Access — Other Devices</h3>
          <button
            onClick={() => refetchQr()}
            disabled={qrFetching}
            className="flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {qrFetching ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Refresh QR
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4">Scan with your phone on the same network to open AgriBill Pro.</p>
        {lanData ? (
          <div className="flex items-center gap-5">
            <img src={lanData.qr} alt="LAN QR" className="w-36 h-36 border rounded-xl" />
            <div>
              <p className="text-xs text-gray-500 mb-1">Network URL</p>
              <p className="font-mono text-sm font-600 text-[var(--primary)]">{lanData.url}</p>
              <p className="text-[11px] text-gray-400 mt-2">Make sure port 3000 is allowed in Windows Firewall.</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-gray-400" /></div>
        )}
      </div>

      {/* Setup instructions */}
      {!status?.activated && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <AlertTriangle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-600 text-blue-800">Supabase not configured</p>
            <p className="text-xs text-blue-700 mt-1">To enable license enforcement, add <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> to your <code>.env</code>. Create the <code>licenses</code> table in your Supabase project (SQL in the implementation guide).</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Settings ─────────────────────────────────────────────────────────── */
export default function Settings() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const fileInputRef = useRef(null);

  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const initialTab = searchParams.get('tab') || 'shop';
  const [activeTab, setActiveTab] = useState(initialTab);

  const { data, isLoading } = useQuery({
    queryKey: ['shop-profile'],
    queryFn: () => shopApi.getProfile().then(r => r.data.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (data) {
      reset({
        shop_name: data.shop_name || '',
        owner_name: data.owner_name || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        gstin: data.gstin || '',
        fssai_number: data.fssai_number || '',
        upi_id: data.upi_id || '',
        invoice_prefix: data.invoice_prefix || 'AGR',
        terms_conditions: data.terms_conditions || '',
        low_stock_threshold: data.low_stock_threshold ?? 5,
        expiry_reminder_days: data.expiry_reminder_days ?? 30,
      });
    }
  }, [data, reset]);

  const updateMutation = useMutation({
    mutationFn: (payload) => shopApi.updateProfile(payload),
    onSuccess: (res) => {
      toast.success('Shop settings updated successfully');
      // Reset form with saved values so isDirty resets → prevents double-save bug
      const saved = res.data?.data;
      if (saved) {
        reset({
          shop_name: saved.shop_name || '',
          owner_name: saved.owner_name || '',
          phone: saved.phone || '',
          address: saved.address || '',
          city: saved.city || '',
          state: saved.state || '',
          pincode: saved.pincode || '',
          gstin: saved.gstin || '',
          fssai_number: saved.fssai_number || '',
          upi_id: saved.upi_id || '',
          invoice_prefix: saved.invoice_prefix || 'AGR',
          terms_conditions: saved.terms_conditions || '',
          low_stock_threshold: saved.low_stock_threshold ?? 5,
          expiry_reminder_days: saved.expiry_reminder_days ?? 30,
        });
      }
      qc.invalidateQueries(['shop-profile']);
      qc.invalidateQueries(['auth-me']);
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const uploadLogoMutation = useMutation({
    mutationFn: (formData) => shopApi.uploadLogo(formData),
    onSuccess: () => {
      toast.success('Logo uploaded successfully');
      qc.invalidateQueries(['shop-profile']);
    },
    onError: () => toast.error('Failed to upload logo'),
  });

  const onSubmit = (formData) => updateMutation.mutate(formData);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('File size must be < 2MB');
    const formData = new FormData();
    formData.append('logo', file);
    uploadLogoMutation.mutate(formData);
  };

  if (isLoading) return <div className="p-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto h-8 w-8"/></div>;

  const TABS = [
    { key: 'shop', label: 'Shop Info', icon: Store },
    { key: 'printer', label: 'Printer', icon: Printer },
    { key: 'backup', label: 'Backup', icon: Database },
    { key: 'license', label: 'License', icon: ShieldCheck },
    { key: 'updates', label: 'Updates', icon: ArrowUpCircle },
  ];

  return (
    <div className="page-enter space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="font-display font-700 text-xl text-gray-900">{t('settings.title')}</h1>
        <p className="font-body text-sm mt-0.5 text-gray-500">
          Configure your profile, billing details, alerts, and hardware
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-600 border-b-2 transition-colors -mb-px ${
              activeTab === key
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'printer' ? (
        <PrinterSettings />
      ) : activeTab === 'backup' ? (
        <BackupSettings />
      ) : activeTab === 'license' ? (
        <LicenseSettings />
      ) : activeTab === 'updates' ? (
        <UpdatesTab />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Logo Section */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm text-center">
              <h3 className="font-display font-600 text-sm mb-4 text-gray-700">Shop Logo</h3>
              <div
                className="w-32 h-32 mx-auto rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden bg-gray-50 group mb-4"
              >
                {data?.logo_path ? (
                  <img src={data.logo_path} alt="Logo" className="w-full h-full object-contain p-2" crossOrigin="anonymous" />
                ) : (
                  <Store size={32} className="text-gray-300" />
                )}
                <div
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="text-white" size={24} />
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg, image/png, image/webp"
                onChange={handleLogoUpload}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadLogoMutation.isPending}
                className="text-sm font-500 text-white bg-[var(--primary)] px-4 py-2 rounded-lg hover:bg-[var(--primary-dark)] transition-colors w-full flex justify-center items-center gap-2"
              >
                {uploadLogoMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                Upload New Logo
              </button>
              <p className="text-[10px] text-gray-400 mt-3 font-body">Max size: 2MB (JPEG, PNG, WEBP)</p>
            </div>

            <div className="bg-[#FFFBEB] rounded-xl p-5 border border-[#F4C430] border-opacity-30">
              <div className="flex items-start gap-2 text-yellow-800">
                <FileText size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-600 font-display mb-1">Invoice Prefix & Counter</p>
                  <p className="text-[11px] opacity-80 font-body leading-tight">Your bills will generate sequentially like <strong>{data?.invoice_prefix}-0001</strong> based on your prefix setting.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="md:col-span-2">
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>

              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-display font-600 text-sm border-b pb-2 text-gray-700">General Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-600 text-gray-700 mb-1">Shop Name</label>
                    <input {...register('shop_name')} className="w-full h-10 px-3 rounded-lg border text-sm outline-none focus:border-[var(--primary)]" />
                    {errors.shop_name && <p className="text-red-500 text-[10px] mt-1">{errors.shop_name.message}</p>}
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-600 text-gray-700 mb-1">Owner Name</label>
                    <input {...register('owner_name')} className="w-full h-10 px-3 rounded-lg border text-sm outline-none focus:border-[var(--primary)]" />
                    {errors.owner_name && <p className="text-red-500 text-[10px] mt-1">{errors.owner_name.message}</p>}
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-600 text-gray-700 mb-1">Phone Number</label>
                    <input {...register('phone')} className="w-full h-10 px-3 rounded-lg border text-sm outline-none focus:border-[var(--primary)]" />
                    {errors.phone && <p className="text-red-500 text-[10px] mt-1">{errors.phone.message}</p>}
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-600 text-gray-700 mb-1">WhatsApp Enabled</label>
                    <div className="h-10 flex items-center px-3 border rounded-lg bg-gray-50 text-sm text-gray-500">
                      {data?.whatsapp_enabled ? 'Yes (Connected to API)' : 'Manage in WhatsApp Tab'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-display font-600 text-sm border-b pb-2 text-gray-700">Address Details</h3>
                <div className="grid grid-cols-6 gap-4">
                  <div className="col-span-6">
                    <label className="block text-xs font-600 text-gray-700 mb-1">Full Address</label>
                    <input {...register('address')} className="w-full h-10 px-3 rounded-lg border text-sm outline-none focus:border-[var(--primary)]" />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block text-xs font-600 text-gray-700 mb-1">City/Village</label>
                    <input {...register('city')} className="w-full h-10 px-3 rounded-lg border text-sm outline-none focus:border-[var(--primary)]" />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block text-xs font-600 text-gray-700 mb-1">State</label>
                    <input {...register('state')} className="w-full h-10 px-3 rounded-lg border text-sm outline-none focus:border-[var(--primary)]" />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block text-xs font-600 text-gray-700 mb-1">Pincode</label>
                    <input {...register('pincode')} className="w-full h-10 px-3 rounded-lg border text-sm outline-none focus:border-[var(--primary)]" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-display font-600 text-sm border-b pb-2 text-gray-700">Billing & GST Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-600 text-gray-700 mb-1">GSTIN Number</label>
                    <input {...register('gstin')} className="w-full h-10 px-3 rounded-lg border text-sm outline-none focus:border-[var(--primary)] placeholder-gray-300" placeholder="e.g. 27AAAAA0000A1Z5" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-600 text-gray-700 mb-1">FSSAI / License Number (Optional)</label>
                    <input {...register('fssai_number')} className="w-full h-10 px-3 rounded-lg border text-sm outline-none focus:border-[var(--primary)]" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-600 text-gray-700 mb-1">UPI ID for QR Code</label>
                    <input {...register('upi_id')} className="w-full h-10 px-3 rounded-lg border text-sm outline-none focus:border-[var(--primary)]" placeholder="shopname@ybl" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-600 text-gray-700 mb-1">Invoice Prefix</label>
                    <input {...register('invoice_prefix')} className="w-full h-10 px-3 rounded-lg border text-sm outline-none focus:border-[var(--primary)] uppercase" />
                    {errors.invoice_prefix && <p className="text-red-500 text-[10px] mt-1">{errors.invoice_prefix.message}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-600 text-gray-700 mb-1">Terms & Conditions (Printed on Bill)</label>
                    <textarea {...register('terms_conditions')} className="w-full border rounded-lg p-3 text-sm focus:border-[var(--primary)] outline-none min-h-[80px]" placeholder="Goods once sold will not be taken back..." />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-display font-600 text-sm border-b pb-2 text-gray-700">Alerts & Reminders</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-600 text-gray-700 mb-1">Low Stock Alert Threshold</label>
                    <div className="relative">
                      <input type="number" min={1} {...register('low_stock_threshold')} className="w-full h-10 pl-3 pr-12 rounded-lg border text-sm outline-none focus:border-[var(--primary)]" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">units</span>
                    </div>
                    {errors.low_stock_threshold && <p className="text-red-500 text-[10px] mt-1">{errors.low_stock_threshold.message}</p>}
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-600 text-gray-700 mb-1">Expiry Reminder Days Before</label>
                    <div className="relative">
                      <input type="number" min={1} {...register('expiry_reminder_days')} className="w-full h-10 pl-3 pr-12 rounded-lg border text-sm outline-none focus:border-[var(--primary)]" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">days</span>
                    </div>
                    {errors.expiry_reminder_days && <p className="text-red-500 text-[10px] mt-1">{errors.expiry_reminder_days.message}</p>}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={!isDirty || updateMutation.isPending}
                  className="flex items-center gap-2 h-11 px-6 rounded-lg text-white font-display font-600 transition-all focus:scale-95 disabled:cursor-not-allowed"
                  style={{ background: isDirty ? 'var(--primary-dark)' : 'var(--gray-300)', opacity: updateMutation.isPending ? 0.7 : 1 }}
                >
                  {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {updateMutation.isPending ? t('settings.saving') : t('settings.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

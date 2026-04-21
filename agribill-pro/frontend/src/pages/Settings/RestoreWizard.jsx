import { useState } from 'react';
import { AlertTriangle, ChevronRight, CheckCircle2, Loader2, RefreshCw, Database, Clock, HardDrive } from 'lucide-react';
import { useListSnapshots, useRestoreSnapshot } from '../../hooks/useBackup.js';
import { formatDate } from '../../utils/formatDate.js';

const STEPS = ['Select Backup', 'Confirm', 'Restoring'];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function RestoreWizard({ onClose }) {
  const [step, setStep] = useState(0);
  const [snapshots, setSnapshots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [restoreDone, setRestoreDone] = useState(false);

  const listSnapshots = useListSnapshots();
  const restoreSnapshot = useRestoreSnapshot();

  const handleLoadSnapshots = async () => {
    const data = await listSnapshots.mutateAsync();
    setSnapshots(data || []);
  };

  const handleNext = () => {
    if (step === 0 && selected) setStep(1);
    else if (step === 1 && confirmText === 'RESTORE') handleRestore();
  };

  const handleRestore = async () => {
    setStep(2);
    try {
      await restoreSnapshot.mutateAsync(selected.key);
      setRestoreDone(true);
    } catch {
      setStep(1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-700 transition-colors ${
                  i < step ? 'bg-green-500 text-white'
                  : i === step ? 'bg-[var(--primary)] text-white'
                  : 'bg-gray-100 text-gray-400'
                }`}>
                  {i < step ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span className={`text-xs font-600 ${i === step ? 'text-[var(--primary)]' : 'text-gray-400'}`}>{s}</span>
                {i < STEPS.length - 1 && <ChevronRight size={14} className="text-gray-300" />}
              </div>
            ))}
          </div>
          <h2 className="font-display font-700 text-lg text-gray-900">Restore from Backup</h2>
        </div>

        {/* Step 0: Select */}
        {step === 0 && (
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-500">Choose a backup snapshot from Cloudflare R2 to restore your database.</p>
            <div className="flex justify-end">
              <button
                onClick={handleLoadSnapshots}
                disabled={listSnapshots.isPending}
                className="flex items-center gap-2 text-xs font-600 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
              >
                {listSnapshots.isPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {listSnapshots.isPending ? 'Loading...' : 'Load Backups'}
              </button>
            </div>

            {snapshots.length === 0 && !listSnapshots.isPending && (
              <div className="py-8 text-center text-gray-400">
                <Database size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Click "Load Backups" to fetch available restore points</p>
              </div>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {snapshots.map((snap, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(snap)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                    selected?.key === snap.key
                      ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Database size={16} className="text-[var(--primary)] flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-600 text-gray-800 truncate">{snap.label}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <Clock size={10} />
                        {snap.last_modified ? new Date(snap.last_modified).toLocaleString('en-IN') : '—'}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <HardDrive size={10} />
                        {formatBytes(snap.size)}
                      </span>
                    </div>
                  </div>
                  {selected?.key === snap.key && <CheckCircle2 size={16} className="text-[var(--primary)] flex-shrink-0" />}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onClose} className="px-4 py-2 text-sm font-600 text-gray-600 hover:text-gray-800">Cancel</button>
              <button
                onClick={handleNext}
                disabled={!selected}
                className="px-5 py-2 text-sm font-600 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Confirm */}
        {step === 1 && (
          <div className="p-6 space-y-5">
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-700 text-red-800 mb-1">This action cannot be undone</p>
                <p className="text-xs text-red-600">All current data will be replaced with the selected backup. The app will restart automatically after restore.</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Selected backup</p>
              <p className="text-sm font-600 text-gray-800 truncate">{selected?.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {selected?.last_modified ? new Date(selected.last_modified).toLocaleString('en-IN') : ''} · {formatBytes(selected?.size || 0)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-600 text-gray-700 mb-2">
                Type <span className="font-mono text-red-600 bg-red-50 px-1 rounded">RESTORE</span> to confirm
              </label>
              <input
                autoFocus
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="Type RESTORE"
                className="w-full h-10 px-3 rounded-lg border text-sm font-mono outline-none focus:border-red-400"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setStep(0)} className="px-4 py-2 text-sm font-600 text-gray-600 hover:text-gray-800">Back</button>
              <button
                onClick={handleNext}
                disabled={confirmText !== 'RESTORE' || restoreSnapshot.isPending}
                className="px-5 py-2 text-sm font-700 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                Restore Database
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Restoring */}
        {step === 2 && (
          <div className="p-10 text-center space-y-4">
            {!restoreDone ? (
              <>
                <Loader2 size={40} className="animate-spin text-[var(--primary)] mx-auto" />
                <p className="font-display font-600 text-gray-800">Restoring database...</p>
                <p className="text-sm text-gray-500">Downloading from Cloudflare R2 and applying restore.</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} className="text-green-600" />
                </div>
                <p className="font-display font-700 text-lg text-gray-900">Restore Complete!</p>
                <p className="text-sm text-gray-500">The app is restarting. Please wait a few seconds and refresh the page.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 px-6 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-600 hover:bg-[var(--primary-dark)]"
                >
                  Refresh Page
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

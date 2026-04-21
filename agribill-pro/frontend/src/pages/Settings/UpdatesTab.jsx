import { useState } from 'react';
import { RefreshCw, Download, CheckCircle2, AlertTriangle, Loader2, RotateCcw, ArrowUpCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUpdateCheck, useDownloadUpdate, useApplyUpdate } from '../../hooks/useUpdater.js';

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UpdatesTab() {
  const { data: info, isLoading: checking, refetch, isFetching } = useUpdateCheck();
  const dl = useDownloadUpdate();
  const applyMutation = useApplyUpdate();

  const handleApply = () => {
    applyMutation.mutate(dl.sha256 || undefined, {
      onSuccess: () => toast.success('Update applied! App will restart shortly.'),
      onError: (e) => toast.error(e?.response?.data?.error || 'Failed to apply update'),
    });
  };

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h3 className="text-base font-700 text-gray-900 mb-0.5">App Updates</h3>
        <p className="text-xs text-gray-400">Automatic background updates keep AgriBill Pro secure and feature-rich.</p>
      </div>

      {/* Current version card */}
      <div className="bg-[var(--surface-card)] rounded-xl border border-gray-100 p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
          <ArrowUpCircle size={20} className="text-[var(--primary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500">Installed version</p>
          <p className="font-700 text-gray-900">v{info?.currentVersion || '—'}</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {isFetching ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Check now
        </button>
      </div>

      {/* Update status */}
      {checking && !info && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" /> Checking for updates…
        </div>
      )}

      {info && !info.updateAvailable && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
          <CheckCircle2 size={16} className="shrink-0" />
          You're on the latest version.
        </div>
      )}

      {info?.forceUpdate && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-600">Critical update required</p>
            <p className="text-xs mt-0.5">v{info.currentVersion} is no longer supported. Minimum required: v{info.minVersion}.</p>
          </div>
        </div>
      )}

      {info?.updateAvailable && (
        <div className="bg-[var(--surface-card)] rounded-xl border border-blue-100 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-700 text-gray-900">v{info.latestVersion} available</p>
              <p className="text-xs text-gray-500 mt-0.5">{info.releaseDate}</p>
            </div>
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-600">
              {formatBytes(info.size)} {info.isDelta ? '(delta)' : '(full)'}
            </span>
          </div>

          {info.releaseNotes && (
            <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-600">
              <span className="font-600 text-gray-700">Release notes: </span>
              {info.releaseNotes}
            </div>
          )}

          {/* Download progress */}
          {(dl.status === 'downloading' || dl.status === 'done') && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>{dl.status === 'done' ? 'Download complete' : `Downloading… ${dl.percent}%`}</span>
                <span>{formatBytes(dl.downloaded)} / {formatBytes(dl.total)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-[var(--primary)] transition-all duration-300"
                  style={{ width: `${dl.percent}%` }}
                />
              </div>
            </div>
          )}

          {dl.status === 'error' && (
            <div className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertTriangle size={13} /> {dl.error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {dl.status !== 'done' ? (
              <button
                onClick={dl.status === 'downloading' ? dl.cancel : dl.start}
                disabled={!info.downloadUrl}
                className="flex items-center gap-1.5 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-600 hover:bg-[var(--primary-dark)] disabled:opacity-40 transition-colors"
              >
                {dl.status === 'downloading' ? (
                  <><RotateCcw size={14} /> Cancel</>
                ) : (
                  <><Download size={14} /> {dl.status === 'error' ? 'Retry Download' : 'Download Update'}</>
                )}
              </button>
            ) : (
              <button
                onClick={handleApply}
                disabled={applyMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {applyMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Apply & Restart
              </button>
            )}
          </div>

          {!info.downloadUrl && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <Info size={12} /> No download URL configured in update manifest.
            </p>
          )}
        </div>
      )}

      <div className="text-xs text-gray-400 flex items-start gap-1.5 pt-1">
        <Info size={12} className="shrink-0 mt-0.5" />
        <span>
          Updates are downloaded in the background. The app restarts automatically to apply changes.
          Configure <code className="bg-gray-100 px-1 rounded">UPDATE_MANIFEST_URL</code> in <code className="bg-gray-100 px-1 rounded">.env</code> to point to your update server.
        </span>
      </div>
    </div>
  );
}

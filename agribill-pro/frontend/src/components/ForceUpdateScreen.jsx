import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { useUpdateCheck } from '../hooks/useUpdater.js';

export default function ForceUpdateScreen() {
  const { data, isLoading } = useUpdateCheck();
  const navigate = useNavigate();

  if (isLoading || !data || !data.forceUpdate) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/95 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldAlert size={32} className="text-red-600" />
          </div>
        </div>

        <h2 className="text-xl font-700 text-gray-900 mb-2">Update Required</h2>
        <p className="text-gray-500 text-sm mb-1">
          Your version <span className="font-600 text-gray-700">v{data.currentVersion}</span> is no longer supported.
        </p>
        <p className="text-gray-500 text-sm mb-6">
          Please update to <span className="font-600 text-[var(--primary)]">v{data.latestVersion}</span> to continue.
        </p>

        {data.releaseNotes && (
          <div className="text-left bg-gray-50 rounded-lg p-3 mb-6 text-xs text-gray-600">
            <p className="font-600 text-gray-700 mb-1">What's new:</p>
            <p>{data.releaseNotes}</p>
          </div>
        )}

        <button
          onClick={() => navigate('/settings?tab=updates')}
          className="flex items-center justify-center gap-2 w-full h-11 bg-[var(--primary)] text-white rounded-lg font-600 hover:bg-[var(--primary-dark)] transition-colors"
        >
          Download Update <ArrowRight size={16} />
        </button>

        <p className="text-xs text-gray-400 mt-3">
          You must update to access AgriBill Pro. Contact support if you need help.
        </p>
      </div>
    </div>
  );
}

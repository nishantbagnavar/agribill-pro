import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, X, ArrowRight } from 'lucide-react';
import { useUpdateCheck } from '../hooks/useUpdater.js';

export default function UpdateBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { data } = useUpdateCheck();
  const navigate = useNavigate();

  if (!data || !data.updateAvailable || data.forceUpdate || dismissed) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-blue-600 text-white text-sm">
      <Download size={15} className="shrink-0" />
      <span className="flex-1">
        <span className="font-600">AgriBill Pro {data.latestVersion}</span> is available.{' '}
        {data.releaseNotes && <span className="opacity-80">{data.releaseNotes.slice(0, 80)}{data.releaseNotes.length > 80 ? '…' : ''}</span>}
      </span>
      <button
        onClick={() => navigate('/settings?tab=updates')}
        className="flex items-center gap-1 px-3 py-1 bg-white text-blue-600 rounded font-600 text-xs hover:bg-blue-50"
      >
        Update <ArrowRight size={12} />
      </button>
      <button onClick={() => setDismissed(true)} className="opacity-70 hover:opacity-100">
        <X size={15} />
      </button>
    </div>
  );
}

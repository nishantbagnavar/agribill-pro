const MAP = {
  active:    { dot: 'bg-green-500',  bg: 'bg-green-50',  text: 'text-green-700',  label: 'Active' },
  trial:     { dot: 'bg-blue-400',   bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Trial' },
  suspended: { dot: 'bg-red-500',    bg: 'bg-red-50',    text: 'text-red-700',    label: 'Suspended' },
  expired:   { dot: 'bg-orange-400', bg: 'bg-orange-50', text: 'text-orange-700', label: 'Expired' },
  offline:   { dot: 'bg-gray-400',   bg: 'bg-gray-100',  text: 'text-gray-600',   label: 'Offline' },
};

export default function StatusBadge({ status }) {
  const s = MAP[status] ?? MAP.offline;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-display font-500 ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  );
}

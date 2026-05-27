import type { Status } from '../../types';

const statusConfig: Record<Status, { bg: string; text: string; dot: string }> = {
  'To Do':              { bg: '#f0eeea', text: '#888888', dot: '#888888' },
  'In Progress':        { bg: '#e8ebf1', text: '#344161', dot: '#344161' },
  'In Review':          { bg: '#edf0e8', text: '#4f5c2e', dot: '#747440' },
  'Partially Approved': { bg: '#f7f1e3', text: '#9a7336', dot: '#c99d5d' },
  'Done':               { bg: '#edf2ef', text: '#4a6b5c', dot: '#6f8e7c' },
};

export default function StatusChip({ status }: { status: Status }) {
  const cfg = statusConfig[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
      {status}
    </span>
  );
}

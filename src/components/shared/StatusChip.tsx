import type { Status } from '../../types';

const statusConfig: Record<Status, { bg: string; text: string; dot: string }> = {
  'To Do':             { bg: '#F3F4F6', text: '#6B7280', dot: '#6B7280' },
  'In Progress':       { bg: '#EFF6FF', text: '#3B82F6', dot: '#3B82F6' },
  'In Review':         { bg: '#F5F3FF', text: '#8B5CF6', dot: '#8B5CF6' },
  'Partially Approved':{ bg: '#FFFBEB', text: '#D97706', dot: '#F59E0B' },
  'Done':              { bg: '#ECFDF5', text: '#10B981', dot: '#10B981' },
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

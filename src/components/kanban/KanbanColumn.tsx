import { Plus } from 'lucide-react';
import type { ContentRequest, Status } from '../../types';
import KanbanCard from './KanbanCard';
import { useApp } from '../../context/AppContext';

const STATUS_COLORS: Record<Status, string> = {
  'To Do':       '#6B7280',
  'In Progress': '#3B82F6',
  'In Review':   '#8B5CF6',
  'Done':        '#10B981',
};

interface KanbanColumnProps {
  status: Status;
  requests: ContentRequest[];
}

export default function KanbanColumn({ status, requests }: KanbanColumnProps) {
  const { openModal } = useApp();
  const color = STATUS_COLORS[status];

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[13px] font-semibold text-gray-700">{status}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
            {requests.length}
          </span>
        </div>
        <button
          onClick={() => openModal({ type: 'new-request' })}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={`Add request to ${status}`}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Cards */}
      <div className="space-y-2.5 flex-1">
        {requests.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
            <p className="text-xs text-gray-400">No requests</p>
          </div>
        ) : (
          requests.map(req => <KanbanCard key={req.id} req={req} />)
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, CheckSquare, Square } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getUrgency } from '../../utils/deadlineUtils';
import Badge from '../shared/Badge';
import StatusChip from '../shared/StatusChip';
import RoundBadge from '../shared/RoundBadge';
import Avatar from '../shared/Avatar';
import type { ContentRequest, Status } from '../../types';

const SECTIONS: { status: Status; label: string }[] = [
  { status: 'To Do',       label: 'To Do' },
  { status: 'In Progress', label: 'In Progress' },
  { status: 'In Review',   label: 'In Review (Waiting on me)' },
  { status: 'Done',        label: 'Done' },
];

function Section({
  label, requests, open, onToggle,
}: {
  label: string; requests: ContentRequest[]; open: boolean; onToggle: () => void;
}) {
  const { openModal, users } = useApp();
  if (requests.length === 0) return null;
  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 mb-2 group"
        aria-expanded={open}
      >
        {open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
        <span className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
        <span className="text-[11px] text-gray-400 font-medium">({requests.length})</span>
      </button>

      {open && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {requests.map((req, i) => {
            const urgency = getUrgency(req);
            const urgent = urgency === 'urgent' || urgency === 'overdue';
            const reviewers = req.reviewerIds.map(id => users.find(u => u.id === id)).filter(Boolean);

            return (
              <div
                key={req.id}
                className={`flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}
                onClick={() => openModal({ type: 'designer-task', requestId: req.id })}
              >
                <div className="flex-shrink-0 text-gray-300 hover:text-gray-400">
                  {req.status === 'Done' ? <CheckSquare size={15} className="text-emerald-500" /> : <Square size={15} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-800 truncate">{req.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <RoundBadge round={req.currentRound} />
                    <span className="text-[11px] text-gray-400 font-mono">{req.id}</span>
                  </div>
                </div>
                <Badge pipeline={req.pipeline} />
                <StatusChip status={req.status} />
                <span className={`text-[12px] font-medium w-20 text-right ${urgent ? 'text-red-500' : 'text-gray-500'}`}>
                  {format(req.postDate, 'MMM d')}
                </span>
                <div className="flex -space-x-1">
                  {reviewers.slice(0, 3).map(u => u && (
                    <Avatar key={u.id} initials={u.initials} color={u.avatarColor} size="sm" title={u.name} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MyTasksView() {
  const { filteredRequests: requests, currentUser } = useApp();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'To Do': true,
    'In Progress': true,
    'In Review': true,
    'Done': false,
  });

  const myRequests = requests.filter(r =>
    r.assigneeIds.includes(currentUser.id) || r.requesterId === currentUser.id
  );
  const activeCount = myRequests.filter(r => r.status !== 'Done').length;
  const assignedCount = myRequests.length;

  const toggle = (status: string) => {
    setOpenSections(prev => ({ ...prev, [status]: !prev[status] }));
  };

  return (
    <div className="flex flex-col h-full px-6 py-4">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">
          {currentUser.name.split(' ')[0]}'s tasks
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {assignedCount} assigned · {activeCount} active
        </p>
      </div>

      {SECTIONS.map(({ status, label }) => (
        <Section
          key={status}
          label={label}
          requests={myRequests.filter(r => r.status === status)}
          open={openSections[status] ?? false}
          onToggle={() => toggle(status)}
        />
      ))}

      {myRequests.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">No tasks assigned to you.</p>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ChevronDown, Flag, X, CalendarDays, Clock, Users, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Badge from '../shared/Badge';
import StatusChip from '../shared/StatusChip';
import Avatar from '../shared/Avatar';
import DateRangePicker from '../shared/DateRangePicker';
import type { DateRange } from '../../context/AppContext';
import type { ContentRequest, Priority } from '../../types';

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; dot: string }> = {
  high:   { label: 'High',   color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
  medium: { label: 'Medium', color: '#d97706', bg: '#fef3c7', dot: '#f59e0b' },
  low:    { label: 'Low',    color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' },
};

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortByPriority(reqs: ContentRequest[]): ContentRequest[] {
  return [...reqs].sort((a, b) => {
    const pa = a.priority != null ? PRIORITY_ORDER[a.priority] : 3;
    const pb = b.priority != null ? PRIORITY_ORDER[b.priority] : 3;
    return pa - pb;
  });
}

function inRange(date: Date, range: DateRange): boolean {
  if (!range.start) return true;
  const end = range.end ?? range.start;
  return isWithinInterval(date, { start: startOfDay(range.start), end: endOfDay(end) });
}

function PriorityPicker({ priority, onChange }: { priority?: Priority; onChange: (p: Priority) => void }) {
  const [open, setOpen] = useState(false);
  const cfg = priority ? PRIORITY_CONFIG[priority] : null;

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors hover:opacity-90"
        style={cfg
          ? { backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.dot + '44' }
          : { backgroundColor: '#f9fafb', color: '#9ca3af', borderColor: '#e5e7eb' }
        }
      >
        <Flag size={10} />
        {cfg ? cfg.label : 'Priority'}
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 bottom-full mb-1.5 bg-white border border-gray-100 rounded-xl z-50 py-1.5 min-w-[120px]"
            style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)' }}
          >
            {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]).map(([key, c]) => (
              <button
                key={key}
                onClick={() => { onChange(key); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.dot }} />
                <span className="text-[12px] font-medium" style={{ color: c.color }}>{c.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TaskRow({ req, isLast, showAssignees }: { req: ContentRequest; isLast: boolean; showAssignees?: boolean }) {
  const { openModal, updateRequest, users } = useApp();
  const cfg = req.priority ? PRIORITY_CONFIG[req.priority] : null;

  const assignees = showAssignees
    ? req.assigneeIds.map(id => users.find(u => u.id === id)).filter(Boolean) as typeof users
    : [];

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/80 transition-colors ${!isLast ? 'border-b border-gray-50' : ''}`}
      onClick={() => openModal({ type: 'designer-task', requestId: req.id })}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: cfg ? cfg.dot : '#e5e7eb' }}
        title={cfg ? cfg.label : 'No priority'}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-800 truncate leading-snug">{req.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-mono text-gray-400">{req.id}</span>
          {showAssignees && (
            assignees.length === 0 ? (
              <span className="text-[10px] text-gray-300 italic">Unassigned</span>
            ) : (
              <div className="flex items-center -space-x-1">
                {assignees.slice(0, 3).map(u => (
                  <div key={u.id} className="ring-2 ring-white rounded-full" title={u.name}>
                    <Avatar initials={u.initials} color={u.avatarColor} size="sm" />
                  </div>
                ))}
                {assignees.length > 3 && (
                  <span className="text-[10px] text-gray-400 pl-2">+{assignees.length - 3}</span>
                )}
              </div>
            )
          )}
        </div>
      </div>

      <div className="w-36 flex-shrink-0">
        <Badge pipeline={req.pipeline} />
      </div>
      <div className="w-32 flex-shrink-0">
        <StatusChip status={req.status} />
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0 w-20">
        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
          <Clock size={8} className="text-amber-500" />
          {format(req.internalDeadline, 'MMM d')}
        </span>
        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
          <CalendarDays size={8} className="text-blue-400" />
          {format(req.postDate, 'MMM d')}
        </span>
      </div>
      <div className="w-24 flex-shrink-0 flex justify-end">
        <PriorityPicker
          priority={req.priority}
          onChange={p => updateRequest(req.id, { priority: p })}
        />
      </div>
    </div>
  );
}

const EMPTY_RANGE: DateRange = { start: null, end: null };

export default function MyTasksView() {
  const { filteredRequests, requests: allRequests, currentUser } = useApp();

  const [tab, setTab]               = useState<'me' | 'team'>('me');
  const [dueDateRange, setDueDateRange]   = useState<DateRange>(EMPTY_RANGE);
  const [postDateRange, setPostDateRange] = useState<DateRange>(EMPTY_RANGE);

  const hasFilters = dueDateRange.start !== null || postDateRange.start !== null;
  const clearFilters = () => { setDueDateRange(EMPTY_RANGE); setPostDateRange(EMPTY_RANGE); };

  // ── Me tab ────────────────────────────────────────────────────────────────
  const myTasks = sortByPriority(
    filteredRequests.filter(r =>
      r.assigneeIds.includes(currentUser.id) &&
      inRange(r.internalDeadline, dueDateRange) &&
      inRange(r.postDate, postDateRange)
    )
  );
  const totalAssigned = filteredRequests.filter(r => r.assigneeIds.includes(currentUser.id)).length;
  const activeCount   = myTasks.filter(r => r.status !== 'Approved' && r.status !== 'Posted').length;
  const highCount     = myTasks.filter(r => r.priority === 'high').length;

  // ── Team tab ──────────────────────────────────────────────────────────────
  const teamTasks = sortByPriority(
    allRequests.filter(r =>
      inRange(r.internalDeadline, dueDateRange) &&
      inRange(r.postDate, postDateRange)
    )
  );
  const teamActive = teamTasks.filter(r => r.status !== 'Approved' && r.status !== 'Posted').length;
  const teamHigh   = teamTasks.filter(r => r.priority === 'high').length;

  const tasks       = tab === 'me' ? myTasks : teamTasks;
  const isEmpty     = tasks.length === 0;

  return (
    <div className="flex flex-col h-full px-6 py-5" style={{ background: '#f5f2e9' }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div className="flex flex-col gap-2">

          {/* Title + toggle */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">Tasks</h2>

            {/* Me / Team pill toggle */}
            <div
              className="flex items-center rounded-xl border border-gray-200 bg-white p-0.5 gap-0.5"
              style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
            >
              <button
                onClick={() => setTab('me')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                  tab === 'me'
                    ? 'bg-[#a9674d] text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <User size={12} />
                Me
              </button>
              <button
                onClick={() => setTab('team')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                  tab === 'team'
                    ? 'bg-[#a9674d] text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users size={12} />
                Team
              </button>
            </div>
          </div>

          {/* Stats subtitle */}
          <div className="flex items-center gap-3 flex-wrap">
            {tab === 'me' ? (
              <>
                <span className="text-sm text-gray-500">
                  {totalAssigned} assigned · {activeCount} active
                  {hasFilters && myTasks.length !== totalAssigned && ` · ${myTasks.length} shown`}
                </span>
                {highCount > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                    <Flag size={9} /> {highCount} high priority
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="text-sm text-gray-500">
                  {allRequests.length} total · {teamActive} active
                  {hasFilters && teamTasks.length !== allRequests.length && ` · ${teamTasks.length} shown`}
                </span>
                {teamHigh > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                    <Flag size={9} /> {teamHigh} high priority
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Date filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
              <Clock size={11} className="text-amber-500" /> Due date
            </span>
            <DateRangePicker value={dueDateRange} onChange={setDueDateRange} />
          </div>

          <span className="w-px h-5 bg-gray-200 flex-shrink-0" />

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
              <CalendarDays size={11} className="text-blue-400" /> Post date
            </span>
            <DateRangePicker value={postDateRange} onChange={setPostDateRange} />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-gray-500 hover:text-gray-700 border border-gray-200 bg-white transition-colors"
            >
              <X size={10} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <span className="text-4xl">{hasFilters ? '🔍' : tab === 'me' ? '✅' : '📋'}</span>
          <p className="text-sm text-gray-500 font-medium">
            {hasFilters
              ? 'No tasks match the selected dates.'
              : tab === 'me'
                ? 'No tasks assigned to you.'
                : 'No tasks in the organisation yet.'}
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-[#a9674d] hover:underline">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 4px 12px rgba(15,23,42,0.04)' }}
        >
          {/* Table header */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50/60">
            <span className="w-2 flex-shrink-0" />
            <span className="flex-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Task</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-36 flex-shrink-0">Category</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-32 flex-shrink-0">Status</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-20 flex-shrink-0 text-right">
              Due · Post
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24 flex-shrink-0 text-right">Priority</span>
          </div>

          {tasks.map((req, i) => (
            <TaskRow
              key={req.id}
              req={req}
              isLast={i === tasks.length - 1}
              showAssignees={tab === 'team'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

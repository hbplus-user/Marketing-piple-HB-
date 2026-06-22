import { useState, useEffect, useMemo } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  isSameMonth, addMonths, subMonths, format, startOfWeek, endOfWeek,
  startOfDay, endOfDay, isWithinInterval,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, CalendarCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { pipelineConfig } from '../shared/Badge';
import { isRedAlert } from '../../utils/deadlineUtils';
import { canViewAllRequests } from '../../utils/permissions';

export default function CalendarView() {
  const {
    requests: allRequests,
    openModal,
    dateRange,
    activePipelines,
    currentUser,
    dateFilterTypes,
    toggleDateFilterType,
  } = useApp();
  const [current, setCurrent] = useState(new Date());

  // Calendar uses its own month navigation — apply only the pipeline filter,
  // not the global date range (which filters by postDate and would hide tasks
  // whose internalDeadline is in the visible month but postDate is outside the range).
  const requests = useMemo(() => {
    let result = allRequests;
    if (!canViewAllRequests(currentUser.role)) {
      result = result.filter(r =>
        r.requesterId === currentUser.id ||
        r.ownerId === currentUser.id ||
        r.assigneeIds.includes(currentUser.id) ||
        r.reviewerIds.includes(currentUser.id)
      );
    }
    if (activePipelines.length > 0) {
      result = result.filter(r => activePipelines.includes(r.pipeline));
    }
    if (dateRange.start) {
      const start = startOfDay(dateRange.start);
      const end = dateRange.end ? endOfDay(dateRange.end) : null;
      result = result.filter(r => {
        const matchesPost = dateFilterTypes.includes('post') && (
          end ? isWithinInterval(r.postDate, { start, end }) : r.postDate >= start
        );
        const matchesDue = dateFilterTypes.includes('due') && (
          end ? isWithinInterval(r.internalDeadline, { start, end }) : r.internalDeadline >= start
        );
        return matchesPost || matchesDue;
      });
    }
    return result;
  }, [allRequests, activePipelines, dateRange, dateFilterTypes, currentUser]);
  const today = new Date();

  useEffect(() => {
    if (dateRange.start) setCurrent(dateRange.start);
  }, [dateRange.start]);

  const monthStart = startOfMonth(current);
  const monthEnd   = endOfMonth(current);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd     = endOfWeek(monthEnd,   { weekStartsOn: 0 });
  const days       = eachDayOfInterval({ start: calStart, end: calEnd });

  const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900">{format(current, 'MMMM yyyy')}</h2>
          {dateRange.start && (
            <span className="text-[11px] text-indigo-500 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">
              Filtered view
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Legend / Interactive Toggles */}
          <div className="flex items-center gap-1 text-[11px] border border-gray-100 rounded-lg p-0.5 bg-[#fcfbfa]">
            <button
              onClick={() => toggleDateFilterType('due')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                dateFilterTypes.includes('due')
                  ? 'bg-amber-50 text-amber-800 font-semibold border border-amber-200/40'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 border border-transparent'
              }`}
            >
              <Clock size={11} className={dateFilterTypes.includes('due') ? "text-amber-600" : "text-gray-300"} />
              Internal deadline
            </button>
            <span className="w-px h-3 bg-gray-200 self-center" />
            <button
              onClick={() => toggleDateFilterType('post')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                dateFilterTypes.includes('post')
                  ? 'bg-blue-50 text-blue-800 font-semibold border border-blue-200/40'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 border border-transparent'
              }`}
            >
              <CalendarCheck size={11} className={dateFilterTypes.includes('post') ? "text-blue-600" : "text-gray-300"} />
              Post date
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrent(subMonths(current, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrent(new Date())}
              className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100 text-gray-600 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setCurrent(addMonths(current, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-[11px] font-semibold text-gray-400 text-center py-1.5 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 flex-1 border-l border-t border-gray-100">
        {days.map(day => {
          const dayMs = day.getTime();
          const inRange = !dateRange.start || (
            dayMs >= startOfDay(dateRange.start).getTime() &&
            (!dateRange.end || dayMs <= endOfDay(dateRange.end).getTime())
          );

          // Tasks whose internal deadline falls on this day (only if 'due' filter is enabled and in range)
          const deadlineReqs = (dateFilterTypes.includes('due') && inRange)
            ? requests.filter(r => isSameDay(r.internalDeadline, day))
            : [];
          
          // Tasks whose post date falls on this day (only if 'post' filter is enabled and in range)
          const postReqs = (dateFilterTypes.includes('post') && inRange)
            ? requests.filter(r => isSameDay(r.postDate, day))
            : [];
          
          // Avoid double-showing if deadline === postDate (only relevant if both are enabled)
          const postOnly = dateFilterTypes.includes('due')
            ? postReqs.filter(r => !isSameDay(r.internalDeadline, day))
            : postReqs;

          const isToday        = isSameDay(day, today);
          const isCurrentMonth = isSameMonth(day, current);
          const totalCount     = deadlineReqs.length + postOnly.length;
          const MAX_VISIBLE    = 3;

          return (
            <div
              key={day.toISOString()}
              className={`border-r border-b border-gray-100 p-1.5 min-h-[110px] transition-all ${
                !inRange
                  ? 'bg-gray-50/40 opacity-45'
                  : !isCurrentMonth ? 'bg-gray-50/50' : 'bg-white'
              }`}
            >
              {/* Day number */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1.5 ${
                isToday
                  ? 'bg-indigo-600 text-white'
                  : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'
              }`}>
                {format(day, 'd')}
              </div>

              <div className="space-y-0.5">
                {/* Deadline chips — amber */}
                {deadlineReqs.slice(0, MAX_VISIBLE).map(req => {
                  const alert = isRedAlert(req);
                  return (
                    <button
                      key={`dl-${req.id}`}
                      onClick={() => openModal({ type: 'designer-task', requestId: req.id })}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate transition-opacity hover:opacity-80 flex items-center gap-0.5 ${
                        alert ? 'ring-1 ring-red-400' : ''
                      }`}
                      style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                      title={`Due: ${req.title}`}
                    >
                      <Clock size={8} className="flex-shrink-0 text-amber-600" />
                      <span className="truncate">{req.title}</span>
                    </button>
                  );
                })}

                {/* Post date chips — pipeline color */}
                {postOnly.slice(0, Math.max(0, MAX_VISIBLE - deadlineReqs.length)).map(req => {
                  const color = pipelineConfig[req.pipeline]?.dot ?? '#6B7280';
                  const bg    = pipelineConfig[req.pipeline]?.bg  ?? '#F3F4F6';
                  const alert = isRedAlert(req);
                  return (
                    <button
                      key={`post-${req.id}`}
                      onClick={() => openModal({ type: 'designer-task', requestId: req.id })}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate transition-opacity hover:opacity-80 flex items-center gap-0.5 ${
                        alert ? 'ring-1 ring-red-400' : ''
                      }`}
                      style={{ backgroundColor: bg, color }}
                      title={`Live: ${req.title}`}
                    >
                      <CalendarCheck size={8} className="flex-shrink-0" style={{ color }} />
                      <span className="truncate">{req.title}</span>
                    </button>
                  );
                })}

                {totalCount > MAX_VISIBLE && (
                  <p className="text-[10px] text-gray-400 px-1">+{totalCount - MAX_VISIBLE} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

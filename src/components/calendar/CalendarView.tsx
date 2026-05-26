import { useState } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  isSameMonth, addMonths, subMonths, format, startOfWeek, endOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { pipelineConfig } from '../shared/Badge';
import { isRedAlert } from '../../utils/deadlineUtils';

export default function CalendarView() {
  const { filteredRequests: requests, openModal } = useApp();
  const [current, setCurrent] = useState(new Date());
  const today = new Date();

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">
          {format(current, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
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
          const dayRequests = requests.filter(r => isSameDay(r.postDate, day));
          const isToday = isSameDay(day, today);
          const isCurrentMonth = isSameMonth(day, current);

          return (
            <div
              key={day.toISOString()}
              className={`border-r border-b border-gray-100 p-1.5 min-h-[100px] ${
                !isCurrentMonth ? 'bg-gray-50/50' : 'bg-white'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1 ${
                isToday
                  ? 'bg-indigo-600 text-white'
                  : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'
              }`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayRequests.slice(0, 3).map(req => {
                  const color = pipelineConfig[req.pipeline]?.dot ?? '#6B7280';
                  const bg = pipelineConfig[req.pipeline]?.bg ?? '#F3F4F6';
                  const alert = isRedAlert(req);
                  return (
                    <button
                      key={req.id}
                      onClick={() => openModal({ type: 'designer-task', requestId: req.id })}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate transition-opacity hover:opacity-80 ${
                        alert ? 'ring-1 ring-red-400' : ''
                      }`}
                      style={{ backgroundColor: bg, color }}
                      title={req.title}
                    >
                      {req.title}
                    </button>
                  );
                })}
                {dayRequests.length > 3 && (
                  <p className="text-[10px] text-gray-400 px-1">+{dayRequests.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

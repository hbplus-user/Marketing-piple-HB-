import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, startOfWeek, endOfWeek, isSameDay,
  isSameMonth, isToday, startOfDay, endOfDay, addDays,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, X, Clock, CalendarCheck } from 'lucide-react';
import { useApp, type DateRange } from '../../context/AppContext';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  type?: 'due' | 'post';
}

const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function DateRangePicker({ value, onChange, type }: DateRangePickerProps) {
  const context = useApp();
  const dateFilterTypes = context?.dateFilterTypes ?? [];
  const toggleDateFilterType = context?.toggleDateFilterType ?? (() => {});
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date());
  const [hoverDay, setHoverDay] = useState<Date | null>(null);
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [tempStart, setTempStart] = useState<Date | null>(value.start);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTempStart(value.start);
      setSelecting(value.start ? 'end' : 'start');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const handleDayClick = (day: Date) => {
    if (selecting === 'start') {
      setTempStart(day);
      setSelecting('end');
    } else {
      if (tempStart && day < tempStart) {
        onChange({ start: day, end: tempStart });
      } else {
        onChange({ start: tempStart, end: day });
      }
      setOpen(false);
      setSelecting('start');
    }
  };

  const isInRange = (day: Date) => {
    const start = tempStart;
    const end = selecting === 'end' ? (hoverDay ?? value.end) : value.end;
    if (!start || !end) return false;
    const lo = start <= end ? start : end;
    const hi = start <= end ? end : start;
    return day > lo && day < hi;
  };

  const isRangeStart = (day: Date) => {
    const s = value.start ?? tempStart;
    return !!s && isSameDay(day, s) && selecting !== 'start';
  };

  const isRangeEnd = (day: Date) => {
    const e = selecting === 'end' ? (hoverDay ?? value.end) : value.end;
    return !!e && isSameDay(day, e);
  };

  const isActive = type 
    ? (value.start !== null && dateFilterTypes.includes(type))
    : value.start !== null;

  const label = () => {
    if (!type) {
      if (!value.start) return 'Date range';
      if (!value.end || isSameDay(value.start, value.end)) return format(value.start, 'MMM d');
      return `${format(value.start, 'MMM d')} – ${format(value.end, 'MMM d')}`;
    }

    const baseText = type === 'due' ? 'Due Date' : 'Post Date';
    if (!isActive || !value.start) return baseText;
    
    if (!value.end || isSameDay(value.start, value.end)) {
      return `${baseText}  |  ${format(value.start, 'MMM d, yyyy')}`;
    }
    return `${baseText}  |  ${format(value.start, 'MMM d, yyyy')} - ${format(value.end, 'MMM d, yyyy')}`;
  };

  const handleTriggerClick = () => {
    if (type && !dateFilterTypes.includes(type)) {
      toggleDateFilterType(type);
    }
    setOpen(v => !v);
  };

  const clearRange = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (type) {
      if (dateFilterTypes.length > 1) {
        toggleDateFilterType(type);
      } else {
        onChange({ start: null, end: null });
      }
    } else {
      onChange({ start: null, end: null });
    }
    setTempStart(null);
    setSelecting('start');
  };

  return (
    <div ref={containerRef} className="relative" style={{ zIndex: 50 }}>
      {/* Trigger */}
      <button
        onClick={handleTriggerClick}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all cursor-pointer ${
          isActive 
            ? type === 'due'
              ? 'text-[#92400e] bg-[#fef3c7] border-[#f59e0b]/30'
              : type === 'post'
                ? 'text-[#1e40af] bg-[#dbeafe] border-[#3b82f6]/30'
                : 'text-white border-transparent'
            : 'text-[#a89e8e] bg-white border-[#ede0d0] hover:text-[#53372b]'
        }`}
        style={isActive ? (
          type
            ? {
                boxShadow: type === 'due'
                  ? 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 4px rgba(245,158,11,0.15)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 4px rgba(59,130,246,0.15)',
              }
            : {
                background: 'linear-gradient(160deg, #c47d61 0%, #8a4f39 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 3px 10px rgba(169,103,77,0.4)',
              }
        ) : {
          boxShadow: '0 1px 2px rgba(83,55,43,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
        }}
        aria-label={type ? `${type === 'due' ? 'Due Date' : 'Post Date'} filter` : 'Date range filter'}
        aria-expanded={open}
      >
        {!type ? (
          <CalendarDays size={13} className={isActive ? 'text-[#f5ece7]' : 'text-[#c4b5a4]'} />
        ) : type === 'due' ? (
          <Clock size={13} className={isActive ? 'text-[#d97706]' : 'text-[#c4b5a4]'} />
        ) : (
          <CalendarCheck size={13} className={isActive ? 'text-[#2563eb]' : 'text-[#c4b5a4]'} />
        )}
        <span>{label()}</span>
        {isActive && (
          <span
            onClick={clearRange}
            className="ml-1.5 flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
            style={type ? { color: type === 'due' ? '#92400e' : '#1e40af' } : { color: 'white' }}
            role="button"
            aria-label="Clear date filter"
          >
            <X size={10} />
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 z-50 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-1"
            style={{
              width: 300,
              background: 'white',
              boxShadow: '0 4px 24px rgba(83,55,43,0.12), 0 1px 4px rgba(83,55,43,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
              border: '1px solid rgba(237,224,208,0.9)',
            }}
          >
            <div className="p-4">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setMonth(subMonths(month, 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[#a89e8e] transition-all hover:text-[#53372b] cursor-pointer"
                  style={{
                    background: 'white',
                    boxShadow: '0 1px 3px rgba(83,55,43,0.09), inset 0 1px 0 rgba(255,255,255,0.9)',
                    border: '1px solid rgba(237,224,208,0.9)',
                  }}
                  aria-label="Previous month"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="font-display text-[14px] font-bold text-[#1a1a1a]">
                  {format(month, 'MMMM yyyy')}
                </span>
                <button
                  onClick={() => setMonth(addMonths(month, 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[#a89e8e] transition-all hover:text-[#53372b] cursor-pointer"
                  style={{
                    background: 'white',
                    boxShadow: '0 1px 3px rgba(83,55,43,0.09), inset 0 1px 0 rgba(255,255,255,0.9)',
                    border: '1px solid rgba(237,224,208,0.9)',
                  }}
                  aria-label="Next month"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAY_HEADERS.map(d => (
                  <div key={d} className="text-[10px] font-bold text-[#c4b5a4] text-center py-1 uppercase tracking-wider">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {days.map(day => {
                  const inRange = isInRange(day);
                  const rangeStart = isRangeStart(day);
                  const rangeEnd = isRangeEnd(day);
                  const todayDay = isToday(day);
                  const inMonth = isSameMonth(day, month);
                  const isSelected = rangeStart || rangeEnd;

                  return (
                    <div
                      key={day.toISOString()}
                      className={`relative flex items-center justify-center ${
                        rangeStart && !rangeEnd ? 'rounded-l-full' : ''
                      } ${rangeEnd && !rangeStart ? 'rounded-r-full' : ''} ${
                        rangeStart && rangeEnd ? 'rounded-full' : ''
                      }`}
                      style={inRange ? { background: '#f5ece7' } : {}}
                    >
                      <button
                        onClick={() => handleDayClick(day)}
                        onMouseEnter={() => selecting === 'end' && setHoverDay(day)}
                        onMouseLeave={() => setHoverDay(null)}
                        className={`w-8 h-8 text-[12px] font-semibold rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'text-white'
                            : todayDay
                              ? 'text-[#a9674d]'
                              : inMonth
                                ? 'text-[#53372b] hover:bg-[#f5ece7] hover:text-[#a9674d]'
                                : 'text-[#c4b5a4] hover:bg-[#f5f2e9]'
                        }`}
                        style={isSelected ? {
                          background: 'linear-gradient(160deg, #c47d61 0%, #8a4f39 100%)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 2px 8px rgba(169,103,77,0.45)',
                        } : todayDay ? {
                          border: '1.5px solid #a9674d',
                        } : {}}
                        aria-label={format(day, 'MMM d, yyyy')}
                        aria-pressed={isSelected}
                      >
                        {format(day, 'd')}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Hint */}
              <p className="text-[11px] text-[#c4b5a4] text-center mt-3 font-medium">
                {selecting === 'start' || !tempStart
                  ? 'Click to set start date'
                  : `Start: ${format(tempStart, 'MMM d')} — click to set end date`}
              </p>

              {/* Quick picks */}
              <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: '#ede0d0' }}>
                {[
                  {
                    label: 'This Week',
                    getRange: () => ({
                      start: startOfDay(startOfWeek(new Date(), { weekStartsOn: 1 })),
                      end: endOfDay(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6)),
                    }),
                  },
                  {
                    label: 'Next 30 days',
                    getRange: () => ({
                      start: startOfDay(new Date()),
                      end: endOfDay(addDays(new Date(), 29)),
                    }),
                  },
                ].map(p => (
                  <button
                    key={p.label}
                    onClick={() => {
                      onChange(p.getRange());
                      setOpen(false);
                      setSelecting('start');
                      setTempStart(null);
                    }}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                    style={{ color: '#a9674d', background: '#f5ece7' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f0e3db')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#f5ece7')}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

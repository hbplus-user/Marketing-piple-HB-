import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, startOfWeek, endOfWeek, isSameDay,
  isSameMonth, isToday, startOfDay, endOfDay,
  addDays, startOfWeek as startOfThisWeek, endOfWeek as endOfThisWeek,
  startOfMonth as startOfThisMonth, endOfMonth as endOfThisMonth,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { DateRange } from '../../context/AppContext';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS = [
  { label: 'Today',      getRange: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }) },
  { label: 'This Week',  getRange: () => ({ start: startOfThisWeek(new Date(), { weekStartsOn: 1 }), end: endOfThisWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: 'This Month', getRange: () => ({ start: startOfThisMonth(new Date()), end: endOfThisMonth(new Date()) }) },
  { label: 'Next 7 days',getRange: () => ({ start: startOfDay(new Date()), end: endOfDay(addDays(new Date(), 6)) }) },
  { label: 'Next 30 days',getRange: () => ({ start: startOfDay(new Date()), end: endOfDay(addDays(new Date(), 29)) }) },
];

const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
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

  // Sync tempStart when picker opens
  useEffect(() => {
    if (open) { setTempStart(value.start); setSelecting(value.start ? 'end' : 'start'); }
  }, [open]);

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

  const hasValue = value.start !== null;

  const label = () => {
    if (!value.start) return null;
    if (!value.end) return format(value.start, 'MMM d');
    if (isSameDay(value.start, value.end)) return format(value.start, 'MMM d');
    return `${format(value.start, 'MMM d')} – ${format(value.end, 'MMM d')}`;
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    onChange(preset.getRange());
    setOpen(false);
    setSelecting('start');
    setTempStart(null);
  };

  const clearRange = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ start: null, end: null });
    setTempStart(null);
    setSelecting('start');
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
          hasValue
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }`}
        aria-label="Date range filter"
        aria-expanded={open}
      >
        <CalendarDays size={13} className={hasValue ? 'text-indigo-200' : 'text-gray-400'} />
        <span>{label() ?? 'Date range'}</span>
        {hasValue && (
          <span
            onClick={clearRange}
            className="ml-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white/20 hover:bg-white/40 transition-colors cursor-pointer"
            role="button"
            aria-label="Clear date filter"
          >
            <X size={9} />
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
            className="absolute top-full mt-2 left-0 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
            style={{ width: 320 }}
          >
            {/* Presets */}
            <div className="px-3 pt-3 pb-2 border-b border-gray-50">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick select</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar */}
            <div className="p-3">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setMonth(subMonths(month, 1))}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[13px] font-semibold text-gray-800">
                  {format(month, 'MMMM yyyy')}
                </span>
                <button
                  onClick={() => setMonth(addMonths(month, 1))}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAY_HEADERS.map(d => (
                  <div key={d} className="text-[10px] font-semibold text-gray-400 text-center py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {days.map(day => {
                  const inRange = isInRange(day);
                  const rangeStart = isRangeStart(day);
                  const rangeEnd = isRangeEnd(day);
                  const today = isToday(day);
                  const inMonth = isSameMonth(day, month);
                  const isSelected = rangeStart || rangeEnd;

                  return (
                    <div
                      key={day.toISOString()}
                      className={`relative flex items-center justify-center ${inRange ? 'bg-indigo-50' : ''} ${
                        rangeStart ? 'rounded-l-full' : ''
                      } ${rangeEnd ? 'rounded-r-full' : ''} ${
                        rangeStart && rangeEnd ? 'rounded-full' : ''
                      }`}
                    >
                      <button
                        onClick={() => handleDayClick(day)}
                        onMouseEnter={() => selecting === 'end' && setHoverDay(day)}
                        onMouseLeave={() => setHoverDay(null)}
                        className={`w-8 h-8 text-[12px] font-medium rounded-full flex items-center justify-center transition-all
                          ${isSelected
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : today
                              ? 'border border-indigo-400 text-indigo-600'
                              : inMonth
                                ? 'text-gray-700 hover:bg-indigo-100 hover:text-indigo-700'
                                : 'text-gray-300 hover:bg-gray-100'
                          }`}
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
              <p className="text-[11px] text-gray-400 text-center mt-3">
                {selecting === 'start' || !tempStart
                  ? 'Click to set start date'
                  : `Start: ${format(tempStart, 'MMM d')} — click to set end date`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

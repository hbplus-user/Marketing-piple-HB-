import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import DateRangePicker from '../shared/DateRangePicker';
import type { Pipeline, View } from '../../types';

const TABS: { id: View; label: string }[] = [
  { id: 'kanban',    label: 'Kanban View' },
  { id: 'calendar', label: 'Calendar View' },
  { id: 'gantt',    label: 'Gantt View' },
  { id: 'redalert', label: 'Red Alert' },
  { id: 'mytasks',  label: 'My Tasks' },
];

const PIPELINES: { value: Pipeline; label: string; color: string; bg: string }[] = [
  { value: 'PM',           label: 'PM',          color: '#7C3AED', bg: '#F5F3FF' },
  { value: 'Content',      label: 'Content',     color: '#0EA5E9', bg: '#F0F9FF' },
  { value: 'Art / Design', label: 'Art / Design',color: '#EC4899', bg: '#FDF2F8' },
  { value: 'Events',       label: 'Events',      color: '#F59E0B', bg: '#FFFBEB' },
];

export default function ViewTabs() {
  const {
    activeView, setActiveView,
    activePipelines, togglePipeline,
    dateRange, setDateRange,
    clearFilters,
  } = useApp();

  const allActive = activePipelines.length === 0;
  const hasFilters = activePipelines.length > 0 || dateRange.start !== null;

  // Clicking "All" clears only the pipeline selection
  const handleAllClick = () => {
    // Remove each active pipeline one by one to reset to "All"
    [...activePipelines].forEach(p => togglePipeline(p));
  };

  return (
    <div className="bg-white border-b border-gray-100">
      {/* Tab row */}
      <div className="flex items-center gap-1 px-6 py-2 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeView === tab.id
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            aria-current={activeView === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 px-6 py-2.5 border-t border-gray-50 flex-wrap">

        {/* Pipeline filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mr-1">
            Pipeline
          </span>

          {/* All chip */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleAllClick}
            className={`px-2.5 py-1 rounded-full text-[12px] font-medium border transition-all ${
              allActive
                ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-700'
            }`}
            aria-pressed={allActive}
          >
            All
          </motion.button>

          {/* Per-pipeline chips */}
          {PIPELINES.map(p => {
            const active = activePipelines.includes(p.value);
            return (
              <motion.button
                key={p.value}
                whileTap={{ scale: 0.95 }}
                onClick={() => togglePipeline(p.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border transition-all ${
                  active
                    ? 'border-transparent shadow-sm'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
                style={active ? { backgroundColor: p.bg, color: p.color, borderColor: p.color + '44' } : {}}
                aria-pressed={active}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: active ? p.color : '#D1D5DB' }}
                />
                {p.label}
              </motion.button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

        {/* Date range picker */}
        <DateRangePicker value={dateRange} onChange={setDateRange} />

        {/* Clear all filters */}
        <AnimatePresence>
          {hasFilters && (
            <motion.button
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15 }}
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 bg-white transition-colors"
              aria-label="Clear all filters"
            >
              <X size={11} />
              Clear filters
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

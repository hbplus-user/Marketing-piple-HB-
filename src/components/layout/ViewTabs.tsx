import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, CalendarCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import DateRangePicker from '../shared/DateRangePicker';
import type { Pipeline, View } from '../../types';

const TABS: { id: View; label: string }[] = [
  { id: 'kanban',    label: 'Kanban View' },
  { id: 'calendar', label: 'Calendar View' },
  { id: 'gantt',    label: 'Gantt View' },
];


const PIPELINES: { value: Pipeline; label: string; color: string; bg: string }[] = [
  { value: 'PM',                   label: 'PM',                   color: '#344161', bg: '#e8ebf1' },
  { value: 'Organic',              label: 'Organic',              color: '#4a6b5c', bg: '#edf2ef' },
  { value: 'Internal requirement', label: 'Internal requirement', color: '#a9674d', bg: '#f5ece7' },
  { value: 'Events',               label: 'Events',               color: '#9a7336', bg: '#f7f1e3' },
];

export default function ViewTabs() {
  const {
    activeView, setActiveView,
    activePipelines, togglePipeline,
    dateRange, setDateRange,
    dateFilterTypes, toggleDateFilterType,
    clearFilters,
  } = useApp();

  const allActive = activePipelines.length === 0;
  const hasFilters = activePipelines.length > 0 || dateRange.start !== null;

  const handleAllClick = () => {
    [...activePipelines].forEach(p => togglePipeline(p));
  };

  return (
    <div
      className="border-b"
      style={{
        background: 'rgba(245,242,233,0.9)',
        backdropFilter: 'blur(8px)',
        borderColor: '#ede0d0',
        boxShadow: '0 1px 3px rgba(83,55,43,0.04)',
        position: 'relative',
        zIndex: 40,
      }}
    >
      {/* Tab row */}
      <div className="flex items-center gap-1 px-6 py-2 overflow-x-auto">
        {TABS.map(tab => {
          const active = activeView === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveView(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                active ? 'text-[#53372b]' : 'text-[#a89e8e] hover:text-[#53372b] hover:bg-[#ede0d0]/50'
              }`}
              style={active ? {
                background: 'white',
                boxShadow: '0 1px 4px rgba(169,103,77,0.12), 0 3px 10px rgba(169,103,77,0.07), inset 0 1px 0 rgba(255,255,255,1)',
                border: '1px solid rgba(237,224,208,0.8)',
              } : {}}
              aria-current={active ? 'page' : undefined}
            >
              {tab.label}
            </motion.button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 px-6 py-2.5 border-t flex-wrap" style={{ borderColor: '#ede0d0' }}>

        {/* Pipeline filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-[#a89e8e] uppercase tracking-wider mr-1">
            Pipeline
          </span>

          {/* All chip — dark pill */}
          <motion.button
            whileTap={{ scale: 0.95, y: 1 }}
            onClick={handleAllClick}
            className={`px-2.5 py-1 rounded-full text-[12px] font-medium transition-all ${
              allActive ? 'text-[#f5f2e9]' : 'text-[#a89e8e] hover:text-[#53372b] hover:border-[#c4b5a4]'
            }`}
            style={allActive ? {
              background: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 2px 6px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
            } : {
              border: '1px solid #ede0d0',
              background: 'white',
              boxShadow: '0 1px 2px rgba(83,55,43,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
            }}
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
                whileTap={{ scale: 0.95, y: 1 }}
                onClick={() => togglePipeline(p.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium transition-all ${
                  active ? '' : 'text-[#a89e8e] hover:text-[#53372b]'
                }`}
                style={active ? {
                  backgroundColor: p.bg,
                  color: p.color,
                  border: `1px solid ${p.color}44`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 4px ${p.color}28, 0 2px 8px ${p.color}16`,
                } : {
                  border: '1px solid #ede0d0',
                  background: 'white',
                  boxShadow: '0 1px 2px rgba(83,55,43,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
                }}
                aria-pressed={active}
              >
                {/* 3D sphere dot */}
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'inline-block',
                    background: active
                      ? `radial-gradient(circle at 36% 32%, rgba(255,255,255,0.9) 0%, ${p.color} 48%)`
                      : 'radial-gradient(circle at 36% 32%, rgba(255,255,255,0.8) 0%, #C4B5A4 48%)',
                    boxShadow: active ? `0 1px 3px ${p.color}55` : '0 1px 2px rgba(83,55,43,0.15)',
                  }}
                />
                {p.label}
              </motion.button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-5 flex-shrink-0" style={{ background: '#ede0d0' }} />

        {/* Date range filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[11px] font-semibold text-[#a89e8e] uppercase tracking-wider mr-1">
            Filter by
          </span>
          <DateRangePicker value={dateRange} onChange={setDateRange} type="post" />
          <DateRangePicker value={dateRange} onChange={setDateRange} type="due" />
        </div>

        {/* Clear all filters */}
        <AnimatePresence>
          {hasFilters && (
            <motion.button
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15 }}
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium text-[#a89e8e] hover:text-[#53372b] transition-colors"
              style={{
                border: '1px solid #ede0d0',
                background: 'white',
                boxShadow: '0 1px 2px rgba(83,55,43,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
              }}
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

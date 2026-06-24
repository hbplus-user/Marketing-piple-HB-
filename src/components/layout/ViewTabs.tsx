import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, CalendarCheck, ChevronDown, Check } from 'lucide-react';
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

const DATE_MODES = [
  { id: 'all',  label: 'All',       icon: null,          types: ['post', 'due'] as ('post' | 'due')[] },
  { id: 'post', label: 'Post Date', icon: CalendarCheck, types: ['post']        as ('post' | 'due')[] },
  { id: 'due',  label: 'Due Date',  icon: Clock,         types: ['due']         as ('post' | 'due')[] },
];

export default function ViewTabs() {
  const {
    activeView, setActiveView,
    activePipelines, togglePipeline,
    dateRange, setDateRange,
    dateFilterTypes, setDateFilterTypes,
    clearFilters,
  } = useApp();

  const [modeOpen, setModeOpen] = useState(false);
  const modeRef = useRef<HTMLDivElement>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!modeOpen) return;
    const handler = (e: MouseEvent) => {
      if (modeRef.current && !modeRef.current.contains(e.target as Node)) setModeOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modeOpen]);

  useEffect(() => {
    if (!viewOpen) return;
    const handler = (e: MouseEvent) => {
      if (viewRef.current && !viewRef.current.contains(e.target as Node)) setViewOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [viewOpen]);

  const allPipelinesActive = activePipelines.length === 0;
  const hasFilters = activePipelines.length > 0 || dateRange.start !== null;

  const postActive = dateFilterTypes.includes('post');
  const dueActive  = dateFilterTypes.includes('due');
  const currentMode = (postActive && dueActive) ? 'all' : postActive ? 'post' : 'due';
  const currentModeConfig = DATE_MODES.find(m => m.id === currentMode)!;

  const handleAllPipelinesClick = () => {
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
      {/* Filter bar */}
      <div className="flex items-center gap-3 px-6 py-2.5 flex-wrap">

        {/* View switcher dropdown */}
        <div ref={viewRef} className="relative">
          <button
            onClick={() => setViewOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all"
            style={{
              background: 'white',
              border: '1px solid rgba(237,224,208,0.8)',
              color: '#53372b',
              boxShadow: '0 1px 4px rgba(169,103,77,0.10), inset 0 1px 0 rgba(255,255,255,1)',
            }}
          >
            {TABS.find(t => t.id === activeView)?.label ?? 'Dashboard'}
            <ChevronDown size={13} className={`text-[#a89e8e] transition-transform ${viewOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {viewOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.13 }}
                className="absolute top-full mt-1.5 left-0 z-50 overflow-hidden"
                style={{
                  width: 160,
                  background: 'white',
                  borderRadius: 12,
                  border: '1px solid #ede0d0',
                  boxShadow: '0 4px 16px rgba(83,55,43,0.12), 0 1px 4px rgba(83,55,43,0.08)',
                }}
              >
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveView(tab.id); setViewOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-[13px] font-medium text-left transition-colors hover:bg-[#f5f2e9]"
                    style={{ color: activeView === tab.id ? '#53372b' : '#a89e8e' }}
                  >
                    {tab.label}
                    {activeView === tab.id && <Check size={13} className="text-[#a9674d]" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="w-px h-5 flex-shrink-0" style={{ background: '#ede0d0' }} />

        {/* Pipeline filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-[#a89e8e] uppercase tracking-wider mr-1">
            Pipeline
          </span>

          <motion.button
            whileTap={{ scale: 0.95, y: 1 }}
            onClick={handleAllPipelinesClick}
            className={`px-2.5 py-1 rounded-full text-[12px] font-medium transition-all ${
              allPipelinesActive ? 'text-[#f5f2e9]' : 'text-[#a89e8e] hover:text-[#53372b] hover:border-[#c4b5a4]'
            }`}
            style={allPipelinesActive ? {
              background: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 2px 6px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
            } : {
              border: '1px solid #ede0d0',
              background: 'white',
              boxShadow: '0 1px 2px rgba(83,55,43,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
            }}
            aria-pressed={allPipelinesActive}
          >
            All
          </motion.button>

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
                <span
                  style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
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

        {/* Date filter — calendar + mode dropdown */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-[#a89e8e] uppercase tracking-wider mr-1">
            Filter by
          </span>

          {/* Calendar date range picker */}
          <DateRangePicker value={dateRange} onChange={setDateRange} />

          {/* Mode dropdown */}
          <div ref={modeRef} className="relative">
            <button
              onClick={() => setModeOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all"
              style={{
                border: '1px solid #ede0d0',
                background: 'white',
                color: '#53372b',
                boxShadow: '0 1px 2px rgba(83,55,43,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
              }}
              aria-haspopup="listbox"
              aria-expanded={modeOpen}
            >
              {currentModeConfig.icon && (
                <currentModeConfig.icon
                  size={12}
                  className={
                    currentMode === 'post' ? 'text-[#2563eb]' :
                    currentMode === 'due'  ? 'text-[#d97706]' :
                    'text-[#a89e8e]'
                  }
                />
              )}
              <span>{currentModeConfig.label}</span>
              <ChevronDown
                size={11}
                className={`text-[#a89e8e] transition-transform ${modeOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {modeOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.13 }}
                  className="absolute top-full mt-1.5 left-0 z-50 overflow-hidden"
                  style={{
                    width: 140,
                    background: 'white',
                    borderRadius: 12,
                    border: '1px solid #ede0d0',
                    boxShadow: '0 4px 16px rgba(83,55,43,0.12), 0 1px 4px rgba(83,55,43,0.08)',
                  }}
                  role="listbox"
                >
                  {DATE_MODES.map(mode => {
                    const isSelected = currentMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => { setDateFilterTypes(mode.types); setModeOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-left transition-colors hover:bg-[#f5f2e9]"
                        style={{ color: isSelected ? '#53372b' : '#a89e8e' }}
                      >
                        {mode.icon ? (
                          <mode.icon
                            size={12}
                            className={
                              mode.id === 'post' ? 'text-[#2563eb]' :
                              mode.id === 'due'  ? 'text-[#d97706]' :
                              'text-[#a89e8e]'
                            }
                          />
                        ) : (
                          <span className="w-3 h-3 rounded-full bg-[#c4b5a4] flex-shrink-0" style={{ width: 12, height: 12 }} />
                        )}
                        {mode.label}
                        {isSelected && <Check size={11} className="ml-auto text-[#a9674d]" />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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

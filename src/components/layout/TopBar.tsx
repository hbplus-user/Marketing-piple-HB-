import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Plus, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { View } from '../../types';

const VIEW_LABELS: Record<View, { title: string; subtitle: string }> = {
  kanban:    { title: 'Kanban',    subtitle: 'All active content requests' },
  calendar:  { title: 'Calendar', subtitle: 'Requests by post date' },
  gantt:     { title: 'Gantt',    subtitle: 'Timeline & production windows' },
  redalert:  { title: 'Red Alert',subtitle: 'Deadline-critical requests' },
  mytasks:   { title: 'My Tasks', subtitle: 'Assigned to you' },
};

export default function TopBar() {
  const { activeView, openModal } = useApp();
  const [search, setSearch] = useState('');
  const [notify, setNotify] = useState(true);
  const label = VIEW_LABELS[activeView];

  return (
    <header
      className="flex-shrink-0 border-b"
      style={{
        background: 'rgba(245,242,233,0.95)',
        backdropFilter: 'blur(12px)',
        borderColor: '#ede0d0',
        boxShadow: '0 1px 3px rgba(83,55,43,0.06), inset 0 -1px 0 rgba(237,224,208,0.8)',
      }}
    >
      <div className="flex items-center justify-between px-6 h-16 gap-4">
        {/* Left: title — display (serif) font */}
        <div className="flex-shrink-0">
          <h1 className="font-display text-base font-semibold text-[#1a1a1a] leading-tight tracking-wide">{label.title}</h1>
          <p className="text-xs text-[#a89e8e]">{label.subtitle}</p>
        </div>

        {/* Center: search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b8a898] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search requests, people, briefs…"
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-xl focus:outline-none text-[#1a1a1a] placeholder:text-[#c6b9aa] transition-shadow"
              style={{
                background: 'rgba(255,255,255,0.7)',
                borderColor: '#ede0d0',
                boxShadow: 'inset 0 2px 4px rgba(83,55,43,0.05), inset 0 1px 0 rgba(255,255,255,0.6)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#a9674d')}
              onBlur={e => (e.currentTarget.style.borderColor = '#ede0d0')}
              aria-label="Search"
            />
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Bell */}
          <motion.button
            whileHover={{ scale: 1.06, y: -1 }}
            whileTap={{ scale: 0.94, y: 0 }}
            onClick={() => setNotify(v => !v)}
            className="relative p-2 rounded-xl text-[#53372b] hover:text-[#a9674d] transition-colors"
            style={{
              background: 'white',
              boxShadow: '0 1px 3px rgba(83,55,43,0.09), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(83,55,43,0.05)',
              border: '1px solid rgba(237,224,208,0.9)',
            }}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {notify && (
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#9f4022]"
                style={{ boxShadow: '0 0 0 1.5px white, 0 1px 3px rgba(159,64,34,0.6)' }}
              />
            )}
          </motion.button>

          {/* "+ New" — terracotta clay button */}
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ y: 1, scale: 0.98 }}
            onClick={() => openModal({ type: 'new-request' })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold"
            style={{
              background: 'linear-gradient(160deg, #c47d61 0%, #8a4f39 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.16), 0 4px 14px rgba(169,103,77,0.45), 0 1px 3px rgba(0,0,0,0.12)',
            }}
            aria-label="New request"
          >
            <Plus size={15} />
            New
          </motion.button>
        </div>
      </div>
    </header>
  );
}

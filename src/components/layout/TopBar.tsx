import { useState } from 'react';
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
    <header className="flex-shrink-0 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between px-6 h-16 gap-4">
        {/* Left: title */}
        <div className="flex-shrink-0">
          <h1 className="text-base font-semibold text-gray-900 leading-tight">{label.title}</h1>
          <p className="text-xs text-gray-400">{label.subtitle}</p>
        </div>

        {/* Center: search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search requests, people, briefs…"
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 text-gray-700 placeholder:text-gray-400"
              aria-label="Search"
            />
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setNotify(v => !v)}
            className="relative p-2 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {notify && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
          <button
            onClick={() => openModal({ type: 'new-request' })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
            aria-label="New request"
          >
            <Plus size={15} />
            New Request
          </button>
        </div>
      </div>
    </header>
  );
}

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Plus, Search, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useNotifications } from '../../hooks/useNotifications';
import Badge from '../shared/Badge';
import StatusChip from '../shared/StatusChip';
import type { View } from '../../types';

const VIEW_LABELS: Record<View, { title: string; subtitle: string }> = {
  kanban:    { title: 'Kanban',    subtitle: 'All active content requests' },
  calendar:  { title: 'Calendar', subtitle: 'Requests by post date' },
  gantt:     { title: 'Gantt',    subtitle: 'Timeline & production windows' },
  redalert:  { title: 'Red Alert',subtitle: 'Deadline-critical requests' },
  mytasks:   { title: 'My Tasks', subtitle: 'Assigned to you' },
};

export default function TopBar() {
  const { activeView, openModal, requests, users } = useApp();
  const { notifications, unreadCount, markAllRead, permission, requestPermission } = useNotifications();
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const label = VIEW_LABELS[activeView];

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const peopleNamesFor = (r: typeof requests[number]) =>
      [r.requesterId, r.ownerId, ...r.assigneeIds, ...r.reviewerIds, ...(r.followerIds ?? [])]
        .map(id => users.find(u => u.id === id)?.name ?? '')
        .join(' ')
        .toLowerCase();

    return requests
      .filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (r.brief ?? '').toLowerCase().includes(q) ||
        peopleNamesFor(r).includes(q)
      )
      .slice(0, 8);
  }, [search, requests, users]);

  const goToSearchResult = (requestId: string) => {
    const req = requests.find(r => r.id === requestId);
    setSearch('');
    setSearchFocused(false);
    if (!req) return;
    openModal({ type: req.status === 'Design Review' ? 'review-feedback' : 'designer-task', requestId });
  };

  const togglePanel = () => {
    requestPermission();
    setPanelOpen(v => {
      const next = !v;
      if (next) {
        markAllRead();
        const rect = bellRef.current?.getBoundingClientRect();
        if (rect) {
          setPanelPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
        }
      }
      return next;
    });
  };

  // Keep the panel pinned under the bell if the window is resized while it's open
  useEffect(() => {
    if (!panelOpen) return;
    const reposition = () => {
      const rect = bellRef.current?.getBoundingClientRect();
      if (rect) setPanelPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    };
    window.addEventListener('resize', reposition);
    return () => window.removeEventListener('resize', reposition);
  }, [panelOpen]);

  const handleNotificationClick = (requestId: string) => {
    const req = requests.find(r => r.id === requestId);
    setPanelOpen(false);
    if (!req) return;
    openModal({ type: req.status === 'Design Review' ? 'review-feedback' : 'designer-task', requestId });
  };

  return (
    <header
      className="flex-shrink-0 border-b relative z-50"
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
              className="w-full pl-9 pr-8 py-2 text-sm border rounded-xl focus:outline-none text-[#1a1a1a] placeholder:text-[#c6b9aa] transition-shadow"
              style={{
                background: 'rgba(255,255,255,0.7)',
                borderColor: '#ede0d0',
                boxShadow: 'inset 0 2px 4px rgba(83,55,43,0.05), inset 0 1px 0 rgba(255,255,255,0.6)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#a9674d'; setSearchFocused(true); }}
              onBlur={e => { e.currentTarget.style.borderColor = '#ede0d0'; setSearchFocused(false); }}
              onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); e.currentTarget.blur(); } }}
              aria-label="Search"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                onMouseDown={e => e.preventDefault()}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#b8a898] hover:text-[#8a4f39] transition-colors"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}

            {searchFocused && search.trim() && (
              <div
                className="absolute left-0 top-full mt-2 w-full max-h-96 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-xl z-50"
                onMouseDown={e => e.preventDefault()}
              >
                {searchResults.length === 0 ? (
                  <p className="text-xs text-gray-400 italic px-4 py-6 text-center">No matches for "{search}".</p>
                ) : (
                  <div className="py-1">
                    {searchResults.map(r => (
                      <button
                        key={r.id}
                        onClick={() => goToSearchResult(r.id)}
                        className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 transition-colors"
                      >
                        <Badge pipeline={r.pipeline} />
                        <span className="flex-1 min-w-0 text-xs font-medium text-gray-800 truncate">{r.title}</span>
                        <StatusChip status={r.status} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Bell */}
          <div className="relative">
            <motion.button
              ref={bellRef}
              whileHover={{ scale: 1.06, y: -1 }}
              whileTap={{ scale: 0.94, y: 0 }}
              onClick={togglePanel}
              className="relative p-2 rounded-xl text-[#53372b] hover:text-[#a9674d] transition-colors"
              style={{
                background: 'white',
                boxShadow: '0 1px 3px rgba(83,55,43,0.09), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(83,55,43,0.05)',
                border: '1px solid rgba(237,224,208,0.9)',
              }}
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#9f4022] text-white text-[10px] font-bold flex items-center justify-center leading-none"
                  style={{ boxShadow: '0 0 0 1.5px white, 0 1px 3px rgba(159,64,34,0.6)' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </motion.button>

            <AnimatePresence>
              {panelOpen && panelPos && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPanelOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    style={{ position: 'fixed', top: panelPos.top, right: panelPos.right }}
                    className="w-80 max-w-[calc(100vw-2rem)] max-h-96 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-xl z-50"
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                      {permission === 'denied' && (
                        <p className="text-[11px] text-red-500 mt-1">
                          Browser alerts are blocked. Enable notifications for this site in your browser settings to get sound + popup alerts.
                        </p>
                      )}
                      {permission === 'default' && (
                        <button
                          onClick={requestPermission}
                          className="text-[11px] text-[#a9674d] hover:underline mt-1"
                        >
                          Enable sound + popup alerts
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="text-xs text-gray-400 italic px-4 py-6 text-center">You're all caught up.</p>
                    ) : (
                      <div className="py-1">
                        {notifications.map(n => (
                          <button
                            key={n.id}
                            onClick={() => handleNotificationClick(n.requestId)}
                            className={`w-full text-left px-4 py-2.5 flex items-start gap-2 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-[#f5ece7]/50' : ''}`}
                          >
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#a9674d] mt-1.5 flex-shrink-0" />}
                            <div className={n.read ? 'pl-3.5' : ''}>
                              <p className="text-xs text-gray-700 leading-snug">{n.message}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {formatDistanceToNow(n.timestamp, { addSuffix: true })}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

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

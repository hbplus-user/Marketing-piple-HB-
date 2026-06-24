import { motion } from 'framer-motion';
import {
  LayoutDashboard, LayoutGrid, Calendar, GanttChartSquare,
  AlertTriangle, CheckSquare, Inbox, DatabaseBackup, LogOut,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useRedAlert } from '../../hooks/useRedAlert';
import { useAuth } from '../../context/AuthContext';
import type { View } from '../../types';

const DASHBOARD_VIEWS: { id: View; label: string; icon: React.ElementType }[] = [
  { id: 'kanban',    label: 'Kanban View',   icon: LayoutGrid },
  { id: 'calendar', label: 'Calendar View', icon: Calendar },
  { id: 'gantt',    label: 'Gantt View',    icon: GanttChartSquare },
];

const PIPELINE_COLORS: Record<string, string> = {
  'PM':                   '#344161',
  'Organic':              '#6f8e7c',
  'Internal requirement': '#a9674d',
  'Events':               '#c99d5d',
};

export default function Sidebar() {
  const { activeView, setActiveView, openModal, requests, currentUser, activePipelines, togglePipeline } = useApp();
  const { redAlertCount } = useRedAlert();
  const { signOut } = useAuth();

  const isDashboard = ['kanban', 'calendar', 'gantt'].includes(activeView);

  const pipelineCounts = Object.entries(PIPELINE_COLORS).map(([name, color]) => ({
    name,
    color,
    count: requests.filter(r => r.pipeline === name && r.status !== 'Approved' && r.status !== 'Posted').length,
  }));

  const myTasksCount = requests.filter(r =>
    (r.assigneeIds.includes(currentUser.id) || r.requesterId === currentUser.id) && r.status !== 'Approved' && r.status !== 'Posted'
  ).length;

  const pendingApprovalCount = (() => {
    if (currentUser.role === 'manager' || currentUser.role === 'founder') {
      const pManager    = requests.filter(r => r.status === 'Brief Approval' && !r.managerApproved).length;
      const pFounder    = requests.filter(r => r.status === 'Brief Approval' && r.managerApproved && r.founderApprovalRequired && !r.founderApproved).length;
      const pCoApproval = requests.filter(r =>
        r.status === 'Design Review' &&
        (r.reviewerIds ?? []).includes(currentUser.id) &&
        !(r.approvedBy ?? []).includes(currentUser.id)
      ).length;
      return pManager + pFounder + pCoApproval;
    }
    return 0;
  })();

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-full" style={{ backgroundColor: '#1a1a1a' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <img
          src="/client-logo.jpg"
          alt="HB+ logo"
          className="h-8 w-8 rounded-lg object-contain flex-shrink-0"
          style={{ background: 'white' }}
        />
        <div>
          <p className="font-display text-[14px] font-bold text-[#f5f2e9] leading-tight tracking-wide">HB+</p>
          <p className="text-[10px] text-[#a89e8e] leading-tight">Marketing Ops</p>
        </div>
      </div>

      {/* Approval Queue + Backup — manager / founder only */}
      {(currentUser.role === 'manager' || currentUser.role === 'founder') && (
        <div className="px-3 pt-4 space-y-1">
          <motion.button
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98, y: 0 }}
            onClick={() => openModal({ type: 'approval-queue' })}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.2)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <Inbox size={15} className="text-[#c4a98a]" />
              <span className="text-[13px] font-medium text-[#d4c5b0]">Approval Queue</span>
            </div>
            {pendingApprovalCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#9f4022] text-white min-w-[18px] text-center"
                style={{ boxShadow: '0 1px 4px rgba(159,64,34,0.5)' }}>
                {pendingApprovalCount}
              </span>
            )}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98, y: 0 }}
            onClick={() => openModal({ type: 'backup-restore' })}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.2)',
            }}
          >
            <DatabaseBackup size={15} className="text-[#c4a98a]" />
            <span className="text-[13px] font-medium text-[#d4c5b0]">Backup & Restore</span>
          </motion.button>
        </div>
      )}

      {/* Navigation */}
      <div className="px-3 pt-5 flex-1 overflow-y-auto">
        <p className="px-2 mb-2 text-[10px] font-semibold text-[#a89e8e] uppercase tracking-widest">Views</p>

        <nav className="space-y-0.5">

          {/* ── Dashboard group ── */}
          <div>
            {/* Dashboard parent row */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { if (!isDashboard) setActiveView('kanban'); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                isDashboard ? 'text-white' : 'text-[#a89e8e] hover:bg-white/5 hover:text-[#f5f2e9]'
              }`}
              style={isDashboard ? {
                background: 'linear-gradient(135deg, #c47d61 0%, #8a4f39 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 12px rgba(169,103,77,0.4), 0 2px 4px rgba(0,0,0,0.25)',
              } : {}}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard size={15} />
                <span className="text-[13px] font-medium">Dashboard</span>
              </div>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${isDashboard ? 'rotate-180' : ''}`}
              />
            </motion.button>

            {/* Sub-items — always visible when dashboard is active */}
            {isDashboard && (
              <div className="mt-0.5 ml-3 pl-3 border-l border-white/10 space-y-0.5">
                {DASHBOARD_VIEWS.map(view => {
                  const active = activeView === view.id;
                  const Icon = view.icon;
                  return (
                    <motion.button
                      key={view.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setActiveView(view.id)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                        active
                          ? 'bg-white/15 text-white'
                          : 'text-[#a89e8e] hover:bg-white/5 hover:text-[#f5f2e9]'
                      }`}
                    >
                      <Icon size={13} />
                      <span className="text-[12px] font-medium">{view.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Alert (Red Alert) ── */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveView('redalert')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
              activeView === 'redalert' ? 'text-white' : 'text-[#a89e8e] hover:bg-white/5 hover:text-[#f5f2e9]'
            }`}
            style={activeView === 'redalert' ? {
              background: 'linear-gradient(135deg, #c47d61 0%, #8a4f39 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 12px rgba(169,103,77,0.4), 0 2px 4px rgba(0,0,0,0.25)',
            } : {}}
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={15} />
              <span className="text-[13px] font-medium">Alert</span>
            </div>
            {redAlertCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#9f4022] text-white min-w-[18px] text-center"
                style={{ boxShadow: '0 1px 4px rgba(159,64,34,0.5)' }}>
                {redAlertCount}
              </span>
            )}
          </motion.button>

          {/* ── My Tasks ── */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveView('mytasks')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
              activeView === 'mytasks' ? 'text-white' : 'text-[#a89e8e] hover:bg-white/5 hover:text-[#f5f2e9]'
            }`}
            style={activeView === 'mytasks' ? {
              background: 'linear-gradient(135deg, #c47d61 0%, #8a4f39 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 12px rgba(169,103,77,0.4), 0 2px 4px rgba(0,0,0,0.25)',
            } : {}}
          >
            <div className="flex items-center gap-2.5">
              <CheckSquare size={15} />
              <span className="text-[13px] font-medium">My Tasks</span>
            </div>
            {myTasksCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#a9674d] text-white min-w-[18px] text-center"
                style={{ boxShadow: '0 1px 4px rgba(169,103,77,0.5)' }}>
                {myTasksCount}
              </span>
            )}
          </motion.button>

        </nav>

        {/* Product Pipeline filter */}
        <p className="px-2 mt-6 mb-2 text-[10px] font-semibold text-[#a89e8e] uppercase tracking-widest">Product Pipeline</p>
        <div className="space-y-0.5">
          {pipelineCounts.map(p => {
            const isActive = activePipelines.includes(p.name as never);
            return (
              <motion.button
                key={p.name}
                whileTap={{ scale: 0.98 }}
                onClick={() => togglePipeline(p.name as never)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left ${
                  isActive ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
                style={isActive ? { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 3px rgba(0,0,0,0.2)' } : {}}
                title={`Filter by ${p.name}`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
                      background: `radial-gradient(circle at 36% 33%, rgba(255,255,255,0.9) 0%, ${p.color} 44%)`,
                      boxShadow: isActive
                        ? `0 0 10px ${p.color}90, 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)`
                        : `0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4)`,
                    }}
                  />
                  <span className={`text-[13px] font-medium transition-colors ${isActive ? 'text-white' : 'text-[#c4b9a8]'}`}>
                    {p.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-medium transition-colors ${isActive ? 'text-white' : 'text-[#a89e8e]'}`}>
                    {p.count}
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white/60" />}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Log out */}
      <div className="px-3 pb-3 border-t border-white/5 pt-3">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#c4a98a] hover:bg-white/5 hover:text-[#d4c5b0] transition-colors"
        >
          <LogOut size={14} />
          <span className="text-[13px] font-medium">Log out</span>
        </button>
      </div>
    </aside>
  );
}

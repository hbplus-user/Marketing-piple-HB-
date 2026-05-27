import { motion } from 'framer-motion';
import {
  LayoutGrid, Calendar, GanttChartSquare, AlertTriangle,
  CheckSquare, Inbox, Circle, DatabaseBackup, LogOut,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useRedAlert } from '../../hooks/useRedAlert';
import { useAuth } from '../../context/AuthContext';
import type { View } from '../../types';

const VIEWS: { id: View; label: string; icon: React.ElementType }[] = [
  { id: 'kanban',    label: 'Kanban View',    icon: LayoutGrid },
  { id: 'calendar', label: 'Calendar View',  icon: Calendar },
  { id: 'gantt',    label: 'Gantt View',      icon: GanttChartSquare },
  { id: 'redalert', label: 'Red Alert',       icon: AlertTriangle },
  { id: 'mytasks',  label: 'My Tasks',        icon: CheckSquare },
];

const PIPELINE_COLORS: Record<string, string> = {
  'PM':          '#7C3AED',
  'Content':     '#0EA5E9',
  'Art / Design':'#EC4899',
  'Events':      '#F59E0B',
};

export default function Sidebar() {
  const { activeView, setActiveView, openModal, requests, currentUser, activePipelines, togglePipeline } = useApp();
  const { redAlertCount } = useRedAlert();
  const { signOut } = useAuth();

  const pipelineCounts = Object.entries(PIPELINE_COLORS).map(([name, color]) => ({
    name,
    color,
    count: requests.filter(r => r.pipeline === name && r.status !== 'Done').length,
  }));

  const myTasksCount = requests.filter(r =>
    (r.assigneeId === currentUser.id || r.requesterId === currentUser.id) && r.status !== 'Done'
  ).length;

  const pendingApprovalCount = requests.filter(r => r.status === 'To Do' && r.assigneeId === null).length;

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-full" style={{ backgroundColor: '#1E1B4B' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <img
          src="/client-logo.jpg"
          alt="HB+ logo"
          className="h-8 w-8 rounded-lg object-contain flex-shrink-0"
          style={{ background: 'white' }}
        />
        <div>
          <p className="text-[13px] font-bold text-white leading-tight">HB+</p>
          <p className="text-[10px] text-indigo-300 leading-tight">Marketing Ops</p>
        </div>
      </div>

      {/* Approval Queue — manager only */}
      {currentUser.role === 'manager' && (
        <div className="px-3 pt-4 space-y-1">
          <motion.button
            whileHover={{ scale: 1.01 }}
            onClick={() => openModal({ type: 'approval-queue' })}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Open approval queue"
          >
            <div className="flex items-center gap-2.5">
              <Inbox size={15} className="text-indigo-300" />
              <span className="text-[13px] font-medium text-indigo-200">Approval Queue</span>
            </div>
            {pendingApprovalCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white min-w-[18px] text-center">
                {pendingApprovalCount}
              </span>
            )}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.01 }}
            onClick={() => openModal({ type: 'backup-restore' })}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Open backup and restore"
          >
            <DatabaseBackup size={15} className="text-indigo-300" />
            <span className="text-[13px] font-medium text-indigo-200">Backup & Restore</span>
          </motion.button>
        </div>
      )}

      {/* Views */}
      <div className="px-3 pt-5 flex-1 overflow-y-auto">
        <p className="px-2 mb-2 text-[10px] font-semibold text-indigo-400 uppercase tracking-widest">Views</p>
        <nav className="space-y-0.5">
          {VIEWS.map(view => {
            const active = activeView === view.id;
            const Icon = view.icon;
            const badge = view.id === 'redalert' ? redAlertCount : view.id === 'mytasks' ? myTasksCount : 0;
            return (
              <motion.button
                key={view.id}
                whileHover={{ scale: 1.01, opacity: 0.9 }}
                onClick={() => setActiveView(view.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-indigo-300 hover:bg-white/5'
                }`}
                aria-current={active ? 'page' : undefined}
                aria-label={view.label}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={15} />
                  <span className="text-[13px] font-medium">{view.label}</span>
                </div>
                {badge > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[18px] text-center ${
                    view.id === 'redalert' ? 'bg-red-500 text-white' : 'bg-indigo-500 text-white'
                  }`}>
                    {badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Product pipeline */}
        <p className="px-2 mt-6 mb-2 text-[10px] font-semibold text-indigo-400 uppercase tracking-widest">Product Pipeline</p>
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
                title={`Filter by ${p.name} — sorted overdue first`}
              >
                <div className="flex items-center gap-2.5">
                  <Circle
                    size={8}
                    fill={p.color}
                    color={p.color}
                    className={isActive ? 'drop-shadow-[0_0_4px_var(--tw-shadow-color)]' : ''}
                    style={isActive ? { filter: `drop-shadow(0 0 4px ${p.color})` } : {}}
                  />
                  <span className={`text-[13px] font-medium transition-colors ${isActive ? 'text-white' : 'text-indigo-300'}`}>
                    {p.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-medium transition-colors ${isActive ? 'text-white' : 'text-indigo-400'}`}>
                    {p.count}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                  )}
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
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          aria-label="Log out"
        >
          <LogOut size={14} />
          <span className="text-[13px] font-medium">Log out</span>
        </button>
      </div>
    </aside>
  );
}

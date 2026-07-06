import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  AlertTriangle, CheckSquare, Inbox, DatabaseBackup, LogOut, Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useRedAlert } from '../../hooks/useRedAlert';
import { useAuth } from '../../context/AuthContext';
import { canManageTeam } from '../../utils/permissions';


export default function Sidebar() {
  const { activeView, setActiveView, openModal, requests, currentUser } = useApp();
  const { redAlertCount } = useRedAlert();
  const { signOut } = useAuth();

  const isDashboard = ['kanban', 'calendar', 'gantt'].includes(activeView);

  const myTasksCount = requests.filter(r =>
    (r.assigneeIds.includes(currentUser.id) || r.requesterId === currentUser.id) && r.status !== 'Approved' && r.status !== 'Posted'
  ).length;

  const pendingApprovalCount = (() => {
    if (currentUser.role === 'manager' || currentUser.role === 'founder') {
      const pManager    = requests.filter(r => r.status === 'Brief Approval' && !r.managerApproved).length;
      const pFounder    = requests.filter(r => r.status === 'Brief Approval' && r.managerApproved && r.founderApprovalRequired && !r.founderApproved).length;
      const pCoApproval = requests.filter(r =>
        r.status === 'Design Review'
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

      {/* Manage Team — manager only */}
      {canManageTeam(currentUser.role) && (
        <div className="px-3 pt-1 space-y-1">
          <motion.button
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98, y: 0 }}
            onClick={() => openModal({ type: 'manage-team' })}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.2)',
            }}
          >
            <Users size={15} className="text-[#c4a98a]" />
            <span className="text-[13px] font-medium text-[#d4c5b0]">Manage Team</span>
          </motion.button>
        </div>
      )}

      {/* Navigation */}
      <div className="px-3 pt-5 flex-1 overflow-y-auto">
        <p className="px-2 mb-2 text-[10px] font-semibold text-[#a89e8e] uppercase tracking-widest">Views</p>

        <nav className="space-y-0.5">

          {/* ── Dashboard ── */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { if (!isDashboard) setActiveView('kanban'); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors ${
              isDashboard ? 'text-white' : 'text-[#a89e8e] hover:bg-white/5 hover:text-[#f5f2e9]'
            }`}
            style={isDashboard ? {
              background: 'linear-gradient(135deg, #c47d61 0%, #8a4f39 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 12px rgba(169,103,77,0.4), 0 2px 4px rgba(0,0,0,0.25)',
            } : {}}
          >
            <LayoutDashboard size={15} />
            <span className="text-[13px] font-medium">Dashboard</span>
          </motion.button>

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

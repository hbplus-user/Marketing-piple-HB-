import { useState } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DatabaseBackup, Trash2, ChevronDown, ChevronRight,
  Building2, Users, User, FileText, Plus, CheckCircle,
  AlertTriangle, RotateCcw, Loader2,
} from 'lucide-react';
import Modal from '../shared/Modal';
import Badge from '../shared/Badge';
import Avatar from '../shared/Avatar';
import { useApp } from '../../context/AppContext';
import { decompressRequests } from '../../utils/backupUtils';
import { USERS } from '../../data/mockData';
import type { BackupSnapshot, ContentRequest, Role } from '../../types';

type RestoreScope = 'org' | 'role' | 'user' | 'individual';

interface PendingRestore {
  backupId: string;
  scope: RestoreScope;
  roleValue?: Role;
  userId?: string;
  requestId?: string;
  label: string;
}

const ROLE_CONFIG: { role: Role; label: string; color: string; bg: string }[] = [
  { role: 'employee', label: 'Employee',  color: '#0EA5E9', bg: '#F0F9FF' },
  { role: 'manager',  label: 'Manager',   color: '#7C3AED', bg: '#F5F3FF' },
  { role: 'founder',  label: 'Founder',   color: '#3B82F6', bg: '#EFF6FF' },
];

export default function BackupRestoreModal({ open }: { open: boolean }) {
  const {
    closeModal, backups, backupsLoading,
    createBackup, restoreAll, restoreByRole, restoreByUser, restoreOne, deleteBackup,
    requests,
  } = useApp();

  const [labelInput, setLabelInput]   = useState('');
  const [creating, setCreating]       = useState(false);
  const [successMsg, setSuccessMsg]   = useState<string | null>(null);

  // Which backup is expanded for individual restore
  const [expandedId, setExpandedId]                         = useState<string | null>(null);
  const [expandedReqs, setExpandedReqs]                     = useState<Record<string, ContentRequest[]>>({});
  const [loadingExpandId, setLoadingExpandId]               = useState<string | null>(null);

  // Which backup's restore panel is open
  const [activePanelId, setActivePanelId]                   = useState<string | null>(null);
  const [activeScope, setActiveScope]                       = useState<RestoreScope>('org');

  // Confirm dialog
  const [pending, setPending]   = useState<PendingRestore | null>(null);
  const [restoring, setRestoring] = useState(false);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleCreate = async () => {
    setCreating(true);
    await createBackup(labelInput.trim() || 'Manual backup');
    setLabelInput('');
    setCreating(false);
    flash('Backup saved to Supabase in compressed format.');
  };

  const openPanel = (id: string) => {
    if (activePanelId === id) { setActivePanelId(null); return; }
    setActivePanelId(id);
    setActiveScope('org');
    setExpandedId(null);
  };

  const loadIndividual = async (snapshot: BackupSnapshot) => {
    if (expandedId === snapshot.id) { setExpandedId(null); return; }
    setExpandedId(snapshot.id);
    if (!expandedReqs[snapshot.id]) {
      setLoadingExpandId(snapshot.id);
      const reqs = await decompressRequests(snapshot.data);
      setExpandedReqs(prev => ({ ...prev, [snapshot.id]: reqs }));
      setLoadingExpandId(null);
    }
  };

  const confirmRestore = (p: PendingRestore) => setPending(p);

  const executeRestore = async () => {
    if (!pending) return;
    setRestoring(true);
    const { backupId, scope, roleValue, userId, requestId } = pending;
    if (scope === 'org')        await restoreAll(backupId);
    if (scope === 'role')       await restoreByRole(backupId, roleValue!);
    if (scope === 'user')       await restoreByUser(backupId, userId!);
    if (scope === 'individual') await restoreOne(backupId, requestId!);
    setRestoring(false);
    setPending(null);
    setActivePanelId(null);
    flash(`Restored: ${pending.label}`);
  };

  const currentIds = new Set(requests.map(r => r.id));
  const creatorOf = (snapshot: BackupSnapshot) =>
    USERS.find(u => u.id === snapshot.createdBy) ?? null;

  return (
    <Modal open={open} onClose={closeModal} size="lg">
      <div className="relative px-6 py-5 max-h-[82vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-1">
          <DatabaseBackup size={17} className="text-indigo-500" />
          <h2 className="text-base font-bold text-gray-900">Backup & Restore</h2>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          All backups are stored in Supabase in compressed format. Auto-backup runs every 6 hours.
        </p>

        {/* Success */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700"
            >
              <CheckCircle size={13} />
              {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create */}
        <div className="flex items-center gap-2 mb-6">
          <input
            value={labelInput}
            onChange={e => setLabelInput(e.target.value)}
            placeholder="Backup label (optional)"
            className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium whitespace-nowrap transition-colors"
          >
            {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            {creating ? 'Saving…' : 'Create backup'}
          </button>
        </div>

        {/* Backup list */}
        {backupsLoading ? (
          <div className="text-center py-10 text-gray-400 flex flex-col items-center gap-2">
            <Loader2 size={22} className="animate-spin opacity-40" />
            <p className="text-xs">Loading backups from Supabase…</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <DatabaseBackup size={32} className="mx-auto mb-2 opacity-25" />
            <p className="text-sm">No backups yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map(snapshot => {
              const isPanelOpen = activePanelId === snapshot.id;
              const creator = creatorOf(snapshot);

              return (
                <div key={snapshot.id} className="border border-gray-100 rounded-xl overflow-hidden">

                  {/* Row */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/70">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-[13px] font-semibold text-gray-800 truncate max-w-[220px]">
                          {snapshot.label}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-200 text-gray-600">
                          {snapshot.requestCount} requests
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-600">
                          compressed · Supabase
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <span>{format(new Date(snapshot.createdAt), 'MMM d, yyyy · h:mm a')}</span>
                        {creator && (
                          <>
                            <span>·</span>
                            <div className="flex items-center gap-1">
                              <Avatar initials={creator.initials} color={creator.avatarColor} size="sm" />
                              <span>{creator.name}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => openPanel(snapshot.id)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          isPanelOpen
                            ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        <RotateCcw size={12} />
                        Restore
                        {isPanelOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      </button>
                      <button
                        onClick={() => deleteBackup(snapshot.id)}
                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete backup"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Restore panel */}
                  <AnimatePresence>
                    {isPanelOpen && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-gray-100 bg-white px-4 py-4">

                          {/* Scope tabs */}
                          <div className="flex items-center gap-1 mb-4 border-b border-gray-100 pb-3">
                            {[
                              { id: 'org' as RestoreScope,        icon: Building2,  label: 'Whole Org' },
                              { id: 'role' as RestoreScope,       icon: Users,      label: 'By Role' },
                              { id: 'user' as RestoreScope,       icon: User,       label: 'By User' },
                              { id: 'individual' as RestoreScope, icon: FileText,   label: 'Individual' },
                            ].map(tab => {
                              const Icon = tab.icon;
                              return (
                                <button
                                  key={tab.id}
                                  onClick={() => setActiveScope(tab.id)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    activeScope === tab.id
                                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                      : 'text-gray-500 hover:bg-gray-50 border border-transparent'
                                  }`}
                                >
                                  <Icon size={12} />
                                  {tab.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Org restore */}
                          {activeScope === 'org' && (
                            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                              <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-amber-700 mb-1">
                                  Restore entire organisation
                                </p>
                                <p className="text-[11px] text-amber-600 mb-3">
                                  Replaces ALL {requests.length} current requests with {snapshot.requestCount} requests from this backup.
                                </p>
                                <button
                                  onClick={() => confirmRestore({
                                    backupId: snapshot.id, scope: 'org',
                                    label: `All ${snapshot.requestCount} requests from "${snapshot.label}"`,
                                  })}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium transition-colors"
                                >
                                  <Building2 size={12} />
                                  Restore entire org
                                </button>
                              </div>
                            </div>
                          )}

                          {/* By role */}
                          {activeScope === 'role' && (
                            <div>
                              <p className="text-[11px] text-gray-500 mb-3">
                                Restore all requests where the requester belongs to a specific role.
                              </p>
                              <div className="grid grid-cols-3 gap-2">
                                {ROLE_CONFIG.map(rc => {
                                  const roleUsers = USERS.filter(u => u.role === rc.role);
                                  return (
                                    <button
                                      key={rc.role}
                                      onClick={() => confirmRestore({
                                        backupId: snapshot.id, scope: 'role', roleValue: rc.role,
                                        label: `All ${rc.label} requests from "${snapshot.label}"`,
                                      })}
                                      className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-transparent hover:border-current transition-all text-center"
                                      style={{ backgroundColor: rc.bg, color: rc.color }}
                                    >
                                      <Users size={18} />
                                      <div>
                                        <p className="text-xs font-bold">{rc.label}</p>
                                        <p className="text-[10px] opacity-70">{roleUsers.length} user{roleUsers.length !== 1 ? 's' : ''}</p>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* By user */}
                          {activeScope === 'user' && (
                            <div>
                              <p className="text-[11px] text-gray-500 mb-3">
                                Restore all requests submitted by a specific user.
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {USERS.map(u => (
                                  <button
                                    key={u.id}
                                    onClick={() => confirmRestore({
                                      backupId: snapshot.id, scope: 'user', userId: u.id,
                                      label: `${u.name}'s requests from "${snapshot.label}"`,
                                    })}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-left"
                                  >
                                    <Avatar initials={u.initials} color={u.avatarColor} size="sm" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-gray-800 truncate">{u.name}</p>
                                      <p className="text-[10px] text-gray-400 capitalize">{u.role}</p>
                                    </div>
                                    <RotateCcw size={12} className="text-gray-300 ml-auto flex-shrink-0" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Individual */}
                          {activeScope === 'individual' && (
                            <div>
                              <button
                                onClick={() => loadIndividual(snapshot)}
                                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 mb-3 font-medium"
                              >
                                {loadingExpandId === snapshot.id
                                  ? <Loader2 size={12} className="animate-spin" />
                                  : expandedId === snapshot.id
                                    ? <ChevronDown size={12} />
                                    : <ChevronRight size={12} />
                                }
                                {expandedId === snapshot.id ? 'Hide requests' : 'Show all requests in backup'}
                              </button>

                              {expandedId === snapshot.id && expandedReqs[snapshot.id] && (
                                <div className="space-y-1 max-h-56 overflow-y-auto border border-gray-100 rounded-xl">
                                  {expandedReqs[snapshot.id].map(req => (
                                    <div
                                      key={req.id}
                                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50"
                                    >
                                      <span className="text-[10px] font-mono text-gray-400 w-16 flex-shrink-0">{req.id}</span>
                                      <Badge pipeline={req.pipeline} />
                                      <span className="text-xs text-gray-700 flex-1 truncate">{req.title}</span>
                                      {!currentIds.has(req.id) && (
                                        <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                          deleted
                                        </span>
                                      )}
                                      <button
                                        onClick={() => confirmRestore({
                                          backupId: snapshot.id, scope: 'individual', requestId: req.id,
                                          label: `"${req.title}" (${req.id})`,
                                        })}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 text-gray-500 hover:text-indigo-600 text-[11px] font-medium transition-colors flex-shrink-0"
                                      >
                                        <RotateCcw size={10} />
                                        Restore
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm dialog overlay */}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/25 rounded-2xl z-20"
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 max-w-sm mx-4 w-full"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle size={15} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-1">Confirm restore</p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    You are about to restore: <span className="font-semibold text-gray-700">{pending.label}</span>
                  </p>
                  {pending.scope === 'org' && (
                    <p className="text-xs text-red-500 mt-1.5">
                      This replaces ALL current requests and cannot be undone.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPending(null)}
                  disabled={restoring}
                  className="flex-1 py-2 text-xs font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeRestore}
                  disabled={restoring}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {restoring && <Loader2 size={12} className="animate-spin" />}
                  {restoring ? 'Restoring…' : 'Yes, restore'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

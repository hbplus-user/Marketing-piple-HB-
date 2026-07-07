import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import type { ActivityLogEntry, AssigneeAcceptance, BackupSnapshot, ContentRequest, ModalState, Pipeline, Role, Status, User, View } from '../types';
import { USERS, MOCK_REQUESTS } from '../data/mockData';
import { calcInternalDeadline, getUrgency } from '../utils/deadlineUtils';
import { canViewAllRequests } from '../utils/permissions';
import {
  compressRequests, decompressRequests,
  fetchBackupsFromSupabase, saveBackupToSupabase, deleteBackupFromSupabase,
} from '../utils/backupUtils';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const AUTO_INTERVAL = 6 * 60 * 60 * 1000;

// Recursively revive ISO date strings in known date fields back to Date objects
const DATE_FIELDS = new Set(['postDate', 'internalDeadline', 'approvedAt', 'createdAt', 'date', 'timestamp', 'acceptedAt', 'startDate', 'initiatedAt']);
function reviveObj(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(reviveObj);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (DATE_FIELDS.has(k) && typeof v === 'string') {
      const d = new Date(v);
      result[k] = isNaN(d.getTime()) ? v : d;
    } else {
      result[k] = reviveObj(v);
    }
  }
  return result;
}

// Migrate legacy status names → current names, and backfill new fields added after initial deploy
const STATUS_MIGRATION: Record<string, Status> = {
  'To Do':              'Brief Approval',
  'In Progress':        'Design Progress',
  'In Review':          'Design Review',
  'Partially Approved': 'Approved',
  'Done':               'Approved',
};

const PIPELINE_MIGRATION: Record<string, Pipeline> = {
  'Content':      'Organic',
  'Art / Design': 'Internal requirement',
};

function migrateRequest(r: ContentRequest): ContentRequest {
  const migratedStatus   = STATUS_MIGRATION[r.status as string]   ?? r.status;
  const migratedPipeline = PIPELINE_MIGRATION[r.pipeline as string] ?? r.pipeline;
  // Legacy rows stored one shared submission on the request itself; carry it into
  // whichever round was active so older data still shows its submitted links/note.
  const legacy = r as unknown as { submissionLinks?: string[]; submissionNote?: string };
  const rounds = (r.rounds ?? []).map((round, i) => ({
    ...round,
    submissionLinks: round.submissionLinks ?? (i === (r.currentRound ?? 0) ? legacy.submissionLinks ?? [] : []),
    submissionNote:  round.submissionNote  ?? (i === (r.currentRound ?? 0) ? legacy.submissionNote  ?? '' : ''),
  }));
  return {
    ...r,
    status:   migratedStatus,
    pipeline: migratedPipeline as Pipeline,
    activityLog:         r.activityLog         ?? [],
    postedBy:            r.postedBy            ?? [],
    managerApproved:     r.managerApproved     ?? false,
    founderApprovalRequired: r.founderApprovalRequired ?? false,
    founderApproved:     r.founderApproved     ?? false,
    assigneeAcceptance:  r.assigneeAcceptance  ?? [],
    followerIds:         r.followerIds         ?? [],
    rounds,
    initiatedAt:         r.initiatedAt         ?? null,
    category:            r.category            ?? null,
  };
}

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface AppState {
  currentUser: User;
  users: User[];
  requests: ContentRequest[];
  filteredRequests: ContentRequest[];
  activeView: View;
  activeModal: ModalState | null;
  activePipelines: Pipeline[];
  dateRange: DateRange;
  dateFilterTypes: ('due' | 'post')[];
  backups: BackupSnapshot[];
  backupsLoading: boolean;
  setCurrentUser: (user: User) => void;
  refreshUsers: () => Promise<void>;
  setActiveView: (view: View) => void;
  openModal: (modal: ModalState) => void;
  closeModal: () => void;
  updateRequest: (id: string, updates: Partial<ContentRequest>) => void;
  addRequest: (req: ContentRequest) => void;
  approveRequest: (id: string, requireFounderReview?: boolean) => void;
  markAsPosted: (id: string) => void;
  initiateDesign: (id: string) => void;
  submitForReview: (id: string, links: string[], note: string) => void;
  acceptTask: (id: string, startDate?: Date) => void;
  removeAssignee: (id: string, userId: string) => void;
  assignTask: (id: string, userId: string) => void;
  dragMoveRequest: (id: string, targetStatus: Status) => void;
  approveAndMoveRequest: (id: string, targetStatus: Status, assigneeId: string, requireFounder: boolean) => void;
  requestChanges: (id: string, comment: string, referenceLink?: string) => void;
  editPostDate: (id: string, newDate: Date, reason: string) => void;
  removeCreatorFromApproval: (id: string) => void;
  addComment: (id: string, text: string, referenceLink?: string) => void;
  createBackup: (label?: string) => Promise<void>;
  restoreAll: (backupId: string) => Promise<void>;
  restoreByRole: (backupId: string, role: Role) => Promise<void>;
  restoreByUser: (backupId: string, userId: string) => Promise<void>;
  restoreOne: (backupId: string, requestId: string) => Promise<void>;
  deleteBackup: (backupId: string) => Promise<void>;
  togglePipeline: (p: Pipeline) => void;
  setDateRange: (range: DateRange) => void;
  toggleDateFilterType: (type: 'due' | 'post') => void;
  setDateFilterTypes: (types: ('due' | 'post')[]) => void;
  clearFilters: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser, userRole } = useAuth();
  const [currentUser, setCurrentUser] = useState<User>(USERS[0]);
  const [users, setUsers]               = useState<User[]>([]);
  const [requests, setRequests]       = useState<ContentRequest[]>([]);
  const [activeView, setActiveView]   = useState<View>('kanban');
  const [activeModal, setActiveModal] = useState<ModalState | null>(null);
  const [activePipelines, setActivePipelines] = useState<Pipeline[]>([]);
  const [dateRange, setDateRangeState]        = useState<DateRange>({ start: null, end: null });
  const [dateFilterTypes, setDateFilterTypesState] = useState<('due' | 'post')[]>(['due', 'post']);

  // Guard: only sync to Supabase after we've finished the initial load
  const supabaseReady = useRef(false);

  // Load all requests from Supabase when user logs in, then subscribe to real-time changes
  useEffect(() => {
    if (!authUser) return;
    supabaseReady.current = false;
    let isFirstLoad = true;

    const loadRequests = () => {
      supabase
        .from('content_requests')
        .select('data')
        .order('updated_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('[Pipeline] Failed to load requests:', error.message);
            if (isFirstLoad) setRequests(MOCK_REQUESTS);
            return;
          }
          const fresh = (data ?? []).map(row => migrateRequest(reviveObj(row.data) as ContentRequest));
          if (isFirstLoad) {
            setRequests(fresh);
          } else {
            // Fallback poll — merge rather than replace, so a transient/partial
            // response can never silently drop rows the UI already has.
            setRequests(prev => {
              const map = new Map(prev.map(r => [r.id, r]));
              for (const r of fresh) map.set(r.id, r);
              return Array.from(map.values());
            });
          }
          isFirstLoad = false;
          supabaseReady.current = true;
        });
    };

    // Initial load
    loadRequests();

    // Real-time subscription — any INSERT or UPDATE on the table updates local state instantly
    const channel = supabase
      .channel('content_requests_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content_requests' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setRequests(prev => prev.filter(r => r.id !== (payload.old as { id: string }).id));
          } else {
            const incoming = migrateRequest(reviveObj((payload.new as { data: unknown }).data) as ContentRequest);
            setRequests(prev => {
              const idx = prev.findIndex(r => r.id === incoming.id);
              if (idx >= 0) return prev.map(r => r.id === incoming.id ? incoming : r);
              return [incoming, ...prev];
            });
          }
        }
      )
      .subscribe();

    // Safety-net poll — self-heals if a realtime event gets dropped (e.g. platform incidents)
    const pollTimer = setInterval(loadRequests, 45_000);

    return () => { supabase.removeChannel(channel); clearInterval(pollTimer); };
  }, [authUser]);


  // Sync currentUser with active Supabase session
  useEffect(() => {
    if (authUser) {
      const initials = authUser.user_metadata?.full_name
        ? authUser.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : (authUser.email?.[0] ?? 'U').toUpperCase();
      
      setCurrentUser({
        id: authUser.id,
        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email,
        initials,
        role: userRole || 'employee',
        avatarColor: '#3B82F6',
      });
    }
  }, [authUser, userRole]);

  // Load users/profiles from Supabase
  const refreshUsers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email, role');

    if (data && data.length > 0) {
      const mappedUsers: User[] = data.map(p => {
        const initials = p.name
          ? p.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
          : (p.email?.[0] ?? 'U').toUpperCase();
        return {
          id: p.id,
          name: p.name || 'Unknown User',
          email: p.email || undefined,
          role: (p.role as Role) || 'employee',
          avatarColor: '#3B82F6',
          initials,
        };
      });

      // Ensure current authenticated user is included in the list
      if (authUser && !mappedUsers.some(u => u.id === authUser.id)) {
        const selfInitials = authUser.user_metadata?.full_name
          ? authUser.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
          : (authUser.email?.[0] ?? 'U').toUpperCase();
        mappedUsers.push({
          id: authUser.id,
          name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          email: authUser.email,
          initials: selfInitials,
          role: userRole || 'employee',
          avatarColor: '#3B82F6',
        });
      }
      setUsers(mappedUsers);
    } else {
      setUsers(USERS);
    }
  }, [authUser, userRole]);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);
  const [backups, setBackups]         = useState<BackupSnapshot[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(true);

  // Load backups from Supabase on mount
  useEffect(() => {
    fetchBackupsFromSupabase().then(data => {
      setBackups(data);
      setBackupsLoading(false);
    });
  }, []);

  const openModal  = useCallback((modal: ModalState) => setActiveModal(modal), []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  const togglePipeline = useCallback((p: Pipeline) => {
    setActivePipelines(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }, []);

  const setDateRange = useCallback((range: DateRange) => setDateRangeState(range), []);

  const toggleDateFilterType = useCallback((type: 'due' | 'post') => {
    setDateFilterTypesState(prev => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev;
        return prev.filter(x => x !== type);
      }
      return [...prev, type];
    });
  }, []);

  const setDateFilterTypes = useCallback((types: ('due' | 'post')[]) => {
    setDateFilterTypesState(types);
  }, []);

  const clearFilters = useCallback(() => {
    setActivePipelines([]);
    setDateRangeState({ start: null, end: null });
    setDateFilterTypesState(['due', 'post']);
  }, []);

  const filteredRequests = useMemo(() => {
    let result = requests;
    if (!canViewAllRequests(currentUser.role)) {
      result = result.filter(r =>
        r.requesterId === currentUser.id ||
        r.ownerId === currentUser.id ||
        r.assigneeIds.includes(currentUser.id) ||
        r.reviewerIds.includes(currentUser.id)
      );
    }
    if (activePipelines.length > 0) {
      result = result.filter(r => activePipelines.includes(r.pipeline));
    }
    if (dateRange.start) {
      const start = startOfDay(dateRange.start);
      const end = dateRange.end ? endOfDay(dateRange.end) : null;
      result = result.filter(r => {
        const matchesPost = dateFilterTypes.includes('post') && (
          end ? isWithinInterval(r.postDate, { start, end }) : r.postDate >= start
        );
        const matchesDue = dateFilterTypes.includes('due') && (
          end ? isWithinInterval(r.internalDeadline, { start, end }) : r.internalDeadline >= start
        );
        return matchesPost || matchesDue;
      });
    }
    // Always sort: overdue → urgent → due-soon → on-track
    const urgencyRank = { overdue: 0, urgent: 1, 'due-soon': 2, 'on-track': 3 } as const;
    return [...result].sort((a, b) => urgencyRank[getUrgency(a)] - urgencyRank[getUrgency(b)]);
  }, [requests, activePipelines, dateRange, dateFilterTypes, currentUser]);

  const updateRequest = useCallback((id: string, updates: Partial<ContentRequest>) => {
    setRequests(prev => {
      const target = prev.find(r => r.id === id);
      if (!target) return prev;
      
      let finalUpdates = { ...updates };
      // Reset approvedBy to empty array if status changes to design/review and not explicitly overridden
      if (updates.status && (updates.status === 'Design' || updates.status === 'Design Progress' || updates.status === 'Design Review')) {
        if (finalUpdates.approvedBy === undefined) {
          finalUpdates.approvedBy = [];
        }
      }
      
      const updated = { ...target, ...finalUpdates };
      if (authUser) {
        supabase.from('content_requests').upsert({ id: updated.id, data: updated, updated_at: new Date().toISOString() }).then(({ error }) => {
          if (error) console.error('[Pipeline] Sync failed:', error.message);
        });
      }
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [authUser]);

  const addRequest = useCallback((req: ContentRequest) => {
    setRequests(prev => [req, ...prev]);
    // Immediately persist to Supabase so other users see it right away
    if (authUser) {
      supabase.from('content_requests').upsert({ id: req.id, data: req, updated_at: new Date().toISOString() }).then(({ error }) => {
        if (error) console.error('[Pipeline] Failed to save new request:', error.message);
      });
    }
  }, [authUser]);

  const makeLogEntry = useCallback((
    type: ActivityLogEntry['type'],
    fromStatus: Status,
    toStatus: Status,
    note?: string,
  ): ActivityLogEntry => ({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    userId: currentUser.id,
    timestamp: new Date(),
    fromStatus,
    toStatus,
    note,
  }), [currentUser.id]);

  const approveRequest = useCallback((id: string, requireFounderReview = false) => {
    const now = new Date();
    setRequests(prev => {
      const target = prev.find(r => r.id === id);
      if (!target) return prev;

      const isManager = currentUser.role === 'manager';
      const isFounder = currentUser.role === 'founder';
      let newStatus: Status = target.status;
      let newApprovedAt = target.approvedAt;
      let isFinal = false;
      // A founder requirement set back at Brief Approval carries forward automatically —
      // the Manager doesn't need to re-check "Require Founder Approval" at Design Review too.
      let founderApprovalRequired = target.founderApprovalRequired;

      if (target.status === 'Design Review') {
        if (isManager) {
          const founderRequired = requireFounderReview || target.founderApprovalRequired === true;
          founderApprovalRequired = founderRequired;
          // Manager is the only one who can advance the stage — with founder review
          // required it still moves to Approved, just pending founder sign-off there.
          newStatus = 'Approved';
          newApprovedAt = founderRequired ? null : now;
          isFinal = !founderRequired;
        }
        // Owner/Founder approving here is partial: recorded in approvedBy below,
        // but the task stays in Design Review until a Manager also signs off.
      } else if (target.status === 'Approved') {
        if (isManager || isFounder) { newApprovedAt = now; isFinal = true; }
      }

      const updatedRounds = target.rounds.map((round, i) =>
        i === target.currentRound ? { ...round, status: 'approved' as const } : round
      );
      const logEntry = makeLogEntry(
        isFinal ? 'final_approval' : 'partial_approval',
        target.status, newStatus,
      );
      const updated: ContentRequest = {
        ...target,
        status: newStatus,
        approvedAt: newApprovedAt,
        founderApprovalRequired,
        approvedBy: Array.from(new Set([...(target.approvedBy ?? []), currentUser.id])),
        rounds: updatedRounds,
        activityLog: [...(target.activityLog ?? []), logEntry],
      };
      if (authUser) {
        supabase.from('content_requests').upsert({ id: updated.id, data: updated, updated_at: new Date().toISOString() }).then(({ error }) => {
          if (error) console.error('[Pipeline] Sync failed:', error.message);
        });
      }
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [currentUser.id, currentUser.role, makeLogEntry, authUser]);

  const markAsPosted = useCallback((id: string) => {
    setRequests(prev => {
      const target = prev.find(r => r.id === id);
      if (!target) return prev;
      const newPostedBy = Array.from(new Set([...(target.postedBy ?? []), currentUser.id]));
      const logEntry = makeLogEntry('marked_posted', target.status, 'Posted');
      const updated: ContentRequest = {
        ...target,
        postedBy: newPostedBy,
        status: 'Posted',
        activityLog: [...(target.activityLog ?? []), logEntry],
      };
      if (authUser) {
        supabase.from('content_requests').upsert({ id: updated.id, data: updated, updated_at: new Date().toISOString() }).then(({ error }) => {
          if (error) console.error('[Pipeline] Sync failed:', error.message);
        });
      }
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [currentUser.id, makeLogEntry, authUser]);

  const initiateDesign = useCallback((id: string) => {
    const now = new Date();
    setRequests(prev => {
      const target = prev.find(r => r.id === id);
      if (!target) return prev;
      const logEntry = makeLogEntry('status_change', target.status, 'Design Progress', 'initiated design work');
      const updated: ContentRequest = {
        ...target,
        status: 'Design Progress' as const,
        initiatedAt: now,
        approvedBy: [],
        activityLog: [...(target.activityLog ?? []), logEntry],
      };
      if (authUser) {
        supabase.from('content_requests').upsert({ id: updated.id, data: updated, updated_at: new Date().toISOString() }).then(({ error }) => {
          if (error) console.error('[Pipeline] Sync failed:', error.message);
        });
      }
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [makeLogEntry, authUser]);

  const submitForReview = useCallback((id: string, links: string[], note: string) => {
    setRequests(prev => {
      const target = prev.find(r => r.id === id);
      if (!target) return prev;
      const logEntry = makeLogEntry('submitted_for_review', target.status, 'Design Review', note || undefined);
      const updatedRounds = target.rounds.map((round, i) =>
        i === target.currentRound ? { ...round, submissionLinks: links, submissionNote: note } : round
      );
      const updated: ContentRequest = {
        ...target,
        status: 'Design Review' as const,
        rounds: updatedRounds,
        approvedBy: [],
        activityLog: [...(target.activityLog ?? []), logEntry],
      };
      if (authUser) {
        supabase.from('content_requests').upsert({ id: updated.id, data: updated, updated_at: new Date().toISOString() }).then(({ error }) => {
          if (error) console.error('[Pipeline] Sync failed:', error.message);
        });
      }
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [makeLogEntry, authUser]);

  const acceptTask = useCallback((id: string, startDate?: Date) => {
    setRequests(prev => {
      const target = prev.find(r => r.id === id);
      if (!target) return prev;
      if ((target.assigneeAcceptance ?? []).some(a => a.userId === currentUser.id)) return prev;
      const sequence = (target.assigneeAcceptance ?? []).length + 1;
      const entry: AssigneeAcceptance = {
        userId: currentUser.id,
        acceptedAt: new Date(),
        startDate,
        sequence,
      };
      const logEntry = makeLogEntry('status_change', target.status, target.status, `accepted task (sequence #${sequence})`);
      const updated: ContentRequest = {
        ...target,
        assigneeIds: target.assigneeIds.includes(currentUser.id)
          ? target.assigneeIds
          : [...target.assigneeIds, currentUser.id],
        assigneeAcceptance: [...(target.assigneeAcceptance ?? []), entry],
        activityLog: [...(target.activityLog ?? []), logEntry],
      };
      if (authUser) {
        supabase.from('content_requests').upsert({ id: updated.id, data: updated, updated_at: new Date().toISOString() }).then(({ error }) => {
          if (error) console.error('[Pipeline] Sync failed:', error.message);
        });
      }
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [currentUser.id, makeLogEntry, authUser]);

  const removeAssignee = useCallback((id: string, userId: string) => {
    setRequests(prev => {
      const target = prev.find(r => r.id === id);
      if (!target) return prev;
      const filtered = (target.assigneeAcceptance ?? [])
        .filter(a => a.userId !== userId)
        .map((a, i) => ({ ...a, sequence: i + 1 }));
      const logEntry = makeLogEntry('status_change', target.status, target.status, `removed assignee`);
      const updated: ContentRequest = {
        ...target,
        assigneeIds: target.assigneeIds.filter(aid => aid !== userId),
        assigneeAcceptance: filtered,
        activityLog: [...(target.activityLog ?? []), logEntry],
      };
      if (authUser) {
        supabase.from('content_requests').upsert({ id: updated.id, data: updated, updated_at: new Date().toISOString() }).then(({ error }) => {
          if (error) console.error('[Pipeline] Sync failed:', error.message);
        });
      }
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [makeLogEntry, authUser]);

  const assignTask = useCallback((id: string, userId: string) => {
    setRequests(prev => {
      const target = prev.find(r => r.id === id);
      if (!target) return prev;
      const newAssigneeIds = userId ? [userId] : [];
      // Drop acceptance records for anyone no longer assigned, renumber the rest
      const filteredAcceptance = (target.assigneeAcceptance ?? [])
        .filter(a => newAssigneeIds.includes(a.userId))
        .map((a, i) => ({ ...a, sequence: i + 1 }));
      const logEntry = makeLogEntry('status_change', target.status, target.status, userId ? 'assigned task' : 'unassigned task');
      const updated: ContentRequest = {
        ...target,
        assigneeIds: newAssigneeIds,
        assigneeAcceptance: filteredAcceptance,
        activityLog: [...(target.activityLog ?? []), logEntry],
      };
      if (authUser) {
        supabase.from('content_requests').upsert({ id: updated.id, data: updated, updated_at: new Date().toISOString() }).then(({ error }) => {
          if (error) console.error('[Pipeline] Sync failed:', error.message);
        });
      }
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [makeLogEntry, authUser]);

  // Kanban drag-and-drop: dragging a card back into Brief Approval clears its
  // approval so it has to be re-approved. Any other plain drag just moves the card.
  const dragMoveRequest = useCallback((id: string, targetStatus: Status) => {
    setRequests(prev => {
      const target = prev.find(r => r.id === id);
      if (!target || target.status === targetStatus) return prev;

      let updated: ContentRequest;
      if (targetStatus === 'Brief Approval') {
        const logEntry = makeLogEntry('status_change', target.status, targetStatus, 'moved back for re-approval');
        updated = {
          ...target,
          status: targetStatus,
          managerApproved: false,
          founderApprovalRequired: false,
          founderApproved: false,
          approvedBy: [],
          activityLog: [...(target.activityLog ?? []), logEntry],
        };
      } else {
        const logEntry = makeLogEntry('status_change', target.status, targetStatus, 'moved via drag and drop');
        updated = {
          ...target,
          status: targetStatus,
          activityLog: [...(target.activityLog ?? []), logEntry],
        };
      }

      if (authUser) {
        supabase.from('content_requests').upsert({ id: updated.id, data: updated, updated_at: new Date().toISOString() }).then(({ error }) => {
          if (error) console.error('[Pipeline] Sync failed:', error.message);
        });
      }
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [makeLogEntry, authUser]);

  // Dragging a card straight out of Brief Approval prompts the manager for an
  // assignee and the founder-review toggle, then approves and moves it in one step.
  const approveAndMoveRequest = useCallback((id: string, targetStatus: Status, assigneeId: string, requireFounder: boolean) => {
    setRequests(prev => {
      const target = prev.find(r => r.id === id);
      if (!target) return prev;
      const logEntry = makeLogEntry('brief_approved', 'Brief Approval', targetStatus);
      const updated: ContentRequest = {
        ...target,
        managerApproved: true,
        founderApprovalRequired: requireFounder,
        founderApproved: !requireFounder,
        assigneeIds: assigneeId ? [assigneeId] : target.assigneeIds,
        approvedBy: [],
        status: targetStatus,
        activityLog: [...(target.activityLog ?? []), logEntry],
      };
      if (authUser) {
        supabase.from('content_requests').upsert({ id: updated.id, data: updated, updated_at: new Date().toISOString() }).then(({ error }) => {
          if (error) console.error('[Pipeline] Sync failed:', error.message);
        });
      }
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [makeLogEntry, authUser]);

  const requestChanges = useCallback((id: string, comment: string, referenceLink?: string) => {
    setRequests(prev => {
      const target = prev.find(r => r.id === id);
      if (!target) return prev;
      const updatedRounds = target.rounds.map((round, i) =>
        i === target.currentRound ? { ...round, status: 'changes-requested' as const } : round
      );
      const newRound = {
        round: target.currentRound + 1,
        comments: comment ? [{ userId: currentUser.id, text: comment, createdAt: new Date(), referenceLink, kind: 'feedback' as const }] : [],
        status: 'pending' as const,
        submissionLinks: [],
        submissionNote: '',
      };
      const logEntry = makeLogEntry('changes_requested', target.status, 'Design Progress', comment);
      const updated: ContentRequest = {
        ...target,
        currentRound: target.currentRound + 1,
        rounds: [...updatedRounds, newRound],
        status: 'Design Progress' as const,
        approvedBy: [],
        activityLog: [...(target.activityLog ?? []), logEntry],
      };
      if (authUser) {
        supabase.from('content_requests').upsert({ id: updated.id, data: updated, updated_at: new Date().toISOString() }).then(({ error }) => {
          if (error) console.error('[Pipeline] Sync failed:', error.message);
        });
      }
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [currentUser.id, makeLogEntry, authUser]);

  const editPostDate = useCallback((id: string, newDate: Date, reason: string) => {
    setRequests(prev => {
      const target = prev.find(r => r.id === id);
      if (!target) return prev;
      const updated: ContentRequest = {
        ...target,
        postDate: newDate,
        internalDeadline: calcInternalDeadline(newDate),
        postDateHistory: [...target.postDateHistory, { date: target.postDate, reason, changedBy: currentUser.id }],
      };
      if (authUser) {
        supabase.from('content_requests').upsert({ id: updated.id, data: updated, updated_at: new Date().toISOString() }).then(({ error }) => {
          if (error) console.error('[Pipeline] Sync failed:', error.message);
        });
      }
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [currentUser.id, authUser]);

  const removeCreatorFromApproval = useCallback((id: string) => {
    setRequests(prev => {
      const target = prev.find(r => r.id === id);
      if (!target) return prev;
      const updated: ContentRequest = {
        ...target,
        creatorRemovedFromApproval: true,
      };
      if (authUser) {
        supabase.from('content_requests').upsert({ id: updated.id, data: updated, updated_at: new Date().toISOString() }).then(({ error }) => {
          if (error) console.error('[Pipeline] Sync failed:', error.message);
        });
      }
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [authUser]);

  const addComment = useCallback((id: string, text: string, referenceLink?: string) => {
    if (!text.trim()) return;
    setRequests(prev => {
      const target = prev.find(r => r.id === id);
      if (!target) return prev;
      const newComment = { userId: currentUser.id, text: text.trim(), createdAt: new Date(), referenceLink, kind: 'comment' as const };
      const updatedRounds = target.rounds.map((round, i) =>
        i === target.currentRound
          ? { ...round, comments: [...round.comments, newComment] }
          : round
      );
      const updated: ContentRequest = {
        ...target,
        rounds: updatedRounds,
      };
      if (authUser) {
        supabase.from('content_requests').upsert({ id: updated.id, data: updated, updated_at: new Date().toISOString() }).then(({ error }) => {
          if (error) console.error('[Pipeline] Sync failed:', error.message);
        });
      }
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [currentUser.id, authUser]);

  // ── Backup helpers ────────────────────────────────────────────────────────

  const requestsRef = useRef(requests);
  requestsRef.current = requests;

  const buildAndSave = useCallback(async (label: string, reqs: ContentRequest[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    const data = await compressRequests(reqs);
    const snapshot: BackupSnapshot = {
      id:           `backup-${Date.now()}`,
      label,
      createdAt:    new Date().toISOString(),
      createdBy:    user?.id ?? null,
      requestCount: reqs.length,
      data,
    };
    await saveBackupToSupabase(snapshot);
    setBackups(prev => [snapshot, ...prev]);
  }, []);

  const createBackup = useCallback(async (label = 'Manual backup') => {
    await buildAndSave(label, requestsRef.current);
  }, [buildAndSave]);

  // ── Restore helpers ───────────────────────────────────────────────────────

  const getRestoredRequests = useCallback(async (backupId: string): Promise<ContentRequest[] | null> => {
    const snapshot = backups.find(b => b.id === backupId);
    if (!snapshot) return null;
    const raw = await decompressRequests(snapshot.data);
    return raw.map(migrateRequest);
  }, [backups]);

  const mergeRestored = useCallback((current: ContentRequest[], incoming: ContentRequest[]) => {
    const map = new Map(current.map(r => [r.id, r]));
    for (const r of incoming) map.set(r.id, r);
    return Array.from(map.values());
  }, []);

  const restoreAll = useCallback(async (backupId: string) => {
    const restored = await getRestoredRequests(backupId);
    if (!restored) return;
    setRequests(restored);
  }, [getRestoredRequests]);

  const restoreByRole = useCallback(async (backupId: string, role: Role) => {
    const restored = await getRestoredRequests(backupId);
    if (!restored) return;
    const roleUserIds = new Set(USERS.filter(u => u.role === role).map(u => u.id));
    const filtered = restored.filter(r => roleUserIds.has(r.requesterId));
    setRequests(prev => mergeRestored(prev, filtered));
  }, [getRestoredRequests, mergeRestored]);

  const restoreByUser = useCallback(async (backupId: string, userId: string) => {
    const restored = await getRestoredRequests(backupId);
    if (!restored) return;
    const filtered = restored.filter(r => r.requesterId === userId);
    setRequests(prev => mergeRestored(prev, filtered));
  }, [getRestoredRequests, mergeRestored]);

  const restoreOne = useCallback(async (backupId: string, requestId: string) => {
    const restored = await getRestoredRequests(backupId);
    if (!restored) return;
    const target = restored.find(r => r.id === requestId);
    if (!target) return;
    setRequests(prev => mergeRestored(prev, [target]));
  }, [getRestoredRequests, mergeRestored]);

  const deleteBackup = useCallback(async (backupId: string) => {
    await deleteBackupFromSupabase(backupId);
    setBackups(prev => prev.filter(b => b.id !== backupId));
  }, []);

  // ── Auto-backup every 6 hours ─────────────────────────────────────────────

  useEffect(() => {
    const runAutoBackup = () => {
      buildAndSave(`Auto backup · ${new Date().toLocaleString()}`, requestsRef.current);
    };

    // Fire on mount if no auto-backup exists or last one is older than 6 hours
    fetchBackupsFromSupabase().then(existing => {
      const lastAuto = existing.find(b => b.label.startsWith('Auto backup'));
      const msSinceLast = lastAuto ? Date.now() - new Date(lastAuto.createdAt).getTime() : Infinity;
      if (msSinceLast >= AUTO_INTERVAL) runAutoBackup();
    });

    const timer = setInterval(runAutoBackup, AUTO_INTERVAL);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppContext.Provider value={{
      currentUser, users, requests, filteredRequests, activeView, activeModal,
      activePipelines, dateRange, dateFilterTypes, backups, backupsLoading,
      setCurrentUser, refreshUsers, setActiveView, openModal, closeModal,
      updateRequest, addRequest, approveRequest, markAsPosted,
      initiateDesign, submitForReview, acceptTask, removeAssignee, assignTask, dragMoveRequest, approveAndMoveRequest, requestChanges,
      editPostDate, removeCreatorFromApproval, addComment,
      createBackup, restoreAll, restoreByRole, restoreByUser, restoreOne, deleteBackup,
      togglePipeline, setDateRange, toggleDateFilterType, setDateFilterTypes, clearFilters,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

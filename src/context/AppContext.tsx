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
import { checkTransition, mergeRequest } from '../utils/mergeRequest';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const AUTO_INTERVAL = 6 * 60 * 60 * 1000;

// How long a write of ours may suppress older-looking echoes before we stop trusting it.
const PENDING_WRITE_TTL = 60_000;

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
  addRequest: (req: Omit<ContentRequest, 'id'>) => Promise<{ ok: boolean; id?: string; error?: string }>;
  approveRequest: (id: string, requireFounderReview?: boolean) => void;
  markAsPosted: (id: string) => void;
  initiateDesign: (id: string) => void;
  submitForReview: (id: string, links: string[], note: string) => void;
  editSubmission: (id: string, round: number, links: string[], note: string) => void;
  acceptTask: (id: string, startDate?: Date) => void;
  removeAssignee: (id: string, userId: string) => void;
  assignTask: (id: string, userId: string) => void;
  dragMoveRequest: (id: string, targetStatus: Status) => void;
  approveAndMoveRequest: (id: string, targetStatus: Status, assigneeId: string, requireFounder: boolean) => void;
  requestChanges: (id: string, comment: string, referenceLink?: string) => void;
  editPostDate: (id: string, newDate: Date, reason: string) => void;
  removeCreatorFromApproval: (id: string) => void;
  addComment: (id: string, text: string, referenceLink?: string) => void;
  editComment: (id: string, round: number, commentId: string, text: string) => void;
  deleteComment: (id: string, round: number, commentId: string) => void;
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
  /** Message explaining a change that was refused as out of date, or null. */
  syncNotice: string | null;
  dismissSyncNotice: () => void;
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

  // Tracks the epoch-ms timestamp of the most recent write *we* fired for each
  // request id. A poll or realtime event that reports an older timestamp for that
  // id is a stale read racing our own in-flight upsert — without this guard it would
  // silently revert the row to its pre-write state (the exact "task jumps back a
  // step for no reason" bug).
  //
  // Stored as a number, not the raw ISO string: Postgres hands `updated_at` back in a
  // different textual shape than the one we sent (`+00:00` vs `Z`, extra sub-ms
  // digits), so the old string comparison judged *every* row we had ever written to
  // be stale — permanently hiding freshly created tasks from later loads.
  const pendingWriteAt = useRef<Map<string, number>>(new Map());

  // Writes for the same request run one after another. Each write reads the live row
  // first, so without this two quick actions on one task (or StrictMode running a
  // state updater twice) would both read the pre-write row and the second would judge
  // the first's stage change to be stale.
  const writeChain = useRef<Map<string, Promise<void>>>(new Map());

  // Surfaced to the user when one of their changes is refused as out of date.
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const dismissSyncNotice = useCallback(() => setSyncNotice(null), []);

  // True only while an echo genuinely predates our own in-flight write. Entries also
  // expire, so a dropped/failed write can never blacklist a row for the whole session.
  const isStaleEcho = (id: string, rowUpdatedAt?: string | null) => {
    const pending = pendingWriteAt.current.get(id);
    if (pending === undefined) return false;
    if (Date.now() - pending > PENDING_WRITE_TTL) { pendingWriteAt.current.delete(id); return false; }
    const rowTs = rowUpdatedAt ? Date.parse(rowUpdatedAt) : NaN;
    if (Number.isNaN(rowTs)) return false;
    if (rowTs >= pending) { pendingWriteAt.current.delete(id); return false; } // our write landed
    return true;
  };

  // Load all requests from Supabase when user logs in, then subscribe to real-time changes.
  // Keyed on the user *id*, not the session object: supabase hands out a fresh user
  // object on every TOKEN_REFRESHED / tab-focus event, which used to re-run this whole
  // effect and wholesale-replace `requests` with a snapshot taken before the user's
  // just-created task had committed — making the new task vanish from the board.
  const authUserId = authUser?.id ?? null;
  useEffect(() => {
    if (!authUserId) return;
    supabaseReady.current = false;
    let isFirstLoad = true;

    const loadRequests = () => {
      supabase
        .from('content_requests')
        .select('data, updated_at')
        .order('updated_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('[Pipeline] Failed to load requests:', error.message);
            if (isFirstLoad) setRequests(MOCK_REQUESTS);
            return;
          }
          const rows = (data ?? []).filter(row =>
            !isStaleEcho((row.data as ContentRequest).id, row.updated_at)
          );
          const fresh = rows.map(row => migrateRequest(reviveObj(row.data) as ContentRequest));
          if (isFirstLoad) {
            // Replace, but keep any row we have an unconfirmed write for — otherwise a
            // load that raced a just-created task would wipe it out of the UI.
            setRequests(prev => {
              const seen = new Set(fresh.map(r => r.id));
              const inFlight = prev.filter(r => !seen.has(r.id) && pendingWriteAt.current.has(r.id));
              return inFlight.length ? [...inFlight, ...fresh] : fresh;
            });
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
            const newRow = payload.new as { data: unknown; updated_at?: string };
            const incoming = migrateRequest(reviveObj(newRow.data) as ContentRequest);
            if (isStaleEcho(incoming.id, newRow.updated_at)) return; // stale echo of a write we've since overtaken
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
  }, [authUserId]);


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

  // Single choke point for every write to content_requests — records the write's
  // timestamp in pendingWriteAt (see above) before firing it, so a poll/realtime
  // event that echoes back an older snapshot of this row gets ignored instead of
  // reverting the UI to stale data.
  // `before` is the copy the action was computed from. Given it, we can write back only
  // the fields that actually changed and leave everything else at whatever the server
  // now holds — so one person's comment no longer drags their stale `status` along with
  // it. Without `before` we fall back to writing the whole document (legacy behaviour).
  const syncOnce = useCallback(async (updated: ContentRequest, before?: ContentRequest) => {
    if (!authUser) return;

    // Compare-and-swap against `updated_at`: if someone wrote between our read and our
    // write we re-read and re-merge rather than clobbering them.
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data: row, error: readErr } = await supabase
        .from('content_requests')
        .select('data, updated_at')
        .eq('id', updated.id)
        .maybeSingle();

      if (readErr) {
        pendingWriteAt.current.delete(updated.id);
        console.error('[Pipeline] Sync failed (read):', readErr.message);
        return;
      }

      const server = row ? migrateRequest(reviveObj(row.data) as ContentRequest) : null;

      if (server) {
        const verdict = checkTransition(server, updated, before);
        if (verdict === 'already-applied') {
          pendingWriteAt.current.delete(updated.id);
          return;
        }
        if (verdict === 'stale') {
          // Refuse it, and snap this person's board to the real state so the card
          // jumps back to its true column instead of sitting in the wrong one.
          pendingWriteAt.current.delete(updated.id);
          setRequests(prev => prev.map(r => (r.id === updated.id ? server : r)));
          setSyncNotice(
            `"${server.title}" was already moved to ${server.status} by someone else, so your ` +
            `change (${before!.status} → ${updated.status}) was not applied. Your board has been updated.`
          );
          console.warn('[Pipeline] Refused stale stage change:', updated.id, before!.status, '→', updated.status, '; server is', server.status);
          return;
        }
      }

      const merged = server ? mergeRequest(server, updated, before) : updated;

      const at = Date.now();
      pendingWriteAt.current.set(updated.id, at);
      const updatedAt = new Date(at).toISOString();

      if (!row) {
        const { error } = await supabase
          .from('content_requests')
          .upsert({ id: updated.id, data: merged, updated_at: updatedAt });
        if (error) {
          pendingWriteAt.current.delete(updated.id);
          console.error('[Pipeline] Sync failed:', error.message);
        }
        return;
      }

      const { data: written, error } = await supabase
        .from('content_requests')
        .update({ data: merged, updated_at: updatedAt })
        .eq('id', updated.id)
        .eq('updated_at', row.updated_at)
        .select('id');

      if (error) {
        // Drop the guard so the next poll is allowed to restore the true server state
        // instead of the local edit that never landed.
        pendingWriteAt.current.delete(updated.id);
        console.error('[Pipeline] Sync failed:', error.message);
        return;
      }
      if (written && written.length > 0) return; // landed

      // Nothing matched: someone else wrote first. Loop to re-read and re-merge.
      pendingWriteAt.current.delete(updated.id);
    }
    console.error('[Pipeline] Sync gave up after repeated write conflicts:', updated.id);
  }, [authUser]);

  // `before` is the copy the action was computed from — see syncOnce. Queued per
  // request id so each write reads the row as the previous write left it.
  const syncToSupabase = useCallback((updated: ContentRequest, before?: ContentRequest) => {
    const previous = writeChain.current.get(updated.id) ?? Promise.resolve();
    const next = previous
      .then(() => syncOnce(updated, before))
      .catch(err => console.error('[Pipeline] Sync failed:', err));
    writeChain.current.set(updated.id, next);
    // Drop the entry once this is the tail, so the map doesn't grow for the session.
    next.then(() => { if (writeChain.current.get(updated.id) === next) writeChain.current.delete(updated.id); });
  }, [syncOnce]);

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
      syncToSupabase(updated, target);
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [syncToSupabase]);

  // Creating a request is the one write we do *not* fire optimistically. The id is
  // allocated from the server and the row is INSERTed (never upserted), so a colliding
  // id fails loudly and gets retried instead of silently overwriting another task — and
  // the caller only sees the modal close once the row is actually committed.
  const addRequest = useCallback(async (
    req: Omit<ContentRequest, 'id'>,
  ): Promise<{ ok: boolean; id?: string; error?: string }> => {
    if (!authUser) return { ok: false, error: 'You are signed out. Sign in again and retry.' };

    // Allocate from the server rather than from local state: a list that was stale,
    // still loading, or filtered by RLS used to hand out an id that already existed.
    const { data: idRows, error: idErr } = await supabase.from('content_requests').select('id');
    if (idErr) return { ok: false, error: idErr.message };
    let next = 1;
    for (const row of idRows ?? []) {
      const m = /^REQ-(\d+)$/.exec(String(row.id));
      if (m) next = Math.max(next, parseInt(m[1], 10) + 1);
    }

    for (let attempt = 0; attempt < 25; attempt++) {
      const id = `REQ-${String(next + attempt).padStart(3, '0')}`;
      const created = { ...req, id } as ContentRequest;
      const at = Date.now();
      pendingWriteAt.current.set(id, at);
      const { error } = await supabase
        .from('content_requests')
        .insert({ id, data: created, updated_at: new Date(at).toISOString() });
      if (!error) {
        setRequests(prev => prev.some(r => r.id === id) ? prev : [created, ...prev]);
        return { ok: true, id };
      }
      pendingWriteAt.current.delete(id);
      if (error.code !== '23505') { // not a duplicate id — a real failure, surface it
        console.error('[Pipeline] Create failed:', error.message);
        return { ok: false, error: error.message };
      }
    }
    return { ok: false, error: 'Could not allocate a free request id. Please try again.' };
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
      syncToSupabase(updated, target);
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [currentUser.id, currentUser.role, makeLogEntry, syncToSupabase]);

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
      syncToSupabase(updated, target);
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [currentUser.id, makeLogEntry, syncToSupabase]);

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
      syncToSupabase(updated, target);
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [makeLogEntry, syncToSupabase]);

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
      syncToSupabase(updated, target);
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [makeLogEntry, syncToSupabase]);

  // Fixes a round's submitted links/note in place — e.g. the submitter pasted the
  // wrong URL. Doesn't touch status or approvedBy, so it's safe to use even on a
  // round that's already been approved (unlike submitForReview, which re-opens review).
  const editSubmission = useCallback((id: string, round: number, links: string[], note: string) => {
    setRequests(prev => {
      const target = prev.find(r => r.id === id);
      if (!target) return prev;
      const logEntry = makeLogEntry('status_change', target.status, target.status, `edited submitted link${links.length !== 1 ? 's' : ''} (round ${round})`);
      const updatedRounds = target.rounds.map((r, i) =>
        i === round ? { ...r, submissionLinks: links, submissionNote: note } : r
      );
      const updated: ContentRequest = {
        ...target,
        rounds: updatedRounds,
        activityLog: [...(target.activityLog ?? []), logEntry],
      };
      syncToSupabase(updated, target);
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [makeLogEntry, syncToSupabase]);

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
      syncToSupabase(updated, target);
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [currentUser.id, makeLogEntry, syncToSupabase]);

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
      syncToSupabase(updated, target);
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [makeLogEntry, syncToSupabase]);

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
      syncToSupabase(updated, target);
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [makeLogEntry, syncToSupabase]);

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

      syncToSupabase(updated, target);
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [makeLogEntry, syncToSupabase]);

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
      syncToSupabase(updated, target);
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [makeLogEntry, syncToSupabase]);

  const requestChanges = useCallback((id: string, comment: string, referenceLink?: string) => {
    setRequests(prev => {
      const target = prev.find(r => r.id === id);
      if (!target) return prev;
      const updatedRounds = target.rounds.map((round, i) =>
        i === target.currentRound ? { ...round, status: 'changes-requested' as const } : round
      );
      const newRound = {
        round: target.currentRound + 1,
        comments: comment ? [{ id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, userId: currentUser.id, text: comment, createdAt: new Date(), referenceLink, kind: 'feedback' as const }] : [],
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
      syncToSupabase(updated, target);
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [currentUser.id, makeLogEntry, syncToSupabase]);

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
      syncToSupabase(updated, target);
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [currentUser.id, syncToSupabase]);

  const removeCreatorFromApproval = useCallback((id: string) => {
    setRequests(prev => {
      const target = prev.find(r => r.id === id);
      if (!target) return prev;
      const updated: ContentRequest = {
        ...target,
        creatorRemovedFromApproval: true,
      };
      syncToSupabase(updated, target);
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [syncToSupabase]);

  const addComment = useCallback((id: string, text: string, referenceLink?: string) => {
    if (!text.trim()) return;
    setRequests(prev => {
      const target = prev.find(r => r.id === id);
      if (!target) return prev;
      const newComment = {
        id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userId: currentUser.id, text: text.trim(), createdAt: new Date(), referenceLink, kind: 'comment' as const,
      };
      const updatedRounds = target.rounds.map((round, i) =>
        i === target.currentRound
          ? { ...round, comments: [...round.comments, newComment] }
          : round
      );
      const updated: ContentRequest = {
        ...target,
        rounds: updatedRounds,
      };
      syncToSupabase(updated, target);
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [currentUser.id, syncToSupabase]);

  // Only the comment's own author may edit it — this is about someone
  // fixing/retracting their own words, not moderation.
  const editComment = useCallback((id: string, round: number, commentId: string, text: string) => {
    if (!text.trim()) return;
    setRequests(prev => {
      const target = prev.find(r => r.id === id);
      if (!target) return prev;
      const updatedRounds = target.rounds.map((r, i) =>
        i === round
          ? {
              ...r,
              comments: r.comments.map(c =>
                c.id === commentId && c.userId === currentUser.id
                  ? { ...c, text: text.trim(), editedAt: new Date() }
                  : c
              ),
            }
          : r
      );
      const updated: ContentRequest = { ...target, rounds: updatedRounds };
      syncToSupabase(updated, target);
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [currentUser.id, syncToSupabase]);

  // Delete is manager-only moderation, not an authorship right — unlike edit,
  // deliberately no author-can-delete-own-comment path.
  const deleteComment = useCallback((id: string, round: number, commentId: string) => {
    if (currentUser.role !== 'manager') return;
    setRequests(prev => {
      const target = prev.find(r => r.id === id);
      if (!target) return prev;
      const updatedRounds = target.rounds.map((r, i) =>
        i === round
          ? { ...r, comments: r.comments.filter(c => c.id !== commentId) }
          : r
      );
      const updated: ContentRequest = { ...target, rounds: updatedRounds };
      syncToSupabase(updated, target);
      return prev.map(r => r.id === id ? updated : r);
    });
  }, [currentUser.role, syncToSupabase]);

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
      initiateDesign, submitForReview, editSubmission, acceptTask, removeAssignee, assignTask, dragMoveRequest, approveAndMoveRequest, requestChanges,
      editPostDate, removeCreatorFromApproval, addComment, editComment, deleteComment,
      createBackup, restoreAll, restoreByRole, restoreByUser, restoreOne, deleteBackup,
      togglePipeline, setDateRange, toggleDateFilterType, setDateFilterTypes, clearFilters,
      syncNotice, dismissSyncNotice,
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

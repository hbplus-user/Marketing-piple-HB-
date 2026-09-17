import type { ActivityLogEntry, Status } from '../types';

const LABELS: Record<ActivityLogEntry['type'], string> = {
  brief_approved:       'approved the brief',
  submitted_for_review: 'submitted for design review',
  partial_approval:     'partially approved (pending manager sign-off)',
  final_approval:       'gave final approval',
  changes_requested:    'requested changes',
  marked_posted:        'marked as posted',
  status_change:        'moved the task',
};

/** One row of the task timeline. `from`/`to` are set only when the task changed stage. */
export interface HistoryItem {
  kind: 'history';
  date: Date;
  userId?: string;
  text: string;
  from?: Status;
  to?: Status;
}

/**
 * Splits an activity entry into what the person did and, separately, the stages the
 * task moved between — kept apart so the timeline can render the transition as
 * coloured status chips instead of burying it in a sentence. The stage pair is what
 * makes the history auditable: a bare "changed status" gives no way to see a task
 * sliding backwards out of Approved.
 */
export function describeActivity(entry: ActivityLogEntry): { text: string; from?: Status; to?: Status } {
  const base = LABELS[entry.type] ?? entry.type;
  const text = entry.note ? `${base} — ${entry.note}` : base;
  return entry.fromStatus && entry.toStatus && entry.fromStatus !== entry.toStatus
    ? { text, from: entry.fromStatus, to: entry.toStatus }
    : { text };
}

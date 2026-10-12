import type { ActivityLogEntry, Status } from '../types';

const LABELS: Record<ActivityLogEntry['type'], string> = {
  brief_approved:       'approved the brief',
  submitted_for_review: 'submitted for design review',
  partial_approval:     'partially approved (pending manager sign-off)',
  final_approval:       'gave final approval',
  changes_requested:    'requested changes',
  marked_posted:        'marked as posted',
  status_change:        'moved the task',
  edited:               'edited the task',
};

/**
 * Human names for the request fields people actually edit. Used both in the
 * timeline and in the note stamped onto an edit, so Slack can say "post date"
 * rather than leaking the internal field name `postDate`.
 */
export const FIELD_LABELS: Record<string, string> = {
  title:            'title',
  brief:            'description',
  pipeline:         'pipeline',
  category:         'category',
  postDate:         'post date',
  internalDeadline: 'internal deadline',
  daysNeeded:       'estimated days needed',
  priority:         'priority',
  ownerId:          'owner',
  referenceLinks:   'reference links',
  reviewerIds:      'reviewers',
  assigneeIds:      'assignee',
  followerIds:      'followers',
};

/**
 * Dates and arrays are rebuilt on every edit, so a plain !== would report fields
 * as changed when nothing about them actually moved.
 */
export function isSameFieldValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => isSameFieldValue(v, b[i]));
  }
  return a === b;
}

/** "post date, reviewers" from a list of changed field keys. */
export function describeFields(keys: string[]): string {
  return keys.map(k => FIELD_LABELS[k] ?? k).join(', ');
}

/** One row of the task timeline. `from`/`to` are set only when the task changed stage. */
export interface HistoryItem {
  kind: 'history';
  date: Date;
  userId?: string;
  /** Name captured when the action happened; used if the user list has no match. */
  userName?: string;
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

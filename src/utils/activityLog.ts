import type { ActivityLogEntry } from '../types';

const LABELS: Record<ActivityLogEntry['type'], string> = {
  brief_approved:       'approved the brief',
  submitted_for_review: 'submitted for design review',
  partial_approval:     'partially approved (pending manager sign-off)',
  final_approval:       'gave final approval',
  changes_requested:    'requested changes',
  marked_posted:        'marked as posted',
  status_change:        'moved the task',
};

/**
 * One line describing an activity entry, including the stages it moved the task
 * between. The from → to pair is what makes the timeline auditable: a bare
 * "changed status" says nothing about what actually happened, and in particular
 * gives no way to spot a task sliding backwards out of Approved.
 */
export function describeActivity(entry: ActivityLogEntry): string {
  const label = LABELS[entry.type] ?? entry.type;
  const note  = entry.note ? ` — ${entry.note}` : '';
  const moved = entry.fromStatus && entry.toStatus && entry.fromStatus !== entry.toStatus;
  return moved
    ? `${label}${note} · ${entry.fromStatus} → ${entry.toStatus}`
    : `${label}${note}`;
}

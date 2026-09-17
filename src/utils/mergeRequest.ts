import type { ActivityLogEntry, ContentRequest, ReviewRound } from '../types';

// ── Concurrent-edit merging ────────────────────────────────────────────────
// Every write stores the whole request as one jsonb document, so a naive write is
// last-one-wins across *all* fields. That is what silently reverted an Approved task
// to Design Review: a second person acting from a stale copy (a tab left open, a
// missed realtime event) wrote their old `status` back along with their actual edit.
// We therefore write only the fields an action genuinely changed, and union the
// append-only lists so two people acting at once can't erase each other.

// Identity of a comment, stable across edits (older comments predate `id`).
export const commentKey = (c: ReviewRound['comments'][number]) =>
  c.id ?? `${c.userId}|${new Date(c.createdAt).getTime()}`;

export function mergeActivityLog(server: ActivityLogEntry[] = [], mine: ActivityLogEntry[] = []): ActivityLogEntry[] {
  const byId = new Map(server.map(e => [e.id, e]));
  for (const e of mine) byId.set(e.id, e);
  return Array.from(byId.values())
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function mergeRounds(
  server: ReviewRound[] = [],
  mine: ReviewRound[] = [],
  before?: ReviewRound[],
): ReviewRound[] {
  // A comment the writer held before but no longer holds was deliberately deleted;
  // anything else only present on the server is someone else's concurrent comment and
  // must survive. Without this, union-merging would resurrect deleted comments.
  const deleted = new Set<string>();
  if (before) {
    const mineKeys = new Set(mine.flatMap(r => (r.comments ?? []).map(commentKey)));
    for (const r of before) {
      for (const c of r.comments ?? []) {
        const k = commentKey(c);
        if (!mineKeys.has(k)) deleted.add(k);
      }
    }
  }

  const out: ReviewRound[] = [];
  for (let i = 0; i < Math.max(server.length, mine.length); i++) {
    const s = server[i];
    const m = mine[i];
    if (!m) { out.push(s); continue; }
    if (!s) { out.push(m); continue; }
    const byKey = new Map<string, ReviewRound['comments'][number]>();
    for (const c of s.comments ?? []) {
      const k = commentKey(c);
      if (!deleted.has(k)) byKey.set(k, c);
    }
    for (const c of m.comments ?? []) byKey.set(commentKey(c), c); // my edit wins
    out.push({
      ...m, // the acting client owns this round's status / submission fields
      comments: Array.from(byKey.values())
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    });
  }
  return out;
}

/** Top-level fields an action actually changed, relative to the copy it started from. */
export function changedKeys(
  updated: ContentRequest,
  before?: ContentRequest,
): (keyof ContentRequest)[] {
  const keys = Object.keys(updated) as (keyof ContentRequest)[];
  return before ? keys.filter(k => !Object.is(updated[k], before[k])) : keys;
}

/**
 * Apply one client's edit onto the row as it currently stands on the server.
 * Only the fields that client actually changed are taken from their copy, so an
 * action performed against a stale snapshot can no longer drag every other field
 * backwards with it.
 */
export function mergeRequest(
  server: ContentRequest,
  updated: ContentRequest,
  before?: ContentRequest,
): ContentRequest {
  const merged = { ...server } as ContentRequest;
  for (const k of changedKeys(updated, before)) {
    (merged as unknown as Record<string, unknown>)[k as string] = updated[k];
  }
  merged.activityLog = mergeActivityLog(server.activityLog, updated.activityLog);
  merged.rounds      = mergeRounds(server.rounds, updated.rounds, before?.rounds);
  return merged;
}

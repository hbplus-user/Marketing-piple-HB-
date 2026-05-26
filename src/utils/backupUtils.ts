import { supabase } from '../lib/supabase';
import type { BackupSnapshot, ContentRequest } from '../types';

// ── Compression ───────────────────────────────────────────────────────────────

export async function compressRequests(requests: ContentRequest[]): Promise<string> {
  const json = JSON.stringify(requests);
  try {
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    writer.write(new TextEncoder().encode(json));
    writer.close();
    const buffer = await new Response(stream.readable).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  } catch {
    return btoa(encodeURIComponent(json));
  }
}

export async function decompressRequests(compressed: string): Promise<ContentRequest[]> {
  try {
    const binary = atob(compressed);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const stream = new DecompressionStream('gzip');
    const writer = stream.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const buffer = await new Response(stream.readable).arrayBuffer();
    return JSON.parse(new TextDecoder().decode(buffer)).map(reviveDates);
  } catch {
    return JSON.parse(decodeURIComponent(atob(compressed))).map(reviveDates);
  }
}

function reviveDates(r: Record<string, unknown>): ContentRequest {
  return {
    ...(r as unknown as ContentRequest),
    postDate:         new Date(r.postDate as string),
    internalDeadline: new Date(r.internalDeadline as string),
    createdAt:        new Date(r.createdAt as string),
    approvedAt:       r.approvedAt ? new Date(r.approvedAt as string) : null,
    postDateHistory: (r.postDateHistory as { date: string; reason: string; changedBy: string }[])
      .map(h => ({ ...h, date: new Date(h.date) })),
    rounds: (r.rounds as { round: number; status: string; comments: { userId: string; text: string; createdAt: string; referenceLink?: string }[] }[])
      .map(round => ({
        ...round,
        comments: round.comments.map(c => ({ ...c, createdAt: new Date(c.createdAt) })),
      })),
  } as ContentRequest;
}

// ── Supabase persistence ──────────────────────────────────────────────────────

export async function fetchBackupsFromSupabase(): Promise<BackupSnapshot[]> {
  const { data, error } = await supabase
    .from('backups')
    .select('id, label, created_at, created_by, request_count, data')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(row => ({
    id:           row.id,
    label:        row.label,
    createdAt:    row.created_at,
    createdBy:    row.created_by ?? null,
    requestCount: row.request_count,
    data:         row.data,
  }));
}

export async function saveBackupToSupabase(snapshot: BackupSnapshot): Promise<void> {
  await supabase.from('backups').insert({
    id:            snapshot.id,
    label:         snapshot.label,
    created_by:    snapshot.createdBy,
    request_count: snapshot.requestCount,
    data:          snapshot.data,
  });
}

export async function deleteBackupFromSupabase(id: string): Promise<void> {
  await supabase.from('backups').delete().eq('id', id);
}

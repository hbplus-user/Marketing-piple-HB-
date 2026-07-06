import { supabase } from '../lib/supabase';

export type InviteRole = 'designer' | 'employee';

export interface PendingInvite {
  email: string;
  role: InviteRole;
  invitedBy: string | null;
  createdAt: string;
}

export async function listPendingInvites(): Promise<PendingInvite[]> {
  const { data, error } = await supabase
    .from('pending_invites')
    .select('email, role, invited_by, created_at')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(row => ({
    email:     row.email,
    role:      row.role as InviteRole,
    invitedBy: row.invited_by ?? null,
    createdAt: row.created_at,
  }));
}

export async function addInvite(email: string, role: InviteRole, invitedBy: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('pending_invites')
    .upsert({ email: email.toLowerCase().trim(), role, invited_by: invitedBy });
  return { error: error?.message ?? null };
}

export async function deleteInvite(email: string): Promise<void> {
  await supabase.from('pending_invites').delete().eq('email', email);
}

export async function updateUserRole(userId: string, role: InviteRole): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);
  return { error: error?.message ?? null };
}

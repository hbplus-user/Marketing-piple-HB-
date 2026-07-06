import { useEffect, useState } from 'react';
import { Users, UserPlus, X, Loader2 } from 'lucide-react';
import Modal from '../shared/Modal';
import Avatar from '../shared/Avatar';
import { useApp } from '../../context/AppContext';
import { canManageTeam } from '../../utils/permissions';
import {
  addInvite, deleteInvite, listPendingInvites, updateUserRole,
  type InviteRole, type PendingInvite,
} from '../../utils/teamInvites';
import type { Role } from '../../types';

const ALLOWED_DOMAIN = 'hbplus.fit';

const ROLE_STYLE: Record<Role, { label: string; bg: string; text: string }> = {
  employee: { label: 'User',     bg: '#F0F9FF', text: '#0EA5E9' },
  designer: { label: 'Designer', bg: '#FDF4FF', text: '#C026D3' },
  manager:  { label: 'Manager',  bg: '#F5F3FF', text: '#7C3AED' },
  founder:  { label: 'Founder',  bg: '#EFF6FF', text: '#3B82F6' },
};

export default function ManageTeamModal({ open }: { open: boolean }) {
  const { closeModal, currentUser, users, refreshUsers } = useApp();

  const [invites, setInvites]     = useState<PendingInvite[]>([]);
  const [email, setEmail]         = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('employee');
  const [error, setError]         = useState<string | null>(null);
  const [busy, setBusy]           = useState(false);

  const allowed = canManageTeam(currentUser.role);

  useEffect(() => {
    if (open && allowed) listPendingInvites().then(setInvites);
  }, [open, allowed]);

  if (!allowed) return null;

  const handleInvite = async () => {
    const trimmed = email.toLowerCase().trim();
    if (!trimmed.endsWith(`@${ALLOWED_DOMAIN}`)) {
      setError(`Email must end with @${ALLOWED_DOMAIN}`);
      return;
    }
    setError(null);
    setBusy(true);
    const { error: err } = await addInvite(trimmed, inviteRole, currentUser.id);
    setBusy(false);
    if (err) { setError(err); return; }
    setEmail('');
    setInvites(await listPendingInvites());
  };

  const handleRemoveInvite = async (inviteEmail: string) => {
    await deleteInvite(inviteEmail);
    setInvites(await listPendingInvites());
  };

  const handleRoleChange = async (userId: string, role: InviteRole) => {
    await updateUserRole(userId, role);
    await refreshUsers();
  };

  return (
    <Modal open={open} onClose={closeModal} size="lg">
      <div className="relative px-6 py-5 max-h-[82vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-1">
          <Users size={17} className="text-[#c47d61]" />
          <h2 className="text-base font-bold text-gray-900">Manage Team</h2>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Add teammates by email as Designer or User. Manager/Founder access can only be set from the backend.
        </p>

        {/* Invite form */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 mb-6">
          <p className="text-xs font-semibold text-gray-600 mb-2.5 flex items-center gap-1.5">
            <UserPlus size={13} /> Invite a teammate
          </p>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={`name@${ALLOWED_DOMAIN}`}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#a9674d] bg-white"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as InviteRole)}
              className="px-2.5 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            >
              <option value="employee">User</option>
              <option value="designer">Designer</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={busy || !email.trim()}
              className="px-3.5 py-2 text-sm font-semibold bg-[#a9674d] hover:bg-[#8a4f39] disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : null}
              Add
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

          {invites.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {invites.map(inv => (
                <div key={inv.email} className="flex items-center justify-between px-3 py-1.5 bg-white rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-700">{inv.email}</span>
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: ROLE_STYLE[inv.role].bg, color: ROLE_STYLE[inv.role].text }}
                    >
                      {ROLE_STYLE[inv.role].label}
                    </span>
                    <span className="text-[10px] text-amber-600 font-medium">pending</span>
                  </div>
                  <button
                    onClick={() => handleRemoveInvite(inv.email)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label={`Remove invite for ${inv.email}`}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Roster */}
        <p className="text-xs font-semibold text-gray-600 mb-2.5">Team ({users.length})</p>
        <div className="space-y-1.5">
          {users.map(u => {
            const editable = u.role === 'employee' || u.role === 'designer';
            return (
              <div key={u.id} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar initials={u.initials} color={u.avatarColor} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{u.name}</p>
                    {u.email && <p className="text-[10px] text-gray-400 truncate">{u.email}</p>}
                  </div>
                </div>
                {editable ? (
                  <select
                    value={u.role}
                    onChange={e => handleRoleChange(u.id, e.target.value as InviteRole)}
                    className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white"
                  >
                    <option value="employee">User</option>
                    <option value="designer">Designer</option>
                  </select>
                ) : (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: ROLE_STYLE[u.role].bg, color: ROLE_STYLE[u.role].text }}
                  >
                    {ROLE_STYLE[u.role].label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

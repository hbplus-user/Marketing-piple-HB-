import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import Modal from '../shared/Modal';
import { useApp } from '../../context/AppContext';
import type { Status } from '../../types';

export default function DragApproveModal({ open, requestId, targetStatus }: { open: boolean; requestId?: string; targetStatus?: Status }) {
  const { requests, users, closeModal, approveAndMoveRequest } = useApp();
  const req = requests.find(r => r.id === requestId);

  const [assigneeId, setAssigneeId] = useState('');
  const [requireFounder, setRequireFounder] = useState(false);

  useEffect(() => {
    if (open && req) {
      setAssigneeId(req.assigneeIds[0] ?? '');
      setRequireFounder(req.founderApprovalRequired === true);
    }
  }, [open, requestId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!req || !targetStatus) return null;

  const designers = users.filter(u => u.role === 'designer');

  const handleConfirm = () => {
    if (!assigneeId) return;
    approveAndMoveRequest(req.id, targetStatus, assigneeId, requireFounder);
    closeModal();
  };

  return (
    <Modal open={open} onClose={closeModal} title="Approve & move" size="sm">
      <div className="px-6 py-5 space-y-4">
        <p className="text-sm text-gray-600">
          Moving <span className="font-semibold text-gray-800">{req.title}</span> to{' '}
          <span className="font-semibold text-gray-800">{targetStatus}</span> approves the brief.
        </p>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Assigned to *</label>
          <select
            value={assigneeId}
            onChange={e => setAssigneeId(e.target.value)}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20 focus:border-[#a9674d] ${
              !assigneeId ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-200'
            }`}
          >
            <option value="">Unassigned</option>
            {designers.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          {!assigneeId && (
            <p className="text-[11px] text-amber-600 mt-1">Required before moving to the next step</p>
          )}
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 rounded-lg bg-violet-50 border border-violet-100 hover:bg-violet-100 transition-colors">
          <input
            type="checkbox"
            checked={requireFounder}
            onChange={e => setRequireFounder(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-violet-600 cursor-pointer"
          />
          <ShieldCheck size={13} className="text-violet-500 flex-shrink-0" />
          <span className="text-[12px] font-semibold text-violet-700">Require Founder Approval</span>
        </label>
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
        <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!assigneeId}
          className="px-4 py-2 text-sm font-semibold bg-[#a9674d] hover:bg-[#8a4f39] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg transition-colors"
        >
          Approve & Move
        </button>
      </div>
    </Modal>
  );
}

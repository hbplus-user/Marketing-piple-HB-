import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, Bell, ShieldAlert } from 'lucide-react';
import Modal from '../shared/Modal';
import { useApp } from '../../context/AppContext';
import { USERS } from '../../data/mockData';
import { canEditPostDate } from '../../utils/permissions';

export default function EditPostDateModal({ open, requestId }: { open: boolean; requestId?: string }) {
  const { requests, closeModal, editPostDate, currentUser } = useApp();
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');

  const req = requests.find(r => r.id === requestId);
  if (!req) return null;

  const canEdit = canEditPostDate(currentUser.role, req, currentUser.id);
  const requester = USERS.find(u => u.id === req.requesterId);
  const assignees = USERS.filter(u => req.assigneeIds.includes(u.id));

  const handleSave = () => {
    if (!newDate || !reason.trim()) return;
    editPostDate(req.id, new Date(newDate), reason);
    closeModal();
    setNewDate('');
    setReason('');
  };

  if (!canEdit) {
    return (
      <Modal open={open} onClose={closeModal} size="sm">
        <div className="px-6 py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={22} className="text-amber-500" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-2">Access restricted</h3>
          <p className="text-sm text-gray-600 mb-5 leading-relaxed">
            Only the requester, marketing manager, or founder can change post dates. Request a date change from{' '}
            <span className="font-semibold text-gray-800">Chetna Rao</span>.
            She'll receive a notification and can override or reject.
          </p>
          <div className="flex gap-2">
            <button onClick={closeModal} className="flex-1 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg transition-colors">
              Cancel
            </button>
            <button className="flex-1 py-2 text-sm font-medium bg-[#a9674d] hover:bg-[#8a4f39] text-white rounded-lg flex items-center justify-center gap-1.5 transition-colors">
              <Bell size={13} />
              Request date change
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={closeModal} title={`Edit post date · ${req.id}`} size="md">
      <div className="px-6 py-5 space-y-5">
        <p className="text-sm font-semibold text-gray-900">{req.title}</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Current post date</label>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
              <CalendarDays size={13} className="text-gray-400" />
              {format(req.postDate, 'MMM d, yyyy')}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">New post date</label>
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20 focus:border-[#a9674d]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Reason for change *</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            placeholder="Required. This will appear in the request's history."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20 focus:border-[#a9674d]"
          />
        </div>

        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
          <Bell size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-blue-700 leading-relaxed">
            A notification will be sent to{' '}
            <span className="font-semibold">{requester?.name}</span>
            {assignees.length > 0 && <>, <span className="font-semibold">{assignees.map(u => u.name).join(', ')}</span></>}
            , and all reviewers. The internal deadline auto-recalculates to T-5.
          </p>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
        <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!newDate || !reason.trim()}
          className="px-4 py-2 text-sm font-medium bg-[#a9674d] hover:bg-[#8a4f39] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg transition-colors"
        >
          Save & notify
        </button>
      </div>
    </Modal>
  );
}

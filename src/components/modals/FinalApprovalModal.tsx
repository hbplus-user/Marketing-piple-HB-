import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';
import Modal from '../shared/Modal';
import Badge from '../shared/Badge';
import RoundBadge from '../shared/RoundBadge';
import Avatar from '../shared/Avatar';
import { useApp } from '../../context/AppContext';

export default function FinalApprovalModal({ open, requestId }: { open: boolean; requestId?: string }) {
  const { requests, closeModal, users } = useApp();
  const req = requests.find(r => r.id === requestId);
  if (!req || !req.approvedAt) return null;

  const approvedByUsers = req.approvedBy.map(id => users.find(u => u.id === id)).filter(Boolean);

  return (
    <Modal open={open} onClose={closeModal} size="lg">
      <div className="px-6 py-8 text-center">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <CheckCircle2 size={20} className="text-emerald-500" />
          <h2 className="text-base font-bold text-gray-900">Approved · {req.id}</h2>
        </div>

        {/* Approval stamp */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <motion.div
            className="relative flex items-center justify-center w-36 h-20 border-4 border-emerald-500 rounded-lg"
            style={{ transform: 'rotate(-3deg)' }}
            initial={{ scale: 1.3, opacity: 0, rotate: -3 }}
            animate={{ scale: 1, opacity: 1, rotate: -3 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="text-center">
              <CheckCircle2 size={16} className="text-emerald-500 mx-auto mb-0.5" />
              <p className="text-xs font-black tracking-widest text-emerald-600 uppercase">Approved</p>
            </div>
          </motion.div>

          <div className="text-left">
            <p className="text-xs text-gray-400">Signed off</p>
            <p className="text-sm font-semibold text-gray-800">{format(req.approvedAt, 'MMM d, yyyy')}</p>
            <p className="text-xs text-gray-500">{format(req.approvedAt, 'h:mm a')}</p>
          </div>
        </div>

        {/* Asset card */}
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 mb-6 text-left">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono text-gray-400">{req.id}</span>
            <Badge pipeline={req.pipeline} />
            <RoundBadge round={req.currentRound} />
          </div>
          <p className="text-sm font-semibold text-gray-800">{req.title}</p>
        </div>

        {/* Audit trail */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden text-left">
          <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Audit trail</p>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { label: 'Pipeline',      value: req.pipeline },
              { label: 'Final round',   value: `R${req.currentRound}` },
              { label: 'Post date',     value: format(req.postDate, 'MMM d, yyyy') },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-gray-500">{row.label}</span>
                <span className="text-xs font-medium text-gray-700">{row.value}</span>
              </div>
            ))}
            <div className="px-4 py-2.5">
              <p className="text-xs text-gray-500 mb-2">Signed off by</p>
              <div className="flex items-center gap-2 flex-wrap">
                {approvedByUsers.map(u => u && (
                  <span key={u.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                    <Avatar initials={u.initials} color={u.avatarColor} size="sm" />
                    <span className="text-[11px] font-medium text-emerald-700">{u.name}</span>
                    <CheckCircle2 size={10} className="text-emerald-500" />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
        <button
          onClick={closeModal}
          className="px-4 py-2 text-sm font-medium bg-[#a9674d] hover:bg-[#8a4f39] text-white rounded-lg transition-colors"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}

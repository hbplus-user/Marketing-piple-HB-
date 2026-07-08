import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { ContentRequest, Status } from '../../types';
import KanbanCard from './KanbanCard';
import { useApp } from '../../context/AppContext';
import { playNotificationSound, unlockAudio } from '../../utils/notificationSound';

const STATUS_COLORS: Record<Status, string> = {
  'Brief Approval':  '#888888',
  'Design':          '#7c3aed',
  'Design Progress': '#344161',
  'Design Review':   '#747440',
  'Approved':        '#c99d5d',
  'Posted':          '#5b8dd9',
};

interface KanbanColumnProps {
  status: Status;
  requests: ContentRequest[];
}

export default function KanbanColumn({ status, requests }: KanbanColumnProps) {
  const { openModal, requests: allRequests, dragMoveRequest, currentUser } = useApp();
  const color = STATUS_COLORS[status];
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    // The drop itself is a real user gesture — good moment to unlock audio for
    // any later async sound playback too (e.g. incoming notifications).
    unlockAudio();
    const reqId = e.dataTransfer.getData('text/plain');
    const dragged = allRequests.find(r => r.id === reqId);
    if (!dragged || dragged.status === status) return;

    // Designer dragging a card from Design Progress into Design Review opens the
    // submit-for-review form instead of silently flipping the status — submitting
    // requires links/notes that only that form collects.
    if (dragged.status === 'Design Progress' && status === 'Design Review') {
      openModal({ type: 'designer-task', requestId: reqId, openReviewForm: true });
      return;
    }

    // Dragging from Design Review into Approved opens the feedback thread (Request
    // changes / Approve Design) instead of flipping the status directly — the actual
    // move only happens once Approve is clicked there, and that same flow already
    // treats a non-manager approval (owner/requester) as partial, not final.
    if (dragged.status === 'Design Review' && status === 'Approved') {
      openModal({ type: 'review-feedback', requestId: reqId });
      return;
    }

    // Only a manager can freely drag a card across the board (forward or backward).
    if (currentUser.role !== 'manager') return;

    // Dragging straight out of Brief Approval is the approval action — prompt for
    // the assignee and founder-review toggle before approving and moving it.
    if (dragged.status === 'Brief Approval') {
      openModal({ type: 'drag-approve', requestId: reqId, dragTargetStatus: status });
      return;
    }

    dragMoveRequest(reqId, status);
    // Immediate confirmation for whoever just did the drag — the notification
    // list itself deliberately skips your own actions, so this can't rely on that.
    playNotificationSound();
  };

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column header — glass pill */}
      <div
        className="flex items-center justify-between mb-3 px-3 py-2 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 1px 4px rgba(15,23,42,0.07), inset 0 1px 0 rgba(255,255,255,0.95)',
          border: '1px solid rgba(255,255,255,0.85)',
        }}
      >
        <div className="flex items-center gap-2">
          {/* 3D sphere status dot */}
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              flexShrink: 0,
              display: 'inline-block',
              background: `radial-gradient(circle at 36% 32%, rgba(255,255,255,0.92) 0%, ${color} 44%)`,
              boxShadow: `0 1px 4px ${color}66, inset 0 -1px 0 rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.55)`,
            }}
          />
          <span className="text-[13px] font-semibold text-gray-700">{status}</span>
          {/* Embossed count badge */}
          <span
            className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-gray-500"
            style={{
              background: 'white',
              boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.10), 0 1px 0 rgba(255,255,255,1)',
              border: '1px solid rgba(226,232,240,0.9)',
            }}
          >
            {requests.length}
          </span>
        </div>

        {/* 3D press add button */}
        <motion.button
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.9, y: 1 }}
          onClick={() => openModal({ type: 'new-request' })}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#a9674d] transition-colors"
          style={{
            background: 'white',
            boxShadow: '0 1px 3px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(15,23,42,0.06)',
            border: '1px solid rgba(226,232,240,0.9)',
          }}
          aria-label={`Add request to ${status}`}
        >
          <Plus size={11} />
        </motion.button>
      </div>

      {/* Column tray — inset 3D container */}
      <div
        onDragOver={e => { e.preventDefault(); if (!isDragOver) setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className="flex-1 rounded-2xl p-3 space-y-2.5 transition-colors"
        style={{
          background: isDragOver ? 'rgba(169,103,77,0.10)' : 'rgba(245,242,233,0.6)',
          boxShadow: 'inset 0 2px 8px rgba(83,55,43,0.06), inset 0 1px 0 rgba(255,255,255,0.85)',
          border: isDragOver ? '1px dashed #a9674d' : '1px solid rgba(237,224,208,0.7)',
          minHeight: 200,
        }}
      >
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[160px] gap-2">
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-300 text-lg"
              style={{
                background: 'white',
                boxShadow: '0 1px 3px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
              }}
            >
              ○
            </span>
            <p className="text-xs text-gray-400 font-medium">No requests</p>
          </div>
        ) : (
          requests.map(req => <KanbanCard key={req.id} req={req} />)
        )}
      </div>
    </div>
  );
}

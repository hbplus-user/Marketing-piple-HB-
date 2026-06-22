import { useState } from 'react';
import { format } from 'date-fns';
import { Paperclip, ImageIcon, Link, ExternalLink, UserMinus, ShieldCheck } from 'lucide-react';
import Modal from '../shared/Modal';
import Badge from '../shared/Badge';
import RoundBadge from '../shared/RoundBadge';
import Avatar from '../shared/Avatar';
import { useApp } from '../../context/AppContext';
import { canApprove, canRequestChanges, canRemoveCreator, isFullApproval, canEditPostDate } from '../../utils/permissions';

export default function ReviewFeedbackModal({ open, requestId }: { open: boolean; requestId?: string }) {
  const { requests, closeModal, approveRequest, requestChanges, removeCreatorFromApproval, currentUser, openModal, users } = useApp();
  const [comment, setComment] = useState('');
  const [refLink, setRefLink] = useState('');

  const req = requests.find(r => r.id === requestId);
  if (!req) return null;

  const userCanApprove    = canApprove(currentUser.role, req, currentUser.id);
  const userCanRequest    = canRequestChanges(currentUser.role, req, currentUser.id);
  const userCanRemove     = canRemoveCreator(currentUser.role, req, currentUser.id);
  const isManager         = currentUser.role === 'manager';
  const isOwner           = req.ownerId === currentUser.id;
  const isFull            = isFullApproval(currentUser.role);
  const creatorUser       = users.find(u => u.id === req.requesterId);
  const inApprovedStage   = req.status === 'Approved';
  // In the Approved stage only the manager can give final sign-off
  const canApproveHere    = inApprovedStage ? isManager : userCanApprove;
  // In the Approved stage both owner and manager can request changes back to Design Progress
  const canRequestHere    = inApprovedStage ? (isOwner || isManager) : userCanRequest;

  const handleApprove = () => {
    approveRequest(req.id);
    closeModal();
  };

  const handleRequestChanges = () => {
    if (!comment.trim()) return;
    requestChanges(req.id, comment.trim(), refLink.trim() || undefined);
    setComment('');
    setRefLink('');
    closeModal();
  };

  const handleRemoveCreator = () => {
    removeCreatorFromApproval(req.id);
  };

  return (
    <Modal open={open} onClose={closeModal} size="full">
      <div className="flex h-[75vh]">
        {/* Left: asset preview */}
        <div className="flex-[3] border-r border-gray-100 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 w-full">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-gray-400">{req.id}</span>
              <Badge pipeline={req.pipeline} />
              <RoundBadge round={req.currentRound} />
              <span className="text-xs text-gray-500">
                {req.attachments.length} attachment{req.attachments.length !== 1 ? 's' : ''}
              </span>
            </div>
            {canEditPostDate(currentUser.role, req, currentUser.id) && (
              <button
                onClick={() => openModal({ type: 'designer-task', requestId: req.id })}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-500">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
                </svg>
                Edit Task Details
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Submission links */}
            {(req.submissionLinks ?? []).length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Submitted links</p>
                <div className="flex flex-col gap-1.5">
                  {req.submissionLinks.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-[#f5ece7] rounded-lg border border-[#f0ddd5] text-xs text-[#8a4f39] hover:bg-[#f0ddd5] transition-colors"
                    >
                      <ExternalLink size={11} className="flex-shrink-0" />
                      <span className="truncate flex-1">{url}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Handoff note */}
            {req.submissionNote && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Handoff note</p>
                <div className="px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                  {req.submissionNote}
                </div>
              </div>
            )}

            {/* Asset preview placeholder */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Asset preview</p>
              <div
                className="w-full aspect-video rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, #f3f4f6 0, #f3f4f6 10px, #f9fafb 0, #f9fafb 50%)' }}
              >
                <ImageIcon size={28} className="text-gray-300" />
                <p className="text-xs text-gray-400 font-medium">No asset uploaded</p>
                {req.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {req.attachments.map(a => (
                      <span key={a} className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-gray-200 text-xs text-gray-500 shadow-sm">
                        <Paperclip size={10} />
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <h3 className="mt-3 text-sm font-semibold text-gray-700">{req.title}</h3>
            </div>
          </div>
        </div>

        {/* Right: feedback thread */}
        <div className="flex-[2] flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Feedback thread</h3>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {req.rounds.map(round => (
              <div key={round.round}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Round {round.round}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    round.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                    round.status === 'changes-requested' ? 'bg-amber-100 text-amber-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {round.status.replace('-', ' ')}
                  </span>
                </div>
                {round.comments.length === 0 ? (
                  <p className="text-xs text-gray-400 italic px-1">No comments yet.</p>
                ) : (
                  <div className="space-y-3">
                    {round.comments.map((c, i) => {
                      const user = users.find(u => u.id === c.userId);
                      return (
                        <div key={i} className="flex items-start gap-2.5">
                          {user && <Avatar initials={user.initials} color={user.avatarColor} size="sm" title={user.name} />}
                          <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[11px] font-semibold text-gray-700">{user?.name}</span>
                              <span className="text-[10px] text-gray-400">{format(c.createdAt, 'MMM d, h:mm a')}</span>
                            </div>
                            <p className="text-xs text-gray-600">{c.text}</p>
                            {c.referenceLink && (
                              <a
                                href={c.referenceLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 flex items-center gap-1 text-[11px] text-[#a9674d] hover:text-[#8a4f39] truncate"
                              >
                                <Link size={10} />
                                {c.referenceLink}
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Comment input + actions */}
          <div className="px-5 py-4 border-t border-gray-100 space-y-2.5">
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={`Comment as ${currentUser.name}...`}
              rows={2}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20 focus:border-[#a9674d]"
            />

            {/* Reference link */}
            <div className="relative">
              <Link size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="url"
                value={refLink}
                onChange={e => setRefLink(e.target.value)}
                placeholder="Reference link (optional)"
                className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20 focus:border-[#a9674d]"
              />
            </div>

            {/* Remove creator from approval - manager or owner only */}
            {userCanRemove && !req.creatorRemovedFromApproval && creatorUser && (
              <label className="flex items-center gap-2 cursor-pointer group">
                <button
                  type="button"
                  onClick={handleRemoveCreator}
                  className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-red-600 transition-colors"
                >
                  <UserMinus size={12} />
                  Remove {creatorUser.name} from approval chain
                </button>
              </label>
            )}
            {req.creatorRemovedFromApproval && creatorUser && (
              <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <UserMinus size={11} />
                {creatorUser.name} removed from approval chain
              </p>
            )}

            {/* Stage-aware context notices */}
            {!inApprovedStage && userCanApprove && !isFull && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                <ShieldCheck size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Your approval marks this as <strong>Approved</strong>. Manager sign-off is still required to move to Done.
                </p>
              </div>
            )}
            {!inApprovedStage && isManager && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
                <ShieldCheck size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-emerald-700">
                  As manager, your approval is <strong>final</strong> and marks this request as Done.
                </p>
              </div>
            )}
            {inApprovedStage && isManager && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
                <ShieldCheck size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-emerald-700">
                  This task is <strong>partially approved</strong>. Your approval will mark it as <strong>Done</strong>.
                </p>
              </div>
            )}
            {inApprovedStage && !isManager && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-violet-50 border border-violet-100">
                <ShieldCheck size={13} className="text-violet-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-violet-700">
                  You've approved this task. Awaiting <strong>manager final sign-off</strong> to move to Done. You can request changes if needed.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              {canRequestHere && (
                <button
                  onClick={handleRequestChanges}
                  disabled={!comment.trim()}
                  className="flex-1 py-2 text-xs font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-gray-700 rounded-lg transition-colors"
                >
                  Request changes
                </button>
              )}
              {canApproveHere && (
                <button
                  onClick={handleApprove}
                  className={`flex-1 py-2 text-xs font-medium text-white rounded-lg transition-colors ${
                    isFull || inApprovedStage
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-amber-500 hover:bg-amber-600'
                  }`}
                >
                  {inApprovedStage ? 'Final Approve → Done' : isFull ? 'Final Approve' : 'Partially Approve'}
                </button>
              )}
              {!canApproveHere && !canRequestHere && (
                <p className="text-[11px] text-gray-400 text-center w-full py-1">
                  You can review and comment, but not approve.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

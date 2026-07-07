import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { Paperclip, Link, ExternalLink, UserMinus, ShieldCheck, Calendar, Send, ChevronRight } from 'lucide-react';
import Modal from '../shared/Modal';
import Badge from '../shared/Badge';
import RoundBadge from '../shared/RoundBadge';
import Avatar from '../shared/Avatar';
import { useApp } from '../../context/AppContext';
import { canApprove, canRequestChanges, canRemoveCreator, canEditPostDate } from '../../utils/permissions';
import { isValidUrl } from '../../utils/validation';

const QUICK_CHIPS = [
  { emoji: '🎉', label: 'Looks good!' },
  { emoji: '👋', label: 'Need help?' },
  { emoji: '🚫', label: 'This is blocked' },
  { emoji: '🔍', label: 'Can you clarify?' },
  { emoji: '✅', label: 'This is on track' },
];

type ActivityTab = 'all' | 'comments' | 'history';

export default function ReviewFeedbackModal({ open, requestId }: { open: boolean; requestId?: string }) {
  const { requests, closeModal, approveRequest, requestChanges, removeCreatorFromApproval, addComment, currentUser, openModal, users } = useApp();
  const [comment, setComment]           = useState('');
  const [refLink, setRefLink]           = useState('');
  const [requireFounder, setRequireFounder] = useState(false);

  // General activity feed — separate from the round-scoped `comment` above,
  // which is tied specifically to the Request Changes / Approve actions below.
  const [activityTab, setActivityTab]             = useState<ActivityTab>('all');
  const [activityComposerOpen, setActivityComposerOpen] = useState(false);
  const [activityText, setActivityText]           = useState('');
  const [activityRefLink, setActivityRefLink]     = useState('');
  const [showActivityRefLink, setShowActivityRefLink] = useState(false);
  const activityTextareaRef = useRef<HTMLTextAreaElement>(null);

  const req = requests.find(r => r.id === requestId);

  // Pre-check "Require Founder Approval" when it already carried over from Brief
  // Approval, but leave it fully editable — the Manager can still override it.
  useEffect(() => {
    setRequireFounder(req?.founderApprovalRequired === true);
  }, [requestId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) {
      setActivityComposerOpen(false);
      setActivityText('');
      setActivityRefLink('');
      setShowActivityRefLink(false);
    }
  }, [open, requestId]);

  useEffect(() => {
    if (activityComposerOpen) activityTextareaRef.current?.focus();
  }, [activityComposerOpen]);

  if (!req) return null;

  const userCanApprove  = canApprove(currentUser.role, req, currentUser.id);
  const userCanRequest  = canRequestChanges(currentUser.role, req, currentUser.id);
  const userCanRemove   = canRemoveCreator(currentUser.role, req, currentUser.id);
  const isManager       = currentUser.role === 'manager';
  const isFounder       = currentUser.role === 'founder';
  const isOwner         = req.ownerId === currentUser.id;
  const creatorUser     = users.find(u => u.id === req.requesterId);
  const partialApprovers = req.status === 'Design Review'
    ? (req.approvedBy ?? []).map(id => users.find(u => u.id === id)).filter(Boolean)
    : [];
  const alreadyApproved = (req.approvedBy ?? []).includes(currentUser.id);
  const currentRoundData = req.rounds.find(r => r.round === req.currentRound);
  const ownerUser      = users.find(u => u.id === req.ownerId);
  const reviewerUsers   = req.reviewerIds.map(id => users.find(u => u.id === id)).filter(Boolean);
  const followerUsers   = (req.followerIds ?? []).map(id => users.find(u => u.id === id)).filter(Boolean);
  const assigneeUsers   = req.assigneeIds.map(id => users.find(u => u.id === id)).filter(Boolean);

  const historyLabels: Record<string, string> = {
    brief_approved:       'approved the brief',
    submitted_for_review: 'submitted for design review',
    partial_approval:     'partially approved (pending manager sign-off)',
    final_approval:       'gave final approval',
    changes_requested:    'requested changes',
    marked_posted:        'marked as posted',
    status_change:        'changed status',
  };
  const historyItems = [
    { kind: 'history' as const, date: req.createdAt, userId: req.requesterId as string | undefined, text: 'created this request' },
    ...req.postDateHistory.map(h => ({ kind: 'history' as const, date: h.date, userId: h.changedBy as string | undefined, text: `changed the post date — ${h.reason}` })),
    ...(req.activityLog ?? []).map(e => ({ kind: 'history' as const, date: e.timestamp, userId: e.userId as string | undefined, text: historyLabels[e.type] ?? e.type })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
  const commentItems = req.rounds.flatMap(round =>
    round.comments
      .filter(c => c.kind !== 'feedback')
      .map(c => ({
        kind: 'comment' as const,
        date: c.createdAt,
        userId: c.userId as string | undefined,
        text: c.text,
        referenceLink: c.referenceLink,
        round: round.round,
      }))
  ).sort((a, b) => a.date.getTime() - b.date.getTime());
  const activityFeedItems =
    activityTab === 'comments' ? commentItems :
    activityTab === 'history'  ? historyItems :
    [...commentItems, ...historyItems].sort((a, b) => a.date.getTime() - b.date.getTime());
  const inApprovedStage = req.status === 'Approved';
  const canRequestHere  = inApprovedStage ? (isOwner || isManager) : userCanRequest;

  // A founder requirement set at Brief Approval carries forward automatically —
  // the checkbox below is pre-checked from it, but the Manager can still edit it.
  const founderCarriedOver = req.founderApprovalRequired === true;

  // Founders in the Approved stage — they can give final sign-off, but only when
  // founder approval was actually required somewhere along the way.
  const founderCanFinalize = isFounder && inApprovedStage && founderCarriedOver;

  const refLinkTrimmed = refLink.trim();
  const refLinkInvalid = refLinkTrimmed.length > 0 && !isValidUrl(refLinkTrimmed);

  const handleApprove = () => {
    if (refLinkInvalid) return;
    const id = req.id;
    const rf = isManager ? requireFounder : false;
    const c  = comment.trim();
    const rl = refLinkTrimmed || undefined;
    if (c) addComment(id, c, rl);
    setComment('');
    setRefLink('');
    setRequireFounder(false);
    closeModal();
    approveRequest(id, rf);
  };

  const handleRequestChanges = () => {
    if (!comment.trim() || refLinkInvalid) return;
    const id = req.id;
    const c  = comment.trim();
    const rl = refLinkTrimmed || undefined;
    setComment('');
    setRefLink('');
    closeModal();
    requestChanges(id, c, rl);
  };

  const openActivityComposer = (prefill = '') => {
    setActivityComposerOpen(true);
    if (prefill) setActivityText(prefill);
  };

  const handleActivitySend = () => {
    if (!activityText.trim()) return;
    addComment(req.id, activityText, activityRefLink.trim() || undefined);
    setActivityText(''); setActivityRefLink(''); setShowActivityRefLink(false); setActivityComposerOpen(false);
  };

  return (
    <Modal open={open} onClose={closeModal} size="full">
      <div className="flex flex-col md:flex-row h-auto md:h-[75vh]">

        {/* Left: asset preview */}
        <div className="w-full md:flex-[3] border-b md:border-b-0 md:border-r border-gray-100 flex flex-col">
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
            {/* Title + brief */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700">{req.title}</h3>
              {req.brief && (
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line mt-1.5">{req.brief}</p>
              )}
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Post date</p>
                <div className="flex items-center gap-1.5 text-xs text-gray-700">
                  <Calendar size={11} className="text-gray-400" />
                  {format(req.postDate, 'MMM d, yyyy')}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Internal deadline</p>
                <div className="flex items-center gap-1.5 text-xs text-gray-700">
                  <Calendar size={11} className="text-gray-400" />
                  {format(req.internalDeadline, 'MMM d, yyyy')}
                </div>
              </div>
              {req.category && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category</p>
                  <p className="text-xs text-gray-700">{req.category}</p>
                </div>
              )}
              {req.priority && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Priority</p>
                  <p className="text-xs text-gray-700 capitalize">{req.priority}</p>
                </div>
              )}
            </div>

            {/* People */}
            <div className="grid grid-cols-2 gap-3">
              {creatorUser && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Requester</p>
                  <div className="flex items-center gap-1.5">
                    <Avatar initials={creatorUser.initials} color={creatorUser.avatarColor} size="sm" />
                    <span className="text-xs text-gray-700">{creatorUser.name}</span>
                  </div>
                </div>
              )}
              {ownerUser && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Owner</p>
                  <div className="flex items-center gap-1.5">
                    <Avatar initials={ownerUser.initials} color={ownerUser.avatarColor} size="sm" />
                    <span className="text-xs text-gray-700">{ownerUser.name}</span>
                  </div>
                </div>
              )}
              {assigneeUsers.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Assignees</p>
                  <div className="flex -space-x-1">
                    {assigneeUsers.map(u => u && <Avatar key={u.id} initials={u.initials} color={u.avatarColor} size="sm" title={u.name} />)}
                  </div>
                </div>
              )}
              {reviewerUsers.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Reviewers</p>
                  <div className="flex -space-x-1">
                    {reviewerUsers.map(u => u && <Avatar key={u.id} initials={u.initials} color={u.avatarColor} size="sm" title={u.name} />)}
                  </div>
                </div>
              )}
              {followerUsers.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Followers</p>
                  <div className="flex -space-x-1">
                    {followerUsers.map(u => u && <Avatar key={u.id} initials={u.initials} color={u.avatarColor} size="sm" title={u.name} />)}
                  </div>
                </div>
              )}
            </div>

            {/* Reference links */}
            {req.referenceLinks.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Reference links</p>
                <div className="flex flex-col gap-1.5">
                  {req.referenceLinks.map(url => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <Link size={11} className="flex-shrink-0" />
                      <span className="truncate flex-1">{url}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Submission links — current round */}
            {(currentRoundData?.submissionLinks ?? []).length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Submitted links</p>
                <div className="flex flex-col gap-1.5">
                  {currentRoundData!.submissionLinks.map((url, i) => (
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

            {/* Handoff note — current round */}
            {currentRoundData?.submissionNote && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Handoff note</p>
                <div className="px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                  {currentRoundData.submissionNote}
                </div>
              </div>
            )}

            {/* Attachments */}
            {req.attachments.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Attachments</p>
                <div className="flex flex-wrap gap-2">
                  {req.attachments.map(a => (
                    <a
                      key={a}
                      href={a}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors max-w-[200px]"
                    >
                      <Paperclip size={11} className="flex-shrink-0" />
                      <span className="truncate">{decodeURIComponent(a.split('/').pop() ?? a)}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Activity — same tabbed feed as the Design/Progress/Approved task view */}
            <div className="pt-5 border-t border-gray-100">
              <div className="flex items-center gap-4 mb-4">
                <h3 className="text-sm font-bold text-gray-900">Activity</h3>
                <div className="flex items-center gap-0.5 border border-gray-200 rounded-lg p-0.5">
                  {(['all', 'comments', 'history'] as ActivityTab[]).map(tab => (
                    <button key={tab} onClick={() => setActivityTab(tab)}
                      className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                        activityTab === tab ? 'bg-white shadow-sm text-[#8a4f39] border border-gray-200' : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3 mb-5">
                <Avatar initials={currentUser.initials} color={currentUser.avatarColor} size="sm" />
                <div className="flex-1">
                  <AnimatePresence mode="wait">
                    {!activityComposerOpen ? (
                      <motion.div key="collapsed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                        <div
                          onClick={() => openActivityComposer()}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-400 cursor-text hover:border-gray-300 hover:bg-gray-50/60 transition-colors"
                        >
                          Add a comment...
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {QUICK_CHIPS.map(chip => (
                            <button
                              key={chip.label}
                              onClick={() => openActivityComposer(chip.label)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-[11px] text-gray-600 font-medium transition-colors"
                            >
                              <span>{chip.emoji}</span>
                              {chip.label}
                            </button>
                          ))}
                          <button className="p-1 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-400 transition-colors">
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="expanded" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                        <div className="border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-[#a9674d]/20 focus-within:border-[#a9674d] overflow-hidden transition-all">
                          {showActivityRefLink && (
                            <div className="relative border-b border-gray-100">
                              <Link size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input type="url" value={activityRefLink} onChange={e => setActivityRefLink(e.target.value)}
                                placeholder="Paste reference URL..."
                                className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 focus:outline-none placeholder:text-gray-400" />
                            </div>
                          )}
                          <textarea
                            ref={activityTextareaRef}
                            value={activityText}
                            onChange={e => setActivityText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleActivitySend(); if (e.key === 'Escape') { setActivityComposerOpen(false); setActivityText(''); } }}
                            placeholder="Add a comment... (Cmd+Enter to send, Esc to cancel)"
                            rows={3}
                            className="w-full px-3 pt-3 pb-1 text-sm resize-none focus:outline-none placeholder:text-gray-400"
                          />
                          <div className="flex items-center justify-between px-2 pb-2">
                            <button onClick={() => setShowActivityRefLink(v => !v)}
                              title={showActivityRefLink ? 'Remove link' : 'Add reference link'}
                              className={`p-1.5 rounded-lg transition-colors ${showActivityRefLink ? 'bg-[#f0ddd5] text-[#a9674d]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                              <Link size={13} />
                            </button>
                            <div className="flex items-center gap-2">
                              <button onClick={() => { setActivityComposerOpen(false); setActivityText(''); }}
                                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
                                Cancel
                              </button>
                              <button onClick={handleActivitySend} disabled={!activityText.trim()}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a9674d] hover:bg-[#8a4f39] disabled:opacity-40 text-white text-xs font-medium transition-colors">
                                <Send size={11} />
                                Save
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {activityFeedItems.length === 0 ? (
                <p className="text-xs text-gray-400 italic pl-9">No activity yet.</p>
              ) : (
                <div className="space-y-4">
                  {activityFeedItems.map((item, i) => {
                    const user = users.find(u => u.id === item.userId);
                    if (item.kind === 'comment') {
                      const isMe = item.userId === currentUser.id;
                      return (
                        <div key={i} className="flex items-start gap-3">
                          {user && <Avatar initials={user.initials} color={user.avatarColor} size="sm" title={user.name} />}
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                              <span className="text-[12px] font-semibold text-gray-800">{user?.name ?? 'Unknown'}</span>
                              {!isMe && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                  Round {item.round}
                                </span>
                              )}
                              <span className="text-[11px] text-gray-400 ml-auto">
                                {format(item.date, 'MMM d, yyyy')} at {format(item.date, 'h:mm a')}
                              </span>
                            </div>
                            <div className={`rounded-xl px-3 py-2 text-sm text-gray-700 leading-relaxed ${isMe ? 'bg-[#f5ece7]' : 'bg-gray-50'}`}>
                              {item.text}
                              {item.referenceLink && (
                                <a href={item.referenceLink} target="_blank" rel="noopener noreferrer"
                                  className="mt-1 flex items-center gap-1 text-[11px] text-[#a9674d] hover:underline truncate">
                                  <Link size={10} />{item.referenceLink}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="flex items-center gap-2">
                        {user
                          ? <Avatar initials={user.initials} color={user.avatarColor} size="sm" />
                          : <div className="w-6 h-6 rounded-full bg-gray-200 flex-shrink-0" />
                        }
                        <p className="text-[12px] text-gray-500">
                          <span className="font-semibold text-gray-700">{user?.name ?? 'System'}</span>{' '}
                          {item.text}
                          <span className="ml-2 text-[11px] text-gray-400">
                            · {format(item.date, 'MMM d, yyyy')} at {format(item.date, 'h:mm a')}
                          </span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: feedback thread */}
        <div className="w-full md:flex-[2] flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Feedback thread</h3>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {req.rounds.map(round => {
              const feedbackComments = round.comments.filter(c => c.kind === 'feedback');
              return (
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
                {(round.submissionLinks.length > 0 || round.submissionNote) && (
                  <div className="mb-3 px-3 py-2 bg-[#f5ece7] rounded-lg border border-[#f0ddd5] space-y-1.5">
                    {round.submissionNote && (
                      <p className="text-xs text-[#8a4f39] whitespace-pre-line">{round.submissionNote}</p>
                    )}
                    {round.submissionLinks.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] text-[#a9674d] hover:text-[#8a4f39] truncate"
                      >
                        <ExternalLink size={10} className="flex-shrink-0" />
                        <span className="truncate">{url}</span>
                      </a>
                    ))}
                  </div>
                )}
                {feedbackComments.length === 0 ? (
                  <p className="text-xs text-gray-400 italic px-1">No comments yet.</p>
                ) : (
                  <div className="space-y-3">
                    {feedbackComments.map((c, i) => {
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
              );
            })}
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
            <div>
              <div className="relative">
                <Link size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  value={refLink}
                  onChange={e => setRefLink(e.target.value)}
                  placeholder="Reference link (optional)"
                  className={`w-full pl-7 pr-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 ${
                    refLinkInvalid
                      ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                      : 'border-gray-200 focus:ring-[#a9674d]/20 focus:border-[#a9674d]'
                  }`}
                />
              </div>
              {refLinkInvalid && (
                <p className="text-[11px] text-red-500 mt-1">Enter a valid link, e.g. https://example.com</p>
              )}
            </div>

            {/* Remove creator from approval chain */}
            {userCanRemove && !req.creatorRemovedFromApproval && creatorUser && (
              <button
                type="button"
                onClick={() => { removeCreatorFromApproval(req.id); }}
                className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-red-600 transition-colors"
              >
                <UserMinus size={12} />
                Remove {creatorUser.name} from approval chain
              </button>
            )}
            {req.creatorRemovedFromApproval && creatorUser && (
              <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <UserMinus size={11} />
                {creatorUser.name} removed from approval chain
              </p>
            )}

            {/* Require Founder Approval — manager only, Design Review stage */}
            {req.status === 'Design Review' && isManager && (
              <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 rounded-lg bg-violet-50 border border-violet-100 hover:bg-violet-100 transition-colors">
                <input
                  type="checkbox"
                  checked={requireFounder}
                  onChange={e => setRequireFounder(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-violet-600 cursor-pointer"
                />
                <ShieldCheck size={13} className="text-violet-500 flex-shrink-0" />
                <span className="text-[12px] font-semibold text-violet-700">
                  Require Founder Approval
                  {founderCarriedOver && requireFounder && <span className="font-normal"> — carried over from Brief Approval</span>}
                </span>
              </label>
            )}

            {/* Partial approval already recorded — stage hasn't advanced, still needs Manager */}
            {req.status === 'Design Review' && partialApprovers.length > 0 && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                <ShieldCheck size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-amber-700">
                  <strong>Partially approved</strong> by {partialApprovers.map(u => u!.name).join(', ')} — still needs a Manager's sign-off to move forward.
                </p>
              </div>
            )}

            {/* Context notices */}
            {req.status === 'Design Review' && isManager && userCanApprove && !requireFounder && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
                <ShieldCheck size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-emerald-700">
                  Your approval will mark this as <strong>Done</strong>.
                </p>
              </div>
            )}
            {req.status === 'Design Review' && !isManager && userCanApprove && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                <ShieldCheck size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-amber-700">
                  This is a <strong>partial approval</strong> — a manager still needs to sign off before this is Done.
                </p>
              </div>
            )}
            {req.status === 'Design Review' && isManager && requireFounder && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-violet-50 border border-violet-100">
                <ShieldCheck size={13} className="text-violet-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-violet-700">
                  Task will move to <strong>Approved</strong> — founder must give final sign-off before Done.
                </p>
              </div>
            )}
            {inApprovedStage && founderCarriedOver && !founderCanFinalize && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-violet-50 border border-violet-100">
                <ShieldCheck size={13} className="text-violet-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-violet-700">
                  Waiting for <strong>founder sign-off</strong> before this can be marked Done.
                </p>
              </div>
            )}
            {founderCanFinalize && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
                <ShieldCheck size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-emerald-700">
                  Your approval will mark this as <strong>Done</strong>.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              {canRequestHere && (
                <button
                  onClick={handleRequestChanges}
                  disabled={!comment.trim() || refLinkInvalid}
                  className="flex-1 py-2 text-xs font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-gray-700 rounded-lg transition-colors"
                >
                  Request changes
                </button>
              )}

              {/* Approve Design — Design Review stage */}
              {req.status === 'Design Review' && userCanApprove && (
                <button
                  onClick={handleApprove}
                  disabled={alreadyApproved || refLinkInvalid}
                  title={alreadyApproved ? "You've already approved — waiting on a manager to finalize" : undefined}
                  className={`flex-1 py-2 text-xs font-medium text-white rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300 ${
                    requireFounder
                      ? 'bg-violet-600 hover:bg-violet-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {alreadyApproved ? 'Approved — awaiting manager' : requireFounder ? 'Approve & Assign Founder' : 'Approve Design'}
                </button>
              )}

              {/* Founder final sign-off — Approved stage */}
              {founderCanFinalize && (
                <button
                  onClick={handleApprove}
                  disabled={refLinkInvalid}
                  className="flex-1 py-2 text-xs font-medium text-white rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Final Approve
                </button>
              )}

              {inApprovedStage && founderCarriedOver && !founderCanFinalize && !isManager && (
                <p className="text-[11px] text-violet-600 font-semibold text-center w-full py-1">
                  ⏳ Awaiting founder sign-off
                </p>
              )}

              {req.status !== 'Approved' && req.status !== 'Design Review' && !userCanApprove && !canRequestHere && (
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

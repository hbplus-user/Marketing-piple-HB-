import { useState, useRef, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Paperclip, Calendar, Link, Send, ChevronRight, Plus, X, Pencil } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Modal from '../shared/Modal';
import Badge from '../shared/Badge';
import StatusChip from '../shared/StatusChip';
import RoundBadge from '../shared/RoundBadge';
import Avatar from '../shared/Avatar';
import Linkify from '../shared/Linkify';
import { useApp } from '../../context/AppContext';
import { daysToDeadline } from '../../utils/deadlineUtils';
import { canEdit, canApprove, canWorkOnDesign, canReassignOwner, isTaskApproved, canEditSubmission } from '../../utils/permissions';
import { isValidUrl } from '../../utils/validation';
import type { Status } from '../../types';

const STATUSES: Status[] = ['Brief Approval', 'Design', 'Design Progress', 'Design Review', 'Approved', 'Posted'];

const QUICK_CHIPS = [
  { emoji: '🎉', label: 'Looks good!' },
  { emoji: '👋', label: 'Need help?' },
  { emoji: '🚫', label: 'This is blocked' },
  { emoji: '🔍', label: 'Can you clarify?' },
  { emoji: '✅', label: 'This is on track' },
];

type ActivityTab = 'all' | 'comments' | 'history';

export default function DesignerTaskModal({ open, requestId, openReviewForm }: { open: boolean; requestId?: string; openReviewForm?: boolean }) {
  const {
    requests, closeModal, updateRequest, openModal, addComment,
    markAsPosted, submitForReview, editSubmission, assignTask,
    initiateDesign, currentUser, users,
  } = useApp();

  const [commentText, setCommentText]   = useState('');
  const [refLink, setRefLink]           = useState('');
  const [showRefLink, setShowRefLink]   = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [activeTab, setActiveTab]       = useState<ActivityTab>('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [directReqFounder, setDirectReqFounder] = useState(false);

  // Submit-for-review form
  const [reviewFormOpen, setReviewFormOpen]   = useState(false);
  const [reviewLinkInput, setReviewLinkInput] = useState('');
  const [reviewLinks, setReviewLinks]         = useState<string[]>([]);
  const [reviewNote, setReviewNote]           = useState('');

  // Inline "fix a wrong submission link" editor — keyed by round number, one at a time.
  const [editingRound, setEditingRound]     = useState<number | null>(null);
  const [editLinkInput, setEditLinkInput]   = useState('');
  const [editLinks, setEditLinks]           = useState<string[]>([]);
  const [editNote, setEditNote]             = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);

  const req = requests.find(r => r.id === requestId);

  const commentItems = useMemo(() => {
    if (!req) return [];
    return req.rounds.flatMap(round =>
      round.comments
        .filter(c => c.kind !== 'feedback')
        .map(c => ({
          kind: 'comment' as const,
          date: c.createdAt,
          userId: c.userId,
          text: c.text,
          referenceLink: c.referenceLink,
          round: round.round,
          roundStatus: round.status,
        }))
    ).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [req]);

  const historyItems = useMemo(() => {
    if (!req) return [];
    const items: { kind: 'history'; date: Date; userId?: string; text: string }[] = [];

    items.push({ kind: 'history', date: req.createdAt, userId: req.requesterId, text: 'created this request' });

    for (const h of req.postDateHistory) {
      items.push({ kind: 'history', date: h.date, userId: h.changedBy, text: `changed the post date — ${h.reason}` });
    }

    for (const round of req.rounds) {
      if (round.status === 'changes-requested' && round.comments.length > 0) {
        const last = round.comments[round.comments.length - 1];
        items.push({ kind: 'history', date: last.createdAt, text: `changes requested on Round ${round.round}` });
      }
      if (round.status === 'approved' && round.comments.length > 0) {
        const last = round.comments[round.comments.length - 1];
        items.push({ kind: 'history', date: last.createdAt, userId: last.userId, text: `approved Round ${round.round}` });
      }
    }

    const logLabels: Record<string, string> = {
      brief_approved:       'approved the brief',
      submitted_for_review: 'submitted for design review',
      partial_approval:     'partially approved (pending manager sign-off)',
      final_approval:       'gave final approval',
      changes_requested:    'requested changes → back to Design Progress',
      marked_posted:        'marked as posted',
      status_change:        'changed status',
    };
    for (const entry of (req.activityLog ?? [])) {
      items.push({
        kind: 'history',
        date: entry.timestamp,
        userId: entry.userId,
        text: logLabels[entry.type] ?? entry.type,
      });
    }

    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [req]);

  const feedItems = useMemo(() => {
    if (activeTab === 'comments') return commentItems;
    if (activeTab === 'history')  return historyItems;
    return [...commentItems, ...historyItems].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [activeTab, commentItems, historyItems]);

  useEffect(() => {
    if (!open) {
      setReviewFormOpen(false);
      setReviewLinks([]);
      setReviewLinkInput('');
      setReviewNote('');
    }
  }, [open, requestId]);

  useEffect(() => {
    setEditingRound(null);
    setEditLinkInput('');
    setEditLinks([]);
    setEditNote('');
  }, [open, requestId]);

  useEffect(() => {
    if (composerOpen) textareaRef.current?.focus();
  }, [composerOpen]);

  useEffect(() => {
    if (open && openReviewForm) setReviewFormOpen(true);
  }, [open, openReviewForm, requestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feedItems.length]);

  if (!req) return null;

  const canShowFeedback = req.status === 'Design Progress' || req.status === 'Approved';

  const requester = users.find(u => u.id === req.requesterId);
  const assignees = users.filter(u => req.assigneeIds.includes(u.id));
  const owner     = users.find(u => u.id === req.ownerId);
  const reviewers = req.reviewerIds.map(id => users.find(u => u.id === id)).filter(Boolean);
  const followers = (req.followerIds ?? []).map(id => users.find(u => u.id === id)).filter(Boolean);
  const currentRoundData = req.rounds.find(r => r.round === req.currentRound);
  const dtd       = daysToDeadline(req.internalDeadline);

  const setStatus = (s: Status) => {
    updateRequest(req.id, { status: s });
    if (s === 'Design Review') { closeModal(); openModal({ type: 'review-feedback', requestId: req.id }); }
  };

  const openComposer = (prefill = '') => {
    setComposerOpen(true);
    if (prefill) setCommentText(prefill);
  };

  const startEditingRound = (round: number, links: string[], note: string) => {
    setEditingRound(round);
    setEditLinks(links);
    setEditLinkInput('');
    setEditNote(note);
  };

  const editLinkTrimmed = editLinkInput.trim();
  const editLinkInvalid = editLinkTrimmed.length > 0 && !isValidUrl(editLinkTrimmed);
  const addEditLink = () => {
    if (editLinkTrimmed && !editLinkInvalid && !editLinks.includes(editLinkTrimmed)) {
      setEditLinks(prev => [...prev, editLinkTrimmed]);
      setEditLinkInput('');
    }
  };
  const saveEditedSubmission = () => {
    if (editingRound === null || editLinks.length === 0) return;
    editSubmission(req.id, editingRound, editLinks, editNote);
    setEditingRound(null);
  };

  const handleSend = () => {
    if (!commentText.trim()) return;
    addComment(req.id, commentText, refLink.trim() || undefined);
    setCommentText(''); setRefLink(''); setShowRefLink(false); setComposerOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
    if (e.key === 'Escape') { setComposerOpen(false); setCommentText(''); }
  };

  return (
    <Modal open={open} onClose={closeModal} size={canShowFeedback ? 'full' : 'lg'}>
      <div className="flex flex-col max-h-[84vh] overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5 mb-2 flex-wrap">
            <Badge pipeline={req.pipeline} />
            <StatusChip status={req.status} />
            <RoundBadge round={req.currentRound} />
          </div>
          <h2 className="text-base font-bold text-gray-900 m-0">{req.title}</h2>
        </div>

        <div className={`flex-1 flex overflow-hidden ${canShowFeedback ? 'flex-col md:flex-row' : ''}`}>

        {/* Scrollable body */}
        <div className={`flex-1 overflow-y-auto ${canShowFeedback ? 'md:border-r border-gray-100' : ''}`}>

          {/* Approval Status Banner */}
          {!isTaskApproved(req) && (
            <div className="mx-6 mt-4 p-4 rounded-xl border flex items-start gap-3 bg-amber-50 border-amber-200">
              <span className="text-lg">⏳</span>
              <div>
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Approval Required</h4>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  {!req.managerApproved
                    ? 'This request is pending manager approval. Work cannot begin until a manager approves this task.'
                    : 'This request has manager approval and is now pending founder sign-off.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Changes Requested — surfaces the latest feedback right at the top so the
              designer doesn't have to scroll the activity feed to find it */}
          {req.status === 'Design Progress' && req.currentRound > 0 && (currentRoundData?.comments.filter(c => c.kind === 'feedback').length ?? 0) > 0 && (
            <div className="mx-6 mt-4 p-4 rounded-xl border flex items-start gap-3 bg-amber-50 border-amber-200">
              <span className="text-lg">✏️</span>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Changes Requested</h4>
                <div className="mt-1.5 space-y-1.5">
                  {currentRoundData!.comments.filter(c => c.kind === 'feedback').map((c, i) => {
                    const commenter = users.find(u => u.id === c.userId);
                    return (
                      <div key={i}>
                        <p className="text-xs text-amber-700 leading-relaxed">
                          {commenter && <span className="font-semibold">{commenter.name}: </span>}
                          {c.text}
                        </p>
                        {c.referenceLink && (
                          <a
                            href={c.referenceLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] text-amber-700 underline hover:text-amber-800 truncate"
                          >
                            <Link size={10} className="flex-shrink-0" />
                            {c.referenceLink}
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Brief + metadata */}
          <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left col: brief / attachments / links */}
            <div className="md:col-span-2 space-y-4 self-start">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{req.brief || '-'}</p>
              </div>
              {(req.category || req.priority) && (
                <div className="flex items-center gap-4">
                  {req.category && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Category</p>
                      <p className="text-xs text-gray-700">{req.category}</p>
                    </div>
                  )}
                  {req.priority && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Priority</p>
                      <p className="text-xs text-gray-700 capitalize">{req.priority}</p>
                    </div>
                  )}
                </div>
              )}
              {(currentRoundData?.submissionLinks.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Submitted links</p>
                  <div className="flex flex-col gap-1.5">
                    {currentRoundData!.submissionLinks.map(url => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#f5ece7] border border-[#f0ddd5] text-xs text-[#8a4f39] hover:bg-[#f0ddd5] transition-colors truncate"
                      >
                        <Link size={11} className="flex-shrink-0" />
                        <span className="truncate">{url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {currentRoundData?.submissionNote && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Handoff note</p>
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">{currentRoundData.submissionNote}</p>
                </div>
              )}
              {req.attachments.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Attachments</p>
                  <div className="flex flex-wrap gap-2">
                    {req.attachments.map(a => (
                      <a
                        key={a}
                        href={a}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors max-w-[220px]"
                      >
                        <Paperclip size={11} className="flex-shrink-0" />
                        <span className="truncate">{decodeURIComponent(a.split('/').pop() ?? a)}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {req.referenceLinks.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Reference links</p>
                  <div className="flex flex-col gap-1.5">
                    {req.referenceLinks.map(url => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#f5ece7] border border-[#f5ece7] text-xs text-[#8a4f39] hover:bg-[#f0ddd5] transition-colors truncate"
                      >
                        <Link size={11} className="flex-shrink-0" />
                        <span className="truncate">{url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity */}
              <div className="pt-5 border-t border-gray-100">
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="text-sm font-bold text-gray-900">Activity</h3>
                  <div className="flex items-center gap-0.5 border border-gray-200 rounded-lg p-0.5">
                    {(['all', 'comments', 'history'] as ActivityTab[]).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                          activeTab === tab ? 'bg-white shadow-sm text-[#8a4f39] border border-gray-200' : 'text-gray-500 hover:text-gray-700'
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
                      {!composerOpen ? (
                        <motion.div key="collapsed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                          <div
                            onClick={() => openComposer()}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-400 cursor-text hover:border-gray-300 hover:bg-gray-50/60 transition-colors"
                          >
                            Add a comment...
                          </div>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {QUICK_CHIPS.map(chip => (
                              <button
                                key={chip.label}
                                onClick={() => openComposer(chip.label)}
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
                          <p className="text-[11px] text-gray-400 mt-2">
                            <span className="font-medium">Pro tip:</span> press{' '}
                            <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-100 text-[10px] font-mono">M</kbd>{' '}
                            to comment
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div key="expanded" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                          <div className="border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-[#a9674d]/20 focus-within:border-[#a9674d] overflow-hidden transition-all">
                            {showRefLink && (
                              <div className="relative border-b border-gray-100">
                                <Link size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="url" value={refLink} onChange={e => setRefLink(e.target.value)}
                                  placeholder="Paste reference URL..."
                                  className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 focus:outline-none placeholder:text-gray-400" />
                              </div>
                            )}
                            <textarea
                              ref={textareaRef}
                              value={commentText}
                              onChange={e => setCommentText(e.target.value)}
                              onKeyDown={handleKeyDown}
                              placeholder="Add a comment... (Cmd+Enter to send, Esc to cancel)"
                              rows={3}
                              className="w-full px-3 pt-3 pb-1 text-sm resize-none focus:outline-none placeholder:text-gray-400"
                            />
                            <div className="flex items-center justify-between px-2 pb-2">
                              <button onClick={() => setShowRefLink(v => !v)}
                                title={showRefLink ? 'Remove link' : 'Add reference link'}
                                className={`p-1.5 rounded-lg transition-colors ${showRefLink ? 'bg-[#f0ddd5] text-[#a9674d]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                                <Link size={13} />
                              </button>
                              <div className="flex items-center gap-2">
                                <button onClick={() => { setComposerOpen(false); setCommentText(''); }}
                                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
                                  Cancel
                                </button>
                                <button onClick={handleSend} disabled={!commentText.trim()}
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

                {feedItems.length === 0 ? (
                  <p className="text-xs text-gray-400 italic pl-9">No activity yet.</p>
                ) : (
                  <div className="space-y-4">
                    {feedItems.map((item, i) => {
                      const user = users.find(u => u.id === item.userId);
                      if (item.kind === 'comment') {
                        const isMe = item.userId === currentUser.id;
                        return (
                          <div key={i} className="flex items-start gap-3">
                            {user && <Avatar initials={user.initials} color={user.avatarColor} size="sm" title={user.name} />}
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                                <span className="text-[12px] font-semibold text-gray-800">{user?.name ?? 'Unknown'}</span>
                                <span className="text-[11px] text-gray-400 capitalize">{user?.role}</span>
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
                                <Linkify text={item.text} />
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
                        <div key={i} className="flex items-center gap-3">
                          {user
                            ? <Avatar initials={user.initials} color={user.avatarColor} size="sm" />
                            : <div className="w-5 h-5 rounded-full bg-gray-200 flex-shrink-0" />
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
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>
            </div>

            {/* Right col: metadata */}
            <div className="space-y-4 bg-gray-50 rounded-xl p-4 self-start">
              {requester && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Requester</p>
                  <div className="flex items-center gap-2">
                    <Avatar initials={requester.initials} color={requester.avatarColor} size="sm" />
                    <span className="text-xs font-medium text-gray-700">{requester.name}</span>
                  </div>
                </div>
              )}
              {owner && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Owner</p>
                  {canReassignOwner(currentUser.role, req, currentUser.id) ? (
                    <select
                      value={req.ownerId}
                      onChange={e => updateRequest(req.id, { ownerId: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20 focus:border-[#a9674d]"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Avatar initials={owner.initials} color={owner.avatarColor} size="sm" />
                      <span className="text-xs font-medium text-gray-700">{owner.name}</span>
                    </div>
                  )}
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Assigned to</p>
                <select
                  value={assignees[0]?.id ?? ''}
                  onChange={e => assignTask(req.id, e.target.value)}
                  className={`w-full px-2 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20 focus:border-[#a9674d] ${
                    assignees.length === 0 ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                {assignees.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">Required before moving to the next step</p>
                )}
              </div>

              {reviewers.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Reviewers</p>
                  <div className="flex -space-x-1">
                    {reviewers.map(u => u && <Avatar key={u.id} initials={u.initials} color={u.avatarColor} size="sm" title={u.name} />)}
                  </div>
                </div>
              )}
              {followers.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Followers</p>
                  <div className="flex -space-x-1">
                    {followers.map(u => u && <Avatar key={u.id} initials={u.initials} color={u.avatarColor} size="sm" title={u.name} />)}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Post date</p>
                <div className="flex items-center gap-1.5 text-xs text-gray-700">
                  <Calendar size={12} className="text-gray-400" />
                  {format(req.postDate, 'MMM d, yyyy')}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {dtd >= 0 ? `${dtd}d to deadline` : `${Math.abs(dtd)}d overdue`} · needs {req.daysNeeded}d
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Internal deadline</p>
                <div className="flex items-center gap-1.5 text-xs text-gray-700">
                  <Calendar size={12} className="text-gray-400" />
                  {format(req.internalDeadline, 'MMM d, yyyy')}
                </div>
              </div>

              {/* Started tag — shows once design is initiated */}
              {req.initiatedAt && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Started</p>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f3eeff] border border-[#e0d0ff] text-[11px] font-semibold text-[#6d28d9]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]" />
                    {format(req.initiatedAt, 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Feedback thread — right column, round-by-round comments, so the team
            can monitor feedback through Design Progress and Approved at a glance */}
        {canShowFeedback && (
          <div className="w-full md:w-[340px] flex-shrink-0 overflow-y-auto p-4 bg-gray-50/50">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Feedback thread</h4>
            <div className="space-y-4">
              {req.rounds.map(round => {
                const feedbackComments = round.comments.filter(c => c.kind === 'feedback');
                return (
                <div key={round.round}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Round {round.round}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      round.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                      round.status === 'changes-requested' ? 'bg-amber-100 text-amber-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {round.status.replace('-', ' ')}
                    </span>
                  </div>
                  {(round.submissionLinks.length > 0 || round.submissionNote || editingRound === round.round) && (
                    <div className="mb-2 px-3 py-2 bg-[#f5ece7] rounded-lg border border-[#f0ddd5] space-y-1.5">
                      {editingRound === round.round ? (
                        <div className="space-y-2">
                          <div className="flex gap-1.5">
                            <input
                              type="url"
                              value={editLinkInput}
                              onChange={e => setEditLinkInput(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') addEditLink(); }}
                              placeholder="Paste corrected link…"
                              className={`flex-1 min-w-0 px-2.5 py-1.5 text-xs border rounded-lg bg-white focus:outline-none focus:ring-2 ${
                                editLinkInvalid
                                  ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                                  : 'border-gray-200 focus:ring-[#a9674d]/20 focus:border-[#a9674d]'
                              }`}
                            />
                            <button
                              onClick={addEditLink}
                              disabled={!editLinkTrimmed || editLinkInvalid}
                              className="px-2.5 py-1.5 bg-white hover:bg-gray-50 disabled:opacity-40 text-gray-600 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 border border-gray-200"
                            >
                              <Plus size={11} /> Add
                            </button>
                          </div>
                          {editLinkInvalid && (
                            <p className="text-[11px] text-red-500">Enter a valid link, e.g. https://example.com</p>
                          )}
                          {editLinks.map((url, i) => (
                            <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white rounded-lg border border-[#f0ddd5]">
                              <Link size={10} className="text-[#a9674d] flex-shrink-0" />
                              <span className="text-[11px] text-[#8a4f39] truncate flex-1">{url}</span>
                              <button onClick={() => setEditLinks(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                                <X size={11} />
                              </button>
                            </div>
                          ))}
                          <textarea
                            value={editNote}
                            onChange={e => setEditNote(e.target.value)}
                            placeholder="Handoff note (optional)"
                            rows={2}
                            className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg resize-none bg-white focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20 focus:border-[#a9674d]"
                          />
                          <div className="flex items-center gap-2 justify-end">
                            <button onClick={() => setEditingRound(null)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
                              Cancel
                            </button>
                            <button
                              onClick={saveEditedSubmission}
                              disabled={editLinks.length === 0}
                              className="px-3.5 py-1.5 text-xs font-semibold bg-[#a9674d] hover:bg-[#8a4f39] disabled:opacity-40 text-white rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              <Send size={11} /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {round.submissionNote && (
                            <p className="text-xs text-[#8a4f39] whitespace-pre-line">{round.submissionNote}</p>
                          )}
                          {round.submissionLinks.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-[11px] text-[#a9674d] hover:text-[#8a4f39] truncate">
                              <Link size={10} className="flex-shrink-0" />
                              <span className="truncate">{url}</span>
                            </a>
                          ))}
                          {canEditSubmission(currentUser.role, req, currentUser.id) && (
                            <button
                              onClick={() => startEditingRound(round.round, round.submissionLinks, round.submissionNote)}
                              className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-[#a9674d] transition-colors pt-0.5"
                            >
                              <Pencil size={10} /> Edit link
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {feedbackComments.length === 0 ? (
                    <p className="text-xs text-gray-400 italic px-1">No comments yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {feedbackComments.map((c, i) => {
                        const user = users.find(u => u.id === c.userId);
                        return (
                          <div key={i} className="flex items-start gap-2">
                            {user && <Avatar initials={user.initials} color={user.avatarColor} size="sm" title={user.name} />}
                            <div className="flex-1 bg-white rounded-lg px-3 py-2 border border-gray-100">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[11px] font-semibold text-gray-700">{user?.name}</span>
                                <span className="text-[10px] text-gray-400">{format(c.createdAt, 'MMM d, h:mm a')}</span>
                              </div>
                              <p className="text-xs text-gray-600"><Linkify text={c.text} /></p>
                              {c.referenceLink && (
                                <a href={c.referenceLink} target="_blank" rel="noopener noreferrer"
                                  className="mt-1 flex items-center gap-1 text-[11px] text-[#a9674d] hover:text-[#8a4f39] truncate">
                                  <Link size={10} />{c.referenceLink}
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
          </div>
        )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-start justify-end flex-shrink-0 bg-gray-50/60">
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium">
                Close
              </button>

              {/* Edit — only task creator or manager */}
              {canEdit(currentUser.role, req, currentUser.id) && (
                <button
                  onClick={() => openModal({ type: 'edit-task', requestId: req.id })}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  <Pencil size={13} />
                  Edit
                </button>
              )}

              {/* Brief-approval stage: approve button for manager/founder */}
              {!isTaskApproved(req) ? (
                (currentUser.role === 'manager' || currentUser.role === 'founder') ? (
                  <div className="flex items-center gap-3 bg-white p-1 rounded-lg border border-gray-200 shadow-sm flex-wrap">
                    {currentUser.role === 'manager' && !req.managerApproved && (
                      <label className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={directReqFounder}
                          onChange={e => setDirectReqFounder(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-[#a9674d] focus:ring-[#a9674d]/30 border-gray-300 cursor-pointer"
                        />
                        Require Founder Approval
                      </label>
                    )}
                    <button
                      onClick={() => {
                        const isFounder = currentUser.role === 'founder';
                        const mkLog = (toStatus: import('../../types').Status) => ({
                          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                          type: 'brief_approved' as const,
                          userId: currentUser.id,
                          timestamp: new Date(),
                          fromStatus: req.status,
                          toStatus,
                        });
                        if (!req.managerApproved) {
                          if (directReqFounder && !isFounder) {
                            const founderIds = users.filter(u => u.role === 'founder').map(u => u.id);
                            closeModal();
                            updateRequest(req.id, {
                              managerApproved: true,
                              founderApprovalRequired: true,
                              founderApproved: false,
                              reviewerIds: Array.from(new Set([...(req.reviewerIds ?? []), ...founderIds])),
                              approvedBy: Array.from(new Set([...(req.approvedBy ?? []), currentUser.id])),
                              activityLog: [...(req.activityLog ?? []), mkLog('Brief Approval')],
                            });
                          } else {
                            closeModal();
                            updateRequest(req.id, {
                              managerApproved: true,
                              founderApprovalRequired: false,
                              founderApproved: true,
                              approvedBy: [],
                              status: 'Design',
                              activityLog: [...(req.activityLog ?? []), mkLog('Design')],
                            });
                          }
                        } else if (req.founderApprovalRequired && !req.founderApproved) {
                          closeModal();
                          updateRequest(req.id, {
                            founderApproved: true,
                            approvedBy: [],
                            status: 'Design',
                            activityLog: [...(req.activityLog ?? []), mkLog('Design')],
                          });
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-[#a9674d] hover:bg-[#8a4f39] text-white text-xs font-semibold shadow-sm transition-colors"
                    >
                      Approve Request
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-amber-600 font-semibold px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100 animate-pulse">
                    ⏳ Awaiting Approval
                  </span>
                )
              ) : (
                /* Stage-specific action buttons */
                (() => {
                  const isManager  = currentUser.role === 'manager';
                  const isFounder  = currentUser.role === 'founder';
                  const isOwner    = req.ownerId === currentUser.id;
                  const isAssignee = req.assigneeIds.includes(currentUser.id);
                  const canSubmit  = isAssignee || canWorkOnDesign(currentUser.role, req, currentUser.id);
                  const canPost    = isOwner || isManager || isFounder;

                  /* Design — show Initiate button (blocked until someone is assigned) */
                  if (req.status === 'Design' && canSubmit) {
                    const noAssignee = assignees.length === 0;
                    return (
                      <div className="flex flex-col items-end gap-1">
                        <button
                          onClick={() => { if (noAssignee) return; closeModal(); initiateDesign(req.id); }}
                          disabled={noAssignee}
                          title={noAssignee ? 'Assign someone before starting design work' : undefined}
                          className="px-4 py-2 text-sm font-semibold bg-[#7c3aed] hover:bg-[#6d28d9] disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300 text-white rounded-lg transition-colors"
                        >
                          Initiate Design
                        </button>
                        {noAssignee && (
                          <span className="text-[11px] text-amber-600">Assign someone first</span>
                        )}
                      </div>
                    );
                  }

                  /* Design Progress — submit for review */
                  if (req.status === 'Design Progress' && canSubmit) {
                    if (!reviewFormOpen) {
                      return (
                        <button
                          onClick={() => setReviewFormOpen(true)}
                          className="px-4 py-2 text-sm font-semibold bg-[#a9674d] hover:bg-[#8a4f39] text-white rounded-lg transition-colors"
                        >
                          Submit for review
                        </button>
                      );
                    }
                    const reviewLinkTrimmed = reviewLinkInput.trim();
                    const reviewLinkInvalid = reviewLinkTrimmed.length > 0 && !isValidUrl(reviewLinkTrimmed);
                    const addReviewLink = () => {
                      if (reviewLinkTrimmed && !reviewLinkInvalid && !reviewLinks.includes(reviewLinkTrimmed)) {
                        setReviewLinks(prev => [...prev, reviewLinkTrimmed]);
                        setReviewLinkInput('');
                      }
                    };
                    return (
                      <div className="flex flex-col gap-2 w-80">
                        <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Submit for review</p>
                        <div className="flex gap-1.5">
                          <input
                            type="url"
                            value={reviewLinkInput}
                            onChange={e => setReviewLinkInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') addReviewLink(); }}
                            placeholder="Paste file / design link…"
                            className={`flex-1 min-w-0 px-2.5 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 ${
                              reviewLinkInvalid
                                ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                                : 'border-gray-200 focus:ring-[#a9674d]/20 focus:border-[#a9674d]'
                            }`}
                          />
                          <button
                            onClick={addReviewLink}
                            disabled={!reviewLinkTrimmed || reviewLinkInvalid}
                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-600 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                          >
                            <Plus size={11} /> Add
                          </button>
                        </div>
                        {reviewLinkInvalid && (
                          <p className="text-[11px] text-red-500 -mt-1">Enter a valid link, e.g. https://example.com</p>
                        )}
                        {reviewLinks.length > 0 && (
                          <div className="flex flex-col gap-1">
                            {reviewLinks.map((url, i) => (
                              <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#f5ece7] rounded-lg border border-[#f0ddd5]">
                                <Link size={10} className="text-[#a9674d] flex-shrink-0" />
                                <span className="text-[11px] text-[#8a4f39] truncate flex-1">{url}</span>
                                <button onClick={() => setReviewLinks(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                                  <X size={11} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <textarea
                          value={reviewNote}
                          onChange={e => setReviewNote(e.target.value)}
                          placeholder="Handoff note for reviewer… (optional)"
                          rows={2}
                          className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20 focus:border-[#a9674d]"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => { setReviewFormOpen(false); setReviewLinks([]); setReviewLinkInput(''); setReviewNote(''); }}
                            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              const rid = req.id;
                              const canReview = canApprove(currentUser.role, req, currentUser.id);
                              closeModal();
                              submitForReview(rid, reviewLinks, reviewNote);
                              setReviewFormOpen(false); setReviewLinks([]); setReviewLinkInput(''); setReviewNote('');
                              // Only drop the user straight into the reviewer screen if they can actually
                              // act on it (manager/founder/owner) — otherwise just close and confirm.
                              if (canReview) {
                                openModal({ type: 'review-feedback', requestId: rid });
                              }
                            }}
                            className="px-3.5 py-1.5 text-xs font-semibold bg-[#a9674d] hover:bg-[#8a4f39] text-white rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            <Send size={11} /> Submit for review
                          </button>
                        </div>
                      </div>
                    );
                  }

                  /* Approved — mark as posted (Owner, Manager, or Founder — any one) */
                  if (req.status === 'Approved' && canPost) {
                    return (
                      <button
                        onClick={() => markAsPosted(req.id)}
                        className="px-4 py-2 text-sm font-semibold bg-[#5b8dd9] hover:bg-[#4a76c0] text-white rounded-lg transition-colors"
                      >
                        Mark as Posted
                      </button>
                    );
                  }

                  /* Posted — reopen */
                  if (req.status === 'Posted' && isManager) {
                    return (
                      <button
                        onClick={() => setStatus('Brief Approval')}
                        className="px-4 py-2 text-sm font-semibold bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                      >
                        Reopen Request
                      </button>
                    );
                  }

                  /* Manager override dropdown for other stages */
                  if (isManager) {
                    return (
                      <div className="relative">
                        <button
                          onClick={() => setDropdownOpen(!dropdownOpen)}
                          className="px-3 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          Change Status
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                        <AnimatePresence>
                          {dropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                style={{
                                  position: 'absolute', bottom: '100%', right: 0,
                                  marginBottom: '8px', width: '180px', background: '#ffffff',
                                  borderRadius: '12px', border: '1px solid #e2e8f0', padding: '6px', zIndex: 50,
                                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                                }}
                              >
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2.5 py-1.5">Override Status</div>
                                {STATUSES.map(s => (
                                  <button key={s} onClick={() => { setStatus(s); setDropdownOpen(false); }}
                                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${req.status === s ? 'bg-[#f5ece7] text-[#a9674d] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                                  >
                                    {s}
                                    {req.status === s && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                                  </button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  return null;
                })()
              )}
            </div>

            {/* Stepper progress indicator */}
            {isTaskApproved(req) && (
              <div className="bg-gray-100 rounded-full p-1 flex items-center gap-0.5 border border-gray-200 flex-wrap">
                {STATUSES.map(s => {
                  const isActive  = req.status === s;
                  const isMgr = currentUser.role === 'manager';
                  return isMgr ? (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-white text-[#a9674d] border-2 border-black font-bold shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {s}
                    </button>
                  ) : (
                    <span
                      key={s}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isActive ? 'bg-white text-[#a9674d] font-bold shadow-sm' : 'text-gray-400'
                      }`}
                    >
                      {s}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

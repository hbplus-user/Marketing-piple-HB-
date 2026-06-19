import { useState, useRef, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Paperclip, Calendar, Link, Send, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Modal from '../shared/Modal';
import Badge from '../shared/Badge';
import StatusChip from '../shared/StatusChip';
import RoundBadge from '../shared/RoundBadge';
import Avatar from '../shared/Avatar';
import { useApp } from '../../context/AppContext';
import { daysToDeadline, calcInternalDeadline } from '../../utils/deadlineUtils';
import { canEditPostDate, isTaskApproved } from '../../utils/permissions';
import type { Status } from '../../types';

const STATUSES: Status[] = ['To Do', 'In Progress', 'In Review', 'Partially Approved', 'Done'];

const QUICK_CHIPS = [
  { emoji: '🎉', label: 'Looks good!' },
  { emoji: '👋', label: 'Need help?' },
  { emoji: '🚫', label: 'This is blocked' },
  { emoji: '🔍', label: 'Can you clarify?' },
  { emoji: '✅', label: 'This is on track' },
];

type ActivityTab = 'all' | 'comments' | 'history';

export default function DesignerTaskModal({ open, requestId }: { open: boolean; requestId?: string }) {
  const { requests, closeModal, updateRequest, openModal, addComment, currentUser, users } = useApp();

  const [commentText, setCommentText]     = useState('');
  const [refLink, setRefLink]             = useState('');
  const [showRefLink, setShowRefLink]     = useState(false);
  const [composerOpen, setComposerOpen]   = useState(false);
  const [activeTab, setActiveTab]         = useState<ActivityTab>('all');
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  
  // Editing states
  const [isEditing, setIsEditing]             = useState(false);
  const [editTitle, setEditTitle]             = useState('');
  const [editBrief, setEditBrief]             = useState('');
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([]);
  const [editPostDateVal, setEditPostDateVal] = useState('');
  const [editLinks, setEditLinks]             = useState<string[]>([]);
  const [newLinkInput, setNewLinkInput]       = useState('');
  const [directReqFounder, setDirectReqFounder] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);

  const req = requests.find(r => r.id === requestId);

  // Flat comment items
  const commentItems = useMemo(() => {
    if (!req) return [];
    return req.rounds.flatMap(round =>
      round.comments.map(c => ({
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

  // History items derived from request data
  const historyItems = useMemo(() => {
    if (!req) return [];
    const items: { kind: 'history'; date: Date; userId?: string; text: string }[] = [];

    items.push({ kind: 'history', date: req.createdAt, userId: req.requesterId, text: 'created this request' });

    for (const h of req.postDateHistory) {
      items.push({ kind: 'history', date: h.date, userId: h.changedBy, text: `changed the post date â€” ${h.reason}` });
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

    if (req.approvedAt) {
      const approver = req.approvedBy[req.approvedBy.length - 1];
      items.push({ kind: 'history', date: req.approvedAt, userId: approver, text: 'approved this request' });
    }

    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [req]);

  const feedItems = useMemo(() => {
    if (activeTab === 'comments') return commentItems;
    if (activeTab === 'history')  return historyItems;
    return [...commentItems, ...historyItems].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [activeTab, commentItems, historyItems]);

  useEffect(() => {
    if (composerOpen) textareaRef.current?.focus();
  }, [composerOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feedItems.length]);

  // Populate edit fields on edit mode trigger
  useEffect(() => {
    if (req && isEditing) {
      setEditTitle(req.title);
      setEditBrief(req.brief || '');
      setEditAssigneeIds(req.assigneeIds);
      setEditPostDateVal(format(req.postDate, 'yyyy-MM-dd'));
      setEditLinks(req.referenceLinks || []);
    }
  }, [isEditing, req]);

  if (!req) return null;

  const requester = users.find(u => u.id === req.requesterId);
  const assignees = users.filter(u => req.assigneeIds.includes(u.id));
  const owner     = users.find(u => u.id === req.ownerId);
  const reviewers = req.reviewerIds.map(id => users.find(u => u.id === id)).filter(Boolean);
  const dtd       = daysToDeadline(req.internalDeadline);

  const setStatus = (s: Status) => {
    updateRequest(req.id, { status: s });
    if (s === 'In Review') { closeModal(); openModal({ type: 'review-feedback', requestId: req.id }); }
  };

  const openComposer = (prefill = '') => {
    setComposerOpen(true);
    if (prefill) setCommentText(prefill);
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
    <Modal open={open} onClose={closeModal} size="lg">
      <div className="flex flex-col max-h-[84vh] overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5 mb-2 flex-wrap">
            <Badge pipeline={req.pipeline} />
            <StatusChip status={req.status} />
            <RoundBadge round={req.currentRound} />
          </div>
          {isEditing ? (
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Edit title</label>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="Request title..."
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20"
              />
            </div>
          ) : (
            <h2 className="text-base font-bold text-gray-900 m-0">{req.title}</h2>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Approval Status Banner */}
          {!isTaskApproved(req) && (
            <div className="mx-6 mt-4 p-4 rounded-xl border flex items-start gap-3 bg-amber-50 border-amber-200">
              <span className="text-lg">⏳</span>
              <div>
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Approval Required</h4>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  {!req.managerApproved
                    ? "This request is pending manager approval. Work cannot begin until a manager approves this task."
                    : "This request has manager approval and is now pending founder sign-off."
                  }
                </p>
              </div>
            </div>
          )}

          {/* Brief + metadata */}
          <div className="px-6 py-5 grid grid-cols-3 gap-6">
            {isEditing ? (
              <div className="col-span-2 space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Brief description</label>
                  <textarea
                    value={editBrief}
                    onChange={e => setEditBrief(e.target.value)}
                    rows={6}
                    placeholder="Enter brief description..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20 focus:border-[#a9674d] resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Reference links</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="url"
                      value={newLinkInput}
                      onChange={e => setNewLinkInput(e.target.value)}
                      placeholder="Add reference URL..."
                      className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = newLinkInput.trim();
                        if (trimmed && !editLinks.includes(trimmed)) {
                          setEditLinks([...editLinks, trimmed]);
                          setNewLinkInput('');
                        }
                      }}
                      className="px-3 py-1.5 bg-[#a9674d] hover:bg-[#8a4f39] text-white rounded-lg text-xs font-medium"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {editLinks.map((url, idx) => (
                      <div key={idx} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#f5ece7] border border-[#f5ece7] text-xs text-[#8a4f39]">
                        <span className="truncate flex-1 pr-2">{url}</span>
                        <button
                          type="button"
                          onClick={() => setEditLinks(editLinks.filter(x => x !== url))}
                          className="text-red-500 hover:text-red-700 font-bold ml-2"
                        >
                          Ã—
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="col-span-2 space-y-4">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Brief</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{req.brief || 'â€”'}</p>
                </div>
                {req.attachments.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Attachments</p>
                    <div className="flex flex-wrap gap-2">
                      {req.attachments.map(a => (
                        <span key={a} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600">
                          <Paperclip size={11} />{a}
                        </span>
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
              </div>
            )}
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
              {owner && owner.id !== requester?.id && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Owner</p>
                  <div className="flex items-center gap-2">
                    <Avatar initials={owner.initials} color={owner.avatarColor} size="sm" />
                    <span className="text-xs font-medium text-gray-700">{owner.name}</span>
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Assigned to</p>
                {isEditing ? (
                  <div className="flex flex-col gap-1">
                    {users.filter(u => u.role !== 'manager').map(u => {
                      const selected = editAssigneeIds.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setEditAssigneeIds(prev =>
                            prev.includes(u.id) ? prev.filter(x => x !== u.id) : [...prev, u.id]
                          )}
                          className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium transition-colors text-left ${
                            selected ? 'bg-[#f5ece7] text-[#8a4f39] border border-[#f0ddd5]' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#f0ddd5]'
                          }`}
                        >
                          <Avatar initials={u.initials} color={u.avatarColor} size="sm" />
                          {u.name}
                        </button>
                      );
                    })}
                  </div>
                ) : assignees.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {assignees.map(u => (
                      <div key={u.id} className="flex items-center gap-2">
                        <Avatar initials={u.initials} color={u.avatarColor} size="sm" />
                        <span className="text-xs font-medium text-gray-700">{u.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">Unassigned</span>
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
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Post date</p>
                {isEditing ? (
                  <input
                    type="date"
                    value={editPostDateVal}
                    onChange={e => setEditPostDateVal(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20"
                  />
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 text-xs text-gray-700">
                      <Calendar size={12} className="text-gray-400" />
                      {format(req.postDate, 'MMM d, yyyy')}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {dtd >= 0 ? `${dtd}d to deadline` : `${Math.abs(dtd)}d overdue`} · needs {req.daysNeeded}d
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* â”€â”€ Activity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="px-6 pb-6 border-t border-gray-100">
            {/* Title + tabs */}
            <div className="flex items-center gap-4 pt-5 mb-4">
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

            {/* Collapsed composer / Add comment prompt */}
            <div className="flex items-start gap-3 mb-5">
              <Avatar initials={currentUser.initials} color={currentUser.avatarColor} size="sm" />
              <div className="flex-1">
                <AnimatePresence mode="wait">
                  {!composerOpen ? (
                    /* Collapsed: clickable placeholder + quick chips */
                    <motion.div key="collapsed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                      <div
                        onClick={() => openComposer()}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-400 cursor-text hover:border-gray-300 hover:bg-gray-50/60 transition-colors"
                      >
                        Add a commentâ€¦
                      </div>
                      {/* Quick chips */}
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
                    /* Expanded composer */
                    <motion.div key="expanded" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                      <div className="border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-[#a9674d]/20 focus-within:border-[#a9674d] overflow-hidden transition-all">
                        {showRefLink && (
                          <div className="relative border-b border-gray-100">
                            <Link size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="url" value={refLink} onChange={e => setRefLink(e.target.value)}
                              placeholder="Paste reference URLâ€¦"
                              className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 focus:outline-none placeholder:text-gray-400" />
                          </div>
                        )}
                        <textarea
                          ref={textareaRef}
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Add a commentâ€¦ (âŒ˜â†µ to send, Esc to cancel)"
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

            {/* Feed */}
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
                  // History item
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-start justify-between flex-shrink-0 bg-gray-50/60">
          <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors mt-2">
            <Paperclip size={13} />
            Attach file
          </button>
          
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!editTitle.trim()) return;
                      updateRequest(req.id, {
                        title: editTitle.trim(),
                        brief: editBrief.trim(),
                        assigneeIds: editAssigneeIds,
                        postDate: new Date(editPostDateVal),
                        internalDeadline: calcInternalDeadline(new Date(editPostDateVal)),
                        referenceLinks: editLinks,
                      });
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium">Close</button>
                  
                  {/* Edit button for eligible roles */}
                  {canEditPostDate(currentUser.role, req, currentUser.id) && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                  )}

                  {!isTaskApproved(req) ? (
                    /* Approval Actions in details view */
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
                            if (!req.managerApproved) {
                              if (directReqFounder && !isFounder) {
                                const founderIds = users.filter(u => u.role === 'founder').map(u => u.id);
                                updateRequest(req.id, {
                                  managerApproved: true,
                                  founderApprovalRequired: true,
                                  founderApproved: false,
                                  reviewerIds: Array.from(new Set([...(req.reviewerIds ?? []), ...founderIds])),
                                  approvedBy: Array.from(new Set([...(req.approvedBy ?? []), currentUser.id])),
                                });
                              } else {
                                const employee = users.find(u => u.role === 'employee');
                                updateRequest(req.id, {
                                  managerApproved: true,
                                  founderApprovalRequired: false,
                                  founderApproved: true,
                                  approvedBy: Array.from(new Set([...(req.approvedBy ?? []), currentUser.id])),
                                  assigneeIds: req.assigneeIds.length > 0 ? req.assigneeIds : (employee ? [employee.id] : []),
                                  status: 'In Progress',
                                });
                              }
                            } else if (req.founderApprovalRequired && !req.founderApproved) {
                              const employee = users.find(u => u.role === 'employee');
                              updateRequest(req.id, {
                                founderApproved: true,
                                approvedBy: Array.from(new Set([...(req.approvedBy ?? []), currentUser.id])),
                                assigneeIds: req.assigneeIds.length > 0 ? req.assigneeIds : (employee ? [employee.id] : []),
                                status: 'In Progress',
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
                    /* Split Button Group (normal progress controls) */
                    <div className="relative flex items-center">
                      <button
                        onClick={() => {
                          const nextStepMap: Record<Status, Status> = {
                            'To Do': 'In Progress',
                            'In Progress': 'In Review',
                            'In Review': 'Partially Approved',
                            'Partially Approved': 'Done',
                            'Done': 'To Do',
                          };
                          setStatus(nextStepMap[req.status]);
                        }}
                        className="px-4 py-2 text-sm font-semibold bg-[#a9674d] hover:bg-[#8a4f39] text-white rounded-l-lg transition-colors border-r border-indigo-500/30"
                      >
                        {req.status === 'To Do' && 'Start Progress'}
                        {req.status === 'In Progress' && 'Submit for review'}
                        {req.status === 'In Review' && 'Approve Round'}
                        {req.status === 'Partially Approved' && 'Mark as Done'}
                        {req.status === 'Done' && 'Reopen Request'}
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setDropdownOpen(!dropdownOpen)}
                          className="px-2.5 py-2.5 bg-[#a9674d] hover:bg-[#8a4f39] text-white rounded-r-lg transition-colors flex items-center justify-center"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                        
                        {/* Dropdown Menu */}
                        <AnimatePresence>
                          {dropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                style={{
                                  position: 'absolute',
                                  bottom: '100%',
                                  right: 0,
                                  marginBottom: '8px',
                                  width: '180px',
                                  background: '#ffffff',
                                  borderRadius: '12px',
                                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 16px -6px rgba(0,0,0,0.05)',
                                  border: '1px solid #e2e8f0',
                                  padding: '6px',
                                  zIndex: 50,
                                }}
                              >
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2.5 py-1.5">Change Progress</div>
                                {STATUSES.map(s => (
                                  <button
                                    key={s}
                                    onClick={() => {
                                      setStatus(s);
                                      setDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                                      req.status === s
                                        ? 'bg-[#f5ece7] text-[#a9674d] font-semibold'
                                        : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    {s}
                                    {req.status === s && (
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <path d="M20 6L9 17l-5-5" />
                                      </svg>
                                    )}
                                  </button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Stepper progress indicator capsule */}
            {isTaskApproved(req) && (
              <div className="bg-gray-100 rounded-full p-1 flex items-center gap-0.5 border border-gray-200">
                {STATUSES.map(s => {
                  const isActive = req.status === s;
                  return (
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

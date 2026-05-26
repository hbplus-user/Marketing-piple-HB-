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
import { USERS } from '../../data/mockData';
import { daysToDeadline } from '../../utils/deadlineUtils';
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
  const { requests, closeModal, updateRequest, openModal, addComment, currentUser } = useApp();

  const [commentText, setCommentText]     = useState('');
  const [refLink, setRefLink]             = useState('');
  const [showRefLink, setShowRefLink]     = useState(false);
  const [composerOpen, setComposerOpen]   = useState(false);
  const [activeTab, setActiveTab]         = useState<ActivityTab>('all');
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

  if (!req) return null;

  const requester = USERS.find(u => u.id === req.requesterId);
  const assignee  = USERS.find(u => u.id === req.assigneeId);
  const owner     = USERS.find(u => u.id === req.ownerId);
  const reviewers = req.reviewerIds.map(id => USERS.find(u => u.id === id)).filter(Boolean);
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
            <span className="text-xs font-mono text-gray-400">{req.id}</span>
            <Badge pipeline={req.pipeline} />
            <StatusChip status={req.status} />
            <RoundBadge round={req.currentRound} />
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-3">{req.title}</h2>
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  req.status === s ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Brief + metadata */}
          <div className="px-6 py-5 grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Brief</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{req.brief || '—'}</p>
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
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-xs text-indigo-700 hover:bg-indigo-100 transition-colors truncate"
                      >
                        <Link size={11} className="flex-shrink-0" />
                        <span className="truncate">{url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
              {assignee && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Assigned to</p>
                  <div className="flex items-center gap-2">
                    <Avatar initials={assignee.initials} color={assignee.avatarColor} size="sm" />
                    <span className="text-xs font-medium text-gray-700">{assignee.name}</span>
                  </div>
                </div>
              )}
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
                <div className="flex items-center gap-1.5 text-xs text-gray-700">
                  <Calendar size={12} className="text-gray-400" />
                  {format(req.postDate, 'MMM d, yyyy')}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {dtd >= 0 ? `${dtd}d to deadline` : `${Math.abs(dtd)}d overdue`} · needs {req.daysNeeded}d
                </p>
              </div>
            </div>
          </div>

          {/* ── Activity ────────────────────────────────────────────── */}
          <div className="px-6 pb-6 border-t border-gray-100">
            {/* Title + tabs */}
            <div className="flex items-center gap-4 pt-5 mb-4">
              <h3 className="text-sm font-bold text-gray-900">Activity</h3>
              <div className="flex items-center gap-0.5 border border-gray-200 rounded-lg p-0.5">
                {(['all', 'comments', 'history'] as ActivityTab[]).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                      activeTab === tab ? 'bg-white shadow-sm text-indigo-700 border border-gray-200' : 'text-gray-500 hover:text-gray-700'
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
                        Add a comment…
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
                      <div className="border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-400 overflow-hidden transition-all">
                        {showRefLink && (
                          <div className="relative border-b border-gray-100">
                            <Link size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="url" value={refLink} onChange={e => setRefLink(e.target.value)}
                              placeholder="Paste reference URL…"
                              className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 focus:outline-none placeholder:text-gray-400" />
                          </div>
                        )}
                        <textarea
                          ref={textareaRef}
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Add a comment… (⌘↵ to send, Esc to cancel)"
                          rows={3}
                          className="w-full px-3 pt-3 pb-1 text-sm resize-none focus:outline-none placeholder:text-gray-400"
                        />
                        <div className="flex items-center justify-between px-2 pb-2">
                          <button onClick={() => setShowRefLink(v => !v)}
                            title={showRefLink ? 'Remove link' : 'Add reference link'}
                            className={`p-1.5 rounded-lg transition-colors ${showRefLink ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                            <Link size={13} />
                          </button>
                          <div className="flex items-center gap-2">
                            <button onClick={() => { setComposerOpen(false); setCommentText(''); }}
                              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
                              Cancel
                            </button>
                            <button onClick={handleSend} disabled={!commentText.trim()}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-medium transition-colors">
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
                  const user = USERS.find(u => u.id === item.userId);
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
                          <div className={`rounded-xl px-3 py-2 text-sm text-gray-700 leading-relaxed ${isMe ? 'bg-indigo-50' : 'bg-gray-50'}`}>
                            {item.text}
                            {item.referenceLink && (
                              <a href={item.referenceLink} target="_blank" rel="noopener noreferrer"
                                className="mt-1 flex items-center gap-1 text-[11px] text-indigo-600 hover:underline truncate">
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
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50/60">
          <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
            <Paperclip size={13} />
            Attach file
          </button>
          <div className="flex items-center gap-2">
            <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Close</button>
            {req.status !== 'In Review' && req.status !== 'Done' && (
              <button onClick={() => setStatus('In Review')}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                Submit for review
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

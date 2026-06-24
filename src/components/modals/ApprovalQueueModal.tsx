import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { CheckCircle, ArrowUp, MessageSquare, ExternalLink, AlertTriangle, Link, Send, X, ChevronDown, Clock } from 'lucide-react';
import Modal from '../shared/Modal';
import Badge from '../shared/Badge';
import Avatar from '../shared/Avatar';
import { useApp } from '../../context/AppContext';
import { isRedAlert } from '../../utils/deadlineUtils';
import type { ContentRequest, ActivityLogEntry } from '../../types';

interface RequestForm {
  comment: string;
  refLink: string;
}

export default function ApprovalQueueModal({ open }: { open: boolean }) {
  const { requests, closeModal, updateRequest, requestChanges, openModal, users, currentUser } = useApp();

  // Co-approver candidates: managers/founders other than the current user
  const coApproverPool = users.filter(u =>
    (u.role === 'founder' || u.role === 'manager') && u.id !== currentUser.id
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, RequestForm>>({});
  const [escalateOpenId, setEscalateOpenId] = useState<string | null>(null);
  const [escalateSelections, setEscalateSelections] = useState<Record<string, string[]>>({});
  const [requireFounder, setRequireFounder] = useState<Record<string, boolean>>({});

  // 1. Pending Manager Approval (visible to managers and founders)
  const pendingManagerApproval = requests.filter(r =>
    r.status === 'Brief Approval' &&
    !r.managerApproved
  );

  // 2. Pending Founder Approval (visible to founders and managers)
  const pendingFounderApproval = requests.filter(r =>
    r.status === 'Brief Approval' &&
    r.managerApproved === true &&
    r.founderApprovalRequired === true &&
    r.founderApproved === false
  );

  // 3. Design Review — visible to all managers and founders
  const pendingCoApproval = requests.filter(r =>
    r.status === 'Design Review' &&
    (currentUser.role === 'manager' || currentUser.role === 'founder')
  );

  const totalPending = pendingManagerApproval.length + pendingFounderApproval.length + pendingCoApproval.length;

  // Records current user's approval.
  const makeLog = (type: ActivityLogEntry['type'], fromStatus: ActivityLogEntry['fromStatus'], toStatus: ActivityLogEntry['toStatus']): ActivityLogEntry => ({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    userId: currentUser.id,
    timestamp: new Date(),
    fromStatus,
    toStatus,
  });

  const accept = (id: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    if (req.status === 'Brief Approval') {
      const isFounder = currentUser.role === 'founder';

      if (!req.managerApproved) {
        const needsFounder = requireFounder[id] ?? false;
        if (needsFounder && !isFounder) {
          // Manager approved but still needs founder — stay in Brief Approval
          const founderIds = users.filter(u => u.role === 'founder').map(u => u.id);
          const logBrief = makeLog('brief_approved', 'Brief Approval', 'Brief Approval');
          updateRequest(id, {
            managerApproved: true,
            founderApprovalRequired: true,
            founderApproved: false,
            reviewerIds: Array.from(new Set([...(req.reviewerIds ?? []), ...founderIds])),
            approvedBy: Array.from(new Set([...(req.approvedBy ?? []), currentUser.id])),
            activityLog: [...(req.activityLog ?? []), logBrief],
          });
        } else {
          // Manager approved, no founder needed → advance to Design
          const logDesign = makeLog('brief_approved', 'Brief Approval', 'Design');
          updateRequest(id, {
            managerApproved: true,
            founderApprovalRequired: false,
            founderApproved: true,
            approvedBy: [],
            status: 'Design',
            activityLog: [...(req.activityLog ?? []), logDesign],
          });
        }
      } else if (req.founderApprovalRequired && !req.founderApproved) {
        // Founder gives final brief approval → advance to Design
        const log = makeLog('brief_approved', 'Brief Approval', 'Design');
        updateRequest(id, {
          founderApproved: true,
          approvedBy: [],
          status: 'Design',
          activityLog: [...(req.activityLog ?? []), log],
        });
      }
    } else {
      // Design Review approval — any manager/founder approval advances to Approved
      const newApprovedBy = Array.from(new Set([...(req.approvedBy ?? []), currentUser.id]));
      const log = makeLog('brief_approved', req.status, 'Approved');
      updateRequest(id, {
        approvedBy: newApprovedBy,
        status: 'Approved',
        activityLog: [...(req.activityLog ?? []), log],
      });
    }
    closeModal();
  };

  const toggleEscalate = (id: string) => {
    setEscalateOpenId(prev => prev === id ? null : id);
    if (!escalateSelections[id]) setEscalateSelections(prev => ({ ...prev, [id]: [] }));
    if (expandedId === id) setExpandedId(null);
  };

  const toggleCoApprover = (reqId: string, userId: string) => {
    setEscalateSelections(prev => {
      const current = prev[reqId] ?? [];
      return {
        ...prev,
        [reqId]: current.includes(userId) ? current.filter(x => x !== userId) : [...current, userId],
      };
    });
  };

  // Records current user's approval AND adds co-approvers; task waits in In Review for their sign-off.
  const submitCoApproval = (reqId: string) => {
    const selected = escalateSelections[reqId] ?? [];
    if (selected.length === 0) return;
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    const mergedReviewers = Array.from(new Set([...req.reviewerIds, ...selected]));
    const newApprovedBy = Array.from(new Set([...req.approvedBy, currentUser.id]));
    const log = makeLog('brief_approved', req.status, 'Design Review');
    updateRequest(reqId, {
      reviewerIds: mergedReviewers,
      approvedBy: newApprovedBy,
      status: 'Design Review',
      activityLog: [...(req.activityLog ?? []), log],
    });
    setEscalateOpenId(null);
    setEscalateSelections(prev => { const next = { ...prev }; delete next[reqId]; return next; });
    closeModal();
  };

  const toggleRequestForm = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
    if (!forms[id]) setForms(prev => ({ ...prev, [id]: { comment: '', refLink: '' } }));
  };

  const updateForm = (id: string, field: keyof RequestForm, value: string) => {
    setForms(prev => ({
      ...prev,
      [id]: { ...(prev[id] || { comment: '', refLink: '' }), [field]: value },
    }));
  };

  const submitRequest = (id: string) => {
    const form = forms[id];
    if (!form?.comment.trim()) return;
    requestChanges(id, form.comment.trim(), form.refLink.trim() || undefined);
    setExpandedId(null);
    setForms(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const renderCard = (req: ContentRequest, showCoApprover: boolean, source: 'brief' | 'review') => {
    const requester = users.find(u => u.id === req.requesterId);
    const alert = isRedAlert(req);
    const isExpanded = expandedId === req.id;
    const isEscalateOpen = escalateOpenId === req.id;
    const form = forms[req.id] ?? { comment: '', refLink: '' };
    const selected = escalateSelections[req.id] ?? [];

    // Other reviewers who still haven't approved
    const stillPending = req.reviewerIds
      .filter(rid => !req.approvedBy.includes(rid) && rid !== currentUser.id)
      .map(rid => users.find(u => u.id === rid))
      .filter(Boolean) as typeof users;

    // Who has already approved (besides current user)
    const alreadyApproved = req.approvedBy
      .filter(rid => rid !== currentUser.id)
      .map(rid => users.find(u => u.id === rid))
      .filter(Boolean) as typeof users;

    const isPendingFounderForManager =
      req.status === 'Brief Approval' &&
      req.managerApproved === true &&
      req.founderApprovalRequired === true &&
      req.founderApproved === false &&
      currentUser.role === 'manager';

    return (
      <div
        key={req.id}
        className={`border rounded-xl overflow-hidden ${alert ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-white'}`}
      >
        <div className="p-4">
          <div className="flex items-start gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Source stage tag */}
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                source === 'brief'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-violet-50 text-violet-700 border-violet-200'
              }`}>
                {source === 'brief' ? '📋 Brief Approval' : '🎨 Design Review'}
              </span>
              <Badge pipeline={req.pipeline} />
              {alert && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-600">
                  <AlertTriangle size={11} />
                  Tight deadline
                </span>
              )}
              {req.status === 'Brief Approval' && req.managerApproved && req.founderApprovalRequired && !req.founderApproved && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 animate-pulse">
                  <Clock size={10} />
                  Waiting for Founder
                </span>
              )}
              {stillPending.length > 0 && req.status !== 'Brief Approval' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-100 text-violet-700">
                  <Clock size={10} />
                  Waiting on: {stillPending.map(u => u.name).join(', ')}
                </span>
              )}
              {alreadyApproved.length > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                  <CheckCircle size={10} />
                  {alreadyApproved.map(u => u.name).join(', ')} approved
                </span>
              )}
            </div>
          </div>

          <p className="text-sm font-bold text-gray-900 mb-1">{req.title}</p>
          <p className="text-xs text-gray-500 mb-3 line-clamp-2">{req.brief}</p>

          <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-4 flex-wrap">
            {requester && (
              <div className="flex items-center gap-1.5">
                <Avatar initials={requester.initials} color={requester.avatarColor} size="sm" />
                <span>{requester.name}</span>
                <span className="text-gray-300">·</span>
                <span className="capitalize">{requester.role}</span>
              </div>
            )}
            <span className="text-gray-300">·</span>
            <span>Post: {format(req.postDate, 'MMM d, yyyy')}</span>
            <span className="text-gray-300">·</span>
            <span>Submitted {formatDistanceToNow(req.createdAt, { addSuffix: true })}</span>
          </div>

          {/* Checkbox for manager approval to require founder approval */}
          {currentUser.role === 'manager' && req.status === 'Brief Approval' && !req.managerApproved && (
            <div className="flex items-center gap-2 bg-[#f5ece7]/60 px-3 py-2 rounded-xl border border-[#f0ddd5] mb-3 self-start max-w-max">
              <input
                type="checkbox"
                id={`founder-req-${req.id}`}
                checked={requireFounder[req.id] || false}
                onChange={(e) => setRequireFounder(prev => ({ ...prev, [req.id]: e.target.checked }))}
                className="w-4 h-4 rounded text-[#a9674d] focus:ring-[#a9674d]/30 border-gray-300 cursor-pointer"
              />
              <label htmlFor={`founder-req-${req.id}`} className="text-xs font-semibold text-gray-700 cursor-pointer select-none">
                Require Founder's approval
              </label>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {isPendingFounderForManager ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
                <Clock size={12} className="animate-pulse text-amber-500" />
                Waiting for Founder Sign-off
              </div>
            ) : (
              <>
                <button
                  onClick={() => accept(req.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a9674d] hover:bg-[#8a4f39] text-white text-xs font-medium transition-colors"
                >
                  <CheckCircle size={12} />
                  Approve
                </button>

                {showCoApprover && coApproverPool.length > 0 && (
                  <button
                    onClick={() => toggleEscalate(req.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      isEscalateOpen
                        ? 'border-violet-300 bg-violet-50 text-violet-700'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <ArrowUp size={12} />
                    Require co-approval
                    <ChevronDown size={11} className={`ml-0.5 transition-transform ${isEscalateOpen ? 'rotate-180' : ''}`} />
                  </button>
                )}

                <button
                  onClick={() => toggleRequestForm(req.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    isExpanded
                      ? 'border-amber-300 bg-amber-50 text-amber-700'
                      : 'border-amber-200 hover:bg-amber-50 text-amber-700'
                  }`}
                >
                  <MessageSquare size={12} />
                  Request changes
                  {isExpanded && <X size={11} className="ml-0.5" />}
                </button>
              </>
            )}

            <button
              onClick={() => { closeModal(); openModal({ type: 'designer-task', requestId: req.id }); }}
              className="ml-auto flex items-center gap-1 text-xs text-[#a9674d] hover:text-[#8a4f39]"
            >
              View detail
              <ExternalLink size={11} />
            </button>
          </div>
        </div>

        {/* Inline co-approver panel */}
        {isEscalateOpen && (
          <div className="border-t border-violet-100 bg-violet-50/60 px-4 py-3 space-y-2.5">
            <div>
              <p className="text-[11px] font-semibold text-violet-700 mb-0.5">
                Require co-approval from
              </p>
              <p className="text-[10px] text-violet-500 leading-relaxed">
                Your approval is recorded now. The task moves to Design Progress only after all selected approvers also sign off.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {coApproverPool.map(u => {
                const isSelected = selected.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleCoApprover(req.id, u.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                      isSelected
                        ? 'border-violet-400 bg-violet-100 text-violet-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-violet-300 hover:bg-violet-50'
                    }`}
                  >
                    <Avatar initials={u.initials} color={u.avatarColor} size="sm" />
                    {u.name}
                    <span className={`ml-0.5 px-1 py-0.5 rounded text-[10px] capitalize ${
                      u.role === 'manager' ? 'bg-[#f0ddd5] text-[#a9674d]' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {u.role}
                    </span>
                    {isSelected && <CheckCircle size={11} className="text-violet-500" />}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => submitCoApproval(req.id)}
                disabled={selected.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-medium transition-colors"
              >
                <CheckCircle size={11} />
                Approve &amp; require {selected.length || ''} co-approval{selected.length === 1 ? '' : 's'}
              </button>
              <button
                onClick={() => setEscalateOpenId(null)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Inline request-changes form */}
        {isExpanded && (
          <div className="border-t border-amber-100 bg-amber-50/60 px-4 py-3 space-y-2.5">
            <p className="text-[11px] font-semibold text-amber-700">
              Send feedback to {requester?.name ?? 'requester'}
            </p>
            <textarea
              value={form.comment}
              onChange={e => updateForm(req.id, 'comment', e.target.value)}
              placeholder="Describe what needs to change…"
              rows={2}
              className="w-full px-3 py-2 text-xs border border-amber-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 bg-white"
            />
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Link size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  value={form.refLink}
                  onChange={e => updateForm(req.id, 'refLink', e.target.value)}
                  placeholder="Reference link (optional)"
                  className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 bg-white"
                />
              </div>
              <button
                onClick={() => submitRequest(req.id)}
                disabled={!form.comment.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-medium transition-colors"
              >
                <Send size={11} />
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal open={open} onClose={closeModal} size="lg">
      <div className="px-6 py-5">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-base font-bold text-gray-900">Approval queue</h2>
          {totalPending > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-600">
              {totalPending} pending
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Approve to start production, or require a co-approver (e.g. founder) before work begins.
        </p>

        {totalPending === 0 ? (
          <div className="text-center py-12">
            <CheckCircle size={32} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Queue is clear — all requests reviewed.</p>
          </div>
        ) : (
          <div className="space-y-7">

            {/* ── Group A: From Brief Approval ─────────────────────────── */}
            {(pendingManagerApproval.length > 0 || pendingFounderApproval.length > 0) && (
              <div>
                {/* Group header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    📋 From Brief Approval
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {pendingManagerApproval.length + pendingFounderApproval.length} pending
                  </span>
                  <div className="flex-1 h-px bg-amber-100" />
                </div>

                <div className="space-y-5">
                  {/* Sub: Pending Manager */}
                  {pendingManagerApproval.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-[#a9674d] uppercase tracking-widest flex items-center gap-1.5">
                        <span>·</span> Needs manager approval · {pendingManagerApproval.length}
                      </p>
                      {pendingManagerApproval.map(req => renderCard(req, true, 'brief'))}
                    </div>
                  )}

                  {/* Sub: Pending Founder */}
                  {pendingFounderApproval.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                        <span>·</span> Needs founder approval · {pendingFounderApproval.length}
                      </p>
                      {pendingFounderApproval.map(req => renderCard(req, false, 'brief'))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Group B: From Design Review ──────────────────────────── */}
            {pendingCoApproval.length > 0 && (
              <div>
                {/* Group header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-violet-100 text-violet-800 border border-violet-200">
                    🎨 From Design Review
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {pendingCoApproval.length} pending
                  </span>
                  <div className="flex-1 h-px bg-violet-100" />
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock size={10} />
                    Awaiting approval · {pendingCoApproval.length}
                  </p>
                  {pendingCoApproval.map(req => renderCard(req, false, 'review'))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </Modal>
  );
}

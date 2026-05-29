import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { CheckCircle, ArrowUp, MessageSquare, ExternalLink, AlertTriangle, Link, Send, X, ChevronDown } from 'lucide-react';
import Modal from '../shared/Modal';
import Badge from '../shared/Badge';
import Avatar from '../shared/Avatar';
import { useApp } from '../../context/AppContext';
import { isRedAlert } from '../../utils/deadlineUtils';

interface RequestForm {
  comment: string;
  refLink: string;
}

export default function ApprovalQueueModal({ open }: { open: boolean }) {
  const { requests, closeModal, updateRequest, requestChanges, openModal, users } = useApp();
  const escalationUsers = users.filter(u => u.role === 'founder' || u.role === 'manager');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, RequestForm>>({});
  const [escalateOpenId, setEscalateOpenId] = useState<string | null>(null);
  const [escalateSelections, setEscalateSelections] = useState<Record<string, string[]>>({});

  const pending = requests.filter(r => r.status === 'To Do' && r.assigneeIds.length === 0);

  const accept = (id: string) => {
    const employee = users.find(u => u.role === 'employee');
    updateRequest(id, { assigneeIds: employee ? [employee.id] : [], status: 'In Progress' });
  };

  const toggleEscalate = (id: string) => {
    setEscalateOpenId(prev => prev === id ? null : id);
    if (!escalateSelections[id]) {
      setEscalateSelections(prev => ({ ...prev, [id]: [] }));
    }
    // Close request-changes form if open
    if (expandedId === id) setExpandedId(null);
  };

  const toggleEscalatePerson = (reqId: string, userId: string) => {
    setEscalateSelections(prev => {
      const current = prev[reqId] ?? [];
      return {
        ...prev,
        [reqId]: current.includes(userId) ? current.filter(x => x !== userId) : [...current, userId],
      };
    });
  };

  const submitEscalation = (reqId: string) => {
    const selected = escalateSelections[reqId] ?? [];
    if (selected.length === 0) return;
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    const merged = Array.from(new Set([...req.reviewerIds, ...selected]));
    updateRequest(reqId, { reviewerIds: merged, status: 'In Review' });
    setEscalateOpenId(null);
    setEscalateSelections(prev => { const next = { ...prev }; delete next[reqId]; return next; });
  };

  const toggleRequestForm = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
    if (!forms[id]) {
      setForms(prev => ({ ...prev, [id]: { comment: '', refLink: '' } }));
    }
  };

  const updateForm = (id: string, field: keyof RequestForm, value: string) => {
    setForms(prev => ({ ...prev, [id]: { ...prev[id], comment: prev[id]?.comment ?? '', refLink: prev[id]?.refLink ?? '', [field]: value } }));
  };

  const submitRequest = (id: string) => {
    const form = forms[id];
    if (!form?.comment.trim()) return;
    requestChanges(id, form.comment.trim(), form.refLink.trim() || undefined);
    setExpandedId(null);
    setForms(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  return (
    <Modal open={open} onClose={closeModal} size="lg">
      <div className="px-6 py-5">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-base font-bold text-gray-900">Approval queue</h2>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-600">
            {pending.length} pending
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Review submitted requests. Accept to assign to production, escalate for leadership review, or send back with feedback.
        </p>

        {pending.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle size={32} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Queue is clear â€” all requests reviewed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(req => {
              const requester = users.find(u => u.id === req.requesterId);
              const alert = isRedAlert(req);
              const isExpanded = expandedId === req.id;
              const isEscalateOpen = escalateOpenId === req.id;
              const form = forms[req.id] ?? { comment: '', refLink: '' };

              return (
                <div
                  key={req.id}
                  className={`border rounded-xl overflow-hidden ${alert ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-white'}`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-gray-400">{req.id}</span>
                        <Badge pipeline={req.pipeline} />
                        {alert && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-600">
                            <AlertTriangle size={11} />
                            Tight deadline
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm font-bold text-gray-900 mb-1">{req.title}</p>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{req.brief}</p>

                    <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-4">
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

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { accept(req.id); closeModal(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a9674d] hover:bg-[#8a4f39] text-white text-xs font-medium transition-colors"
                      >
                        <CheckCircle size={12} />
                        Approve
                      </button>
                      <button
                        onClick={() => toggleEscalate(req.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          isEscalateOpen
                            ? 'border-violet-300 bg-violet-50 text-violet-700'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <ArrowUp size={12} />
                        Escalate
                        <ChevronDown size={11} className={`ml-0.5 transition-transform ${isEscalateOpen ? 'rotate-180' : ''}`} />
                      </button>
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
                      <button
                        onClick={() => { closeModal(); openModal({ type: 'designer-task', requestId: req.id }); }}
                        className="ml-auto flex items-center gap-1 text-xs text-[#a9674d] hover:text-[#8a4f39]"
                      >
                        View detail
                        <ExternalLink size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Inline escalation panel */}
                  {isEscalateOpen && (
                    <div className="border-t border-violet-100 bg-violet-50/60 px-4 py-3 space-y-2.5">
                      <p className="text-[11px] font-semibold text-violet-700">
                        Choose who to escalate to
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {escalationUsers.map(u => {
                          const isSelected = (escalateSelections[req.id] ?? []).includes(u.id);
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => toggleEscalatePerson(req.id, u.id)}
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
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => submitEscalation(req.id)}
                          disabled={(escalateSelections[req.id] ?? []).length === 0}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-medium transition-colors"
                        >
                          <ArrowUp size={11} />
                          Escalate to {(escalateSelections[req.id] ?? []).length || ''} selected
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
                        placeholder="Describe what needs to changeâ€¦"
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
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

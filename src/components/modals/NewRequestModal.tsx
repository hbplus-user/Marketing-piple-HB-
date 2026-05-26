import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { AlertTriangle, CheckCircle, Link, Plus, X } from 'lucide-react';
import Modal from '../shared/Modal';
import Avatar from '../shared/Avatar';
import { useApp } from '../../context/AppContext';
import { calcInternalDeadline, daysToDeadline } from '../../utils/deadlineUtils';
import { USERS } from '../../data/mockData';
import type { Pipeline } from '../../types';

const PIPELINES: { value: Pipeline; label: string; desc: string; color: string }[] = [
  { value: 'PM',           label: 'PM',           desc: 'Strategy & briefs',    color: '#7C3AED' },
  { value: 'Content',      label: 'Content',      desc: 'Copy & long-form',     color: '#0EA5E9' },
  { value: 'Art / Design', label: 'Art / Design', desc: 'Visual design',        color: '#EC4899' },
  { value: 'Events',       label: 'Events',       desc: 'Events & activations', color: '#F59E0B' },
];

export default function NewRequestModal({ open }: { open: boolean }) {
  const { closeModal, addRequest, currentUser } = useApp();

  const [title, setTitle]         = useState('');
  const [brief, setBrief]         = useState('');
  const [pipeline, setPipeline]   = useState<Pipeline | null>(null);
  const [postDate, setPostDate]   = useState('');
  const [daysNeeded, setDaysNeeded] = useState(3);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [linkInput, setLinkInput]   = useState('');
  const [referenceLinks, setReferenceLinks] = useState<string[]>([]);

  const addLink = () => {
    const trimmed = linkInput.trim();
    if (!trimmed || referenceLinks.includes(trimmed)) return;
    setReferenceLinks(prev => [...prev, trimmed]);
    setLinkInput('');
  };

  const removeLink = (url: string) => setReferenceLinks(prev => prev.filter(l => l !== url));

  const manager = USERS.find(u => u.role === 'manager')!;
  // Assignable users: everyone except the manager (who auto-joins as reviewer)
  const assignableUsers = USERS.filter(u => u.role !== 'manager');

  const postDateObj      = postDate ? new Date(postDate) : null;
  const internalDeadline = postDateObj ? calcInternalDeadline(postDateObj) : null;
  const dtd              = internalDeadline ? daysToDeadline(internalDeadline) : null;
  const showRedAlert     = dtd !== null && dtd < daysNeeded;

  const reset = () => {
    setTitle(''); setBrief(''); setPipeline(null);
    setPostDate(''); setDaysNeeded(3); setAssigneeId(null);
    setLinkInput(''); setReferenceLinks([]);
  };

  const handleSubmit = () => {
    if (!title || !pipeline || !postDateObj) return;
    const id = `REQ-${Math.floor(Math.random() * 900) + 100}`;
    addRequest({
      id,
      title,
      brief,
      pipeline,
      status: 'To Do',
      requesterId: currentUser.id,
      ownerId: currentUser.id,               // creator is default sole approver
      assigneeId,
      reviewerIds: [manager.id],             // manager always present
      postDate: postDateObj,
      internalDeadline: internalDeadline!,
      daysNeeded,
      rounds: [{ round: 0, comments: [], status: 'pending' }],
      currentRound: 0,
      attachments: [],
      referenceLinks,
      approvedAt: null,
      approvedBy: [],
      createdAt: new Date(),
      postDateHistory: [],
      creatorRemovedFromApproval: false,
    });
    reset();
    closeModal();
  };

  return (
    <Modal open={open} onClose={() => { reset(); closeModal(); }} title="New content request" size="lg">
      <div className="px-6 py-5 space-y-5">

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Request title *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Q4 Webinar — Launch promo kit"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          />
        </div>

        {/* Brief */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Brief description</label>
          <textarea
            value={brief}
            onChange={e => setBrief(e.target.value)}
            rows={3}
            placeholder="What needs to be made? Where will it run? Any references or constraints?"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none"
          />
          <p className="text-[11px] text-gray-400 mt-1">Markdown supported. Attach files after creating the request.</p>
        </div>

        {/* Reference links */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reference links</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="url"
                value={linkInput}
                onChange={e => setLinkInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
                placeholder="https://example.com/reference"
                className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
            </div>
            <button
              type="button"
              onClick={addLink}
              disabled={!linkInput.trim()}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-medium transition-colors"
            >
              <Plus size={13} />
              Add
            </button>
          </div>
          {referenceLinks.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {referenceLinks.map(url => (
                <span key={url} className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-[11px] text-indigo-700 max-w-full">
                  <Link size={10} className="flex-shrink-0" />
                  <span className="truncate max-w-[220px]">{url}</span>
                  <button type="button" onClick={() => removeLink(url)} className="flex-shrink-0 hover:text-red-500 transition-colors">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Pipeline category *</label>
          <div className="grid grid-cols-2 gap-2">
            {PIPELINES.map(p => (
              <button
                key={p.value}
                onClick={() => setPipeline(p.value)}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  pipeline === p.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: p.color }} />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{p.label}</p>
                  <p className="text-[11px] text-gray-500">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Post date *</label>
            <input
              type="date"
              value={postDate}
              onChange={e => setPostDate(e.target.value)}
              min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Internal deadline
              <span className="ml-2 text-indigo-500 font-normal text-[11px]">Auto: T-5</span>
            </label>
            <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-500">
              {internalDeadline ? format(internalDeadline, 'MM/dd/yyyy') : '—'}
            </div>
          </div>
        </div>

        {/* Days slider */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-600">Estimated days needed to create</label>
            <span className="text-xs font-semibold text-indigo-600">{daysNeeded} days</span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            value={daysNeeded}
            onChange={e => setDaysNeeded(parseInt(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-indigo-600"
            style={{ background: `linear-gradient(to right, #4F46E5 ${(daysNeeded / 30) * 100}%, #E5E7EB ${(daysNeeded / 30) * 100}%)` }}
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>1 day</span>
            <span>30 days</span>
          </div>
        </div>

        {/* Assignee */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            Assignee
            <span className="ml-1.5 text-gray-400 font-normal">— who will work on this</span>
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {assignableUsers.map(u => {
              const selected = assigneeId === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => setAssigneeId(selected ? null : u.id)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all ${
                    selected
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Avatar initials={u.initials} color={u.avatarColor} size="sm" />
                  <span>{u.name}</span>
                  <span className={`capitalize text-[10px] ${selected ? 'text-indigo-400' : 'text-gray-400'}`}>
                    {u.role}
                  </span>
                  {selected && <CheckCircle size={12} className="text-indigo-500 ml-0.5" />}
                </button>
              );
            })}
          </div>
          {!assigneeId && (
            <p className="text-[11px] text-gray-400 mt-1.5">
              Optional — can be assigned later from the task view.
            </p>
          )}
        </div>

        {/* Manager auto-present notice */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-violet-50 border border-violet-100">
          <Avatar initials={manager.initials} color={manager.avatarColor} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-violet-700">
              {manager.name} <span className="text-violet-500 font-normal">will be notified of every new request</span>
            </p>
          </div>
          <CheckCircle size={14} className="text-violet-400 flex-shrink-0" />
        </div>

        {/* Red alert preview */}
        {showRedAlert && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
            <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-[12px] text-red-600 font-medium">
              Red Alert: Only {dtd}d to deadline but you've estimated {daysNeeded}d to deliver. This request will arrive in {manager.name}'s queue flagged as urgent.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
        {/* Auto-fetched requester */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Avatar initials={currentUser.initials} color={currentUser.avatarColor} size="sm" />
          <span className="text-[12px] text-gray-500 truncate">
            Submitting as <span className="font-semibold text-gray-700">{currentUser.name}</span>.{' '}
            After submission, this will appear in {manager.name}'s approval queue.
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => { reset(); closeModal(); }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title || !pipeline || !postDate}
            className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg transition-colors"
          >
            Submit request
          </button>
        </div>
      </div>
    </Modal>
  );
}

import { useState, useEffect, useRef } from 'react';
import { format, addDays } from 'date-fns';
import { AlertTriangle, CheckCircle, Link, Plus, X } from 'lucide-react';
import Modal from '../shared/Modal';
import Avatar from '../shared/Avatar';
import { useApp } from '../../context/AppContext';
import { calcInternalDeadline, daysToDeadline } from '../../utils/deadlineUtils';
import type { Pipeline } from '../../types';
import CategoryPicker from '../shared/CategoryPicker';

const PIPELINES: { value: Pipeline; label: string; desc: string; color: string }[] = [
  { value: 'PM',                   label: 'PM',                   desc: 'Strategy & briefs',    color: '#344161' },
  { value: 'Organic',              label: 'Organic',              desc: 'Copy & long-form',     color: '#6f8e7c' },
  { value: 'Internal requirement', label: 'Internal requirement', desc: 'Visual design',        color: '#a9674d' },
  { value: 'Events',               label: 'Events',               desc: 'Events & activations', color: '#c99d5d' },
];

export default function NewRequestModal({ open }: { open: boolean }) {
  const { closeModal, addRequest, currentUser, users, requests } = useApp();

  const [title, setTitle]         = useState('');
  const [brief, setBrief]         = useState('');
  const [pipeline, setPipeline]   = useState<Pipeline | null>(null);
  const [postDate, setPostDate]   = useState('');
  const [internalDeadlineStr, setInternalDeadlineStr] = useState('');
  const [daysNeeded, setDaysNeeded] = useState(3);
  const [category, setCategory]     = useState('');
  const [followerIds, setFollowerIds] = useState<string[]>([]);
  const [linkInput, setLinkInput]   = useState('');
  const [referenceLinks, setReferenceLinks] = useState<string[]>([]);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const addLink = () => {
    const trimmed = linkInput.trim();
    if (!trimmed || referenceLinks.includes(trimmed)) return;
    setReferenceLinks(prev => [...prev, trimmed]);
    setLinkInput('');
    // Keep focus so the user can immediately type the next link
    setTimeout(() => linkInputRef.current?.focus(), 0);
  };

  const removeLink = (url: string) => setReferenceLinks(prev => prev.filter(l => l !== url));

  const toggleFollower = (id: string) =>
    setFollowerIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const manager = users.find(u => u.role === 'manager') || users.find(u => u.id === currentUser.id) || currentUser;
  const assignableUsers = users.filter(u => u.role !== 'manager');

  const postDateObj = postDate ? new Date(postDate) : null;

  useEffect(() => {
    if (postDateObj) {
      setInternalDeadlineStr(format(calcInternalDeadline(postDateObj), 'yyyy-MM-dd'));
    } else {
      setInternalDeadlineStr('');
    }
  }, [postDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const internalDeadline = internalDeadlineStr ? new Date(internalDeadlineStr) : null;
  const autoDeadline     = postDateObj ? calcInternalDeadline(postDateObj) : null;
  const isAuto           = !!autoDeadline && !!internalDeadlineStr &&
                           format(autoDeadline, 'yyyy-MM-dd') === internalDeadlineStr;
  const dtd          = internalDeadline ? daysToDeadline(internalDeadline) : null;
  const showRedAlert = dtd !== null && dtd < daysNeeded;

  const reset = () => {
    setTitle(''); setBrief(''); setPipeline(null); setCategory('');
    setPostDate(''); setInternalDeadlineStr(''); setDaysNeeded(3);
    setFollowerIds([]); setLinkInput(''); setReferenceLinks([]);
  };

  const handleSubmit = () => {
    if (!title || !pipeline || !postDateObj || !internalDeadline) return;
    const maxNum = requests.reduce((max, r) => {
      const m = r.id.match(/REQ-(\d+)/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    const id = `REQ-${String(maxNum + 1).padStart(3, '0')}`;
    const now = new Date();

    addRequest({
      id,
      title,
      brief,
      pipeline,
      status: 'Brief Approval',
      requesterId: currentUser.id,
      ownerId: currentUser.id,
      assigneeIds: [],
      followerIds,
      reviewerIds: [manager.id],
      postDate: postDateObj,
      internalDeadline: internalDeadline,
      daysNeeded,
      rounds: [{ round: 0, comments: [], status: 'pending' }],
      currentRound: 0,
      attachments: [],
      referenceLinks,
      approvedAt: null,
      approvedBy: [],
      createdAt: now,
      postDateHistory: [],
      creatorRemovedFromApproval: false,
      managerApproved: false,
      founderApprovalRequired: false,
      founderApproved: false,
      activityLog: [],
      postedBy: [],
      assigneeAcceptance: [],
      submissionLinks: [],
      submissionNote: '',
      category: pipeline === 'Organic' ? (category || null) : null,
    });
    reset();
    closeModal();
  };

  const isMeSelected = followerIds.includes(currentUser.id);

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
            placeholder="e.g. Q4 Webinar - Launch promo kit"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20 focus:border-[#a9674d]"
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
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20 focus:border-[#a9674d] resize-none"
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
                ref={linkInputRef}
                type="url"
                value={linkInput}
                onChange={e => setLinkInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
                placeholder="https://example.com/reference"
                className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20 focus:border-[#a9674d]"
              />
            </div>
            <button
              type="button"
              onClick={addLink}
              disabled={!linkInput.trim()}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#a9674d] hover:bg-[#8a4f39] disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-medium transition-colors"
            >
              <Plus size={13} />
              Add
            </button>
          </div>
          {referenceLinks.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {referenceLinks.map(url => (
                <span key={url} className="flex items-center gap-1.5 px-2 py-1 bg-[#f5ece7] border border-[#f5ece7] rounded-lg text-[11px] text-[#8a4f39] max-w-full">
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
                onClick={() => { setPipeline(p.value); if (p.value !== 'Organic') setCategory(''); }}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  pipeline === p.value
                    ? 'border-[#a9674d] bg-[#f5ece7]'
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

        {/* Category — Organic only */}
        {pipeline === 'Organic' && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Category
              <span className="ml-1.5 text-gray-400 font-normal">— optional</span>
            </label>
            <CategoryPicker
              value={category}
              onChange={setCategory}
              isManager={currentUser.role === 'manager' || currentUser.role === 'founder'}
            />
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Post date *</label>
            <input
              type="date"
              value={postDate}
              onChange={e => setPostDate(e.target.value)}
              min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20 focus:border-[#a9674d]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Internal deadline
              {isAuto
                ? <span className="ml-2 text-[#c47d61] font-normal text-[11px]">Auto: T-5</span>
                : internalDeadlineStr
                  ? <span className="ml-2 text-amber-500 font-normal text-[11px]">Custom</span>
                  : null}
            </label>
            <input
              type="date"
              value={internalDeadlineStr}
              onChange={e => setInternalDeadlineStr(e.target.value)}
              max={postDate || undefined}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20 focus:border-[#a9674d]"
            />
          </div>
        </div>

        {/* Days slider */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-600">Estimated days needed to create</label>
            <span className="text-xs font-semibold text-[#a9674d]">{daysNeeded} days</span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            value={daysNeeded}
            onChange={e => setDaysNeeded(parseInt(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#a9674d]"
            style={{ background: `linear-gradient(to right, #a9674d ${(daysNeeded / 30) * 100}%, #E5E7EB ${(daysNeeded / 30) * 100}%)` }}
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>1 day</span>
            <span>30 days</span>
          </div>
        </div>

        {/* Followers - multi-select */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            Followers
            <span className="ml-1.5 text-gray-400 font-normal">- select one or more</span>
            {followerIds.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#f0ddd5] text-[#8a4f39] text-[10px] font-bold">
                {followerIds.length} selected
              </span>
            )}
          </label>
          <div className="flex items-center gap-2 flex-wrap">

            {/* Follow this task */}
            <button
              onClick={() => toggleFollower(currentUser.id)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all ${
                isMeSelected
                  ? 'border-green-400 bg-green-50 text-green-700'
                  : 'border-dashed border-gray-300 bg-white text-gray-500 hover:border-[#c4a98a] hover:bg-[#f5ece7] hover:text-[#a9674d]'
              }`}
            >
              <Avatar initials={currentUser.initials} color={currentUser.avatarColor} size="sm" />
              <span>Follow this task</span>
              {isMeSelected && <CheckCircle size={12} className="text-green-500 ml-0.5" />}
            </button>

            <span className="text-gray-200 select-none">|</span>

            {assignableUsers
              .filter(u => u.id !== currentUser.id)
              .map(u => {
                const selected = followerIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => toggleFollower(u.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all ${
                      selected
                        ? 'border-[#a9674d] bg-[#f5ece7] text-[#8a4f39]'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Avatar initials={u.initials} color={u.avatarColor} size="sm" />
                    <span>{u.name}</span>
                    <span className={`capitalize text-[10px] ${selected ? 'text-[#c4a98a]' : 'text-gray-400'}`}>
                      {u.role}
                    </span>
                    {selected && <CheckCircle size={12} className="text-[#c47d61] ml-0.5" />}
                  </button>
                );
              })}
          </div>

          {followerIds.length === 0 && (
            <p className="text-[11px] text-gray-400 mt-1.5">
              Optional - can be added later from the task view.
            </p>
          )}
          {isMeSelected && (
            <p className="text-[11px] text-green-600 mt-1.5 font-medium">
              You'll be notified about updates to this task.
            </p>
          )}
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
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Avatar initials={currentUser.initials} color={currentUser.avatarColor} size="sm" />
          <span className="text-[12px] text-gray-500 truncate">
            Submitting as <span className="font-semibold text-gray-700">{currentUser.name}</span>.{' '}
            {currentUser.role !== 'manager'
              ? `${manager.name} will own and approve this request.`
              : 'You will own and approve this request.'
            }
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
            className="px-4 py-2 text-sm font-medium bg-[#a9674d] hover:bg-[#8a4f39] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg transition-colors"
          >
            Submit request
          </button>
        </div>
      </div>
    </Modal>
  );
}

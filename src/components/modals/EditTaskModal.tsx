import { useState, useEffect, useRef } from 'react';
import { format, addDays } from 'date-fns';
import { Link, Plus, X } from 'lucide-react';
import Modal from '../shared/Modal';
import Avatar from '../shared/Avatar';
import { useApp } from '../../context/AppContext';
import { calcInternalDeadline } from '../../utils/deadlineUtils';
import { canReassignOwner, canEditReviewers } from '../../utils/permissions';
import type { Pipeline } from '../../types';
import CategoryPicker from '../shared/CategoryPicker';

const PIPELINES: { value: Pipeline; label: string; desc: string; color: string }[] = [
  { value: 'PM',                   label: 'PM',                   desc: 'Strategy & briefs',    color: '#344161' },
  { value: 'Organic',              label: 'Organic',              desc: 'Copy & long-form',     color: '#6f8e7c' },
  { value: 'Internal requirement', label: 'Internal requirement', desc: 'Visual design',        color: '#a9674d' },
  { value: 'Events',               label: 'Events',               desc: 'Events & activations', color: '#c99d5d' },
];

export default function EditTaskModal({ open, requestId }: { open: boolean; requestId?: string }) {
  const { requests, closeModal, updateRequest, users, currentUser } = useApp();
  const req = requests.find(r => r.id === requestId);

  const [title, setTitle]           = useState('');
  const [brief, setBrief]           = useState('');
  const [pipeline, setPipeline]     = useState<Pipeline | null>(null);
  const [postDate, setPostDate]     = useState('');
  const [internalDeadlineStr, setInternalDeadlineStr] = useState('');
  const [daysNeeded, setDaysNeeded] = useState(3);
  const [category, setCategory]     = useState('');
  const [followerIds, setFollowerIds] = useState<string[]>([]);
  const [ownerId, setOwnerId]       = useState('');
  const [reviewerIds, setReviewerIds] = useState<string[]>([]);
  const [linkInput, setLinkInput]   = useState('');
  const [referenceLinks, setReferenceLinks] = useState<string[]>([]);
  const linkInputRef = useRef<HTMLInputElement>(null);

  // Populate fields whenever modal opens for a request
  useEffect(() => {
    if (req && open) {
      setTitle(req.title);
      setBrief(req.brief || '');
      setPipeline(req.pipeline);
      setPostDate(format(req.postDate, 'yyyy-MM-dd'));
      setInternalDeadlineStr(format(req.internalDeadline, 'yyyy-MM-dd'));
      setDaysNeeded(req.daysNeeded);
      setFollowerIds(req.followerIds ?? []);
      setOwnerId(req.ownerId);
      setReviewerIds(req.reviewerIds ?? []);
      setReferenceLinks(req.referenceLinks || []);
      setCategory(req.category || '');
      setLinkInput('');
    }
  }, [open, requestId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!req) return null;

  const assignableUsers = users.filter(u => u.role !== 'manager');

  const addLink = () => {
    const trimmed = linkInput.trim();
    if (!trimmed || referenceLinks.includes(trimmed)) return;
    setReferenceLinks(prev => [...prev, trimmed]);
    setLinkInput('');
    setTimeout(() => linkInputRef.current?.focus(), 0);
  };

  const handleSave = () => {
    if (!title.trim() || !pipeline || !postDate) return;
    const newPostDate = new Date(postDate);
    const newDeadline = internalDeadlineStr ? new Date(internalDeadlineStr) : calcInternalDeadline(newPostDate);
    updateRequest(req.id, {
      title: title.trim(),
      brief: brief.trim(),
      pipeline,
      postDate: newPostDate,
      internalDeadline: newDeadline,
      daysNeeded,
      followerIds,
      referenceLinks,
      category: pipeline === 'Organic' ? (category || null) : null,
      ...(canReassignOwner(currentUser.role, req, currentUser.id) ? { ownerId } : {}),
      ...(canEditReviewers(currentUser.role) ? { reviewerIds } : {}),
    });
    closeModal();
  };

  return (
    <Modal open={open} onClose={closeModal} title="Edit request" size="lg">
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
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
          <textarea
            value={brief}
            onChange={e => setBrief(e.target.value)}
            rows={3}
            placeholder="What needs to be made? Where will it run? Any references or constraints?"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20 focus:border-[#a9674d] resize-none"
          />
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
                  <button
                    type="button"
                    onClick={() => setReferenceLinks(prev => prev.filter(l => l !== url))}
                    className="flex-shrink-0 hover:text-red-500 transition-colors"
                  >
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
              onChange={e => {
                setPostDate(e.target.value);
                if (e.target.value) {
                  setInternalDeadlineStr(format(calcInternalDeadline(new Date(e.target.value)), 'yyyy-MM-dd'));
                }
              }}
              min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20 focus:border-[#a9674d]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Internal deadline</label>
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

        {/* Followers */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            Followers
            {followerIds.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#f0ddd5] text-[#8a4f39] text-[10px] font-bold">
                {followerIds.length} selected
              </span>
            )}
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {assignableUsers.map(u => {
              const selected = followerIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => setFollowerIds(prev =>
                    prev.includes(u.id) ? prev.filter(x => x !== u.id) : [...prev, u.id]
                  )}
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
                </button>
              );
            })}
          </div>
        </div>

        {/* Owner — Requestor or Manager only */}
        {canReassignOwner(currentUser.role, req, currentUser.id) && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Owner</label>
            <div className="flex items-center gap-2 flex-wrap">
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => setOwnerId(u.id)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all ${
                    ownerId === u.id
                      ? 'border-[#a9674d] bg-[#f5ece7] text-[#8a4f39]'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Avatar initials={u.initials} color={u.avatarColor} size="sm" />
                  <span>{u.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reviewers — Manager only */}
        {canEditReviewers(currentUser.role) && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              Reviewers
              {reviewerIds.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#f0ddd5] text-[#8a4f39] text-[10px] font-bold">
                  {reviewerIds.length} selected
                </span>
              )}
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {users.map(u => {
                const selected = reviewerIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => setReviewerIds(prev =>
                      prev.includes(u.id) ? prev.filter(x => x !== u.id) : [...prev, u.id]
                    )}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all ${
                      selected
                        ? 'border-[#a9674d] bg-[#f5ece7] text-[#8a4f39]'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Avatar initials={u.initials} color={u.avatarColor} size="sm" />
                    <span>{u.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
        <button
          onClick={closeModal}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!title.trim() || !pipeline || !postDate}
          className="px-4 py-2 text-sm font-semibold bg-[#a9674d] hover:bg-[#8a4f39] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg transition-colors"
        >
          Save changes
        </button>
      </div>
    </Modal>
  );
}

import { useState } from 'react';
import { Pencil, Trash2, Check, Link } from 'lucide-react';
import Linkify from './Linkify';
import { useApp } from '../../context/AppContext';

interface CommentLike {
  id?: string;
  userId: string;
  text: string;
  referenceLink?: string;
  editedAt?: Date;
}

// Renders a comment's text/link, plus (only for the comment's own author) inline
// Edit/Delete controls. Comments created before `id` existed have no id, so they
// can't be targeted for edit/delete — isMine requires one.
export default function CommentBody({
  requestId, round, comment, textClassName,
}: { requestId: string; round: number; comment: CommentLike; textClassName?: string }) {
  const { currentUser, editComment, deleteComment } = useApp();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.text);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isMine = !!comment.id && comment.userId === currentUser.id;

  const save = () => {
    if (!comment.id || !text.trim()) return;
    editComment(requestId, round, comment.id, text.trim());
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-1.5">
        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#a9674d]/20 focus:border-[#a9674d]"
        />
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => { setEditing(false); setText(comment.text); }}
            className="px-2 py-1 text-[11px] text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!text.trim()}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-[#a9674d] hover:bg-[#8a4f39] disabled:opacity-40 text-white rounded-lg transition-colors"
          >
            <Check size={11} /> Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className={textClassName}>
        <Linkify text={comment.text} />
        {comment.editedAt && <span className="ml-1.5 text-[10px] text-gray-400 italic">(edited)</span>}
      </p>
      {comment.referenceLink && (
        <a
          href={comment.referenceLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center gap-1 text-[11px] text-[#a9674d] hover:underline truncate"
        >
          <Link size={10} />
          {comment.referenceLink}
        </a>
      )}
      {isMine && (
        confirmingDelete ? (
          <div className="mt-1.5 flex items-center gap-2 text-[11px]">
            <span className="text-gray-500">Delete this comment?</span>
            <button onClick={() => deleteComment(requestId, round, comment.id!)} className="text-red-600 font-semibold hover:underline">
              Delete
            </button>
            <button onClick={() => setConfirmingDelete(false)} className="text-gray-400 hover:text-gray-600">
              Cancel
            </button>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2.5">
            <button onClick={() => setEditing(true)} className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-[#a9674d] transition-colors">
              <Pencil size={9} /> Edit
            </button>
            <button onClick={() => setConfirmingDelete(true)} className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 size={9} /> Delete
            </button>
          </div>
        )
      )}
    </div>
  );
}

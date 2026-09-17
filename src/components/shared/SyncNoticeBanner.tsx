import { AlertTriangle, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/**
 * Tells someone their stage change was refused because the task had already moved on
 * (see checkTransition). Without it the card would just silently jump back to its real
 * column, which looks exactly like the bug it's preventing.
 */
export default function SyncNoticeBanner() {
  const { syncNotice, dismissSyncNotice } = useApp();
  if (!syncNotice) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-xl flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[13px] shadow-lg"
    >
      <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
      <p className="flex-1 leading-relaxed">{syncNotice}</p>
      <button
        onClick={dismissSyncNotice}
        className="p-1 -m-1 rounded-md text-amber-500 hover:text-amber-700 hover:bg-amber-100 transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

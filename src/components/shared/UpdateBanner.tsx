import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useNewVersionAvailable } from '../../hooks/useNewVersionAvailable';

const RELOAD_AFTER_S = 15;
const RELOADED_FOR_KEY = 'pipeline:reloaded-for-build';

function readReloadedFor(): string | null {
  try { return sessionStorage.getItem(RELOADED_FOR_KEY); } catch { return null; }
}

/** Remember which build we reloaded for (see the loop guard below), then reload. */
function reloadFor(buildId: string) {
  try { sessionStorage.setItem(RELOADED_FOR_KEY, buildId); } catch { /* private mode */ }
  window.location.reload();
}

/**
 * Forces tabs onto the latest deploy. When a newer build is live, this reloads the
 * page after a short visible countdown (or immediately if the tab is in the
 * background). The session survives a reload, so nobody has to sign in again.
 *
 * Guarded against a reload loop: if we already reloaded for this exact build and are
 * *still* on old code — a cached index.html, say — it stops auto-reloading and asks
 * for a hard refresh instead of spinning forever.
 */
export default function UpdateBanner() {
  const latestBuildId = useNewVersionAvailable();
  const [secondsLeft, setSecondsLeft] = useState(RELOAD_AFTER_S);

  const alreadyTried = latestBuildId !== null && readReloadedFor() === latestBuildId;
  const autoReload   = latestBuildId !== null && !alreadyTried;

  useEffect(() => {
    if (!autoReload || !latestBuildId) return;

    // Nobody is looking at a background tab — no point making them return to a countdown.
    if (document.visibilityState === 'hidden') { reloadFor(latestBuildId); return; }

    const onHide = () => { if (document.visibilityState === 'hidden') reloadFor(latestBuildId); };
    document.addEventListener('visibilitychange', onHide);
    const tick = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      clearInterval(tick);
    };
  }, [autoReload, latestBuildId]);

  // Kept out of the state updater above: updaters must stay pure (StrictMode runs them twice).
  useEffect(() => {
    if (autoReload && latestBuildId && secondsLeft === 0) reloadFor(latestBuildId);
  }, [autoReload, latestBuildId, secondsLeft]);

  if (!latestBuildId) return null;

  const reloadNow = () => reloadFor(latestBuildId);

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-[60] flex items-center justify-center gap-3 px-4 py-2.5 bg-[#344161] text-white text-[13px] shadow-lg flex-wrap"
    >
      <RefreshCw size={14} className={autoReload ? 'animate-spin' : ''} />
      {autoReload ? (
        <span>
          A new version of the pipeline is live. Reloading in <strong>{secondsLeft}s</strong> so
          your changes save correctly — finish or copy anything you're typing.
        </span>
      ) : (
        <span>
          A new version is live but this tab couldn't load it. Please hard refresh
          (<strong>Cmd+Shift+R</strong> on Mac, <strong>Ctrl+Shift+R</strong> on Windows).
        </span>
      )}
      <button
        onClick={reloadNow}
        className="px-3 py-1 rounded-md bg-white text-[#344161] text-[12px] font-semibold hover:bg-gray-100 transition-colors"
      >
        Reload now
      </button>
    </div>
  );
}

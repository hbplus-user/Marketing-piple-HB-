import { useEffect, useState } from 'react';

const CHECK_EVERY_MS = 60_000;

/**
 * Watches for a deploy newer than the code running in this tab.
 *
 * Returns the build id the server is now serving once it differs from this bundle's,
 * otherwise null. People leave this app open for days without refreshing, and a tab
 * running old code keeps writing with old rules — which is how tasks kept getting
 * dragged back out of Approved after the fix had already shipped.
 */
export function useNewVersionAvailable(): string | null {
  const [latestBuildId, setLatestBuildId] = useState<string | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) return; // the dev server has no version.json

    let cancelled = false;
    const check = async () => {
      try {
        // Query string + no-store so neither the browser nor a CDN hands back a cached copy.
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { buildId } = (await res.json()) as { buildId?: string };
        if (!cancelled && buildId && buildId !== __APP_BUILD_ID__) setLatestBuildId(buildId);
      } catch {
        // Offline, or the request was blocked — the next check retries.
      }
    };

    const run = () => { void check(); };
    // Check on focus too: the tabs that matter most are the ones someone just came back to.
    const onVisible = () => { if (document.visibilityState === 'visible') run(); };

    run();
    const timer = setInterval(run, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', run);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', run);
    };
  }, []);

  return latestBuildId;
}

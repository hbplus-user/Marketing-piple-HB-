let audioCtx: AudioContext | null = null;

// Browsers start AudioContext suspended until a real user gesture touches the
// page — call this from a click/keydown handler once to unlock it for later,
// asynchronous playback (e.g. a sound firing off a realtime update).
export function unlockAudio() {
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch {
    // Audio not available in this environment — fail silently
  }
}

// A short synthesized chime — no audio asset to bundle or fetch.
export function playNotificationSound() {
  try {
    audioCtx ??= new AudioContext();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio blocked (e.g. no user gesture yet) — fail silently
  }
}

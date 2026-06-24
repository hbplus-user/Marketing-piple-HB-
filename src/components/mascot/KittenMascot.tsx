import { useState, useEffect, useRef, useCallback } from 'react';

// ── CSS animations ─────────────────────────────────────────────────────────
const KITTEN_STYLE = `
.kEyeL, .kEyeR {
  transform-box: fill-box;
  transform-origin: 50% 50%;
}
.kEyeL { animation: kBlink 5s ease-in-out infinite; }
.kEyeR { animation: kBlink 5s ease-in-out infinite 0.22s; }
.kTail {
  transform-box: fill-box;
  transform-origin: 0% 100%;
  animation: kTailWag 2s ease-in-out infinite;
}
.kEarL {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: kEarTwitch 7s ease-in-out infinite;
}
.kEarR {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: kEarTwitch 7s ease-in-out infinite 3.5s;
}
@keyframes kBlink {
  0%, 88%, 100% { transform: scaleY(1); }
  93% { transform: scaleY(0.07); }
}
@keyframes kTailWag {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(22deg); }
}
@keyframes kEarTwitch {
  0%, 84%, 100% { transform: rotate(0deg); }
  88% { transform: rotate(-14deg); }
  94% { transform: rotate(7deg); }
}
@keyframes kFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
}
@keyframes kBounce {
  0%   { transform: translateY(0) scale(1,1); }
  15%  { transform: translateY(-22px) scale(1.06,0.94); }
  45%  { transform: translateY(-30px) scale(1.1,0.92); }
  65%  { transform: translateY(-14px) scale(1.04,0.98); }
  80%  { transform: translateY(-6px) scale(1.02,1); }
  100% { transform: translateY(0) scale(1,1); }
}
@keyframes kSad {
  0%   { transform: translateY(0); }
  100% { transform: translateY(5px); }
}
@keyframes kBubblePop {
  0%   { opacity: 0; transform: scale(0.72) translateY(8px); }
  65%  { opacity: 1; transform: scale(1.04) translateY(-2px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
.kWrap-idle   { animation: kFloat 3.2s ease-in-out infinite; }
.kWrap-happy  { animation: kBounce 0.75s ease-out forwards; }
.kWrap-sad    { animation: kSad 0.45s ease-out forwards; }
.kBubble      { animation: kBubblePop 0.24s cubic-bezier(.34,1.56,.64,1) forwards; }
.kWrap-sad .kMouthSmile { opacity: 0; }
.kWrap-sad .kMouthFrown { opacity: 1; }
.kWrap-happy .kMouthFrown { opacity: 0; }
.kMouthFrown  { opacity: 0; }
`;

// ── Message rules ───────────────────────────────────────────────────────────
const CONFIRM_RULES: { test: RegExp; q: string; yay: string }[] = [
  {
    test: /new request|new content|\bnew\b.*content/i,
    q:   'Meow! Creating a brand new request? 🐾',
    yay: "Yay! Let's make something purr-fect! 🎉",
  },
  {
    test: /approve design|final approve|approve & assign|\bapprove\b/i,
    q:   'Purrr… approving this one? Big moment! 🐾',
    yay: 'Approved! ✨ Well done, boss!',
  },
  {
    test: /submit.*review|for review/i,
    q:   'Sending for review? How exciting! 🐾',
    yay: 'Off it goes! Good luck! 🚀',
  },
  {
    test: /initiate design|start design/i,
    q:   'Starting the design phase? Creative time! 🎨',
    yay: "Let's create something beautiful! 🐾",
  },
  {
    test: /mark.*post|as posted/i,
    q:   "Marking as posted? Almost done! 🐾",
    yay: "It's live! You did it! 🎊",
  },
  {
    test: /\bbackup\b/i,
    q:   'Making a backup? Smart thinking! 🧠',
    yay: 'Safety first! Your data is safe! 🐾',
  },
  {
    test: /\brestore\b/i,
    q:   'Restoring from backup? Hope it helps! 🐱',
    yay: 'Restored! Welcome back! 🐾',
  },
  {
    test: /\baccept\b/i,
    q:   "Accepting this task? You've got this! 💪",
    yay: "Let's go! You'll crush it! 🐾",
  },
  {
    test: /save changes|\bsave\b/i,
    q:   'Saving your changes? Pawsome! 🐾',
    yay: 'Saved! Nothing lost! ✨',
  },
  {
    test: /\bdelete\b|\bremove\b/i,
    q:   "Deleting this? That's permanent… 😿",
    yay: 'Gone. Hope that was the right call! 🐾',
  },
  {
    test: /request changes/i,
    q:   'Sending feedback? Constructive criticism! 🐱',
    yay: 'Feedback sent! Let\'s make it better! 🐾',
  },
];

const REACT_LINES = [
  "Ooh, you're busy! 👀",
  'Click click click! 🐾',
  'Working hard I see! ✨',
  'Meow~ keep going! 🐱',
  'Look at you being productive! 🐾',
  'Purr-fect click! 🐾',
  'I see you! 👀',
  'Busy human! 🐾',
];

function classify(btn: HTMLElement): { type: 'confirm' | 'react' | 'skip'; q: string; yay: string } {
  const text = (btn.textContent ?? btn.getAttribute('aria-label') ?? '').trim();

  // Skip icon-only / close / cancel buttons
  if (
    !text ||
    text.length <= 1 ||
    /^[×✕✗✖xX]$/.test(text) ||
    /^(cancel|close|dismiss|log out|logout)$/i.test(text)
  ) {
    return { type: 'skip', q: '', yay: '' };
  }

  for (const rule of CONFIRM_RULES) {
    if (rule.test.test(text)) {
      return { type: 'confirm', q: rule.q, yay: rule.yay };
    }
  }

  return {
    type: 'react',
    q: REACT_LINES[Math.floor(Math.random() * REACT_LINES.length)],
    yay: '',
  };
}

// ── Component ───────────────────────────────────────────────────────────────
type KState = 'idle' | 'happy' | 'sad';

interface Bubble {
  msg: string;
  yay: string;
  type: 'confirm' | 'react';
  btn: HTMLElement | null;
  phase: 'ask' | 'yay' | 'aw';
}

export default function KittenMascot() {
  const [visible, setVisible]         = useState(true);
  const [facingRight, setFacingRight] = useState(true);
  const [kState, setKState]           = useState<KState>('idle');
  const [bubble, setBubble]           = useState<Bubble | null>(null);
  const [bubbleRight, setBubbleRight] = useState(true);

  const wrapRef      = useRef<HTMLDivElement>(null);
  const posRef       = useRef({ x: -200, y: -200 });
  const targetRef    = useRef({ x: -200, y: -200 });
  const rafRef       = useRef<number>(0);
  const lastXRef     = useRef(0);
  const confirmedRef = useRef(new WeakSet<Element>());
  const blockingRef  = useRef(false);
  const autoRef      = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Disable entirely on touch devices
  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // ── RAF smooth follow ────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || isTouch) return;
    const loop = () => {
      posRef.current.x += (targetRef.current.x - posRef.current.x) * 0.1;
      posRef.current.y += (targetRef.current.y - posRef.current.y) * 0.1;
      if (wrapRef.current) {
        wrapRef.current.style.transform =
          `translate(${posRef.current.x}px,${posRef.current.y}px)`;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, isTouch]);

  // ── Mouse move ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || isTouch) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - lastXRef.current;
      if (Math.abs(dx) > 3) {
        setFacingRight(dx > 0);
        lastXRef.current = e.clientX;
      }
      targetRef.current.x = e.clientX - 35;
      targetRef.current.y = e.clientY - 90;
      setBubbleRight(e.clientX < window.innerWidth * 0.65);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [visible, isTouch]);

  // ── Click interceptor ────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || isTouch) return;
    const handler = (e: MouseEvent) => {
      const tgt = e.target as Element;
      if (tgt.closest('[data-kitten-ui]')) return;

      const btn = tgt.closest<HTMLElement>('button:not([disabled])');
      if (!btn) return;

      if (confirmedRef.current.has(btn)) {
        confirmedRef.current.delete(btn);
        return;
      }

      const { type, q, yay } = classify(btn);
      if (type === 'skip') return;

      if (type === 'react') {
        clearTimeout(autoRef.current);
        setBubble({ msg: q, yay: '', type: 'react', btn: null, phase: 'ask' });
        autoRef.current = setTimeout(() => setBubble(null), 2200);
        return; // don't block the action
      }

      // Blocking confirmation
      if (blockingRef.current) return;
      e.stopImmediatePropagation();
      blockingRef.current = true;
      clearTimeout(autoRef.current);
      setBubble({ msg: q, yay, type: 'confirm', btn, phase: 'ask' });
      setKState('idle');
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [visible, isTouch]);

  // ── Confirm Yes ──────────────────────────────────────────────────────────
  const handleYes = useCallback(() => {
    if (!bubble?.btn) return;
    const btn = bubble.btn;
    const yayMsg = bubble.yay || "Yay! Let's go! 🐾";
    setBubble(prev => prev ? { ...prev, msg: yayMsg, phase: 'yay', type: 'react' } : null);
    setKState('happy');
    setTimeout(() => {
      blockingRef.current = false;
      confirmedRef.current.add(btn);
      btn.click();
      clearTimeout(autoRef.current);
      autoRef.current = setTimeout(() => { setBubble(null); setKState('idle'); }, 1500);
    }, 550);
  }, [bubble]);

  // ── Confirm No ───────────────────────────────────────────────────────────
  const handleNo = useCallback(() => {
    setBubble({ msg: 'Aww, okay… maybe next time! 😿', yay: '', type: 'react', btn: null, phase: 'aw' });
    setKState('sad');
    blockingRef.current = false;
    clearTimeout(autoRef.current);
    autoRef.current = setTimeout(() => { setBubble(null); setKState('idle'); }, 2000);
  }, []);

  if (isTouch) return null;

  return (
    <>
      <style>{KITTEN_STYLE}</style>

      {/* ── Toggle paw button ────────────────────────────────────────────── */}
      <button
        data-kitten-ui
        onClick={() => setVisible(v => !v)}
        title={visible ? 'Hide kitty' : 'Show kitty 🐾'}
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 10001,
          background: visible
            ? 'linear-gradient(135deg,rgba(196,125,97,0.18),rgba(138,79,57,0.14))'
            : 'rgba(245,242,233,0.85)',
          border: '1px solid rgba(196,125,97,0.3)',
          borderRadius: 12,
          padding: '6px 9px',
          fontSize: 17,
          cursor: 'pointer',
          lineHeight: 1,
          backdropFilter: 'blur(8px)',
          boxShadow: '0 2px 10px rgba(83,55,43,0.12)',
          transition: 'all 0.2s',
          userSelect: 'none',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.12)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        🐾
      </button>

      {/* ── Kitten + bubble container ─────────────────────────────────────── */}
      {visible && (
        <div
          ref={wrapRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: 70,
            height: 90,
            zIndex: 9999,
            pointerEvents: 'none',
            willChange: 'transform',
            overflow: 'visible',
          }}
        >
          {/* Speech bubble */}
          {bubble && (
            <div
              data-kitten-ui
              key={bubble.msg}
              className="kBubble"
              style={{
                position: 'absolute',
                bottom: 94,
                ...(bubbleRight ? { left: -5 } : { right: -5 }),
                width: 208,
                pointerEvents:
                  bubble.type === 'confirm' && bubble.phase === 'ask' ? 'auto' : 'none',
              }}
            >
              <div style={{
                background: 'white',
                borderRadius: 16,
                padding: '10px 13px 11px',
                boxShadow: '0 6px 24px rgba(83,55,43,0.16), 0 1px 4px rgba(83,55,43,0.08)',
                border: '1px solid rgba(237,224,208,0.9)',
                position: 'relative',
              }}>
                <p style={{
                  margin: 0,
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: '#53372b',
                  fontWeight: 500,
                }}>
                  {bubble.msg}
                </p>

                {bubble.type === 'confirm' && bubble.phase === 'ask' && (
                  <div style={{ marginTop: 9, display: 'flex', gap: 6 }}>
                    <button
                      data-kitten-ui
                      onClick={handleYes}
                      style={{
                        flex: 1,
                        padding: '5px 8px',
                        borderRadius: 8,
                        background: 'linear-gradient(135deg,#c47d61 0%,#8a4f39 100%)',
                        color: 'white',
                        border: 'none',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(169,103,77,0.4)',
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.88')}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
                    >
                      Yes! 🐾
                    </button>
                    <button
                      data-kitten-ui
                      onClick={handleNo}
                      style={{
                        flex: 1,
                        padding: '5px 8px',
                        borderRadius: 8,
                        background: 'white',
                        color: '#a89e8e',
                        border: '1px solid #ede0d0',
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#f5f2e9')}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'white')}
                    >
                      Nope
                    </button>
                  </div>
                )}

                {/* Bubble tail */}
                <div style={{
                  position: 'absolute',
                  bottom: -7,
                  ...(bubbleRight ? { left: 28 } : { right: 28 }),
                  width: 13,
                  height: 13,
                  background: 'white',
                  borderRight: '1px solid rgba(237,224,208,0.9)',
                  borderBottom: '1px solid rgba(237,224,208,0.9)',
                  transform: 'rotate(45deg)',
                  boxShadow: '2px 2px 4px rgba(83,55,43,0.06)',
                }} />
              </div>
            </div>
          )}

          {/* Kitten wrapper — bounce / sad / float animations */}
          <div
            className={`kWrap-${kState}`}
            style={{ width: 70, height: 90, position: 'absolute', bottom: 0, left: 0 }}
          >
            {/* Horizontal flip based on movement direction */}
            <div style={{
              transform: facingRight ? 'none' : 'scaleX(-1)',
              width: 70,
              height: 90,
              pointerEvents: 'none',
            }}>
              {/* ── SVG Kitten ─────────────────────────────────────────── */}
              <svg
                viewBox="0 0 70 90"
                width={70}
                height={90}
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  overflow: 'visible',
                  filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.18))',
                }}
              >
                {/* ── Tail (behind body) ─── */}
                <path
                  className="kTail"
                  d="M49 73 Q74 62 70 47 Q66 33 53 41"
                  stroke="#e8934a"
                  strokeWidth={8}
                  fill="none"
                  strokeLinecap="round"
                />

                {/* ── Body ─── */}
                <ellipse cx="35" cy="71" rx="22" ry="18" fill="#f4a261" />
                {/* Chest / belly */}
                <ellipse cx="35" cy="69" rx="13" ry="10" fill="#fde8d0" opacity="0.7" />

                {/* ── Head ─── */}
                <circle cx="35" cy="35" r="24" fill="#f4a261" />
                {/* Face center */}
                <ellipse cx="35" cy="39" rx="16" ry="13" fill="#fde8d0" opacity="0.55" />

                {/* ── Ears ─── */}
                {/* Left ear outer */}
                <polygon className="kEarL" points="13,19 7,3 25,11" fill="#f4a261" />
                {/* Right ear outer */}
                <polygon className="kEarR" points="57,19 63,3 45,11" fill="#f4a261" />
                {/* Left ear inner */}
                <polygon points="16,16 11,5 23,11" fill="#e76f51" opacity="0.9" />
                {/* Right ear inner */}
                <polygon points="54,16 59,5 47,11" fill="#e76f51" opacity="0.9" />

                {/* ── Eyes ─── */}
                {/* Left eye group */}
                <g className="kEyeL">
                  <ellipse cx="26" cy="33" rx="8.5" ry="9.5" fill="white" />
                  <circle cx="27" cy="34" r="6" fill="#12080a" />
                  <circle cx="27" cy="34" r="3.8" fill="#6ea832" />
                  <ellipse cx="27" cy="34" rx="1.9" ry="4" fill="#12080a" />
                  <circle cx="29.5" cy="30.5" r="2" fill="white" />
                  <circle cx="26.5" cy="35.5" r="1" fill="rgba(255,255,255,0.4)" />
                </g>
                {/* Right eye group */}
                <g className="kEyeR">
                  <ellipse cx="44" cy="33" rx="8.5" ry="9.5" fill="white" />
                  <circle cx="45" cy="34" r="6" fill="#12080a" />
                  <circle cx="45" cy="34" r="3.8" fill="#6ea832" />
                  <ellipse cx="45" cy="34" rx="1.9" ry="4" fill="#12080a" />
                  <circle cx="47.5" cy="30.5" r="2" fill="white" />
                  <circle cx="44.5" cy="35.5" r="1" fill="rgba(255,255,255,0.4)" />
                </g>

                {/* ── Nose ─── */}
                <path d="M32.5 43 L35 46 L37.5 43 Z" fill="#e76f51" />

                {/* ── Mouth (smile + frown) ─── */}
                <path
                  className="kMouthSmile"
                  d="M31 46 Q35 51 39 46"
                  stroke="#c4523a"
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  className="kMouthFrown"
                  d="M31 50 Q35 46.5 39 50"
                  stroke="#c4523a"
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinecap="round"
                />

                {/* ── Whiskers ─── */}
                <line x1="3" y1="42" x2="27" y2="44" stroke="#c4a48a" strokeWidth="1.1" strokeLinecap="round" />
                <line x1="3" y1="47" x2="27" y2="47" stroke="#c4a48a" strokeWidth="1.1" strokeLinecap="round" />
                <line x1="43" y1="44" x2="67" y2="42" stroke="#c4a48a" strokeWidth="1.1" strokeLinecap="round" />
                <line x1="43" y1="47" x2="67" y2="47" stroke="#c4a48a" strokeWidth="1.1" strokeLinecap="round" />

                {/* ── Paws ─── */}
                <ellipse cx="21" cy="85" rx="10.5" ry="6" fill="#f0935a" />
                <ellipse cx="49" cy="85" rx="10.5" ry="6" fill="#f0935a" />
                {/* Left paw toes */}
                <circle cx="16.5" cy="83" r="2" fill="#e07a45" />
                <circle cx="21"   cy="82" r="2" fill="#e07a45" />
                <circle cx="25.5" cy="83" r="2" fill="#e07a45" />
                {/* Right paw toes */}
                <circle cx="44.5" cy="83" r="2" fill="#e07a45" />
                <circle cx="49"   cy="82" r="2" fill="#e07a45" />
                <circle cx="53.5" cy="83" r="2" fill="#e07a45" />

                {/* ── Belly stripe (subtle) ─── */}
                <ellipse cx="35" cy="73" rx="8" ry="5" fill="#f0935a" opacity="0.3" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

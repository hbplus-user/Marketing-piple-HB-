import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

interface WelcomePageProps {
  onEnter: () => void;
}

/* ─── Brand palette ───────────────────────────────── */
const B = '#4285F4';
const R = '#EA4335';
const Y = '#FBBC04';
const G = '#34A853';

/* ─── Clay shadow helper ──────────────────────────── */
const clayBox = (glow = 'rgba(0,0,0,0.14)') =>
  `0 18px 48px ${glow}, 0 4px 14px rgba(0,0,0,0.10), inset 0 2px 5px rgba(255,255,255,0.52), inset 0 -2px 5px rgba(0,0,0,0.08)`;

const clayBg = (base: string, light: string, dark: string) =>
  `radial-gradient(ellipse at 33% 28%, ${light} 0%, ${base} 48%, ${dark} 100%)`;

/* ══════════════════════════════════════════════════
   HERO G
══════════════════════════════════════════════════ */
function ClayG() {
  const size   = 360;
  const thick  = Math.round(size * 0.233); // ring thickness ≈ 84 px
  const hole   = size - thick * 2;          // inner hole ≈ 192 px

  /* crossbar sits from inner-hole-right-edge to outer-edge */
  const barW = thick + 10;
  const barH = Math.round(thick * 0.46);

  return (
    <motion.div
      animate={{ rotate: [0, 3, 0, -3, 0] }}
      transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
    >
      {/* ── Outer ring (conic + white sheen overlay) ── */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: [
            'radial-gradient(ellipse at 32% 27%, rgba(255,255,255,0.55) 0%, transparent 52%)',
            `conic-gradient(from 315deg, ${B} 0deg 90deg, ${R} 90deg 180deg, ${Y} 180deg 270deg, ${G} 270deg 360deg)`,
          ].join(', '),
          boxShadow: clayBox('rgba(60,60,130,0.22)'),
          position: 'relative',
        }}
      >
        {/* ── Inner donut hole ── */}
        <div
          style={{
            position: 'absolute',
            width: hole,
            height: hole,
            borderRadius: '50%',
            background: 'linear-gradient(145deg, #fef9f2 0%, #f5ece0 100%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            boxShadow: 'inset 0 6px 20px rgba(0,0,0,0.09), inset 0 -2px 8px rgba(255,255,255,0.7)',
          }}
        />
      </div>

      {/* ── Green pill crossbar (G's bar) ── */}
      <div
        style={{
          position: 'absolute',
          right: -6,
          top: '50%',
          transform: 'translateY(-50%)',
          width: barW,
          height: barH,
          borderRadius: 50,
          background: clayBg(G, '#5fd87a', '#1b7436'),
          boxShadow: `0 8px 22px rgba(52,168,83,0.55), inset 0 2px 5px rgba(255,255,255,0.48), inset 0 -2px 4px rgba(0,0,0,0.12)`,
          zIndex: 4,
        }}
      >
        {/* white sheen on top half of bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 8,
            right: 8,
            height: '45%',
            borderRadius: '50px 50px 0 0',
            background: 'rgba(255,255,255,0.28)',
          }}
        />
      </div>

      {/* ── Wet-clay highlight ellipse ── */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '13%',
          width: '34%',
          height: '26%',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.42)',
          filter: 'blur(15px)',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      />
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════
   CONFETTI
══════════════════════════════════════════════════ */
type CShape = {
  t: 'circle' | 'square' | 'pill' | 'tri';
  c: string; l: string;          // base color, light color
  s: number;                     // size px
  x: string; y: string;
  r?: number;                    // rotation deg
  d: number;                     // delay s
};

const CONF: CShape[] = [
  { t:'circle', c:R,  l:'#f87171', s:22, x:'4%',  y:'12%', d:0    },
  { t:'square', c:B,  l:'#7eb5f7', s:18, x:'11%', y:'7%',  r:25,  d:0.3  },
  { t:'pill',   c:G,  l:'#5fd87a', s:32, x:'18%', y:'76%', r:-15, d:0.5  },
  { t:'tri',    c:Y,  l:'#fcd34d', s:26, x:'7%',  y:'61%', r:10,  d:0.2  },
  { t:'circle', c:Y,  l:'#fcd34d', s:16, x:'39%', y:'9%',  d:0.7  },
  { t:'square', c:R,  l:'#f87171', s:34, x:'43%', y:'83%', r:-20, d:0.4  },
  { t:'circle', c:B,  l:'#7eb5f7', s:20, x:'4%',  y:'43%', d:0.6  },
  { t:'pill',   c:R,  l:'#f87171', s:28, x:'26%', y:'13%', r:32,  d:0.1  },
  { t:'tri',    c:B,  l:'#7eb5f7', s:22, x:'50%', y:'4%',  r:-5,  d:0.8  },
  { t:'circle', c:G,  l:'#5fd87a', s:26, x:'55%', y:'7%',  d:0.3  },
  { t:'square', c:G,  l:'#5fd87a', s:18, x:'30%', y:'87%', r:15,  d:0.5  },
  { t:'circle', c:R,  l:'#f87171', s:30, x:'49%', y:'91%', d:0.9  },
  { t:'pill',   c:B,  l:'#7eb5f7', s:24, x:'14%', y:'93%', r:-35, d:0.2  },
  { t:'circle', c:Y,  l:'#fcd34d', s:20, x:'93%', y:'13%', d:0.4  },
  { t:'square', c:G,  l:'#5fd87a', s:16, x:'96%', y:'57%', r:22,  d:0.7  },
  { t:'tri',    c:R,  l:'#f87171', s:22, x:'91%', y:'78%', r:8,   d:0.1  },
  { t:'circle', c:Y,  l:'#fcd34d', s:42, x:'3%',  y:'30%', d:0.6  },
  { t:'square', c:B,  l:'#7eb5f7', s:28, x:'46%', y:'53%', r:-12, d:0.3  },
  { t:'pill',   c:Y,  l:'#fcd34d', s:22, x:'34%', y:'23%', r:40,  d:0.8  },
  { t:'tri',    c:G,  l:'#5fd87a', s:20, x:'22%', y:'47%', r:-20, d:0.5  },
];

function Confetti({ p }: { p: CShape }) {
  const bg = clayBg(p.c, p.l, p.c + 'cc');
  const shadow = `0 6px 16px ${p.c}55, inset 0 2px 4px rgba(255,255,255,0.44), inset 0 -1px 3px rgba(0,0,0,0.10)`;

  let el: React.ReactNode;
  if (p.t === 'circle') {
    el = <div style={{ width: p.s, height: p.s, borderRadius: '50%', background: bg, boxShadow: shadow }} />;
  } else if (p.t === 'square') {
    el = <div style={{ width: p.s, height: p.s, borderRadius: Math.round(p.s * 0.22), transform: `rotate(${p.r ?? 0}deg)`, background: bg, boxShadow: shadow }} />;
  } else if (p.t === 'pill') {
    el = <div style={{ width: p.s * 1.85, height: p.s * 0.68, borderRadius: p.s, transform: `rotate(${p.r ?? 0}deg)`, background: bg, boxShadow: shadow }} />;
  } else {
    el = (
      <div style={{
        width: p.s, height: p.s,
        background: `radial-gradient(ellipse at 38% 32%, ${p.l} 0%, ${p.c} 55%, ${p.c}aa 100%)`,
        clipPath: 'polygon(50% 0%,0% 100%,100% 100%)',
        filter: `drop-shadow(0 4px 8px ${p.c}55)`,
        transform: `rotate(${p.r ?? 0}deg)`,
      }} />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1, y: [0, -11, 0, -7, 0] }}
      transition={{
        opacity: { delay: p.d, duration: 0.5 },
        scale:   { delay: p.d, duration: 0.6, type: 'spring', stiffness: 200 },
        y:       { delay: p.d + 0.6, duration: 3.4 + p.d * 0.7, repeat: Infinity, ease: 'easeInOut' },
      }}
      style={{ position: 'absolute', top: p.y, left: p.x, pointerEvents: 'none', zIndex: 0 }}
    >
      {el}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════ */
export default function WelcomePage({ onEnter }: WelcomePageProps) {
  const { user } = useAuth();

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';
  const initials  = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0] ?? 'U').toUpperCase();

  const now = new Date();
  const signedInTime =
    now.toLocaleDateString('en-US', { weekday: 'long' }) + ' ' +
    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    const t = setTimeout(onEnter, 8000);
    return () => clearTimeout(t);
  }, [onEnter]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: [
          'radial-gradient(ellipse at 0% 0%,   rgba(254,248,220,0.90) 0%, transparent 55%)',
          'radial-gradient(ellipse at 55% 50%,  rgba(250,196,180,0.70) 0%, transparent 60%)',
          'radial-gradient(ellipse at 100% 100%,rgba(210,214,248,0.90) 0%, transparent 55%)',
          'linear-gradient(135deg, #fef4e4 0%, #fde0d0 45%, #dde0f8 100%)',
        ].join(', '),
        backgroundAttachment: 'fixed',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5%',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* subtle dot texture */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(80,60,40,0.05) 1.5px, transparent 1.5px)',
        backgroundSize: '22px 22px',
      }} />

      {/* ── Confetti ── */}
      {CONF.map((p, i) => <Confetti key={i} p={p} />)}

      {/* ── Top-left account badge ── */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        style={{
          position: 'absolute', top: 24, left: 24,
          display: 'flex', alignItems: 'center', gap: 10,
          background: clayBg('#ffffff', '#ffffff', '#f5f0e8'),
          borderRadius: 20,
          padding: '10px 18px 10px 12px',
          boxShadow: clayBox('rgba(0,0,0,0.09)'),
          zIndex: 20,
        }}
      >
        {/* mini G */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%', position: 'relative', flexShrink: 0,
          background: `conic-gradient(from 315deg, ${B} 0deg 90deg, ${R} 90deg 180deg, ${Y} 180deg 270deg, ${G} 270deg 360deg)`,
          boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
        }}>
          <div style={{
            position: 'absolute', width: 13, height: 13, borderRadius: '50%',
            background: '#fef8f2', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#5e483a', letterSpacing: '0.08em' }}>
          ACCOUNT
        </span>
      </motion.div>

      {/* ── Left: Hero G ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.65, x: -40 }}
        animate={{ opacity: 1, scale: 1,   x: 0   }}
        transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
        style={{ flexShrink: 0, zIndex: 5 }}
      >
        <ClayG />
      </motion.div>

      {/* ── Right: Welcome card ── */}
      <motion.div
        initial={{ opacity: 0, x: 56, y: 18 }}
        animate={{ opacity: 1, x: 0,  y: 0  }}
        transition={{ delay: 0.28, duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: 480, flexShrink: 0, zIndex: 10,
          background: 'radial-gradient(ellipse at 28% 18%, #ffffff 0%, #fffdf7 100%)',
          borderRadius: 36,
          padding: '36px 36px 34px',
          boxShadow: [
            '0 36px 90px rgba(100,55,35,0.17)',
            '0 8px 28px rgba(0,0,0,0.09)',
            'inset 0 2px 6px rgba(255,255,255,0.85)',
            'inset 0 -2px 6px rgba(0,0,0,0.04)',
          ].join(', '),
        }}
      >
        {/* ── Avatar + signed-in row ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          {/* Rounded-square avatar */}
          <div style={{
            width: 54, height: 54, borderRadius: 18,
            background: clayBg(Y, '#fcd34d', '#d49600'),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 19, fontWeight: 900, color: '#fff',
            boxShadow: `0 8px 22px rgba(251,188,4,0.52), inset 0 2px 5px rgba(255,255,255,0.48), inset 0 -2px 4px rgba(0,0,0,0.12)`,
            textShadow: '0 1px 3px rgba(0,0,0,0.18)',
            flexShrink: 0,
          }}>
            {initials}
          </div>

          {/* Signed-in label */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginBottom: 3 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: G, display: 'inline-block',
                boxShadow: `0 0 7px ${G}`,
              }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: G, letterSpacing: '0.09em' }}>SIGNED IN</span>
            </div>
            <div style={{ fontSize: 12, color: '#9e8a7e' }}>{signedInTime}</div>
          </div>
        </div>

        {/* ── Headline ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 56, fontWeight: 500,
            color: '#0f0e1a', lineHeight: 1.0,
          }}>
            Hey,
          </div>
          <div style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 56, fontWeight: 500, fontStyle: 'italic',
            color: R, lineHeight: 1.0, letterSpacing: '-0.025em',
          }}>
            {firstName}!
          </div>
        </div>

        {/* ── Subhead ── */}
        <p style={{ fontSize: 15, lineHeight: '22px', color: '#5e483a', margin: '0 0 26px' }}>
          Everything's right where you left it. Mail, photos, and notes — all synced up and ready to go.
        </p>

        {/* ── Service chips ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
          {[
            { c: R, l: '#f87171', label: 'Mail',     count: '12', glow: 'rgba(234,67,53,0.44)'   },
            { c: Y, l: '#fcd34d', label: 'Drive',    count: '3',  glow: 'rgba(251,188,4,0.44)'   },
            { c: B, l: '#7eb5f7', label: 'Calendar', count: '2',  glow: 'rgba(66,133,244,0.44)'  },
          ].map(s => (
            <div
              key={s.label}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: clayBg(s.c, s.l, s.c + 'cc'),
                borderRadius: 50, padding: '9px 16px 9px 12px',
                boxShadow: `0 7px 20px ${s.glow}, inset 0 2px 4px rgba(255,255,255,0.46), inset 0 -2px 4px rgba(0,0,0,0.10)`,
                color: '#fff', fontSize: 13, fontWeight: 700,
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'rgba(255,255,255,0.88)', display: 'inline-block',
                boxShadow: '0 0 5px rgba(255,255,255,0.7)',
              }} />
              {s.label}
              <span style={{
                background: 'rgba(255,255,255,0.24)', borderRadius: 20,
                padding: '1px 8px', fontSize: 11, fontWeight: 800,
              }}>
                {s.count}
              </span>
            </div>
          ))}
        </div>

        {/* ── CTA button ── */}
        <motion.button
          whileHover={{ scale: 1.025 }}
          whileTap={{ scale: 0.97 }}
          onClick={onEnter}
          style={{
            width: '100%', height: 56, borderRadius: 18, border: 'none',
            background: clayBg(B, '#7eb5f7', '#2a6cd4'),
            color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            boxShadow: `0 14px 36px rgba(66,133,244,0.44), inset 0 2px 5px rgba(255,255,255,0.44), inset 0 -2px 5px rgba(0,0,0,0.12)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            letterSpacing: '0.01em',
          }}
        >
          Take me in
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3.5 9h11M10 4.5 14.5 9 10 13.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      </motion.div>
    </div>
  );
}

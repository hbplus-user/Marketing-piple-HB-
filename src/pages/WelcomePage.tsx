import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { getUrgency } from '../utils/deadlineUtils';
import { differenceInDays, startOfDay } from 'date-fns';

interface WelcomePageProps {
  onEnter: () => void;
}

/* ─── Official brand palette only ───────────────── */
const NAVY    = '#344161';   // was Google Blue
const RUST    = '#9f4022';   // was Google Red
const GOLD    = '#c99d5d';   // was Google Yellow
const SAGE    = '#6f8e7c';   // was Google Green
const TERRA   = '#a9674d';   // terracotta accent
const OLIVE   = '#747440';   // olive
const BROWN   = '#53372b';   // dark brown
const CREAM   = '#f5f2e9';   // warm cream
const WARM    = '#ede0d0';   // warm border

/* ─── Clay shadow helper ──────────────────────────── */
const clayBox = (glow = 'rgba(0,0,0,0.14)') =>
  `0 18px 48px ${glow}, 0 4px 14px rgba(0,0,0,0.10), inset 0 2px 5px rgba(255,255,255,0.52), inset 0 -2px 5px rgba(0,0,0,0.08)`;

const clayBg = (base: string, light: string, dark: string) =>
  `radial-gradient(ellipse at 33% 28%, ${light} 0%, ${base} 48%, ${dark} 100%)`;

/* ══════════════════════════════════════════════════
   HERO ring — brand 4-colour conic
══════════════════════════════════════════════════ */
function ClayRing() {
  const size   = 360;
  const thick  = Math.round(size * 0.233);
  const hole   = size - thick * 2;
  const barW   = thick + 10;
  const barH   = Math.round(thick * 0.46);

  return (
    <motion.div
      animate={{ rotate: [0, 3, 0, -3, 0] }}
      transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
    >
      {/* Outer ring — brand conic */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: [
            'radial-gradient(ellipse at 32% 27%, rgba(255,255,255,0.55) 0%, transparent 52%)',
            `conic-gradient(from 315deg, ${NAVY} 0deg 90deg, ${RUST} 90deg 180deg, ${GOLD} 180deg 270deg, ${SAGE} 270deg 360deg)`,
          ].join(', '),
          boxShadow: clayBox('rgba(52,65,97,0.24)'),
          position: 'relative',
        }}
      >
        {/* Inner donut hole — warm cream */}
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

      {/* Crossbar pill — sage */}
      <div
        style={{
          position: 'absolute',
          right: -6,
          top: '50%',
          transform: 'translateY(-50%)',
          width: barW,
          height: barH,
          borderRadius: 50,
          background: clayBg(SAGE, '#8db09e', '#3f6b59'),
          boxShadow: `0 8px 22px ${SAGE}88, inset 0 2px 5px rgba(255,255,255,0.48), inset 0 -2px 4px rgba(0,0,0,0.12)`,
          zIndex: 4,
        }}
      >
        <div
          style={{
            position: 'absolute', top: 0, left: 8, right: 8, height: '45%',
            borderRadius: '50px 50px 0 0',
            background: 'rgba(255,255,255,0.28)',
          }}
        />
      </div>

      {/* Wet-clay highlight ellipse */}
      <div
        style={{
          position: 'absolute', top: '10%', left: '13%',
          width: '34%', height: '26%', borderRadius: '50%',
          background: 'rgba(255,255,255,0.42)',
          filter: 'blur(15px)',
          pointerEvents: 'none', zIndex: 5,
        }}
      />
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════
   CONFETTI — brand colors only
══════════════════════════════════════════════════ */
type CShape = {
  t: 'circle' | 'square' | 'pill' | 'tri';
  c: string; l: string;
  s: number;
  x: string; y: string;
  r?: number;
  d: number;
};

const CONF: CShape[] = [
  { t:'circle', c:RUST,  l:'#c4613e', s:22, x:'4%',  y:'12%', d:0    },
  { t:'square', c:NAVY,  l:'#4d5e87', s:18, x:'11%', y:'7%',  r:25,  d:0.3  },
  { t:'pill',   c:SAGE,  l:'#8db09e', s:32, x:'18%', y:'76%', r:-15, d:0.5  },
  { t:'tri',    c:GOLD,  l:'#d9b478', s:26, x:'7%',  y:'61%', r:10,  d:0.2  },
  { t:'circle', c:GOLD,  l:'#d9b478', s:16, x:'39%', y:'9%',  d:0.7  },
  { t:'square', c:TERRA, l:'#c47d61', s:34, x:'43%', y:'83%', r:-20, d:0.4  },
  { t:'circle', c:NAVY,  l:'#4d5e87', s:20, x:'4%',  y:'43%', d:0.6  },
  { t:'pill',   c:RUST,  l:'#c4613e', s:28, x:'26%', y:'13%', r:32,  d:0.1  },
  { t:'tri',    c:OLIVE, l:'#8a8d50', s:22, x:'50%', y:'4%',  r:-5,  d:0.8  },
  { t:'circle', c:SAGE,  l:'#8db09e', s:26, x:'55%', y:'7%',  d:0.3  },
  { t:'square', c:SAGE,  l:'#8db09e', s:18, x:'30%', y:'87%', r:15,  d:0.5  },
  { t:'circle', c:TERRA, l:'#c47d61', s:30, x:'49%', y:'91%', d:0.9  },
  { t:'pill',   c:NAVY,  l:'#4d5e87', s:24, x:'14%', y:'93%', r:-35, d:0.2  },
  { t:'circle', c:GOLD,  l:'#d9b478', s:20, x:'93%', y:'13%', d:0.4  },
  { t:'square', c:OLIVE, l:'#8a8d50', s:16, x:'96%', y:'57%', r:22,  d:0.7  },
  { t:'tri',    c:RUST,  l:'#c4613e', s:22, x:'91%', y:'78%', r:8,   d:0.1  },
  { t:'circle', c:GOLD,  l:'#d9b478', s:42, x:'3%',  y:'30%', d:0.6  },
  { t:'square', c:NAVY,  l:'#4d5e87', s:28, x:'46%', y:'53%', r:-12, d:0.3  },
  { t:'pill',   c:GOLD,  l:'#d9b478', s:22, x:'34%', y:'23%', r:40,  d:0.8  },
  { t:'tri',    c:SAGE,  l:'#8db09e', s:20, x:'22%', y:'47%', r:-20, d:0.5  },
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
  const { requests, currentUser } = useApp();

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
          `radial-gradient(ellipse at 0% 0%,   rgba(245,236,231,0.95) 0%, transparent 55%)`,
          `radial-gradient(ellipse at 55% 50%,  rgba(237,224,208,0.75) 0%, transparent 60%)`,
          `radial-gradient(ellipse at 100% 100%,rgba(116,116,64,0.12) 0%, transparent 55%)`,
          `linear-gradient(135deg, ${CREAM} 0%, ${WARM} 45%, #e8e4d8 100%)`,
        ].join(', '),
        backgroundAttachment: 'fixed',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5%',
        fontFamily: "'Gilroy', 'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Subtle warm dot texture */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(rgba(83,55,43,0.06) 1.5px, transparent 1.5px)`,
        backgroundSize: '22px 22px',
      }} />

      {/* Confetti — brand colors */}
      {CONF.map((p, i) => <Confetti key={i} p={p} />)}

      {/* Top-left account badge */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        style={{
          position: 'absolute', top: 24, left: 24,
          display: 'flex', alignItems: 'center', gap: 10,
          background: clayBg('#ffffff', '#ffffff', '#f5ece7'),
          borderRadius: 20,
          padding: '10px 18px 10px 12px',
          boxShadow: clayBox('rgba(83,55,43,0.09)'),
          zIndex: 20,
        }}
      >
        {/* Mini brand ring */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%', position: 'relative', flexShrink: 0,
          background: `conic-gradient(from 315deg, ${NAVY} 0deg 90deg, ${RUST} 90deg 180deg, ${GOLD} 180deg 270deg, ${SAGE} 270deg 360deg)`,
          boxShadow: '0 3px 8px rgba(83,55,43,0.2)',
        }}>
          <div style={{
            position: 'absolute', width: 13, height: 13, borderRadius: '50%',
            background: CREAM, top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: BROWN, letterSpacing: '0.08em' }}>
          ACCOUNT
        </span>
      </motion.div>

      {/* Left: Hero ring */}
      <motion.div
        initial={{ opacity: 0, scale: 0.65, x: -40 }}
        animate={{ opacity: 1, scale: 1,   x: 0   }}
        transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
        style={{ flexShrink: 0, zIndex: 5 }}
      >
        <ClayRing />
      </motion.div>

      {/* Right: Welcome card */}
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
            '0 36px 90px rgba(83,55,43,0.16)',
            '0 8px 28px rgba(0,0,0,0.08)',
            'inset 0 2px 6px rgba(255,255,255,0.85)',
            'inset 0 -2px 6px rgba(0,0,0,0.04)',
          ].join(', '),
          border: `1px solid ${WARM}`,
        }}
      >
        {/* Avatar + signed-in row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          {/* Rounded-square avatar — terracotta */}
          <div style={{
            width: 54, height: 54, borderRadius: 18,
            background: clayBg(TERRA, '#c47d61', '#8a4f39'),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 19, fontWeight: 900, color: '#fff',
            boxShadow: `0 8px 22px ${TERRA}80, inset 0 2px 5px rgba(255,255,255,0.48), inset 0 -2px 4px rgba(0,0,0,0.12)`,
            textShadow: '0 1px 3px rgba(0,0,0,0.18)',
            flexShrink: 0,
          }}>
            {initials}
          </div>

          {/* Signed-in label — sage */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginBottom: 3 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: SAGE, display: 'inline-block',
                boxShadow: `0 0 7px ${SAGE}`,
              }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: SAGE, letterSpacing: '0.09em' }}>SIGNED IN</span>
            </div>
            <div style={{ fontSize: 12, color: '#9e8a7e' }}>{signedInTime}</div>
          </div>
        </div>

        {/* Headline — The Seasons / Cormorant Garamond */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontFamily: "'The Seasons', 'Cormorant Garamond', Georgia, serif",
            fontSize: 56, fontWeight: 500,
            color: BROWN, lineHeight: 1.0,
          }}>
            Hey,
          </div>
          <div style={{
            fontFamily: "'The Seasons', 'Cormorant Garamond', Georgia, serif",
            fontSize: 56, fontWeight: 500, fontStyle: 'italic',
            color: TERRA, lineHeight: 1.0, letterSpacing: '-0.025em',
          }}>
            {firstName}!
          </div>
        </div>

        {/* Subhead */}
        <p style={{ fontSize: 15, lineHeight: '22px', color: BROWN, margin: '0 0 26px', opacity: 0.8 }}>
          Everything's right where you left it. Your pipeline, tasks, and deadlines — all ready to go.
        </p>

        {/* Service chips — brand colors */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
          {(() => {
            const isManagerOrFounder = currentUser.role === 'manager' || currentUser.role === 'founder';
            const todayStart = startOfDay(new Date());

            const overdueCount = requests.filter(r => {
              if (r.status === 'Approved' || r.status === 'Posted') return false;
              if (!isManagerOrFounder && !r.assigneeIds.includes(currentUser.id)) return false;
              return getUrgency(r) === 'overdue';
            }).length;

            const nearDueCount = requests.filter(r => {
              if (r.status === 'Approved' || r.status === 'Posted') return false;
              if (!isManagerOrFounder && !r.assigneeIds.includes(currentUser.id)) return false;
              const urgency = getUrgency(r);
              return urgency === 'urgent' || urgency === 'due-soon';
            }).length;

            const nearPostCount = requests.filter(r => {
              if (r.status === 'Approved' || r.status === 'Posted') return false;
              if (!isManagerOrFounder && !r.assigneeIds.includes(currentUser.id)) return false;
              const diff = differenceInDays(startOfDay(r.postDate), todayStart);
              return diff >= 0 && diff <= 2;
            }).length;

            let chips = [];
            if (isManagerOrFounder) {
              const pendingManagerApproval = requests.filter(r => r.status === 'Brief Approval' && !r.managerApproved);
              const pendingFounderApproval = currentUser.role === 'founder'
                ? requests.filter(r => r.status === 'Brief Approval' && r.managerApproved === true && r.founderApprovalRequired === true && r.founderApproved === false)
                : [];
              const pendingCoApproval = requests.filter(r => r.status === 'Design Review' && (r.reviewerIds ?? []).includes(currentUser.id) && !(r.approvedBy ?? []).includes(currentUser.id));
              const needToApproveCount = pendingManagerApproval.length + pendingFounderApproval.length + pendingCoApproval.length;

              chips = [
                { c: RUST,  l: '#c4613e', label: 'Need to Approve', count: needToApproveCount, glow: `${RUST}70` },
                { c: GOLD,  l: '#d9b478', label: 'Overdue', count: overdueCount, glow: `${GOLD}70` },
                { c: NAVY,  l: '#4d5e87', label: 'Near to Due', count: nearDueCount, glow: `${NAVY}70` },
                { c: SAGE,  l: '#8db09e', label: 'Near to Post', count: nearPostCount, glow: `${SAGE}70` },
              ];
            } else {
              const inReviewCount = requests.filter(r => r.assigneeIds.includes(currentUser.id) && r.status === 'Design Review').length;
              const reRequestCount = requests.filter(r => r.assigneeIds.includes(currentUser.id) && r.status === 'Design Progress' && r.rounds.some(rd => rd.status === 'changes-requested')).length;

              chips = [
                { c: RUST,  l: '#c4613e', label: 'Overdue', count: overdueCount, glow: `${RUST}70` },
                { c: GOLD,  l: '#d9b478', label: 'Near Due', count: nearDueCount, glow: `${GOLD}70` },
                { c: NAVY,  l: '#4d5e87', label: 'Near to Post', count: nearPostCount, glow: `${NAVY}70` },
                { c: SAGE,  l: '#8db09e', label: 'In Review', count: inReviewCount, glow: `${SAGE}70` },
                { c: TERRA, l: '#c47d61', label: 'Re-request', count: reRequestCount, glow: `${TERRA}70` },
              ];
            }

            return chips.map(s => (
              <div
                key={s.label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: clayBg(s.c, s.l, s.c + 'cc'),
                  borderRadius: 50,
                  padding: '9px 16px 9px 12px',
                  boxShadow: `0 7px 20px ${s.glow}, inset 0 2px 4px rgba(255,255,255,0.46), inset 0 -2px 4px rgba(0,0,0,0.10)`,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.88)',
                    display: 'inline-block',
                    boxShadow: '0 0 5px rgba(255,255,255,0.7)',
                  }}
                />
                {s.label}
                <span
                  style={{
                    background: 'rgba(255,255,255,0.24)',
                    borderRadius: 20,
                    padding: '1px 8px',
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {s.count}
                </span>
              </div>
            ));
          })()}
        </div>

        {/* CTA button — terracotta */}
        <motion.button
          whileHover={{ scale: 1.025 }}
          whileTap={{ scale: 0.97 }}
          onClick={onEnter}
          style={{
            width: '100%', height: 56, borderRadius: 18, border: 'none',
            background: clayBg(TERRA, '#c47d61', '#8a4f39'),
            color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            boxShadow: `0 14px 36px ${TERRA}70, inset 0 2px 5px rgba(255,255,255,0.44), inset 0 -2px 5px rgba(0,0,0,0.12)`,
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

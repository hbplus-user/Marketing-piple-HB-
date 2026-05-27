import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onEnterDashboard: () => void;
}

const orbColours = ['#9f4022', '#c99d5d', '#6f8e7c', '#344161'];

export default function LoginPage({ onEnterDashboard }: LoginPageProps) {
  const { signInWithGoogle, authError, session } = useAuth();
  const [phase, setPhase] = useState<'signin' | 'authenticating'>('signin');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      setPhase('authenticating');
      const t = setTimeout(() => {
        onEnterDashboard();
      }, 1100);
      return () => clearTimeout(t);
    } else {
      setPhase('signin');
    }
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setPhase('authenticating');
    setTimeout(async () => {
      try {
        await signInWithGoogle();
      } catch {
        setPhase('signin');
        setLoading(false);
      }
    }, 1200);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #f5f2e9 0%, #ede0d0 55%, #e2cfc0 100%)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Gilroy', 'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Dotted grid overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(83, 55, 43, 0.07) 1.5px, transparent 1.5px)',
          backgroundSize: '18px 18px',
          pointerEvents: 'none',
        }}
      />

      {/* Sun glow top-right */}
      <div
        style={{
          position: 'absolute',
          top: '-120px',
          right: '-120px',
          width: '420px',
          height: '420px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,157,93,0.38) 0%, rgba(201,157,93,0) 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* PIPELINE logo */}
      <div
        style={{
          position: 'absolute',
          top: '32px',
          left: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 10,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#0f0e1a" strokeWidth="2.5" strokeDasharray="16 6" />
          <circle cx="12" cy="12" r="4" fill="#c99d5d" />
        </svg>
        <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.12em', color: '#0f0e1a' }}>
          PIPELINE
        </span>
      </div>

      {/* ── Sign-in card ── */}
      <AnimatePresence>
        {phase === 'signin' && (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: '400px',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '40px 36px 34px',
              boxShadow: '0 24px 64px rgba(15,14,26,0.1), 0 4px 16px rgba(15,14,26,0.06)',
              position: 'relative',
              zIndex: 20,
            }}
          >
            {/* Google G mark */}
            <div style={{ marginBottom: '28px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            </div>

            <h1
              style={{
                fontSize: '32px',
                fontWeight: 800,
                color: '#0f0e1a',
                lineHeight: 1.2,
                margin: '0 0 8px',
              }}
            >
              Step into<br />your world.
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 28px' }}>
              One sign-in unlocks all of it.
            </p>

            {/* Email field */}
            <div
              style={{
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '14px',
                background: '#fafafa',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  color: '#94a3b8',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '3px',
                }}
              >
                Email
              </div>
              <div style={{ fontSize: '14px', color: '#0f0e1a' }}>you@hbplus.fit</div>
            </div>

            {/* Auth error */}
            <AnimatePresence>
              {authError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ marginBottom: '14px', overflow: 'hidden' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                    }}
                  >
                    <ShieldAlert size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b', margin: 0 }}>
                        Access denied
                      </p>
                      <p style={{ fontSize: '11px', color: '#b91c1c', margin: '2px 0 0' }}>{authError}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Continue with Google */}
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '15px 20px',
                borderRadius: '14px',
                border: 'none',
                background: '#0f0e1a',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.75 : 1,
                boxShadow: '0 8px 24px rgba(15,14,26,0.18)',
                marginBottom: '20px',
              }}
            >
              {loading ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              {loading ? 'Authenticating…' : 'Continue with Google'}
            </motion.button>

            {/* Verified device + 2FA */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <span
                style={{
                  fontSize: '12px',
                  color: '#6f8e7c',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#6f8e7c',
                    display: 'inline-block',
                  }}
                />
                Verified device
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#6f8e7c',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#6f8e7c',
                    display: 'inline-block',
                  }}
                />
                2FA on
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Authenticating overlay ── */}
      <AnimatePresence>
        {phase === 'authenticating' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(15,14,26,0.88)',
              zIndex: 500,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
            }}
          >
            <div style={{ position: 'relative', width: '72px', height: '72px' }}>
              {orbColours.map((col, i) => {
                const angle = (i * 90 * Math.PI) / 180;
                return (
                  <motion.div
                    key={i}
                    style={{
                      position: 'absolute',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: col,
                      top: '30px',
                      left: '30px',
                    }}
                    animate={{
                      x: [
                        Math.cos(angle) * 28,
                        Math.cos(angle + Math.PI) * 28,
                        Math.cos(angle + 2 * Math.PI) * 28,
                      ],
                      y: [
                        Math.sin(angle) * 28,
                        Math.sin(angle + Math.PI) * 28,
                        Math.sin(angle + 2 * Math.PI) * 28,
                      ],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  />
                );
              })}
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.2em',
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              AUTHENTICATING
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom step indicator ── */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(15,14,26,0.8)',
          backdropFilter: 'blur(12px)',
          padding: '8px 20px',
          borderRadius: '40px',
          fontSize: '11px',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.4)',
          zIndex: 30,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: phase === 'signin' ? '#fff' : 'rgba(255,255,255,0.4)' }}>Sign in</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span style={{ color: phase === 'authenticating' ? '#fff' : 'rgba(255,255,255,0.4)' }}>Verify</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>Welcome</span>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { signInWithGoogle, authError } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    await signInWithGoogle();
    // Redirect to Google happens — loading resets only if they come back with wrong domain
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F8F9FB' }}>

      {/* ── Left brand panel ── */}
      <div
        className="hidden lg:flex w-[480px] flex-shrink-0 flex-col justify-between p-12"
        style={{ backgroundColor: '#1E1B4B' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center font-black text-white text-lg">P</div>
          <div>
            <p className="text-base font-bold text-white leading-tight">Pipeline</p>
            <p className="text-[11px] text-indigo-300">Marketing Operations</p>
          </div>
        </div>

        <div className="space-y-5">
          <motion.h1
            className="text-4xl font-black text-white leading-tight"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          >
            Your marketing<br />
            <span className="text-indigo-400">moves faster</span><br />
            than ever.
          </motion.h1>
          <motion.p
            className="text-indigo-300 text-sm leading-relaxed max-w-xs"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          >
            From brief to final post — one tool for your entire content production pipeline.
          </motion.p>

          <motion.div
            className="space-y-2.5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          >
            {[
              'Kanban, Gantt & Calendar views',
              'Red Alert deadline tracking',
              'Round-by-round review & approval',
              'Role-based permissions',
            ].map(f => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3.5 6L6.5 2.5" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-[13px] text-indigo-200">{f}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <p className="text-[11px] text-indigo-400">© 2026 Antigravity · hbplus.fit</p>
      </div>

      {/* ── Right sign-in panel ── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white">P</div>
            <span className="font-bold text-gray-900">Pipeline</span>
          </div>

          <h2 className="text-2xl font-black text-gray-900 mb-1">Sign in</h2>
          <p className="text-sm text-gray-500 mb-6">
            Use your <span className="font-semibold text-indigo-600">@hbplus.fit</span> Google account to access Pipeline.
          </p>

          {/* Domain error banner */}
          <AnimatePresence>
            {authError && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-5 overflow-hidden"
              >
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200">
                  <ShieldAlert size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-red-700 mb-0.5">Access denied</p>
                    <p className="text-[12px] text-red-600 leading-relaxed">{authError}</p>
                    <p className="text-[11px] text-red-500 mt-1">
                      Please sign in with an <strong>@hbplus.fit</strong> email address.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm hover:shadow-md hover:border-gray-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg className="animate-spin w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {loading ? 'Redirecting to Google…' : 'Continue with Google'}
          </motion.button>

          {/* Domain restriction notice */}
          <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-indigo-50 border border-indigo-100">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
              <circle cx="7" cy="7" r="6" stroke="#6366F1" strokeWidth="1.2"/>
              <path d="M7 6v4M7 4.5v.5" stroke="#6366F1" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <p className="text-[12px] text-indigo-700">
              Only <strong>@hbplus.fit</strong> Google accounts are allowed.
            </p>
          </div>

          {/* Trust row */}
          <div className="flex items-center gap-3 mt-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[11px] text-gray-400 uppercase tracking-wider">Secure login</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="flex items-center justify-center gap-4 mt-4">
            {['SSO via Google', 'Encrypted session', 'No password'].map(t => (
              <span key={t} className="flex items-center gap-1 text-[11px] text-gray-400">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4 7L8 3" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, ChevronUp, LogOut } from 'lucide-react';
import { usePersona } from '../../hooks/usePersona';
import { useAuth } from '../../context/AuthContext';
import Avatar from './Avatar';

export default function PersonaSwitcher() {
  const { currentUser, personas, setPersona } = usePersona();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
          >
            {/* Signed-in Google account */}
            {user && (
              <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50/60">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Signed in as</p>
                <div className="flex items-center gap-2">
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} className="w-6 h-6 rounded-full" alt="" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                      {(user.email ?? 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-[12px] text-gray-700 truncate">{user.email}</span>
                </div>
              </div>
            )}

            {/* Persona switcher */}
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Switch persona</p>
            </div>
            {personas.map(p => (
              <button
                key={p.id}
                onClick={() => { setPersona(p); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-indigo-50 transition-colors ${currentUser.id === p.id ? 'bg-indigo-50' : ''}`}
                aria-label={`Switch to ${p.name}`}
              >
                <Avatar initials={p.initials} color={p.avatarColor} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-[11px] text-gray-500">{p.role}</p>
                </div>
                {currentUser.id === p.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                )}
              </button>
            ))}

            {/* Sign out */}
            <button
              onClick={() => { signOut(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left border-t border-gray-100 hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={14} />
              <span className="text-sm font-medium">Sign out</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors"
        aria-label="Switch persona"
      >
        {/* Show Google avatar if available */}
        {user?.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            className="w-6 h-6 rounded-full flex-shrink-0 ring-2 ring-indigo-400/40"
            alt={user.email ?? ''}
          />
        ) : (
          <Avatar initials={currentUser.initials} color={currentUser.avatarColor} size="sm" />
        )}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-sidebar-text truncate">
            {user?.user_metadata?.full_name ?? currentUser.name}
          </p>
          <p className="text-[11px] text-sidebar-muted">{currentUser.role}</p>
        </div>
        <ChevronUp
          size={14}
          className={`text-sidebar-muted transition-transform ${open ? '' : 'rotate-180'}`}
        />
        <Settings size={14} className="text-sidebar-muted" />
      </button>
    </div>
  );
}

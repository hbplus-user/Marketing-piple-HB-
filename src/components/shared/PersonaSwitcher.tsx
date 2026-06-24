import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, LogOut } from 'lucide-react';
import { usePersona } from '../../hooks/usePersona';
import { useAuth } from '../../context/AuthContext';
import Avatar from './Avatar';

export default function PersonaSwitcher() {
  const { currentUser } = usePersona();
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
            {/* Signed-in account info */}
            <div className="px-3 py-3 border-b border-gray-100 bg-gray-50/60">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Signed in as</p>
              <div className="flex items-center gap-2.5">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} className="w-8 h-8 rounded-full ring-2 ring-indigo-100" alt="" />
                ) : (
                  <Avatar initials={currentUser.initials} color={currentUser.avatarColor} size="sm" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {user?.user_metadata?.full_name ?? currentUser.name}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              <div className="mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 capitalize">
                  {currentUser.role}
                </span>
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={() => { signOut(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors"
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
        aria-label="Account menu"
      >
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
          <p className="text-[11px] text-sidebar-muted capitalize">{currentUser.role}</p>
        </div>
        <ChevronUp
          size={14}
          className={`text-sidebar-muted transition-transform ${open ? '' : 'rotate-180'}`}
        />
      </button>
    </div>
  );
}

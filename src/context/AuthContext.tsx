import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Role } from '../types';

const ALLOWED_DOMAIN = 'hbplus.fit';

interface AuthState {
  session: Session | null;
  user: User | null;
  userRole: Role | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession]     = useState<Session | null>(null);
  const [userRole, setUserRole]   = useState<Role | null>(null);
  const [loading, setLoading]     = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchRole = async (userId: string): Promise<Role | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return data.role as Role;
  };

  const validateAndSetSession = async (incoming: Session | null) => {
    if (!incoming) {
      setSession(null);
      setUserRole(null);
      setLoading(false);
      return;
    }

    const email = incoming.user.email ?? '';
    if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      await supabase.auth.signOut();
      setSession(null);
      setUserRole(null);
      setAuthError(
        `Access restricted to @${ALLOWED_DOMAIN} accounts. You signed in with ${email}.`
      );
      setLoading(false);
      return;
    }

    const role = await fetchRole(incoming.user.id);
    setAuthError(null);
    setSession(incoming);
    setUserRole(role);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      validateAndSetSession(data.session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      validateAndSetSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      userRole,
      loading,
      authError,
      signInWithGoogle,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

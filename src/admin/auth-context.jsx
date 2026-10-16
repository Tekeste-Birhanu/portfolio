import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [status, setStatus] = useState('checking');
  const [user, setUser] = useState(null);
  const [issue, setIssue] = useState(null);
  const [recoverySession, setRecoverySession] = useState(false);
  const generation = useRef(0);

  const verifySession = useCallback(async (session) => {
    const requestId = ++generation.current;
    if (!session) {
      setUser(null);
      setStatus('signed_out');
      return;
    }
    setUser(session.user);
    setStatus('checking');
    if (!session.user.email_confirmed_at) {
      setIssue('email_unverified');
      setUser(null);
      setStatus('signed_out');
      await supabase.auth.signOut();
      return;
    }
    const { data, error } = await supabase.rpc('is_designated_admin');
    if (requestId !== generation.current) return;
    if (error) {
      setStatus('error');
      return;
    }
    if (!data) {
      setIssue('not_admin');
      setUser(null);
      setStatus('signed_out');
      await supabase.auth.signOut();
      return;
    }
    setIssue(null);
    setStatus('admin');
  }, []);

  useEffect(() => {
    if (!supabase) {
      setStatus('error');
      return undefined;
    }

    let mounted = true;
    const timers = new Set();
    const scheduleVerification = (session) => {
      if (!session) {
        generation.current += 1;
        setUser(null);
        setStatus('signed_out');
        return;
      }
      setUser(session.user);
      setStatus('checking');
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (mounted) void verifySession(session);
      }, 0);
      timers.add(timer);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecoverySession(true);
      else if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setRecoverySession(false);
      scheduleVerification(session);
    });
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) setStatus('error');
        else scheduleVerification(data.session);
      })
      .catch(() => { if (mounted) setStatus('error'); });

    return () => {
      mounted = false;
      timers.forEach((timer) => window.clearTimeout(timer));
      subscription.unsubscribe();
    };
  }, [verifySession]);

  const signInWithPassword = useCallback(async (email, password) => {
    setIssue(null);
    setRecoverySession(false);
    if (!supabase) return { error: new Error('Supabase is not configured.') };
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setIssue(null);
    setRecoverySession(false);
    if (!supabase) return { error: new Error('Supabase is not configured.') };
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/admin/callback` },
    });
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    if (!supabase) return { error: new Error('Supabase is not configured.') };
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });
  }, []);

  const updatePassword = useCallback(async (password) => {
    if (!supabase) return { error: new Error('Supabase is not configured.') };
    return supabase.auth.updateUser({ password });
  }, []);

  const signOut = useCallback(async () => {
    setIssue(null);
    setRecoverySession(false);
    if (supabase) return supabase.auth.signOut();
    return { error: null };
  }, []);

  const value = useMemo(() => ({
    status,
    user,
    issue,
    recoverySession,
    signInWithPassword,
    signInWithGoogle,
    sendPasswordReset,
    updatePassword,
    signOut,
    refresh: () => supabase?.auth.getSession().then(({ data }) => verifySession(data.session)),
  }), [status, user, issue, recoverySession, signInWithPassword, signInWithGoogle, sendPasswordReset, updatePassword, signOut, verifySession]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used inside AdminAuthProvider.');
  return context;
}

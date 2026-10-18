import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const AdminAuthContext = createContext(null);
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'portfolio-admin-last-activity';
const AUTH_REDIRECT_ORIGIN = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/+$/, '');

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
    try {
      const lastActivity = Number(window.sessionStorage.getItem(LAST_ACTIVITY_KEY));
      if (lastActivity > 0 && Date.now() - lastActivity >= INACTIVITY_TIMEOUT_MS) {
        window.sessionStorage.removeItem(LAST_ACTIVITY_KEY);
        setUser(null);
        setStatus('signed_out');
        await supabase.auth.signOut({ scope: 'local' });
        return;
      }
    } catch {
      // Continue with normal authorization if browser storage is unavailable.
    }
    setUser(session.user);
    setStatus('checking');
    if (!session.user.email_confirmed_at) {
      setIssue('email_unverified');
      setUser(null);
      setStatus('signed_out');
      await supabase.auth.signOut({ scope: 'local' });
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
      await supabase.auth.signOut({ scope: 'local' });
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
      options: { redirectTo: `${AUTH_REDIRECT_ORIGIN}/admin/callback` },
    });
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    if (!supabase) return { error: new Error('Supabase is not configured.') };
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${AUTH_REDIRECT_ORIGIN}/admin/reset-password`,
    });
  }, []);

  const updatePassword = useCallback(async (password) => {
    if (!supabase) return { error: new Error('Supabase is not configured.') };
    return supabase.auth.updateUser({ password });
  }, []);

  const signOut = useCallback(async () => {
    setIssue(null);
    setRecoverySession(false);
    try {
      window.sessionStorage.removeItem(LAST_ACTIVITY_KEY);
    } catch {
      // Sign-out still proceeds if browser storage is unavailable.
    }
    if (supabase) return supabase.auth.signOut({ scope: 'local' });
    return { error: null };
  }, []);

  useEffect(() => {
    if (status !== 'admin' || !supabase) return undefined;

    const readLastActivity = () => {
      try {
        const stored = Number(window.sessionStorage.getItem(LAST_ACTIVITY_KEY));
        return Number.isFinite(stored) && stored > 0 ? stored : Date.now();
      } catch {
        return Date.now();
      }
    };

    let timer;
    let lastActivity = readLastActivity();
    let lastStoredActivity = 0;
    const saveActivity = (timestamp) => {
      lastActivity = timestamp;
      if (timestamp - lastStoredActivity < 5000) return;
      lastStoredActivity = timestamp;
      try {
        window.sessionStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp));
      } catch {
        // The in-memory timer still protects this tab if storage is unavailable.
      }
    };
    const hasExpired = () => Date.now() - lastActivity >= INACTIVITY_TIMEOUT_MS;
    const checkInactivity = () => {
      if (hasExpired()) {
        void signOut();
        return;
      }
      timer = window.setTimeout(checkInactivity, INACTIVITY_TIMEOUT_MS - (Date.now() - lastActivity));
    };
    const handleActivity = () => {
      if (hasExpired()) {
        void signOut();
        return;
      }
      saveActivity(Date.now());
      window.clearTimeout(timer);
      checkInactivity();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        window.clearTimeout(timer);
        checkInactivity();
      }
    };

    saveActivity(lastActivity);
    checkInactivity();
    const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, handleActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(timer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status, signOut]);

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

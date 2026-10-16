import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function retirePersistentSession() {
  if (typeof window === 'undefined' || !supabaseUrl || !supabaseAnonKey) return;

  const legacyStorageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
  try {
    if (!window.localStorage.getItem(legacyStorageKey)) return;

    const legacyClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: window.localStorage,
        storageKey: legacyStorageKey,
      },
    });

    void legacyClient.auth.signOut({ scope: 'local' }).catch(() => {}).finally(() => {
      try {
        window.localStorage.removeItem(legacyStorageKey);
        window.localStorage.removeItem(`${legacyStorageKey}-code-verifier`);
        window.localStorage.removeItem(`${legacyStorageKey}-user`);
      } catch {
        // The old session cannot be retained in localStorage when access is blocked.
      }
    });
  } catch {
    // Browser storage can be unavailable; the current tab still uses sessionStorage.
  }
}

retirePersistentSession();

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: typeof window === 'undefined' ? undefined : window.sessionStorage,
      storageKey: `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token-tab`,
    },
  })
  : null;

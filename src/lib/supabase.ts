import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * The one Supabase client. Null until VITE_SUPABASE_URL / _ANON_KEY are set,
 * so the app keeps working on the demo catalogue while the backend is being connected.
 * Typed with the generated Database types once the project exists (npm run db:types).
 */
export const supabase: SupabaseClient | null = env.hasBackend
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: window.localStorage,
        autoRefreshToken: true,
        persistSession: true,
        // The web client completes OAuth and magic-link redirects from the URL.
        detectSessionInUrl: true,
      },
    })
  : null;

// Refresh the session only while the tab is in the foreground.
if (supabase) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

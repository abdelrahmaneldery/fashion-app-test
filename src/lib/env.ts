export type AppVariant = 'development' | 'staging' | 'production';

// VITE_* values are inlined at build time, so they must be read with static property access.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const env = {
  variant: (import.meta.env.VITE_APP_VARIANT ?? (import.meta.env.DEV ? 'development' : 'production')) as AppVariant,
  supabaseUrl,
  supabaseAnonKey,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? '',
  analyticsDebug: import.meta.env.VITE_ANALYTICS_DEBUG === '1',
  /** False until a Supabase project is configured; the app then runs on the bundled demo catalogue. */
  hasBackend: supabaseUrl.length > 0 && supabaseAnonKey.length > 0,
} as const;

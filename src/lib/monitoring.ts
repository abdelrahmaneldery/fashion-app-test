import * as Sentry from '@sentry/react';
import { env } from './env';

/** Crash and performance reporting. A no-op until VITE_SENTRY_DSN is set. */
export function initMonitoring() {
  if (!env.sentryDsn) return;
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.variant,
    enabled: import.meta.env.PROD,
    sendDefaultPii: false,
    tracesSampleRate: env.variant === 'production' ? 0.2 : 1,
    integrations: [Sentry.browserTracingIntegration()],
  });
}

export { Sentry };

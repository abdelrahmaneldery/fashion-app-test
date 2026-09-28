import { env } from './env';
import { Sentry } from './monitoring';

/**
 * Every product event SEAM records, typed so names and properties can't drift.
 * These map to the funnel we care about: discover a Look → open a piece → save or shop.
 */
export type AnalyticsEvent =
  | { name: 'look_viewed'; lookId: string }
  | { name: 'piece_opened'; lookId: string; position: number; identified: boolean; from: 'hotspot' | 'row' | 'list' }
  | { name: 'product_viewed'; productId: string }
  | { name: 'save_created'; kind: 'look' | 'product'; id: string }
  | { name: 'save_removed'; kind: 'look' | 'product'; id: string }
  | { name: 'lookbook_filed'; kind: 'look' | 'product'; id: string; newLookbook: boolean }
  | { name: 'shop_clicked'; productId: string; surface: 'piece_sheet' | 'product_detail' | 'sticky_bar' | 'alternatives' }
  | { name: 'alternatives_band_changed'; productId: string; band: 'lower' | 'similar' | 'higher' }
  | { name: 'follow_toggled'; creatorId: string; following: boolean }
  | { name: 'look_liked'; lookId: string; liked: boolean; from: 'button' | 'double_tap' }
  | { name: 'comment_posted'; lookId: string }
  | { name: 'import_signed_in'; source: string }
  | { name: 'import_disconnected'; source: string }
  | { name: 'images_imported'; source: string; count: number };

type Sink = (event: AnalyticsEvent) => void;
const sinks: Sink[] = [];

/** Plug in a vendor (PostHog, Amplitude…) without touching call sites. */
export function addAnalyticsSink(sink: Sink) {
  sinks.push(sink);
}

export function track(event: AnalyticsEvent) {
  // Breadcrumbs give every crash report the path that led to it.
  Sentry.addBreadcrumb({ category: 'analytics', message: event.name, data: event, level: 'info' });
  if (env.analyticsDebug) console.log('[analytics]', event);
  for (const sink of sinks) {
    try {
      sink(event);
    } catch {
      // Analytics must never break the app.
    }
  }
}

/**
 * Likes and comments. There is no backend for either yet, so what a person does lives in the
 * persisted store, and the counts other people contribute are stand-ins: stable per Look, so a
 * reload never reshuffles them, and replaced wholesale once the real numbers exist.
 */

/** The one account in the app. Profile, comments and likes all speak as this creator. */
export const ME = 'amira';

/** A small, stable hash of an id — the same Look always gets the same stand-in count. */
function seed(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** How many other people like a Look, before you do. */
export const baselineLikes = (lookId: string) => 38 + (seed(lookId) % 420);

/** How many other people like a comment. Your own comments start at nothing. */
export const baselineCommentLikes = (commentId: string, authorId: string) =>
  authorId === ME ? 0 : seed(commentId) % 14;

/** 1,204 up to ten thousand, then 12.4K — the way a feed writes a count. */
export function formatCount(n: number) {
  if (n < 10_000) return n.toLocaleString('en-US');
  const k = n / 1000;
  return `${k < 100 ? k.toFixed(1).replace(/\.0$/, '') : Math.round(k)}K`;
}

/** now · 4m · 3h · 2d · 5w — short enough to sit beside a name. */
export function timeAgo(at: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return 'now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.round(d / 7)}w`;
}

/** The longest comment the composer takes. Enough for a sentence or two about a Look. */
export const COMMENT_MAX = 400;

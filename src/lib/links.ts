/**
 * Links people type by hand. A tag's link is written in a hurry on a phone, so "brand.com/coat"
 * has to become a real URL, and anything that cannot be one has to be caught before it is saved.
 */

const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Returns the tidied absolute URL, `''` for a blank field (a link is optional), or `null` when
 * what was typed cannot be a web address.
 */
export function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return '';
  try {
    const url = new URL(SCHEME.test(value) ? value : `https://${value}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    // A bare word is a typo, not a host.
    if (!url.hostname.includes('.') || url.hostname.endsWith('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** The part of a link worth showing in a list: the site, without the ceremony. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

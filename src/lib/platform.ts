/** The handful of device capabilities the app used native modules for, as plain web APIs. */

/** Expo Haptics' web counterpart. Silently absent on desktop, which is the right behaviour. */
export const haptics = {
  impact: () => navigator.vibrate?.(10),
  selection: () => navigator.vibrate?.(5),
};

/** Opens a retailer in a new tab, replacing WebBrowser.openBrowserAsync. */
export function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Web Share where the browser has it (mobile Safari, Android Chrome), clipboard everywhere else.
 * Resolves to the wording for the confirmation toast, or null when the person cancelled.
 */
export async function share(text: string, url = window.location.href): Promise<string | null> {
  if (navigator.share) {
    try {
      await navigator.share({ text, url });
      return null;
    } catch (error) {
      // AbortError means the person dismissed the sheet; anything else falls through to the clipboard.
      if (error instanceof DOMException && error.name === 'AbortError') return null;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} — ${url}`);
    return 'Link copied';
  } catch {
    return 'Sharing is not available here';
  }
}

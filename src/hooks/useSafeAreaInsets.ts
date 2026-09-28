import { useEffect, useState } from 'react';

export type Insets = { top: number; right: number; bottom: number; left: number };

/**
 * The least room the chrome keeps at the top, whatever the device reports. A phone with a cutout
 * asks for far more than this and is unaffected; a desktop browser or an Android phone with no
 * notch reports nothing, and without a floor the back button and the wordmark sit flush against
 * the edge of the screen.
 */
const MIN_TOP = 12;

const ZERO: Insets = { top: MIN_TOP, right: 0, bottom: 0, left: 0 };

let probe: HTMLDivElement | null = null;

/**
 * `env(safe-area-inset-*)` only resolves to pixels once it is applied to a real box, so a hidden
 * probe carries them as padding and we read them back. Zero everywhere without a display cutout.
 */
function read(): Insets {
  if (typeof window === 'undefined') return ZERO;
  if (!probe) {
    probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';
    document.body.appendChild(probe);
  }
  const s = getComputedStyle(probe);
  return {
    top: Math.max(parseFloat(s.paddingTop) || 0, MIN_TOP),
    right: parseFloat(s.paddingRight) || 0,
    bottom: parseFloat(s.paddingBottom) || 0,
    left: parseFloat(s.paddingLeft) || 0,
  };
}

const equal = (a: Insets, b: Insets) =>
  a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;

/**
 * The room to keep clear at each edge: the notch and home-indicator margins, with a floor on the
 * top so every screen has air above its chrome even on a device that reports no inset at all.
 */
export function useSafeAreaInsets(): Insets {
  const [insets, setInsets] = useState<Insets>(read);

  useEffect(() => {
    const update = () => setInsets((prev) => {
      const next = read();
      return equal(prev, next) ? prev : next;
    });
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return insets;
}

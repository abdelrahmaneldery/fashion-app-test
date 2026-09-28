import { useEffect, useState } from 'react';
import { breakpoint } from '@/theme/tokens';

export type Viewport = { width: number; height: number };

const read = (): Viewport =>
  typeof window === 'undefined'
    ? { width: 390, height: 844 }
    : { width: window.innerWidth, height: window.innerHeight };

/**
 * The visible window, for the few places that size against the screen rather than a container:
 * the hero cap, sheet detents and the sticky bar's resting position.
 */
export function useViewport(): Viewport {
  const [size, setSize] = useState<Viewport>(read);
  useEffect(() => {
    const update = () =>
      setSize((prev) => {
        const next = read();
        return prev.width === next.width && prev.height === next.height ? prev : next;
      });
    update();
    window.addEventListener('resize', update);
    // The URL bar collapsing on mobile changes the visual viewport, not the window.
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);
  return size;
}

export type Breakpoint = 'phone' | 'tablet' | 'wide';

/** Mobile-first: the phone canvas is the base, and wider screens earn extra feed columns. */
export function useBreakpoint(): Breakpoint {
  const { width } = useViewport();
  if (width >= breakpoint.wide) return 'wide';
  if (width >= breakpoint.tablet) return 'tablet';
  return 'phone';
}

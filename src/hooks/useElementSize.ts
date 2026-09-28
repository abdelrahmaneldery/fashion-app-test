import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react';

/**
 * The content-box size of an element, kept current with a ResizeObserver. Layout maths that used
 * to run off the screen width now run off the container, so the app can widen without redesigning.
 */
export function useElementSize<T extends HTMLElement>(): [RefObject<T | null>, { width: number; height: number }] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const measure = useCallback((el: T) => {
    const { width, height } = el.getBoundingClientRect();
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure(el);
    const observer = new ResizeObserver(() => measure(el));
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  return [ref, size];
}

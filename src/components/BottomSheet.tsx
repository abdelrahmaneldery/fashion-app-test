import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { useOnEscape } from '@/hooks/useOnEscape';
import { useViewport } from '@/hooks/useViewport';
import styles from './BottomSheet.module.css';

const EASE = [0.25, 0.1, 0.25, 1] as const;

/** Sheets stay phone-width on large screens, so their content keeps the proportions it was drawn at. */
export const SHEET_MAX_WIDTH = 560;

/** And phone-height: past this a sheet stops reading as a sheet and starts reading as a page. */
export const SHEET_MAX_HEIGHT = 780;

/**
 * A detent, as a share of the screen. Every sheet in the app sizes itself through this, so how
 * tall the popups stand is one number here rather than a constant per component.
 */
export const sheetDetent = (screenH: number, share: number) =>
  Math.round(Math.min(screenH * share, SHEET_MAX_HEIGHT));

/** The width a sheet's content actually gets, for the grids and carousels sized in pixels. */
export const useSheetWidth = () => Math.min(useViewport().width, SHEET_MAX_WIDTH);

type Props = {
  open: boolean;
  /** Sheet heights per detent, including the bottom safe area, smallest first. */
  heights: number[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Called when the person drags the sheet away, taps the scrim or presses Escape. */
  onRequestClose: () => void;
  /** Scrim opacity at the first and last detent. */
  scrim: [number, number];
  scrimClosesSheet?: boolean;
  /** Draggable header content, drawn under the grabber. */
  handle: ReactNode;
  children: ReactNode;
  /** Written with 0 at the first detent and 1 at the last, for cross-fading content. */
  progress?: MotionValue<number>;
  'aria-label'?: string;
};

/** One sheet anatomy: Surface / Elevated, 12 px top corners, hairline top edge, 36 × 4 grabber, detents. */
export function BottomSheet({
  open,
  heights,
  index,
  onIndexChange,
  onRequestClose,
  scrim,
  scrimClosesSheet,
  handle,
  children,
  progress,
  'aria-label': ariaLabel,
}: Props) {
  const { height: screenH } = useViewport();
  const maxH = heights[heights.length - 1];
  const offsets = heights.map((h) => maxH - h);
  const closed = maxH;
  const y = useMotionValue(closed);
  const dragControls = useDragControls();
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      const controls = animate(y, offsets[Math.min(index, offsets.length - 1)], { duration: 0.3, ease: EASE });
      return () => controls.stop();
    }
    const controls = animate(y, closed, { duration: 0.25, ease: EASE });
    controls.then(() => setMounted(false));
    return () => controls.stop();
    // offsets derive from heights; re-run when the detent or open state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, maxH]);

  useMotionValueEvent(y, 'change', (v) => {
    if (!progress) return;
    progress.set(offsets.length > 1 ? Math.min(1, Math.max(0, 1 - v / offsets[0])) : 0);
  });

  const scrimOpacity = useTransform(
    y,
    offsets.length > 1 ? [0, offsets[0], closed] : [0, closed],
    offsets.length > 1 ? [scrim[1], scrim[0], 0] : [scrim[0], 0],
    { clamp: true },
  );

  useOnEscape(open, onRequestClose);

  if (!mounted) return null;

  return (
    <div className={styles.root} style={{ ['--sheet-max-width' as string]: `${SHEET_MAX_WIDTH}px` }}>
      <motion.div
        className={styles.scrim}
        style={{ opacity: scrimOpacity, pointerEvents: scrimClosesSheet ? 'auto' : 'none' }}
      >
        {scrimClosesSheet ? (
          <button type="button" className={styles.scrimTappable} aria-label="Close" onClick={onRequestClose} />
        ) : null}
      </motion.div>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={styles.sheet}
        style={{ top: screenH - maxH, height: maxH, y }}
        drag="y"
        // Only the header starts a drag, so the body is free to scroll.
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: closed }}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          const projected = y.get() + info.velocity.y * 0.12;
          if (info.velocity.y > 1200 || projected > offsets[0] + 80) {
            onRequestClose();
            return;
          }
          let best = 0;
          for (let i = 1; i < offsets.length; i++) {
            if (Math.abs(offsets[i] - projected) < Math.abs(offsets[best] - projected)) best = i;
          }
          animate(y, offsets[best], { duration: 0.25, ease: EASE });
          onIndexChange(best);
        }}
      >
        <div onPointerDown={(e) => dragControls.start(e)}>
          <button
            type="button"
            className={styles.grabberZone}
            aria-label="Sheet size"
            onClick={() => heights.length > 1 && onIndexChange(index === 0 ? heights.length - 1 : 0)}
          >
            <span className={styles.grabber} />
          </button>
          {handle}
        </div>
        <div className={styles.body}>{children}</div>
      </motion.div>
    </div>
  );
}

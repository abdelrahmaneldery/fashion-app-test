import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { onPhoto } from '@/theme/theme';
import styles from './Eyelet.module.css';
import { Text } from './Text';

export type EyeletState = 'default' | 'selected' | 'dimmed' | 'hidden';
export type TagPosition = 'above' | 'below' | 'left' | 'right';

type Props = {
  /** Centre of the hotspot in the parent's coordinates. */
  x: number;
  y: number;
  state: EyeletState;
  identified: boolean;
  /** What the piece is called — the line the tag leads with. */
  name: string;
  /** Who makes it, set above the name. Absent on a piece nobody has identified yet. */
  brand?: string;
  position?: TagPosition;
  /** How far the tag slides along the Eyelet, in px; its thread stays on the piece. */
  tagShift?: number;
  /** False keeps the tag away, as for a piece cropped out of the photo. */
  labelled?: boolean;
  /** ms to wait before appearing; null keeps it invisible (image not loaded yet). */
  appearDelay: number | null;
  /** One-time "breath" on the first Look a person opens. */
  breath?: boolean;
  onOpen: () => void;
  'aria-label': string;
};

const BONE = onPhoto.textPrimary;
const MIST = onPhoto.textSecondary;
const EDGE = onPhoto.scrim60;

/** Concentric circles are drawn from the 44 px frame's centre, so every ring grows about one point. */
const ring = (diameter: number) => ({
  width: diameter,
  height: diameter,
  borderRadius: diameter / 2,
  left: 22 - diameter / 2,
  top: 22 - diameter / 2,
});

/** The Eyelet: a dual-tone ring (Bone inside, Ink 60% outside) with a Bone core. Readable on white and black cloth. */
export function Eyelet({
  x,
  y,
  state,
  identified,
  name,
  brand,
  position = 'above',
  tagShift = 0,
  labelled = true,
  appearDelay,
  breath,
  onOpen,
  'aria-label': ariaLabel,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [staggered, setStaggered] = useState(false);

  // Eyelets fan in a few frames apart once the photo is decoded; reduced motion shows them at once.
  useEffect(() => {
    if (appearDelay === null || reduceMotion) return;
    const t = setTimeout(() => setStaggered(true), appearDelay);
    return () => clearTimeout(t);
  }, [appearDelay, reduceMotion]);

  const appeared = appearDelay !== null && (reduceMotion || staggered);

  const selected = state === 'selected';
  const sel = selected ? 1 : 0;
  const visible = state === 'hidden' ? 0 : state === 'dimmed' ? 0.4 : 1;
  const showBreath = breath && appeared && !reduceMotion;
  // Every piece wears its tag, so the photo reads as a list of what is in it without a tap.
  const showTag = labelled && state !== 'hidden';
  const threadFirst = position === 'below' || position === 'right';

  return (
    <motion.div
      className={styles.frame}
      style={{ left: x - 22, top: y - 22 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: appeared ? visible : 0, scale: appeared ? 1 : 0.8 }}
      transition={{ duration: appeared ? 0.15 : 0.2 }}
    >
      <AnimatePresence>
        {showTag ? (
          <motion.div
            key="tag"
            className={`${styles.tagGroup} ${styles[position]}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* The thread always runs from the Eyelet to the tag, so it comes first below or to the right. */}
            {threadFirst ? <span className={styles.thread} style={{ background: BONE }} /> : null}
            <span
              className={brand ? `${styles.tag} ${styles.stacked}` : styles.tag}
              style={tagShift ? { transform: `translateX(${tagShift}px)` } : undefined}
            >
              {brand ? (
                <Text variant="microUpper" lines={1} style={{ color: MIST }}>
                  {brand}
                </Text>
              ) : null}
              <Text variant={brand ? 'captionMedium' : 'microUpper'} lines={1} style={{ color: BONE }}>
                {name}
              </Text>
            </span>
            {threadFirst ? null : <span className={styles.thread} style={{ background: BONE }} />}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={onOpen}
        disabled={state === 'hidden'}
        aria-label={ariaLabel}
        aria-pressed={selected}
        className={styles.hit}
        whileTap={{ scale: 0.9 }}
        transition={{ duration: 0.1 }}
      >
        {showBreath ? (
          <motion.span
            className={styles.ring}
            style={{ border: `1px solid ${BONE}` }}
            initial={{ ...ring(22), opacity: 0 }}
            animate={{ ...ring(30), opacity: [0, 1, 0] }}
            transition={{ duration: 0.6, delay: 0.25 }}
          />
        ) : null}
        <motion.span
          className={styles.ring}
          style={{ border: `1px solid ${EDGE}` }}
          initial={false}
          animate={ring(22 + 8 * sel)}
          transition={{ duration: 0.2 }}
        />
        <motion.span
          className={styles.ring}
          style={{ borderColor: BONE, borderStyle: identified ? 'solid' : 'dashed' }}
          initial={false}
          animate={{ ...ring(20 + 8 * sel), borderWidth: 1 + 0.5 * sel }}
          transition={{ duration: 0.2 }}
        />
        {identified ? (
          <motion.span
            className={styles.ring}
            style={{ background: BONE, border: `1px solid ${EDGE}` }}
            initial={false}
            animate={ring(8 + 2 * sel)}
            transition={{ duration: 0.2 }}
          />
        ) : null}
      </motion.button>
    </motion.div>
  );
}

/** A tag's widest, before its text is cut short. Matches .tagGroup in Eyelet.module.css. */
const TAG_MAX = 180;
/** Eyelet centre to the near edge of its tag: half the 44 px frame, a 1 px gap, then the thread. */
const TAG_REACH = 22 + 1 + 18;
/** The same for a tag beside its Eyelet, whose thread is shorter. Matches .left and .right in the CSS. */
const SIDE_REACH = 22 + 1 + 12;
/** How far in from a slid tag's end its thread lands. */
const THREAD_INSET = 18;

type Box = { l: number; t: number; r: number; b: number };

/** Where a tag sits: which side of its Eyelet, and how far it slides along it (above and below only). */
export type TagPlacement = { side: TagPosition; shift: number };

const overlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));

/**
 * A tag's size from its text: with a brand, a two-line card (11 px caps over a 13 px name); without,
 * a single 20 px line of caps. Estimated per character, a little generous so near-misses count.
 */
function tagSize(name: string, brand?: string) {
  const caps = (text: string) => text.length * 8;
  const width = brand ? Math.max(caps(brand), name.length * 7.4) + 20 : caps(name) + 20;
  return { w: Math.min(TAG_MAX, width), h: brand ? 44 : 20 };
}

/**
 * Where each tag goes now that every tag shows at once. Each can sit above or below its Eyelet (and
 * slide along it), or beside it; every combination is scored and the one whose tags cover the fewest
 * other tags, Eyelets, controls and edges of the photo wins. Centred and above break ties.
 */
export function placeTags(
  spots: { x: number; y: number; name: string; brand?: string }[],
  area: { top: number; bottom: number; width: number },
  /** Controls laid over the photo that a tag must not cover. */
  keepClear: Box[] = [],
): TagPlacement[] {
  const n = spots.length;
  const PAD = 4;

  // Every way each tag could sit, with the box it would take up.
  const options = spots.map((spot) => {
    const { w, h } = tagSize(spot.name, spot.brand);
    const slide = Math.max(0, w / 2 - THREAD_INSET);
    // Sliding pays off only with few pieces; past six the search keeps each tag centred.
    const shifts = n <= 6 && slide > 8 ? [0, -slide, slide] : [0];
    const stacked = (['above', 'below'] as const).flatMap((side) =>
      shifts.map((shift) => {
        const l = spot.x + shift - w / 2 - PAD;
        const r = spot.x + shift + w / 2 + PAD;
        const box =
          side === 'above'
            ? { l, r, t: spot.y - TAG_REACH - h - PAD, b: spot.y - TAG_REACH + PAD }
            : { l, r, t: spot.y + TAG_REACH - PAD, b: spot.y + TAG_REACH + h + PAD };
        // A small price for leaving the default, so a clean centred tag above always wins a tie.
        const bias = (side === 'below' ? 2 : 0) + (shift ? 1 : 0);
        return { placement: { side, shift } as TagPlacement, box, bias };
      }),
    );
    // Beside the Eyelet, centred on it: for Looks too tall and crowded to stack every tag.
    const t = spot.y - h / 2 - PAD;
    const b = spot.y + h / 2 + PAD;
    const beside = [
      { placement: { side: 'left', shift: 0 } as TagPlacement, box: { l: spot.x - SIDE_REACH - w - PAD, r: spot.x - SIDE_REACH + PAD, t, b }, bias: 2 },
      { placement: { side: 'right', shift: 0 } as TagPlacement, box: { l: spot.x + SIDE_REACH - PAD, r: spot.x + SIDE_REACH + w + PAD, t, b }, bias: 2 },
    ];
    return [...stacked, ...beside];
  });

  const dots: Box[] = spots.map((spot) => ({ l: spot.x - 14, r: spot.x + 14, t: spot.y - 14, b: spot.y + 14 }));
  const frame: Box = { l: 0, r: area.width, t: area.top, b: area.bottom };
  const outside = (box: Box) => (box.r - box.l) * (box.b - box.t) - overlap(box, frame);

  // What each option costs on its own: the edge, the controls, other Eyelets.
  const alone = options.map((list, i) =>
    list.map((option) => {
      let cost = option.bias + outside(option.box) * 3;
      for (const control of keepClear) cost += overlap(option.box, control) * 3;
      dots.forEach((dot, j) => {
        if (j !== i) cost += overlap(option.box, dot) * 2;
      });
      return cost;
    }),
  );

  const best = options.map(() => 0);
  let bestCost = Infinity;
  const pick = options.map(() => 0);
  // Depth-first over every combination, giving up on a branch once it already costs more than the best.
  const walk = (i: number, cost: number) => {
    if (cost >= bestCost) return;
    if (i === n) {
      bestCost = cost;
      best.splice(0, n, ...pick);
      return;
    }
    options[i].forEach((option, k) => {
      let next = cost + alone[i][k];
      for (let j = 0; j < i; j++) next += overlap(option.box, options[j][pick[j]].box);
      pick[i] = k;
      walk(i + 1, next);
    });
  };
  walk(0, 0);
  return best.map((k, i) => options[i][k].placement);
}

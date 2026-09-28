import type { Look } from '@/data/catalog';
import { useBreakpoint } from '@/hooks/useViewport';
import { layout } from '@/theme/tokens';
import { LookCard, lookCardHeight } from './LookCard';
import styles from './Masonry.module.css';
import { WideEditorialCard } from './WideEditorialCard';

type Segment = { kind: 'columns'; columns: Look[][] } | { kind: 'wide'; look: Look };

/** Two columns on a phone, three on a tablet, four past the wide breakpoint. */
export const columnsFor = (breakpoint: 'phone' | 'tablet' | 'wide') =>
  breakpoint === 'wide' ? 4 : breakpoint === 'tablet' ? 3 : 2;

export const columnWidthFor = (containerWidth: number, count: number) =>
  (containerWidth - layout.margin * 2 - layout.gutter * (count - 1)) / count;

/**
 * Balanced columns: each card joins the shortest one. An editorial Look becomes a full-bleed Wide
 * card, placed only where the columns end within 24 px of each other (or after three more cards),
 * so the grid never leaves a hole.
 */
export function buildSegments(items: Look[], columnWidth: number, allowWide: boolean, count = 2): Segment[] {
  const segments: Segment[] = [];
  let columns: Look[][] = Array.from({ length: count }, () => []);
  let heights = new Array<number>(count).fill(0);
  const pending: Look[] = [];
  let sincePending = 0;

  const flush = () => {
    if (columns.some((c) => c.length)) segments.push({ kind: 'columns', columns });
    columns = Array.from({ length: count }, () => []);
    heights = new Array<number>(count).fill(0);
  };

  for (const look of items) {
    if (allowWide && look.editorial) {
      pending.push(look);
      sincePending = 0;
    } else {
      const h = lookCardHeight(look, columnWidth);
      let shortest = 0;
      for (let i = 1; i < count; i++) if (heights[i] < heights[shortest]) shortest = i;
      columns[shortest].push(look);
      heights[shortest] += h;
      if (pending.length) sincePending += 1;
    }
    const spread = Math.max(...heights) - Math.min(...heights);
    if (pending.length && columns.some((c) => c.length) && (spread <= 24 || sincePending >= 3)) {
      flush();
      pending.splice(0).forEach((l) => segments.push({ kind: 'wide', look: l }));
    }
  }
  flush();
  pending.forEach((l) => segments.push({ kind: 'wide', look: l }));
  return segments;
}

type Props = {
  looks: Look[];
  /** Width of the column the feed sits in, measured rather than assumed from the window. */
  containerWidth: number;
  allowWide?: boolean;
  toastBottom: number;
};

export function Masonry({ looks, containerWidth, allowWide = false, toastBottom }: Props) {
  const count = columnsFor(useBreakpoint());
  const columnWidth = columnWidthFor(containerWidth, count);
  if (columnWidth <= 0) return null;
  const segments = buildSegments(looks, columnWidth, allowWide, count);

  return (
    <div>
      {segments.map((seg, i) =>
        seg.kind === 'wide' ? (
          <WideEditorialCard key={seg.look.id} look={seg.look} width={containerWidth} toastBottom={toastBottom} />
        ) : (
          <div key={`cols-${i}`} className={styles.columns}>
            {seg.columns.map((col, c) => (
              <div key={c} className={styles.column} style={{ width: columnWidth }}>
                {col.map((look) => (
                  <LookCard key={look.id} look={look} width={columnWidth} toastBottom={toastBottom} />
                ))}
              </div>
            ))}
          </div>
        ),
      )}
    </div>
  );
}

import { useState } from 'react';
import { styles as styleList } from '@/data/catalog';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useViewport } from '@/hooks/useViewport';
import { BAND_RANGES } from '@/data/catalog';
import { EMPTY_FILTERS, type ResultKind, type SearchFilters } from '@/lib/search';
import { useTheme } from '@/theme/theme';
import { BottomSheet, sheetDetent } from './BottomSheet';
import { CheckIcon, XIcon } from './icons';
import styles from './FilterSheet.module.css';
import { Text } from './Text';

type Props = {
  open: boolean;
  value: SearchFilters;
  onApply: (next: SearchFilters) => void;
  onClose: () => void;
};

const KINDS: { key: ResultKind; label: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'looks', label: 'Looks' },
  { key: 'pieces', label: 'Pieces' },
  { key: 'creators', label: 'Creators' },
];

/** Filters live in the sheet until Show results; Clear all resets without closing. */
export function FilterSheet({ open, value, onApply, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useViewport();
  const { colors } = useTheme();
  const [draft, setDraft] = useState<SearchFilters>(value);
  // Re-seed whenever the sheet is reopened with different applied filters.
  const [seen, setSeen] = useState(value);
  if (open && seen !== value) {
    setSeen(value);
    setDraft(value);
  }

  const toggle = <T,>(list: T[], item: T) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const footerH = 84 + insets.bottom;

  const header = (
    <div className={styles.header}>
      <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
        <XIcon size={22} weight="bold" color={colors.iconPrimary} />
      </button>
      <Text variant="h3" as="h2" className={styles.title}>
        Filter by
      </Text>
      <span className={styles.close} aria-hidden="true" />
    </div>
  );

  return (
    <BottomSheet
      open={open}
      heights={[sheetDetent(height, 0.84) + insets.bottom]}
      index={0}
      onIndexChange={() => {}}
      onRequestClose={onClose}
      scrim={[0.4, 0.4]}
      scrimClosesSheet
      handle={header}
      aria-label="Filter results"
    >
      <div className="scroll" style={{ height: '100%', paddingBottom: footerH + 16 }}>
        <Text variant="label" color="textMuted" as="div" className={styles.group}>
          Show
        </Text>
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            role="radio"
            aria-checked={draft.kind === k.key}
            className={styles.row}
            onClick={() => setDraft({ ...draft, kind: k.key })}
          >
            <Text variant="bodyL" className={styles.rowText}>
              {k.label}
            </Text>
            <span className={draft.kind === k.key ? `${styles.radio} ${styles.radioOn}` : styles.radio} />
          </button>
        ))}

        <Text variant="label" color="textMuted" as="div" className={styles.group}>
          Style
        </Text>
        <div className={styles.chips}>
          {styleList
            .filter((s) => s !== 'All')
            .map((s) => {
              const on = draft.styles.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  className={on ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                  onClick={() => setDraft({ ...draft, styles: toggle(draft.styles, s) })}
                >
                  <Text variant="action" color={on ? 'actionInverse' : 'textSecondary'}>
                    {s}
                  </Text>
                </button>
              );
            })}
        </div>

        <Text variant="label" color="textMuted" as="div" className={styles.group}>
          Price
        </Text>
        <div className={styles.chips}>
          {BAND_RANGES.map((range, i) => {
            const band = i + 1;
            const on = draft.bands.includes(band);
            return (
              <button
                key={range}
                type="button"
                aria-pressed={on}
                className={on ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                onClick={() => setDraft({ ...draft, bands: toggle(draft.bands, band) })}
              >
                <Text variant="action" color={on ? 'actionInverse' : 'textSecondary'} tabular>
                  {range}
                </Text>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={draft.inStockOnly}
          className={styles.toggleRow}
          onClick={() => setDraft({ ...draft, inStockOnly: !draft.inStockOnly })}
        >
          <Text variant="bodyL" className={styles.rowText}>
            In stock only
          </Text>
          <span className={draft.inStockOnly ? `${styles.check} ${styles.checkOn}` : styles.check}>
            {draft.inStockOnly ? <CheckIcon size={15} weight="bold" color={colors.accentInverse} /> : null}
          </span>
        </button>
      </div>

      <div className={styles.footer} style={{ height: footerH, paddingBottom: insets.bottom }}>
        <button type="button" className={styles.clear} onClick={() => setDraft(EMPTY_FILTERS)}>
          <Text variant="action">Clear all</Text>
        </button>
        <button type="button" className={styles.apply} onClick={() => onApply(draft)}>
          <Text variant="action" style={{ color: 'var(--c-accentInverse)' }}>
            Show results
          </Text>
        </button>
      </div>
    </BottomSheet>
  );
}

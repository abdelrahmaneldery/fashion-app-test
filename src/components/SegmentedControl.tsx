import { motion } from 'framer-motion';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { TypeVariant } from '@/theme/tokens';
import styles from './SegmentedControl.module.css';
import { Text } from './Text';

export type Segment<K extends string> = { key: K; label: string; disabled?: boolean };

type Props<K extends string> = {
  segments: Segment<K>[];
  value: K;
  onChange: (key: K) => void;
  /** stretch: equal thirds over a hairline (price bands) · start: segments hug their text (feed switch) */
  align?: 'stretch' | 'start';
  /** tabs: switches what is shown below it · radios: picks a setting, and nothing moves */
  kind?: 'tabs' | 'radios';
  height?: number;
  textVariant?: TypeVariant;
  'aria-label'?: string;
};

type Underline = { left: number; width: number };

/** Underlined words, not pills: the selected label gets the 1 px seam line, which slides between segments. */
export function SegmentedControl<K extends string>({
  segments,
  value,
  onChange,
  align = 'stretch',
  kind = 'tabs',
  height = 36,
  textVariant = 'captionMedium',
  'aria-label': ariaLabel,
}: Props<K>) {
  const radios = kind === 'radios';
  const rowRef = useRef<HTMLDivElement>(null);
  const labels = useRef(new Map<string, HTMLSpanElement>());
  const [underline, setUnderline] = useState<Underline | null>(null);

  const measure = useCallback(() => {
    const row = rowRef.current;
    const label = labels.current.get(value);
    if (!row || !label) return;
    const rowBox = row.getBoundingClientRect();
    const box = label.getBoundingClientRect();
    const next = { left: box.left - rowBox.left, width: box.width };
    setUnderline((prev) => (prev && prev.left === next.left && prev.width === next.width ? prev : next));
  }, [value]);

  useLayoutEffect(() => {
    measure();
    const row = rowRef.current;
    if (!row) return;
    // Containers resize and webfonts land after first paint; both move the labels.
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div
      ref={rowRef}
      role={radios ? 'radiogroup' : 'tablist'}
      aria-label={ariaLabel}
      className={`${styles.row} ${align === 'stretch' ? styles.stretchRow : styles.startRow}`}
      style={{ height }}
    >
      {segments.map((s) => {
        const selected = s.key === value;
        return (
          <button
            type="button"
            key={s.key}
            role={radios ? 'radio' : 'tab'}
            {...(radios ? { 'aria-checked': selected } : { 'aria-selected': selected })}
            disabled={s.disabled}
            onClick={() => onChange(s.key)}
            className={align === 'stretch' ? `${styles.segment} ${styles.stretch}` : styles.segment}
          >
            <span
              ref={(el) => {
                if (el) labels.current.set(s.key, el);
                else labels.current.delete(s.key);
              }}
            >
              <Text variant={textVariant} color={selected ? 'textPrimary' : 'textMuted'}>
                {s.label}
              </Text>
            </span>
          </button>
        );
      })}
      {underline ? (
        <motion.span
          className={styles.seam}
          initial={false}
          animate={{ left: underline.left, width: underline.width }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        />
      ) : null}
    </div>
  );
}

import { audiences, type LookAudience } from '@/data/audience';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useViewport } from '@/hooks/useViewport';
import { useTheme } from '@/theme/theme';
import styles from './AudienceSheet.module.css';
import { BottomSheet, sheetDetent } from './BottomSheet';
import { IconButton } from './IconButton';
import { XIcon } from './icons';
import { Text } from './Text';

type Props = {
  open: boolean;
  value: LookAudience;
  onChange: (audience: LookAudience) => void;
  onClose: () => void;
};

/** Who a Look is for: one choice from three, each saying plainly who will see it. */
export function AudienceSheet({ open, value, onChange, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useViewport();
  const { colors } = useTheme();

  const header = (
    <div className={styles.header}>
      <span className={styles.side} aria-hidden="true" />
      <Text variant="h3" as="h2" className={styles.title}>
        Who can see this Look
      </Text>
      <span className={styles.side}>
        <IconButton icon={XIcon} aria-label="Close" onClick={onClose} />
      </span>
    </div>
  );

  return (
    <BottomSheet
      open={open}
      heights={[Math.min(sheetDetent(height, 0.6), 460) + insets.bottom]}
      index={0}
      onIndexChange={() => {}}
      onRequestClose={onClose}
      scrim={[0.4, 0.4]}
      scrimClosesSheet
      handle={header}
      aria-label="Who can see this Look"
    >
      <div className={styles.body} style={{ paddingBottom: insets.bottom + 16 }}>
        <div role="radiogroup" aria-label="Who can see this Look" className={styles.options}>
          {audiences.map((a) => {
            const on = a.key === value;
            const Glyph = a.icon;
            return (
              <button
                key={a.key}
                type="button"
                role="radio"
                aria-checked={on}
                className={on ? `${styles.option} ${styles.optionOn}` : styles.option}
                onClick={() => {
                  onChange(a.key);
                  onClose();
                }}
              >
                <span className={styles.icon}>
                  <Glyph size={20} color={colors.iconPrimary} />
                </span>
                <span className={styles.text}>
                  <Text variant="bodyMedium" as="span">
                    {a.label}
                  </Text>
                  <Text variant="caption" color="textMuted" as="span">
                    {a.line}
                  </Text>
                </span>
                <span className={on ? `${styles.radio} ${styles.radioOn}` : styles.radio} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
    </BottomSheet>
  );
}

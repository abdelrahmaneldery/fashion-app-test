import type { CSSProperties } from 'react';
import { useTheme } from '@/theme/theme';
import styles from './Button.module.css';
import type { Icon, IconWeight } from './icons';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'destructive';

type Props = {
  label: string;
  onClick?: () => void;
  variant?: Variant;
  leadingIcon?: Icon;
  leadingWeight?: IconWeight;
  trailingIcon?: Icon;
  disabled?: boolean;
  loading?: boolean;
  /** Tertiary only: FOLLOWING-style de-emphasis, no underline. */
  muted?: boolean;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
};

export function Button({
  label,
  onClick,
  variant = 'primary',
  leadingIcon: Leading,
  leadingWeight = 'light',
  trailingIcon: Trailing,
  disabled,
  loading,
  muted,
  className,
  style,
  'aria-label': ariaLabel,
}: Props) {
  const { colors } = useTheme();
  const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

  if (variant === 'tertiary' || variant === 'destructive') {
    const color = disabled || muted ? colors.textMuted : variant === 'destructive' ? colors.error : colors.textPrimary;
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        className={cx(styles.tertiary, className)}
        style={style}
      >
        <Text
          variant="label"
          style={{ color, ...(!muted && !disabled ? { textDecoration: 'underline', textUnderlineOffset: 3 } : null) }}
        >
          {label}
        </Text>
      </button>
    );
  }

  const primary = variant === 'primary';
  // Primary sits on the accent, so its label takes accentInverse (white everywhere) rather than
  // actionInverse, which follows the page and would turn near-black on a dark theme's red.
  const fg = disabled ? colors.textMuted : primary ? colors.accentInverse : colors.textPrimary;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel ?? label}
      aria-busy={!!loading}
      className={cx(styles.base, primary ? styles.primary : styles.secondary, className)}
      style={style}
    >
      {loading ? (
        <span className={styles.spinner} style={{ color: fg }} role="status" aria-label="Loading" />
      ) : (
        <span className={styles.row}>
          {Leading ? <Leading size={20} weight={leadingWeight} color={fg} /> : null}
          <Text variant="bodyMedium" lines={1} style={{ color: fg }}>
            {label}
          </Text>
          {Trailing ? <Trailing size={16} weight="regular" color={fg} /> : null}
        </span>
      )}
    </button>
  );
}

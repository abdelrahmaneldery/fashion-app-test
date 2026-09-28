import type { CSSProperties } from 'react';
import { onPhoto, useTheme } from '@/theme/theme';
import type { Icon, IconWeight } from './icons';
import styles from './IconButton.module.css';

type Props = {
  icon: Icon;
  onClick?: () => void;
  'aria-label': string;
  /**
   * overlay: dark circle on a photograph · floating: dark rounded square on a photograph ·
   * plain: the glyph alone · outlined: a 52 px disc on a surface
   */
  variant?: 'overlay' | 'floating' | 'plain' | 'outlined';
  /** plain only: sets the glyph on a Bone disc so it reads before it is pressed. */
  disc?: boolean;
  weight?: IconWeight;
  size?: number;
  color?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function IconButton({
  icon: IconCmp,
  onClick,
  'aria-label': ariaLabel,
  variant = 'plain',
  disc,
  weight = 'regular',
  size = 20,
  color,
  disabled,
  className,
  style,
}: Props) {
  const { colors } = useTheme();
  const overlay = variant === 'overlay';
  const outlined = variant === 'outlined';
  const floating = variant === 'floating';
  const fg = color ?? (overlay || floating ? onPhoto.textPrimary : colors.iconPrimary);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={[
        outlined ? styles.outlined : floating ? styles.floating : styles.hit,
        variant === 'plain' && styles.plain,
        variant === 'plain' && disc && styles.disc,
        disabled && styles.disabled,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {overlay ? (
        <span className={styles.circle}>
          <IconCmp size={size} weight={weight} color={fg} />
        </span>
      ) : (
        <IconCmp size={size} weight={weight} color={fg} />
      )}
    </button>
  );
}

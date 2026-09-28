import { motion } from 'framer-motion';
import { useCallback, type CSSProperties } from 'react';
import { track } from '@/lib/analytics';
import { haptics } from '@/lib/platform';
import { useSeamStore, type SaveRef } from '@/store/useSeamStore';
import { useTheme } from '@/theme/theme';
import type { ThemeName } from '@/theme/tokens';
import { Button } from './Button';
import { BookmarkSimpleIcon } from './icons';
import styles from './SaveButton.module.css';

/**
 * One Save rule everywhere: an unsaved item saves to All Saves instantly and opens the Lookbook sheet;
 * a saved item opens the sheet in manage mode (removal only happens there).
 */
export function useSaveAction(kind: SaveRef['kind'], id: string, theme: ThemeName, toastBottom: number) {
  const key = `${kind}:${id}`;
  const saved = useSeamStore((s) => key in s.saves);
  const save = useSeamStore((s) => s.save);
  const openSaveSheet = useSeamStore((s) => s.openSaveSheet);

  const onClick = useCallback(() => {
    const ref = { kind, id };
    if (saved) {
      openSaveSheet({ ref, theme, mode: 'manage', toastBottom });
      return;
    }
    save(ref);
    track({ name: 'save_created', kind, id });
    haptics.impact();
    openSaveSheet({ ref, theme, mode: 'file', toastBottom });
  }, [id, kind, openSaveSheet, save, saved, theme, toastBottom]);

  return { saved, onClick };
}

type Props = {
  kind: SaveRef['kind'];
  id: string;
  /**
   * overlay: 34 px glyph disc on photos · icon: plain 44 · outlined: 52 square · full: a wide labelled
   * button · pill: a compact "Save" at the end of an action row
   */
  variant: 'overlay' | 'icon' | 'outlined' | 'full' | 'pill';
  toastBottom: number;
  className?: string;
  style?: CSSProperties;
  fullLabel?: string;
};

export function SaveButton({ kind, id, variant, toastBottom, className, style, fullLabel = 'Save look' }: Props) {
  const { name, colors } = useTheme();
  const { saved, onClick } = useSaveAction(kind, id, name, toastBottom);
  const label = saved ? 'Saved. Change Lookbooks' : 'Save';

  if (variant === 'pill') {
    return (
      <Button
        label={saved ? 'Saved' : 'Save'}
        variant={saved ? 'secondary' : 'primary'}
        onClick={onClick}
        className={className}
        style={{ height: 44, padding: '0 22px', ...style }}
        aria-label={label}
      />
    );
  }

  if (variant === 'full') {
    return (
      <Button
        label={saved ? 'Saved' : fullLabel}
        variant={saved ? 'secondary' : 'primary'}
        leadingIcon={BookmarkSimpleIcon}
        leadingWeight={saved ? 'fill' : 'light'}
        onClick={onClick}
        className={className}
        style={style}
        aria-label={label}
      />
    );
  }

  const overlay = variant === 'overlay';
  const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

  const press = (e: React.MouseEvent) => {
    // Cards wrap the whole tile in a link; saving must not navigate.
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  // On a photograph the action is a bookmark on smoked glass, so the picture keeps the room.
  if (overlay) {
    return (
      <motion.button
        type="button"
        onClick={press}
        aria-label={label}
        aria-pressed={saved}
        className={cx(styles.overlay, className)}
        style={style}
        animate={saved ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        transition={{ duration: 0.15, times: [0, 0.5, 1] }}
      >
        <BookmarkSimpleIcon size={18} weight={saved ? 'fill' : 'regular'} color="#FFFFFF" />
      </motion.button>
    );
  }

  return (
    <button
      type="button"
      onClick={press}
      aria-label={label}
      aria-pressed={saved}
      className={cx(styles.disc, variant === 'outlined' && styles.large, className)}
      style={style}
    >
      <motion.span
        className={styles.mark}
        animate={saved ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        transition={{ duration: 0.15, times: [0, 0.5, 1] }}
      >
        <BookmarkSimpleIcon
          size={variant === 'outlined' ? 22 : 20}
          weight={saved ? 'fill' : 'regular'}
          color={saved ? colors.accent : colors.iconPrimary}
        />
      </motion.span>
    </button>
  );
}

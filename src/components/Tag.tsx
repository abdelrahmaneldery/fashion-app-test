import type { CSSProperties } from 'react';
import { onPhoto } from '@/theme/theme';
import styles from './Tag.module.css';
import { Text } from './Text';

/** A 12 px miniature eyelet: ring plus dot (hollow when off). */
export function PiecesGlyph({ filled = true, color = onPhoto.textPrimary }: { filled?: boolean; color?: string }) {
  return (
    <span className={styles.glyph} style={{ color }}>
      {filled ? <span className={styles.glyphDot} /> : null}
    </span>
  );
}

/** Informational tag on photographs: a 2 px rectangle, never a pill, never tappable. */
export function Tag({ text, glyph, className, style }: { text: string; glyph?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <span className={[styles.tag, className].filter(Boolean).join(' ')} style={style}>
      {glyph ? <PiecesGlyph /> : null}
      <Text variant="microUpper" style={{ color: onPhoto.textPrimary }}>
        {text}
      </Text>
    </span>
  );
}

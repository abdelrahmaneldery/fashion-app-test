import { onPhoto } from '@/theme/theme';
import styles from './PiecesPill.module.css';
import { PiecesGlyph } from './Tag';
import { Text } from './Text';

/** Opens every tag on a Look. A pill because it's interactive, and it says how many there are. */
export function PiecesPill({ count, open, onOpen }: { count: number; open: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`Show all ${count} pieces`}
      onClick={onOpen}
      className={styles.hit}
    >
      <span className={styles.pill}>
        <PiecesGlyph filled={open} />
        <Text variant="microUpper" style={{ color: onPhoto.textPrimary }}>
          {count} pieces
        </Text>
      </span>
    </button>
  );
}

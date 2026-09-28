import { importSourceByKey, type ImportSourceKey } from '@/data/importSources';
import { useTheme } from '@/theme/theme';
import styles from './SourceLogo.module.css';

type Props = {
  source: ImportSourceKey;
  /** The row's icon size; each logo is drawn to the same visual weight. */
  size: number;
};

/**
 * A platform's logo in the platform's own colours. The one exception is a black logo, which is drawn in
 * the page's light ink on dark surfaces so it does not vanish. Decorative: whatever holds it carries the name.
 */
export function SourceLogo({ source, size }: Props) {
  const { isDark } = useTheme();
  const mark = importSourceByKey[source].mark;
  const height = Math.round(size * mark.height);

  return (
    <img
      className={mark.mono && isDark ? `${styles.image} ${styles.onDark}` : styles.image}
      src={mark.src}
      alt=""
      width={Math.round(height * mark.aspect)}
      height={height}
      draggable={false}
    />
  );
}

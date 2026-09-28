import { motion } from 'framer-motion';
import styles from './Switch.module.css';

/**
 * The switch's appearance only. Rows here are tappable end to end, so the caller owns the
 * `<button role="switch" aria-checked>` and this draws the state — one control per element.
 */
export function Switch({ checked }: { checked: boolean }) {
  return (
    <span className={styles.track} data-on={checked} aria-hidden="true">
      <motion.span layout transition={{ duration: 0.15 }} className={styles.knob} />
    </span>
  );
}

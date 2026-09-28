import { AnimatePresence, motion } from 'framer-motion';
import { useOnEscape } from '@/hooks/useOnEscape';
import styles from './ActionMenu.module.css';
import { Text } from './Text';

export type MenuOption = { label: string; onSelect: () => void; destructive?: boolean };

type Props = {
  open: boolean;
  title?: string;
  options: MenuOption[];
  onClose: () => void;
};

/**
 * The web stand-in for the native action sheet: a short list of choices over a scrim, dismissed by
 * the scrim, Cancel or Escape.
 */
export function ActionMenu({ open, title, options, onClose }: Props) {
  useOnEscape(open, onClose);

  return (
    <AnimatePresence>
      {open ? (
        <div className={styles.root}>
          <motion.button
            type="button"
            aria-label="Close"
            className={styles.scrim}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title ?? 'Options'}
            className={styles.card}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {title ? (
              <Text variant="label" color="textMuted" className={styles.title}>
                {title}
              </Text>
            ) : null}
            {options.map((option) => (
              <button
                key={option.label}
                type="button"
                className={styles.option}
                onClick={() => {
                  option.onSelect();
                  onClose();
                }}
              >
                <Text variant="body" color={option.destructive ? 'error' : 'textPrimary'}>
                  {option.label}
                </Text>
              </button>
            ))}
            <button type="button" className={styles.cancel} onClick={onClose}>
              <Text variant="bodyMedium">Cancel</Text>
            </button>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

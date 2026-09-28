import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useSeamStore } from '@/store/useSeamStore';
import { ThemeScope } from '@/theme/theme';
import { themes } from '@/theme/tokens';
import { CheckIcon } from './icons';
import { Text } from './Text';
import styles from './ToastHost.module.css';

/** Toasts are always Graphite with Bone text, so they read on both Ink and Bone screens. */
export function ToastHost() {
  const toast = useSeamStore((s) => s.toast);
  const hide = useSeamStore((s) => s.hideToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(hide, 4000);
    return () => clearTimeout(t);
  }, [toast, hide]);

  return (
    <ThemeScope name="dark">
      <AnimatePresence>
        {toast ? (
          <motion.div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={styles.toast}
            style={{ bottom: toast.bottom }}
            initial={{ opacity: 0, y: 24, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 24, x: '-50%' }}
            transition={{ duration: 0.2 }}
          >
            <CheckIcon size={16} weight="regular" color={themes.dark.success} />
            <Text variant="body" lines={1} className={styles.message}>
              {toast.message}
            </Text>
            {toast.actionLabel ? (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  toast.onAction?.();
                  hide();
                }}
              >
                <Text variant="label" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
                  {toast.actionLabel}
                </Text>
              </button>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </ThemeScope>
  );
}

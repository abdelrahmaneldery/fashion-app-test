import { forwardRef } from 'react';
import { useTheme } from '@/theme/theme';
import { MagnifyingGlassIcon, ScanIcon, XIcon } from './icons';
import styles from './SearchBar.module.css';
import { Text } from './Text';

type Props = {
  /** Live input. Omit `onChange` to render a button that navigates to the search screen instead. */
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  onOpen?: () => void;
  onCamera?: () => void;
  onClear?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
};

/**
 * One pill for every search surface. Home and Explore render the static form, which is a button;
 * the Search screen renders the live form, which is a real text input.
 */
export const SearchBar = forwardRef<HTMLInputElement, Props>(function SearchBar(
  { value, onChange, onSubmit, onOpen, onCamera, onClear, placeholder = 'Search Looks and pieces', autoFocus },
  ref,
) {
  const { colors } = useTheme();
  const glass = <MagnifyingGlassIcon size={20} weight="bold" color={colors.textSecondary} />;

  if (!onChange) {
    return (
      <div className={styles.bar}>
        {glass}
        <Text variant="bodyL" color="textMuted" className={styles.placeholder}>
          {placeholder}
        </Text>
        {/*
          The pill opens search through a button stretched across it, and the camera is a sibling
          above that — one control per element, rather than a second one nested in the first.
        */}
        <button type="button" className={styles.open} onClick={onOpen} aria-label={placeholder} />
        {onCamera ? (
          <button
            type="button"
            className={`${styles.trailing} ${styles.above}`}
            aria-label="Search with a photo"
            onClick={onCamera}
          >
            <ScanIcon size={21} weight="regular" color={colors.iconPrimary} />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <form
      className={styles.bar}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      role="search"
    >
      {glass}
      <input
        ref={ref}
        className={styles.field}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        enterKeyHint="search"
      />
      {value ? (
        <button type="button" className={styles.trailing} aria-label="Clear search" onClick={onClear}>
          <XIcon size={18} weight="bold" color={colors.textSecondary} />
        </button>
      ) : onCamera ? (
        <button type="button" className={styles.trailing} aria-label="Search with a photo" onClick={onCamera}>
          <ScanIcon size={21} weight="regular" color={colors.iconPrimary} />
        </button>
      ) : null}
    </form>
  );
});

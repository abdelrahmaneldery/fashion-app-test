import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useViewport } from '@/hooks/useViewport';
import { normalizeUrl } from '@/lib/links';
import { useTheme } from '@/theme/theme';
import { BottomSheet, sheetDetent } from './BottomSheet';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { XIcon } from './icons';
import styles from './TagEditor.module.css';
import { Text } from './Text';

/** A mark on a Look: what the piece is called, where it sits, and where tapping it goes. */
export type LookTag = {
  id: string;
  name: string;
  /** Who makes the piece, shown above the name when someone hovers the tag. '' when unknown. */
  brand: string;
  /** Absolute and tidied, or '' when the tag carries no link. */
  url: string;
  /** Fractions of the photo, 0–1 on both axes. */
  x: number;
  y: number;
};

type Props = {
  /** The tag being written, or null when the editor is closed. */
  tag: LookTag | null;
  /** True while the tag has not been added to the Look yet, which decides Cancel vs Remove. */
  isNew: boolean;
  onSave: (tag: LookTag) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
};

/** Writes one tag: a name, an optional link, and nothing else to think about. */
export function TagEditor({ tag, isNew, onSave, onRemove, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useViewport();
  const { colors } = useTheme();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Every opening starts from what is saved — closing the editor drops the draft with it, so a
  // tag abandoned half-written comes back as it was, not as it was left.
  const [seen, setSeen] = useState<string | null>(null);
  const key = tag ? tag.id : null;
  if (key !== seen) {
    setSeen(key);
    if (tag) {
      setName(tag.name);
      setBrand(tag.brand);
      setUrl(tag.url);
      setError(null);
    }
  }

  const open = !!tag;
  useEffect(() => {
    if (!open) return;
    // After the sheet has travelled, so the keyboard does not fight the animation.
    const id = window.setTimeout(() => nameRef.current?.focus(), 260);
    return () => window.clearTimeout(id);
  }, [open, seen]);

  const submit = () => {
    if (!tag) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the tag a name.');
      nameRef.current?.focus();
      return;
    }
    const link = normalizeUrl(url);
    if (link === null) {
      setError('That link is not a web address.');
      return;
    }
    onSave({ ...tag, name: trimmed, brand: brand.trim(), url: link });
  };

  return (
    <BottomSheet
      open={open}
      heights={[sheetDetent(height, 0.74) + insets.bottom]}
      index={0}
      onIndexChange={() => {}}
      onRequestClose={onClose}
      scrim={[0.4, 0.4]}
      scrimClosesSheet
      handle={
        <div className={styles.header}>
          <Text variant="h3" as="h2" className={styles.title}>
            {isNew ? 'Add a tag' : 'Edit tag'}
          </Text>
          <IconButton icon={XIcon} aria-label="Close" onClick={onClose} />
        </div>
      }
      aria-label={isNew ? 'Add a tag' : 'Edit tag'}
    >
      <form
        className={styles.form}
        style={{ paddingBottom: insets.bottom + 16 }}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className={styles.field}>
          <Text variant="label" color="textMuted" as="div">
            Tag name
          </Text>
          <input
            ref={nameRef}
            className={styles.input}
            value={name}
            maxLength={40}
            placeholder="Linen blazer"
            enterKeyHint="next"
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
        </label>

        <label className={styles.field}>
          <Text variant="label" color="textMuted" as="div">
            Brand
          </Text>
          <input
            className={styles.input}
            value={brand}
            maxLength={32}
            placeholder="Maren"
            enterKeyHint="next"
            onChange={(e) => {
              setBrand(e.target.value);
              setError(null);
            }}
          />
        </label>

        <label className={styles.field}>
          <Text variant="label" color="textMuted" as="div">
            Link
          </Text>
          <input
            className={styles.input}
            value={url}
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="brand.com/linen-blazer"
            enterKeyHint="done"
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
          />
          <Text variant="caption" color="textMuted" as="div">
            Where tapping this tag takes people. Optional.
          </Text>
        </label>

        <div className={styles.status} role={error ? 'alert' : undefined}>
          {error ? (
            <Text variant="caption" style={{ color: colors.error }}>
              {error}
            </Text>
          ) : null}
        </div>

        <div className={styles.actions}>
          {isNew ? (
            <button type="button" className={styles.ghost} onClick={onClose}>
              <Text variant="action">Cancel</Text>
            </button>
          ) : (
            <button type="button" className={styles.ghost} onClick={() => tag && onRemove(tag.id)}>
              <Text variant="action" style={{ color: colors.error }}>
                Remove
              </Text>
            </button>
          )}
          <Button label={isNew ? 'Add tag' : 'Save tag'} onClick={submit} style={{ flex: 1 }} />
        </div>
      </form>
    </BottomSheet>
  );
}

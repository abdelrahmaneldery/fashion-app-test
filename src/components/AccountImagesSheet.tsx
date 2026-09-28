import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { importSourceByKey, type ImportSourceKey } from '@/data/importSources';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useViewport } from '@/hooks/useViewport';
import { track } from '@/lib/analytics';
import { importAdapters, type AccountImage } from '@/lib/imports';
import { useSeamStore } from '@/store/useSeamStore';
import { space } from '@/theme/tokens';
import styles from './AccountImagesSheet.module.css';
import { BottomSheet, sheetDetent } from './BottomSheet';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { CheckIcon, XIcon } from './icons';
import { Image } from './Image';
import { SourceLogo } from './SourceLogo';
import { Tag } from './Tag';
import { Text } from './Text';

type Props = {
  /** The connected platform whose photos are shown, or null when the sheet is closed. */
  source: ImportSourceKey | null;
  onClose: () => void;
};

type Load = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; images: AccountImage[] };

/** Placeholder tiles while the account answers: three rows, the shape of what is coming. */
const PLACEHOLDERS = Array.from({ length: 9 }, (_, i) => i);

/**
 * The photos on a connected account. Pick any number and they are added to your SEAM account, where
 * your profile shows them; anything already brought in is marked, so nothing arrives twice.
 */
export function AccountImagesSheet({ source, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useViewport();
  const navigate = useNavigate();
  const connections = useSeamStore((s) => s.connections);
  const imported = useSeamStore((s) => s.importedImages);
  const addImportedImages = useSeamStore((s) => s.addImportedImages);
  const disconnectSource = useSeamStore((s) => s.disconnectSource);
  const showToast = useSeamStore((s) => s.showToast);

  // The platform stays shown while the sheet slides away, so its content does not empty mid-exit.
  const [shown, setShown] = useState<ImportSourceKey | null>(source);
  const [opened, setOpened] = useState<ImportSourceKey | null>(null);
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [selected, setSelected] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);

  // Every opening starts from a clean selection and a fresh list, even on the same platform as last time.
  if (source !== opened) {
    setOpened(source);
    if (source) {
      setShown(source);
      setSelected([]);
      setLoad({ status: 'loading' });
    }
  }

  useEffect(() => {
    if (!source) return;
    let live = true;
    importAdapters[source]
      .listImages()
      .then((images) => live && setLoad({ status: 'ready', images }))
      .catch(() => live && setLoad({ status: 'failed' }));
    return () => {
      live = false;
    };
  }, [source, attempt]);

  const added = useMemo(
    () => new Set(imported.filter((i) => i.source === shown).map((i) => i.sourceId)),
    [imported, shown],
  );

  if (!shown) return null;
  const { name } = importSourceByKey[shown];
  const handle = connections[shown]?.handle ?? '';
  const toastBottom = insets.bottom + space.s24;

  const toggle = (id: string) =>
    setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const add = () => {
    if (load.status !== 'ready') return;
    // In the order the account shows them, newest first, rather than the order they were tapped.
    const ids = load.images.map((image) => image.id).filter((id) => selected.includes(id));
    const count = addImportedImages(shown, ids);
    track({ name: 'images_imported', source: shown, count });
    showToast({
      message: count === 1 ? '1 image added to your profile' : `${count} images added to your profile`,
      actionLabel: 'View',
      onAction: () => navigate('/profile'),
      bottom: toastBottom,
    });
    onClose();
  };

  const disconnect = () => {
    disconnectSource(shown);
    track({ name: 'import_disconnected', source: shown });
    showToast({ message: `Signed out of ${name}. Images you added stay on your profile.`, bottom: toastBottom });
    onClose();
  };

  const header = (
    <div className={styles.header}>
      <div className={styles.account}>
        <SourceLogo source={shown} size={22} />
        <Text variant="caption" color="textMuted" lines={1}>
          {handle}
        </Text>
      </div>
      <Button variant="tertiary" label="Disconnect" aria-label={`Disconnect ${name}`} onClick={disconnect} />
      <IconButton icon={XIcon} aria-label="Close" onClick={onClose} />
    </div>
  );

  const count = selected.length;

  return (
    <BottomSheet
      open={!!source}
      heights={[sheetDetent(height, 0.9) + insets.bottom]}
      index={0}
      onIndexChange={() => {}}
      onRequestClose={onClose}
      scrim={[0.4, 0.4]}
      scrimClosesSheet
      handle={header}
      aria-label={`Your photos on ${name}`}
    >
      <div className={styles.body}>
        <div className={`scroll ${styles.scroller}`}>
          {load.status === 'failed' ? (
            <div className={styles.message} role="alert">
              <Text variant="h3" as="p">
                {`Couldn't load your ${name} photos`}
              </Text>
              <Text variant="body" color="textSecondary" as="p">
                Check your connection and try again.
              </Text>
              <Button
                variant="secondary"
                label="Try again"
                onClick={() => {
                  setLoad({ status: 'loading' });
                  setAttempt((n) => n + 1);
                }}
              />
            </div>
          ) : load.status === 'ready' && !load.images.length ? (
            <div className={styles.message}>
              <Text variant="h3" as="p">
                No photos yet
              </Text>
              <Text variant="body" color="textSecondary" as="p">
                {`Photos you post on ${name} will show up here.`}
              </Text>
            </div>
          ) : (
            <div
              className={styles.grid}
              role="group"
              aria-label={`Your photos on ${name}`}
              aria-busy={load.status === 'loading'}
            >
              {load.status === 'loading'
                ? PLACEHOLDERS.map((i) => <span key={i} className={styles.placeholder} />)
                : load.images.map((image) => {
                    const done = added.has(image.id);
                    const on = selected.includes(image.id);
                    return (
                      <button
                        key={image.id}
                        type="button"
                        className={[styles.tile, on && styles.tileOn, done && styles.tileDone].filter(Boolean).join(' ')}
                        aria-pressed={on}
                        aria-label={done ? `${image.description}, already added` : image.description}
                        disabled={done}
                        onClick={() => toggle(image.id)}
                      >
                        <Image src={image.src} transition={0} />
                        {done ? (
                          <Tag text="Added" className={styles.addedTag} />
                        ) : (
                          <span className={on ? `${styles.check} ${styles.checkOn}` : styles.check} aria-hidden="true">
                            {on ? <CheckIcon size={14} weight="bold" color="#0B0B0C" /> : null}
                          </span>
                        )}
                      </button>
                    );
                  })}
            </div>
          )}
        </div>

        <div className={styles.footer} style={{ paddingBottom: insets.bottom + 12 }}>
          <Button
            label={count ? `Add ${count} ${count === 1 ? 'image' : 'images'}` : 'Choose photos to add'}
            disabled={!count}
            onClick={add}
            className={styles.cta}
          />
        </div>
      </div>
    </BottomSheet>
  );
}

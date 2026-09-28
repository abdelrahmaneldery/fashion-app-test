import { useMemo, useRef, useState, type ReactNode } from 'react';
import { lookImage, looks, productImage, products } from '@/data/catalog';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useViewport } from '@/hooks/useViewport';
import { track } from '@/lib/analytics';
import { haptics } from '@/lib/platform';
import { parseKey, refKey, useSeamStore, type Lookbook, type SaveSheetState } from '@/store/useSeamStore';
import { ThemeScope, useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';
import { BottomSheet, sheetDetent } from './BottomSheet';
import { Button } from './Button';
import { CaretLeftIcon, CaretRightIcon, CheckIcon, LockSimpleIcon, PlusIcon } from './icons';
import { Image } from './Image';
import styles from './SaveSheetHost.module.css';
import { Switch } from './Switch';
import { Text } from './Text';

const thumbFor = (key: string) => {
  const ref = parseKey(key);
  return ref.kind === 'look' ? lookImage(ref.id) : productImage(ref.id);
};

/** Rendered once at the root. Saving has already happened by the time this opens; the sheet only files. */
export function SaveSheetHost() {
  const sheet = useSeamStore((s) => s.saveSheet);
  // Keep the last sheet on screen while it animates closed.
  const [current, setCurrent] = useState<SaveSheetState | null>(sheet);
  if (sheet && sheet !== current) setCurrent(sheet);
  if (!current) return null;
  return (
    <ThemeScope name={current.theme}>
      <SaveSheet key={current.session} open={!!sheet} state={current} />
    </ThemeScope>
  );
}

function SaveSheet({ open, state }: { open: boolean; state: SaveSheetState }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useViewport();
  const { ref, mode, toastBottom } = state;
  const key = refKey(ref);

  const lookbooks = useSeamStore((s) => s.lookbooks);
  const toggleInLookbook = useSeamStore((s) => s.toggleInLookbook);
  const createLookbook = useSeamStore((s) => s.createLookbook);
  const unsave = useSeamStore((s) => s.unsave);
  const restore = useSeamStore((s) => s.restore);
  const close = useSeamStore((s) => s.closeSaveSheet);
  const openSaveSheet = useSeamStore((s) => s.openSaveSheet);
  const showToast = useSeamStore((s) => s.showToast);

  const [step, setStep] = useState<'list' | 'new'>('list');
  const [name, setName] = useState('');
  const [isPrivate, setPrivate] = useState(true);
  const picked = useRef(false);

  const reopenManage = () => openSaveSheet({ ...state, mode: 'manage' });
  const containing = lookbooks.filter((lb) => lb.items.includes(key));
  const sorted = useMemo(() => [...lookbooks].sort((a, b) => b.updatedAt - a.updatedAt), [lookbooks]);
  const suggested = mode === 'file' ? sorted[0] : undefined;
  const rest = suggested ? sorted.filter((lb) => lb.id !== suggested.id) : sorted;

  const suggestions = useMemo(() => {
    if (ref.kind === 'look') {
      const l = looks[ref.id];
      return [l.style, `${l.occasion} looks`, 'Summer tailoring'];
    }
    const p = products[ref.id];
    const noun = p.label.charAt(0) + p.label.slice(1).toLowerCase();
    return [noun, 'Workwear', 'Summer tailoring'];
  }, [ref]);

  const dismiss = () => {
    close();
    if (mode === 'file' && !picked.current) {
      showToast({ message: 'Saved to All Saves', actionLabel: 'Organize', onAction: reopenManage, bottom: toastBottom });
    }
  };

  const pick = (lb: Lookbook) => {
    const had = lb.items.includes(key);
    toggleInLookbook(lb.id, ref);
    haptics.selection();
    if (mode === 'manage' || had) return;
    picked.current = true;
    track({ name: 'lookbook_filed', kind: ref.kind, id: ref.id, newLookbook: false });
    setTimeout(() => {
      close();
      showToast({ message: `Saved to ${lb.name}`, actionLabel: 'Change', onAction: reopenManage, bottom: toastBottom });
    }, 400);
  };

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createLookbook(trimmed, isPrivate, ref);
    track({ name: 'lookbook_filed', kind: ref.kind, id: ref.id, newLookbook: true });
    picked.current = true;
    close();
    showToast({ message: `Saved to ${trimmed}`, actionLabel: 'Change', onAction: reopenManage, bottom: toastBottom });
  };

  const remove = () => {
    const ids = containing.map((lb) => lb.id);
    unsave(ref);
    track({ name: 'save_removed', kind: ref.kind, id: ref.id });
    close();
    showToast({ message: 'Removed from All Saves', actionLabel: 'Undo', onAction: () => restore(ref, ids), bottom: toastBottom });
  };

  const header =
    step === 'list' ? (
      <div className={styles.header}>
        <div className={styles.thumb}>
          <Image src={thumbFor(key)} transition={0} />
        </div>
        <div className={styles.headerText}>
          <div className={styles.savedLine}>
            <Text variant="h3" as="h2">
              Saved
            </Text>
            <CheckIcon size={16} weight="regular" color={colors.textPrimary} />
          </div>
          <Text variant="caption" color="textMuted">
            {mode === 'manage' && containing.length
              ? `Saved in ${containing.length} Lookbook${containing.length > 1 ? 's' : ''}`
              : 'In All Saves'}
          </Text>
        </div>
        <button type="button" onClick={dismiss} className={styles.headerAction}>
          <Text variant="bodyMedium">Done</Text>
        </button>
      </div>
    ) : (
      <div className={styles.header}>
        <button type="button" onClick={() => setStep('list')} aria-label="Back" className={styles.back}>
          <CaretLeftIcon size={20} weight="light" color={colors.iconPrimary} />
        </button>
        <Text variant="h3" as="h2" className={styles.title}>
          New Lookbook
        </Text>
        <button type="button" onClick={create} disabled={!name.trim()} className={styles.headerAction}>
          <Text variant="bodyMedium" color={name.trim() ? 'textPrimary' : 'textMuted'}>
            Create
          </Text>
        </button>
      </div>
    );

  return (
    <BottomSheet
      open={open}
      heights={[sheetDetent(screenH, 0.54) + insets.bottom, screenH - (insets.top + 53)]}
      index={step === 'new' ? 1 : 0}
      onIndexChange={(i) => i === 0 && step === 'new' && setStep('list')}
      onRequestClose={dismiss}
      scrim={[0.4, 0.4]}
      scrimClosesSheet
      handle={header}
      aria-label="Save to a Lookbook"
    >
      {step === 'list' ? (
        <div className="scroll" style={{ height: '100%', paddingBottom: insets.bottom + space.s24 }}>
          <Row
            onOpen={() => setStep('new')}
            cover={
              <span className={`${styles.cover} ${styles.dashed}`}>
                <PlusIcon size={16} weight="regular" color={colors.iconPrimary} />
              </span>
            }
            title="New Lookbook"
            trailing={<CaretRightIcon size={16} weight="regular" color={colors.iconSecondary} />}
          />
          {suggested ? (
            <>
              <Text variant="label" color="textMuted" as="div" className={styles.section}>
                Suggested
              </Text>
              <LookbookRow lb={suggested} itemKey={key} onOpen={() => pick(suggested)} />
            </>
          ) : null}
          <Text variant="label" color="textMuted" as="div" className={styles.section}>
            Your Lookbooks
          </Text>
          {rest.map((lb) => (
            <LookbookRow key={lb.id} lb={lb} itemKey={key} onOpen={() => pick(lb)} />
          ))}
          {mode === 'manage' ? (
            <div className={styles.remove}>
              <Button label="Remove from All Saves" variant="destructive" onClick={remove} />
            </div>
          ) : null}
        </div>
      ) : (
        <div className={styles.newWrap}>
          <div className={styles.newCover}>
            <Image src={thumbFor(key)} transition={0} />
          </div>
          <div className={styles.field}>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 40))}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder="Name your Lookbook"
              aria-label="Lookbook name"
              className={styles.input}
            />
            <Text variant="micro" color="textMuted" tabular>{`${name.length}/40`}</Text>
          </div>
          <div className={styles.chips}>
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => setName(s)} className={styles.chip}>
                <Text variant="captionMedium" color="textSecondary">
                  {s}
                </Text>
              </button>
            ))}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPrivate}
            onClick={() => setPrivate((v) => !v)}
            className={styles.privateRow}
          >
            <Text variant="body">Private</Text>
            <Switch checked={isPrivate} />
          </button>
        </div>
      )}
    </BottomSheet>
  );
}

function Row({
  onOpen,
  cover,
  title,
  subtitle,
  trailing,
}: {
  onOpen: () => void;
  cover: ReactNode;
  title: string;
  subtitle?: ReactNode;
  trailing: ReactNode;
}) {
  return (
    <button type="button" onClick={onOpen} className={styles.row}>
      {cover}
      <span className={styles.rowText}>
        <Text variant="body" lines={1}>
          {title}
        </Text>
        {subtitle}
      </span>
      <span className={styles.trailing}>{trailing}</span>
    </button>
  );
}

function LookbookRow({ lb, itemKey, onOpen }: { lb: Lookbook; itemKey: string; onOpen: () => void }) {
  const { colors } = useTheme();
  const inIt = lb.items.includes(itemKey);
  const covers = lb.items.slice(0, 4);
  return (
    <Row
      onOpen={onOpen}
      title={lb.name}
      cover={
        <span className={`${styles.cover} ${styles.mosaic}`}>
          {covers.map((k) => (
            <img key={k} src={thumbFor(k)} alt="" className={styles.mosaicCell} style={{ objectFit: 'cover' }} />
          ))}
        </span>
      }
      subtitle={
        <span className={styles.subtitle}>
          <Text variant="caption" color="textMuted">{`${lb.items.length} item${lb.items.length === 1 ? '' : 's'}`}</Text>
          {lb.isPrivate ? <LockSimpleIcon size={12} weight="regular" color={colors.textMuted} /> : null}
        </span>
      }
      trailing={
        <span
          aria-label={inIt ? 'In this Lookbook' : 'Not in this Lookbook'}
          className={`${styles.check} ${inIt ? styles.checkOn : styles.checkOff}`}
        >
          {inIt ? <CheckIcon size={14} weight="bold" color={colors.actionInverse} /> : null}
        </span>
      }
    />
  );
}

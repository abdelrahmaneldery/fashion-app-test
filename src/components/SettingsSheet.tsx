import { Link } from 'react-router-dom';
import { creators } from '@/data/catalog';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useViewport } from '@/hooks/useViewport';
import { selectTheme, useSeamStore, type ThemeMode } from '@/store/useSeamStore';
import { useTheme } from '@/theme/theme';
import { Avatar } from './Avatar';
import { BottomSheet, sheetDetent } from './BottomSheet';
import { CaretRightIcon, XIcon } from './icons';
import { SegmentedControl, type Segment } from './SegmentedControl';
import styles from './SettingsSheet.module.css';
import { Text } from './Text';

const MODES: Segment<ThemeMode>[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

/**
 * Everything the profile keeps out of its own way: the colour mode, the boards and the creators
 * you follow. Opened from the list button in the profile's top bar.
 */
export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { height } = useViewport();
  const { colors } = useTheme();

  const mode = useSeamStore((s) => s.themeMode);
  const showing = useSeamStore(selectTheme);
  const setThemeMode = useSeamStore((s) => s.setThemeMode);
  const lookbooks = useSeamStore((s) => s.lookbooks);
  const following = useSeamStore((s) => s.following);
  const toggleFollow = useSeamStore((s) => s.toggleFollow);

  const header = (
    <div className={styles.header}>
      <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
        <XIcon size={22} weight="bold" color={colors.iconPrimary} />
      </button>
      <Text variant="h3" as="h2" className={styles.title}>
        Settings
      </Text>
      <span className={styles.close} aria-hidden="true" />
    </div>
  );

  return (
    <BottomSheet
      open={open}
      heights={[sheetDetent(height, 0.9) + insets.bottom]}
      index={0}
      onIndexChange={() => {}}
      onRequestClose={onClose}
      scrim={[0.4, 0.4]}
      scrimClosesSheet
      handle={header}
      aria-label="Settings"
    >
      <div className="scroll" style={{ height: '100%', paddingBottom: insets.bottom + 24 }}>
        <Text variant="label" color="textMuted" as="div" className={styles.group}>
          Appearance
        </Text>
        <div className={styles.segment}>
          <SegmentedControl
            segments={MODES}
            value={mode}
            onChange={setThemeMode}
            kind="radios"
            height={44}
            textVariant="bodyMedium"
            aria-label="Appearance"
          />
        </div>
        <Text variant="caption" color="textMuted" as="p" className={styles.note}>
          {mode === 'system'
            ? `Following this device, which is set to ${showing === 'dark' ? 'dark' : 'light'}. Change it there and SEAM changes with it.`
            : `Staying ${mode} whatever this device is set to.`}
        </Text>

        <Text variant="label" color="textMuted" as="div" className={styles.group}>
          Your SEAM
        </Text>
        <Link to="/lookbooks" className={styles.row} onClick={onClose}>
          <span className={styles.rowText}>
            <Text variant="bodyL" as="div">
              Lookbooks
            </Text>
            <Text variant="caption" color="textMuted" as="div">
              {`${lookbooks.length} board${lookbooks.length === 1 ? '' : 's'}`}
            </Text>
          </span>
          <CaretRightIcon size={18} weight="bold" color={colors.iconSecondary} />
        </Link>

        <Text variant="label" color="textMuted" as="div" className={styles.group}>
          Creators
        </Text>
        {Object.values(creators).map((creator) => {
          const on = following.includes(creator.id);
          return (
            <div key={creator.id} className={styles.creator}>
              <Link
                to={`/creator/${creator.id}`}
                className={styles.who}
                aria-label={`Open ${creator.name}`}
                onClick={onClose}
              >
                <Avatar creatorId={creator.id} size={44} />
                <span className={styles.rowText}>
                  <Text variant="bodyMedium" as="div">
                    {creator.name}
                  </Text>
                  <Text variant="caption" color="textMuted" lines={1} as="div">
                    {creator.bio}
                  </Text>
                </span>
              </Link>
              <button
                type="button"
                aria-pressed={on}
                className={on ? `${styles.follow} ${styles.followOn}` : styles.follow}
                onClick={() => toggleFollow(creator.id)}
              >
                <Text variant="action" color={on ? 'textPrimary' : 'accentInverse'}>
                  {on ? 'Following' : 'Follow'}
                </Text>
              </button>
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}

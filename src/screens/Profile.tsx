import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import {
  ExportIcon,
  ImagesIcon,
  ListIcon,
  PlayIcon,
  SquaresFourIcon,
  VideoCameraIcon,
} from '@/components/icons';
import { IconButton } from '@/components/IconButton';
import { Image } from '@/components/Image';
import { SettingsSheet } from '@/components/SettingsSheet';
import { Tag } from '@/components/Tag';
import { TAB_BAR_HEIGHT } from '@/components/TabBar';
import { Text } from '@/components/Text';
import { creators, lookImage } from '@/data/catalog';
import { filmsBy, formatRuntime } from '@/data/films';
import { importSourceByKey } from '@/data/importSources';
import { useElementSize } from '@/hooks/useElementSize';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useBreakpoint, type Breakpoint } from '@/hooks/useViewport';
import { importedImageSrc } from '@/lib/imports';
import { share } from '@/lib/platform';
import { ME } from '@/lib/social';
import { useSeamStore } from '@/store/useSeamStore';
import { useTheme, useThemeColorMeta } from '@/theme/theme';
import { cardPhoto, space } from '@/theme/tokens';
import styles from './Profile.module.css';

/** The top bar's own height, under the status area. The tab strip stops beneath it. */
const BAR = 52;

/** The seam between tiles: wide enough to separate two photographs, too narrow to be a gutter. */
const GAP = 2;

const columnsFor = (breakpoint: Breakpoint) => (breakpoint === 'wide' ? 6 : breakpoint === 'tablet' ? 4 : 3);

export function Profile() {
  const insets = useSafeAreaInsets();
  const location = useLocation();
  const navigate = useNavigate();
  const { colors } = useTheme();
  const [gridRef, gridSize] = useElementSize<HTMLDivElement>();
  const columns = columnsFor(useBreakpoint());
  useThemeColorMeta();

  const [tab, setTab] = useState<'images' | 'videos'>('images');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const saves = useSeamStore((s) => s.saves);
  const lookbooks = useSeamStore((s) => s.lookbooks);
  const following = useSeamStore((s) => s.following);
  const showToast = useSeamStore((s) => s.showToast);
  const imported = useSeamStore((s) => s.importedImages);
  const mine = useMemo(() => [...imported].sort((a, b) => b.addedAt - a.addedAt), [imported]);

  const me = creators[ME];
  const films = filmsBy(ME);

  const saved = useMemo(
    () =>
      Object.entries(saves)
        .sort((a, b) => b[1] - a[1])
        .map(([key]) => key),
    [saves],
  );

  const cell = gridSize.width ? (gridSize.width - GAP * (columns - 1)) / columns : 0;
  const toastBottom = insets.bottom + TAB_BAR_HEIGHT + space.s8;

  const openCreate = () => navigate('/create', { state: { background: location } });

  const onShare = async () => {
    const message = await share(`${me.name} on SEAM`);
    if (message) showToast({ message, bottom: toastBottom });
  };

  const stats = [
    { value: String(saved.length), label: saved.length === 1 ? 'save' : 'saves' },
    { value: String(lookbooks.length), label: 'Lookbooks', to: '/lookbooks' },
    { value: String(following.length), label: 'following' },
  ];

  return (
    <div ref={gridRef} className={`scroll ${styles.screen}`}>
      {/* Creating a Look lives on the tab bar, so the bar here only names the page and opens settings. */}
      <header className={styles.topBar} style={{ paddingTop: insets.top, height: insets.top + BAR }}>
        <Text variant="h2" lines={1}>
          {me.handle}
        </Text>
        <IconButton icon={ListIcon} disc aria-label="Settings" onClick={() => setSettingsOpen(true)} />
      </header>

      <div style={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT + space.s32 }}>
        <div className={styles.identity}>
          <Avatar creatorId={ME} size={84} />
          <div className={styles.stats}>
            {stats.map((stat) =>
              stat.to ? (
                <Link key={stat.label} to={stat.to} className={styles.stat}>
                  <Text variant="h2" as="div" tabular>
                    {stat.value}
                  </Text>
                  <Text variant="caption" color="textSecondary" as="div">
                    {stat.label}
                  </Text>
                </Link>
              ) : (
                <div key={stat.label} className={styles.stat}>
                  <Text variant="h2" as="div" tabular>
                    {stat.value}
                  </Text>
                  <Text variant="caption" color="textSecondary" as="div">
                    {stat.label}
                  </Text>
                </div>
              ),
            )}
          </div>
        </div>

        <div className={styles.about}>
          <Text variant="h3" as="h1">
            {me.name}
          </Text>
          <Text variant="body" color="textSecondary" as="p">
            {me.bio}
          </Text>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.action} onClick={onShare}>
            <ExportIcon size={18} color={colors.iconPrimary} />
            <Text variant="action">Share profile</Text>
          </button>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Your posts" style={{ top: insets.top + BAR }}>
          {(['images', 'videos'] as const).map((key) => {
            const on = tab === key;
            const Glyph = key === 'images' ? SquaresFourIcon : PlayIcon;
            const name = key === 'images' ? 'Images' : 'Videos';
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={on}
                aria-label={`${name} · ${key === 'images' ? mine.length : films.length}`}
                className={styles.tab}
                onClick={() => setTab(key)}
              >
                <Glyph size={20} weight={on ? 'fill' : 'regular'} color={on ? colors.iconPrimary : colors.iconSecondary} />
                <Text variant="captionMedium" color={on ? 'textPrimary' : 'textMuted'}>
                  {name}
                </Text>
              </button>
            );
          })}
          <motion.span
            className={styles.underline}
            initial={false}
            animate={{ left: tab === 'images' ? '0%' : '50%' }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </div>

        {/* Your own images, newest first. Saves live in Lookbooks. */}
        {tab === 'images' ? (
          mine.length ? (
            <div className={styles.grid}>
              {mine.map((image) => {
                const from = importSourceByKey[image.source].name;
                return (
                  <Link
                    key={image.id}
                    to="/create"
                    state={{ background: location, photo: importedImageSrc(image) }}
                    className={styles.cell}
                    aria-label={`Photo from ${from}. Open it to tag and post.`}
                    style={{ width: cell, height: cell * cardPhoto.tile }}
                  >
                    <Image src={importedImageSrc(image)} transition={0} />
                    <Tag text={from} className={styles.source} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>
                <ImagesIcon size={26} color={colors.iconSecondary} />
              </span>
              <Text variant="h3" as="h2">
                No images yet
              </Text>
              <Text variant="body" color="textSecondary">
                Bring in photos from Instagram, Vinted, Depop or Vestiaire Collective, or post a Look.
              </Text>
              <button type="button" className={styles.emptyAction} onClick={openCreate}>
                <Text variant="action" color="accentInverse">
                  Add images
                </Text>
              </button>
            </div>
          )
        ) : films.length ? (
          <div className={styles.grid}>
            {films.map((film) => (
              <Link
                key={film.id}
                to={`/look/${film.lookId}`}
                className={styles.cell}
                aria-label={`${formatRuntime(film.seconds)} film`}
                style={{ width: cell, height: (cell * 16) / 9 }}
              >
                <Image src={lookImage(film.lookId)} transition={0} />
                <span className={styles.runtime}>
                  <PlayIcon size={12} weight="fill" color="#FFFFFF" />
                  <Text variant="micro" style={{ color: '#FFFFFF' }} tabular>
                    {formatRuntime(film.seconds)}
                  </Text>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <VideoCameraIcon size={26} color={colors.iconSecondary} />
            </span>
            <Text variant="h3" as="h2">
              No videos yet
            </Text>
            <Text variant="body" color="textSecondary">
              Looks you film appear here, beside the ones you photograph.
            </Text>
            <button type="button" className={styles.emptyAction} onClick={openCreate}>
              <Text variant="action" color="accentInverse">
                Record a Look
              </Text>
            </button>
          </div>
        )}
      </div>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

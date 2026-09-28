import { motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { ScanIcon } from '@/components/icons';
import { Masonry } from '@/components/Masonry';
import { SegmentedControl, type Segment } from '@/components/SegmentedControl';
import { TAB_BAR_HEIGHT } from '@/components/TabBar';
import { Text } from '@/components/Text';
import { creators, feed, styles as styleList } from '@/data/catalog';
import { useElementSize } from '@/hooks/useElementSize';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useSeamStore } from '@/store/useSeamStore';
import { useThemeColorMeta } from '@/theme/theme';
import { space } from '@/theme/tokens';
import styles from './Home.module.css';

const CHROME = 48 + 44 + 62 + 10; // top bar, feed switch, chip rail, gap to the feed

/** The feed switch reads as two words with a seam under the one you are in, not as two pills. */
type FeedMode = 'forYou' | 'following';

const FEEDS: Segment<FeedMode>[] = [
  { key: 'forYou', label: 'For You' },
  { key: 'following', label: 'Following' },
];

/** One chip per style, all the same size and colour — the photograph does the talking. */
const CATEGORIES = styleList.filter((s) => s !== 'All');

export function Home() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const [feedRef, feedSize] = useElementSize<HTMLDivElement>();
  useThemeColorMeta();

  const [feedMode, setFeedMode] = useState<FeedMode>('forYou');
  const [styleFilter, setStyleFilter] = useState('All');
  const following = useSeamStore((s) => s.following);
  const toggleFollow = useSeamStore((s) => s.toggleFollow);

  const looks = useMemo(() => {
    if (feedMode === 'following') return feed.filter((l) => following.includes(l.creatorId));
    return styleFilter === 'All' ? feed : feed.filter((l) => l.style === styleFilter);
  }, [feedMode, following, styleFilter]);

  // Chrome collapses on scroll down, returns on any scroll up.
  const lastY = useRef(0);
  const [hidden, setHidden] = useState(false);
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const y = e.currentTarget.scrollTop;
    const dy = y - lastY.current;
    if (y <= 0) setHidden(false);
    else if (dy > 8 && y > CHROME) setHidden(true);
    else if (dy < -4) setHidden(false);
    lastY.current = y;
  };

  const toastBottom = insets.bottom + TAB_BAR_HEIGHT + space.s8;
  const suggested = Object.values(creators)
    .filter((c) => !following.includes(c.id))
    .slice(0, 3);

  return (
    <div className={styles.screen}>
      <div ref={feedRef} className={`scroll ${styles.feed}`} onScroll={onScroll}>
        <div style={{ paddingTop: insets.top + CHROME, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space.s32 }}>
          {looks.length ? (
            <Masonry
              looks={looks}
              containerWidth={feedSize.width}
              allowWide={feedMode === 'forYou'}
              toastBottom={toastBottom}
            />
          ) : (
            <div className={styles.empty}>
              <Text variant="h1" as="h2">
                Follow creators to fill this feed
              </Text>
              <Text variant="body" color="textSecondary">
                Looks from people you follow appear here, newest first.
              </Text>
              {suggested.map((c) => (
                <div key={c.id} className={styles.suggestion}>
                  <Avatar creatorId={c.id} size={44} />
                  <div className={styles.suggestionText}>
                    <Text variant="bodyMedium" as="div">
                      {c.name}
                    </Text>
                    <Text variant="caption" color="textMuted" as="div">
                      {c.bio}
                    </Text>
                  </div>
                  <Button label="Follow" variant="tertiary" onClick={() => toggleFollow(c.id)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <motion.div
        className={styles.chrome}
        style={{ top: insets.top, height: CHROME - 10 }}
        initial={false}
        animate={{ y: hidden ? -CHROME : 0, opacity: hidden ? 0 : 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className={styles.topBar}>
          {/* A logo, not a line of type: a plain heading, so the scale's inline style cannot shrink it. */}
          <h1 className={styles.wordmark}>SEAM</h1>
          <IconButton icon={ScanIcon} disc aria-label="Search with a photo" onClick={() => navigate('/explore')} />
        </div>

        <div className={styles.modes}>
          <SegmentedControl
            segments={FEEDS}
            value={feedMode}
            onChange={setFeedMode}
            align="start"
            height={40}
            textVariant="bodyMedium"
            aria-label="Feed"
          />
        </div>

        <div className={`hscroll ${styles.chips}`}>
          {['All', ...CATEGORIES].map((style) => {
            const on = styleFilter === style && feedMode === 'forYou';
            return (
              <button
                key={style}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setFeedMode('forYou');
                  setStyleFilter(style);
                }}
                className={on ? `${styles.chip} ${styles.chipOn}` : styles.chip}
              >
                <Text variant="micro" color={on ? 'actionInverse' : 'textSecondary'}>
                  {style}
                </Text>
              </button>
            );
          })}
        </div>
      </motion.div>
      <div className={styles.statusFill} style={{ height: insets.top }} />
    </div>
  );
}

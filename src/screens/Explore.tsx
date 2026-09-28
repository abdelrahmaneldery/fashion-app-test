import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { CaretRightIcon } from '@/components/icons';
import { Image } from '@/components/Image';
import { Masonry } from '@/components/Masonry';
import { SearchBar } from '@/components/SearchBar';
import { TAB_BAR_HEIGHT } from '@/components/TabBar';
import { Text } from '@/components/Text';
import { creators, feed, lookImage, styles as styleList } from '@/data/catalog';
import { useElementSize } from '@/hooks/useElementSize';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useSeamStore } from '@/store/useSeamStore';
import { onPhoto, useTheme, useThemeColorMeta } from '@/theme/theme';
import { layout, space } from '@/theme/tokens';
import styles from './Explore.module.css';

const CHROME = 64;

export function Explore() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const { colors } = useTheme();
  const [feedRef, feedSize] = useElementSize<HTMLDivElement>();
  const following = useSeamStore((s) => s.following);
  useThemeColorMeta();

  const categories = styleList.filter((s) => s !== 'All');
  const rowWidth = feedSize.width - layout.margin * 2;
  const tileWidth = (rowWidth - layout.gutter) / 2;
  // An odd count would leave the last tile alone on its row, so the first one takes the whole row instead.
  const leadSpans = categories.length % 2 === 1;
  const toastBottom = insets.bottom + TAB_BAR_HEIGHT + space.s8;
  const trending = feed.slice(2, 8);

  return (
    <div className={styles.screen}>
      <div ref={feedRef} className={`scroll ${styles.feed}`}>
        <div style={{ paddingTop: insets.top + CHROME, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space.s32 }}>
          {/* The screen says what it is to the eye; this says it to a screen reader. */}
          <Text variant="label" as="h1" className="srOnly">
            Explore
          </Text>

          {/* Browse by style */}
          <div className={styles.sectionHead}>
            <div>
              <Text variant="label" color="textMuted" as="div" className={styles.eyebrow}>
                Browse
              </Text>
              <Text variant="h2" as="h2">
                Every style
              </Text>
            </div>
          </div>
          <div className={styles.tiles}>
            {categories.map((style, i) => {
              const cover = feed.find((l) => l.style === style) ?? feed[0];
              return (
                <Link
                  key={style}
                  to={`/search?q=${encodeURIComponent(style)}`}
                  className={styles.tile}
                  style={{ width: leadSpans && i === 0 ? rowWidth : tileWidth }}
                  aria-label={`Browse ${style} Looks`}
                >
                  <Image src={lookImage(cover.id)} transition={0} />
                  <span className={styles.tileScrim} />
                  {/* Text on a photograph is pinned to the dark theme's ink, so it reads in either mode. */}
                  <Text variant="h3" as="div" className={styles.tileLabel} style={{ color: onPhoto.textPrimary }}>
                    {style}
                  </Text>
                </Link>
              );
            })}
          </div>

          {/* Creators */}
          <div className={styles.sectionHead} style={{ paddingTop: space.s32 }}>
            <div>
              <Text variant="label" color="textMuted" as="div" className={styles.eyebrow}>
                People
              </Text>
              <Text variant="h2" as="h2">
                Creators to follow
              </Text>
            </div>
            <Link to="/profile" className={styles.round} aria-label="See all creators">
              <CaretRightIcon size={18} weight="bold" color={colors.iconPrimary} />
            </Link>
          </div>
          <div className={`hscroll ${styles.rail}`}>
            {Object.values(creators).map((c) => (
              <Link key={c.id} to={`/creator/${c.id}`} className={styles.creator}>
                <Avatar creatorId={c.id} size={56} />
                <Text variant="captionMedium" lines={1} as="div">
                  {c.name.split(' ')[0]}
                </Text>
                <Text variant="micro" color="textMuted" as="div">
                  {following.includes(c.id) ? 'Following' : 'Follow'}
                </Text>
              </Link>
            ))}
          </div>

          {/* Trending */}
          <div className={styles.sectionHead} style={{ paddingTop: space.s32 }}>
            <div>
              <Text variant="label" color="textMuted" as="div" className={styles.eyebrow}>
                Right now
              </Text>
              <Text variant="h2" as="h2">
                Trending Looks
              </Text>
            </div>
          </div>
          <Masonry looks={trending} containerWidth={feedSize.width} toastBottom={toastBottom} />
        </div>
      </div>

      <div className={styles.chrome} style={{ top: insets.top }}>
        <SearchBar onOpen={() => navigate('/search')} onCamera={() => navigate('/visual-search')} />
      </div>
      <div className={styles.statusFill} style={{ height: insets.top }} />
    </div>
  );
}

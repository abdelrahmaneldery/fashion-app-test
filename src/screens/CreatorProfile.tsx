import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ActionMenu } from '@/components/ActionMenu';
import { Avatar } from '@/components/Avatar';
import { IconButton } from '@/components/IconButton';
import { CaretLeftIcon, DotsThreeIcon, ExportIcon } from '@/components/icons';
import { Image } from '@/components/Image';
import { LookCard } from '@/components/LookCard';
import { columnsFor, columnWidthFor } from '@/components/Masonry';
import { Text } from '@/components/Text';
import { ProductCard } from '@/components/ProductCard';
import { creators, feed, formatPrice, lookImage, lookTotal, products } from '@/data/catalog';
import { useElementSize } from '@/hooks/useElementSize';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useBreakpoint } from '@/hooks/useViewport';
import { track } from '@/lib/analytics';
import { share } from '@/lib/platform';
import { useSeamStore } from '@/store/useSeamStore';
import { useThemeColorMeta } from '@/theme/theme';
import { space } from '@/theme/tokens';
import { NotFound } from './NotFound';
import styles from './CreatorProfile.module.css';

export function CreatorProfile() {
  const { id } = useParams<{ id: string }>();
  const creator = id ? creators[id] : undefined;
  if (!creator) return <NotFound />;
  return <Detail key={creator.id} creatorId={creator.id} />;
}

function Detail({ creatorId }: { creatorId: string }) {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const [gridRef, gridSize] = useElementSize<HTMLDivElement>();
  const count = columnsFor(useBreakpoint());
  const [tab, setTab] = useState<'looks' | 'pieces'>('looks');
  const [menuOpen, setMenuOpen] = useState(false);
  useThemeColorMeta();

  const creator = creators[creatorId];
  const following = useSeamStore((s) => s.following.includes(creatorId));
  const toggleFollow = useSeamStore((s) => s.toggleFollow);
  const showToast = useSeamStore((s) => s.showToast);

  const theirLooks = useMemo(() => feed.filter((l) => l.creatorId === creatorId), [creatorId]);
  // A piece can appear in more than one of their Looks; the Pieces tab lists it once.
  const theirPieces = useMemo(() => {
    const ids = new Set<string>();
    for (const look of theirLooks) {
      for (const piece of look.pieces) if (piece.productId) ids.add(piece.productId);
    }
    return [...ids].map((id) => products[id]);
  }, [theirLooks]);
  const pieceCount = theirLooks.reduce((n, l) => n + l.pieces.length, 0);
  const wardrobe = theirLooks.reduce((sum, l) => sum + lookTotal(l), 0);
  const width = columnWidthFor(gridSize.width, count);
  const toastBottom = insets.bottom + space.s16;

  const onShare = async () => {
    const message = await share(`${creator.name} on SEAM`);
    if (message) showToast({ message, bottom: toastBottom });
  };

  return (
    <div className={styles.screen}>
      <div ref={gridRef} className={`scroll ${styles.feed}`}>
        <div style={{ paddingBottom: insets.bottom + space.s48 }}>
          {/* Cover, taken from their most recent Look */}
          <div className={styles.cover}>
            {theirLooks[0] ? (
              <Image src={lookImage(theirLooks[0].id)} className={styles.coverPhoto} transition={0} />
            ) : null}
            <span className={styles.coverScrim} />
          </div>

          <div className={styles.identity}>
            <div className={styles.avatar}>
              <Avatar creatorId={creatorId} size={80} />
            </div>
            <Text variant="displayL" as="h1">
              {creator.name}
            </Text>
            <Text variant="bodyL" color="textMuted" as="div">
              {creator.handle}
            </Text>

            <div className={styles.stats}>
              <Text variant="bodyMedium" tabular>
                {theirLooks.length}
              </Text>
              <Text variant="body" color="textSecondary">
                {theirLooks.length === 1 ? 'Look' : 'Looks'}
              </Text>
              <span className={styles.dot} aria-hidden="true" />
              <Text variant="bodyMedium" tabular>
                {pieceCount}
              </Text>
              <Text variant="body" color="textSecondary">
                pieces
              </Text>
              <span className={styles.dot} aria-hidden="true" />
              <Text variant="bodyMedium" tabular>
                {formatPrice(wardrobe)}
              </Text>
              <Text variant="body" color="textSecondary">
                wardrobe
              </Text>
            </div>

            <Text variant="body" color="textSecondary" as="p" className={styles.bio}>
              {creator.bio}
            </Text>

            <div className={styles.actions}>
              <button
                type="button"
                className={following ? `${styles.follow} ${styles.followOn}` : styles.follow}
                onClick={() => {
                  track({ name: 'follow_toggled', creatorId, following: !following });
                  toggleFollow(creatorId);
                }}
              >
                <Text variant="action" color={following ? 'textPrimary' : 'accentInverse'}>
                  {following ? 'Following' : 'Follow'}
                </Text>
              </button>
              <button type="button" className={styles.secondary} onClick={onShare}>
                <Text variant="action">Share</Text>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs} role="tablist">
            {(['looks', 'pieces'] as const).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={tab === key ? `${styles.tab} ${styles.tabOn}` : styles.tab}
                onClick={() => setTab(key)}
              >
                <span className={styles.tabLabel}>
                  <Text variant="bodyLMedium" color={tab === key ? 'textPrimary' : 'textMuted'}>
                    {key === 'looks' ? 'Looks' : 'Pieces'}
                  </Text>
                </span>
              </button>
            ))}
          </div>

          {tab === 'looks' && theirLooks.length === 0 ? (
            <div className={styles.empty}>
              <Text variant="h3" as="h2">
                No Looks yet
              </Text>
              <Text variant="body" color="textSecondary">
                {`Follow ${creator.name.split(' ')[0]} and their first Look will reach your feed.`}
              </Text>
            </div>
          ) : tab === 'looks' ? (
            <div className={styles.grid}>
              {theirLooks.map((l) => (
                <LookCard key={l.id} look={l} width={width} toastBottom={toastBottom} />
              ))}
            </div>
          ) : theirPieces.length === 0 ? (
            <div className={styles.empty}>
              <Text variant="h3" as="h2">
                Nothing tagged yet
              </Text>
              <Text variant="body" color="textSecondary">
                Pieces appear here once a Look has them identified.
              </Text>
            </div>
          ) : (
            <div className={styles.grid}>
              {theirPieces.map((p) => (
                <ProductCard key={p.id} product={p} width={width} toastBottom={toastBottom} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating controls over the cover */}
      <div className={styles.controls} style={{ top: insets.top + space.s8 }}>
        <IconButton icon={CaretLeftIcon} variant="floating" aria-label="Back" onClick={() => navigate(-1)} />
        <div className={styles.controlsRight}>
          <IconButton icon={ExportIcon} variant="floating" aria-label="Share this profile" onClick={onShare} />
          <IconButton icon={DotsThreeIcon} variant="floating" weight="bold" aria-label="More options" onClick={() => setMenuOpen(true)} />
        </div>
      </div>

      <ActionMenu
        open={menuOpen}
        title={creator.name}
        onClose={() => setMenuOpen(false)}
        options={[
          { label: 'Share this profile', onSelect: onShare },
          {
            label: following ? 'Unfollow' : 'Follow',
            onSelect: () => toggleFollow(creatorId),
          },
          {
            label: 'Report this creator',
            destructive: true,
            onSelect: () => showToast({ message: 'Thanks. We review every report.', bottom: toastBottom }),
          },
        ]}
      />
    </div>
  );
}

import { Link } from 'react-router-dom';
import { creators, feed, formatPrice, identifiedProducts, lookLink, lookTotal, type Look } from '@/data/catalog';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useViewport } from '@/hooks/useViewport';
import { track } from '@/lib/analytics';
import { hostOf } from '@/lib/links';
import { useSeamStore } from '@/store/useSeamStore';
import { useTheme } from '@/theme/theme';
import { Avatar } from './Avatar';
import { BottomSheet, sheetDetent } from './BottomSheet';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { ArrowUpRightIcon, GlobeSimpleIcon, XIcon } from './icons';
import styles from './LookAboutSheet.module.css';
import { SaveButton } from './SaveButton';
import { Text } from './Text';

type Props = {
  look: Look;
  open: boolean;
  onClose: () => void;
  /** Opens a link outside SEAM; the Look page counts the visit. */
  onVisit: (url: string) => void;
};

/** The footer is one row of 52 px buttons; toasts raised from here sit just above it. */
const FOOTER = 52 + 24;

/**
 * Everything about a Look in one place: what it is, what it costs, who made it, and where its link goes.
 * Visit leaves SEAM for the link the creator attached; Save keeps the Look.
 */
export function LookAboutSheet({ look, open, onClose, onVisit }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useViewport();
  const { colors } = useTheme();
  const creator = creators[look.creatorId];
  const link = lookLink(look);
  const identified = identifiedProducts(look).length;
  const theirLooks = feed.filter((l) => l.creatorId === creator.id);
  const theirPieces = theirLooks.reduce((n, l) => n + l.pieces.length, 0);
  const following = useSeamStore((s) => s.following.includes(creator.id));
  const toggleFollow = useSeamStore((s) => s.toggleFollow);

  const header = (
    <div className={styles.header}>
      <IconButton icon={XIcon} aria-label="Close" onClick={onClose} />
    </div>
  );

  return (
    <BottomSheet
      open={open}
      heights={[sheetDetent(height, 0.72) + insets.bottom]}
      index={0}
      onIndexChange={() => {}}
      onRequestClose={onClose}
      scrim={[0.4, 0.4]}
      scrimClosesSheet
      handle={header}
      aria-label="About this Look"
    >
      <div className={styles.body}>
        <div className={`scroll ${styles.scroller}`}>
          <Text variant="h1" as="h2">
            {look.caption}
          </Text>
          <Text variant="body" color="textSecondary" as="p" className={styles.details}>
            {`${look.style} · ${look.occasion} · ${look.season}`}
          </Text>

          {/* What the whole Look costs, the figure the Look page used to carry in its own card. */}
          <div className={styles.price}>
            <Text variant="h2" as="span" tabular>
              {formatPrice(lookTotal(look))}
            </Text>
            <Text variant="caption" color="textMuted" as="span" tabular>
              {identified === look.pieces.length
                ? `for all ${look.pieces.length} pieces`
                : `for ${identified} of ${look.pieces.length} pieces identified`}
            </Text>
          </div>

          <div className={styles.creator}>
            <div className={styles.creatorRow}>
              <Link to={`/creator/${creator.id}`} className={styles.creatorLink} onClick={onClose}>
                <Avatar creatorId={creator.id} size={48} />
                <span className={styles.creatorText}>
                  <Text variant="bodyMedium" as="span" lines={1}>
                    {creator.name}
                  </Text>
                  <Text variant="caption" color="textMuted" as="span" lines={1}>
                    {creator.handle}
                  </Text>
                </span>
              </Link>
              <Button
                label={following ? 'Following' : 'Follow'}
                variant="tertiary"
                muted={following}
                aria-label={following ? `Following ${creator.name}. Unfollow` : `Follow ${creator.name}`}
                onClick={() => {
                  track({ name: 'follow_toggled', creatorId: creator.id, following: !following });
                  toggleFollow(creator.id);
                }}
              />
            </div>
            <Text variant="caption" color="textSecondary" as="p" tabular className={styles.stats}>
              {`${theirLooks.length} ${theirLooks.length === 1 ? 'Look' : 'Looks'} · ${theirPieces} pieces tagged`}
            </Text>
            {creator.website ? (
              <button
                type="button"
                className={styles.site}
                aria-label={`${creator.name}'s website, ${hostOf(creator.website)}`}
                onClick={() => onVisit(creator.website!)}
              >
                <GlobeSimpleIcon size={18} color={colors.iconPrimary} />
                <Text variant="captionMedium" lines={1}>
                  {hostOf(creator.website)}
                </Text>
              </button>
            ) : null}
          </div>
        </div>

        <div className={styles.footer} style={{ paddingBottom: insets.bottom + 12 }}>
          {link ? (
            <Button
              variant="secondary"
              label="Visit"
              trailingIcon={ArrowUpRightIcon}
              aria-label={`Visit ${hostOf(link)}`}
              onClick={() => onVisit(link)}
              className={styles.half}
            />
          ) : null}
          <SaveButton
            kind="look"
            id={look.id}
            variant="full"
            fullLabel="Save"
            toastBottom={FOOTER + insets.bottom + 8}
            className={styles.half}
          />
        </div>
      </div>
    </BottomSheet>
  );
}

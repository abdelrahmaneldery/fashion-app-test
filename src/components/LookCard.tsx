import { Link } from 'react-router-dom';
import { creators, formatPrice, lookImage, lookTotal, type Look } from '@/data/catalog';
import { useTheme } from '@/theme/theme';
import { cardPhoto } from '@/theme/tokens';
import { DotsThreeIcon } from './icons';
import { Image } from './Image';
import styles from './LookCard.module.css';
import { SaveButton } from './SaveButton';
import { Tag } from './Tag';
import { Text } from './Text';

type Props = {
  look: Look;
  width: number;
  /** default: overlays + meta · compact: image only · rail: fixed 120 × 160 (More from) */
  variant?: 'default' | 'compact' | 'rail';
  toastBottom: number;
  onMore?: () => void;
};

/** A sharp photograph, two small overlays, one line of text. No container, no border. */
export function LookCard({ look, width, variant = 'default', toastBottom, onMore }: Props) {
  const { colors } = useTheme();
  const creator = creators[look.creatorId];
  const rail = variant === 'rail';
  const w = rail ? 120 : width;
  const h = rail ? Math.round(w * cardPhoto.tile) : Math.round((w / look.ratio) * cardPhoto.stretch);
  const full = variant === 'default';
  // What the identified pieces add up to, the same figure as the Look total on the Look page.
  const total = lookTotal(look);

  return (
    <article className={styles.card} style={{ width: w, flex: rail ? `0 0 ${w}px` : undefined }}>
      <div className={styles.photo} style={{ width: w, height: h }}>
        <Image src={lookImage(look.id)} />
        <Link
          to={`/look/${look.id}`}
          className={styles.link}
          aria-label={`${look.style} Look by ${creator.name}, ${look.pieces.length} pieces`}
        />
        {full ? (
          <>
            <Tag text={`${look.pieces.length} pieces`} className={`${styles.pieces} ${styles.overlay}`} />
            {look.ai ? <Tag text="AI" className={`${styles.ai} ${styles.overlay}`} /> : null}
            <SaveButton
              kind="look"
              id={look.id}
              variant="overlay"
              toastBottom={toastBottom}
              className={`${styles.save} ${styles.overlay}`}
            />
          </>
        ) : null}
      </div>
      {full ? (
        <div className={styles.meta}>
          <div className={styles.text}>
            <Text variant="captionMedium" lines={1} as="div">
              {look.caption}
            </Text>
            {/* The price reads first and largest; the style sits beside it, small. */}
            <div className={styles.priceLine}>
              {total ? (
                <Text variant="bodyMedium" tabular>
                  {formatPrice(total)}
                </Text>
              ) : null}
              <Text variant="micro" color="textMuted" lines={1} className={styles.style}>
                {total ? `· ${look.style}` : look.style}
              </Text>
            </div>
          </div>
          {onMore ? (
            <button type="button" className={styles.more} aria-label={`More options for this Look`} onClick={onMore}>
              <DotsThreeIcon size={16} weight="bold" color={colors.iconSecondary} />
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/** The two lines under a card — the title (18) and the price-and-style line (22) — plus the 8 above. */
const META_HEIGHT = 48;

/** Card height in the masonry: image + the two meta lines + the gap to the next card. */
export const lookCardHeight = (look: Look, width: number) =>
  Math.round((width / look.ratio) * cardPhoto.stretch) + META_HEIGHT + 14;

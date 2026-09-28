import { Link } from 'react-router-dom';
import { creators, formatPrice, lookImage, lookTotal, type Look } from '@/data/catalog';
import { Avatar } from './Avatar';
import { Image } from './Image';
import { SaveButton } from './SaveButton';
import { Tag } from './Tag';
import { Text } from './Text';
import styles from './WideEditorialCard.module.css';

type Props = { look: Look; width: number; toastBottom: number };

/** A magazine page in the feed: kicker, headline, full-bleed picture, credit. */
export function WideEditorialCard({ look, width, toastBottom }: Props) {
  const creator = creators[look.creatorId];
  const h = Math.round(width / look.ratio);
  const editorial = look.editorial;

  return (
    <div className={styles.wrap}>
      {editorial ? (
        <div className={styles.head}>
          <Text variant="label" color="textMuted">
            {editorial.kicker}
          </Text>
          <Link to={`/look/${look.id}`} className={styles.headline}>
            <Text variant="displayL" as="h2" lines={2}>
              {editorial.headline.map((part, i) => (
                <Text key={i} variant="displayL" style={part.italic ? { fontStyle: 'italic' } : undefined}>
                  {part.text}
                </Text>
              ))}
            </Text>
          </Link>
        </div>
      ) : null}
      <div className={styles.photo} style={{ width, height: h }}>
        <Image src={lookImage(look.id)} />
        <Link to={`/look/${look.id}`} className={styles.link} aria-label={`Open Look by ${creator.name}`} />
        <Tag text={`${look.pieces.length} pieces`} glyph className={`${styles.pieces} ${styles.overlay}`} />
        <SaveButton kind="look" id={look.id} variant="overlay" toastBottom={toastBottom} className={`${styles.save} ${styles.overlay}`} />
      </div>
      <div className={styles.credit}>
        <Avatar creatorId={look.creatorId} size={20} />
        <Text variant="captionMedium">{creator.name}</Text>
        <Text variant="caption" color="textMuted">{` · ${look.pieces.length} pieces`}</Text>
        {lookTotal(look) ? (
          <>
            <Text variant="caption" color="textMuted">{' · '}</Text>
            <Text variant="bodyMedium" tabular>
              {formatPrice(lookTotal(look))}
            </Text>
          </>
        ) : null}
      </div>
    </div>
  );
}

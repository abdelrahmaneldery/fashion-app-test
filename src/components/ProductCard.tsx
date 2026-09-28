import { Link } from 'react-router-dom';
import { formatDelta, formatPrice, productImage, type Product } from '@/data/catalog';
import { cardPhoto } from '@/theme/tokens';
import { Image } from './Image';
import styles from './ProductCard.module.css';
import { SaveButton } from './SaveButton';
import { Text } from './Text';

type Props = {
  product: Product;
  width: number;
  /** grid and rail show brand, name and Save; mini shows price only (Piece Sheet carousel). */
  variant?: 'grid' | 'rail' | 'mini';
  /** Price of the piece being compared, to show the difference. */
  referencePrice?: number;
  toastBottom: number;
  /** Overrides navigation — the Piece Sheet swaps the selected piece instead of routing. */
  onOpen?: () => void;
};

export function ProductCard({ product, width, variant = 'grid', referencePrice, toastBottom, onOpen }: Props) {
  const delta = referencePrice !== undefined ? product.price - referencePrice : undefined;
  const mini = variant === 'mini';
  // The sheet's carousel keeps the shorter thumbnail; it is cut by the fold as it is.
  const height = Math.round(width * (mini ? 4 / 3 : cardPhoto.tile));
  const label = `${product.brand}, ${product.name}, ${formatPrice(product.price)}${product.stock === 'out' ? ', sold out' : ''}`;

  return (
    <article className={styles.card} style={{ width, flex: `0 0 ${width}px` }}>
      <div className={styles.photo} style={{ width, height }}>
        <Image src={productImage(product.id)} />
        {onOpen ? (
          <button type="button" onClick={onOpen} aria-label={label} className={styles.link} />
        ) : (
          <Link to={`/product/${product.id}`} aria-label={label} className={styles.link} />
        )}
        {!mini ? (
          <SaveButton kind="product" id={product.id} variant="overlay" toastBottom={toastBottom} className={styles.save} />
        ) : null}
      </div>
      <div className={styles.meta}>
        {!mini ? (
          <>
            <Text variant="label" lines={1}>
              {product.brand}
            </Text>
            <Text variant="caption" color="textSecondary" lines={1}>
              {product.name}
            </Text>
          </>
        ) : null}
        <div className={styles.priceRow}>
          <Text variant="captionMedium" tabular>
            {formatPrice(product.price)}
          </Text>
          {delta !== undefined ? (
            <Text variant="micro" color="textMuted" tabular>
              {formatDelta(delta)}
            </Text>
          ) : null}
        </div>
        {product.stock === 'out' ? (
          <Text variant="micro" color="textMuted">
            Sold out
          </Text>
        ) : null}
      </div>
    </article>
  );
}

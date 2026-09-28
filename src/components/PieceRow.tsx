import { alternativesFor, formatPrice, productImage, products, type Look, type Piece } from '@/data/catalog';
import { useTheme } from '@/theme/theme';
import { Image } from './Image';
import { LookCrop } from './LookCrop';
import styles from './PieceRow.module.css';
import { SaveButton } from './SaveButton';
import { Text } from './Text';

type Props = { look: Look; piece: Piece; onOpen: () => void; toastBottom: number };

/** A row in Shop the Look: packshot, brand, name, price · stock, Save. */
export function PieceRow({ look, piece, onOpen, toastBottom }: Props) {
  const { colors } = useTheme();
  const product = piece.productId ? products[piece.productId] : undefined;

  const stock = !product
    ? null
    : product.stock === 'in'
      ? { text: 'In stock', color: colors.textSecondary }
      : product.stock === 'low'
        ? { text: 'Low stock', color: colors.warning }
        : { text: 'Sold out', color: colors.textMuted };

  const label = product
    ? `Piece ${piece.index}: ${product.brand}, ${product.name}, ${formatPrice(product.price)}, ${stock?.text}`
    : `Piece ${piece.index}: ${piece.label.toLowerCase()}, not identified yet. Find similar`;

  return (
    <div className={styles.row}>
      <button type="button" onClick={onOpen} aria-label={label} className={styles.open} />
      {product ? (
        <div className={styles.tile}>
          <Image src={productImage(product.id)} />
        </div>
      ) : (
        <div className={`${styles.tile} ${styles.dashed}`}>
          <LookCrop look={look} x={piece.x} y={piece.y} width={58} height={73} />
        </div>
      )}
      <div className={styles.text}>
        <div className={styles.lines}>
          <Text variant="label" color={product ? 'textPrimary' : 'textMuted'} lines={1}>
            {product ? product.brand : piece.label}
          </Text>
          <Text variant="body" color="textSecondary" lines={1}>
            {product ? product.name : 'Not identified yet'}
          </Text>
          {product && stock ? (
            <Text variant="bodyMedium" tabular lines={1}>
              {formatPrice(product.price)}
              <Text variant="caption" color="textMuted">{'  ·  '}</Text>
              <Text variant="caption" style={{ color: stock.color }}>
                {stock.text}
              </Text>
              {product.stock === 'out' ? (
                <Text variant="captionMedium" color="textPrimary">
                  {'  ·  '}
                  {`${alternativesFor(product).length} alternatives`}
                </Text>
              ) : null}
            </Text>
          ) : (
            <Text variant="label" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Find similar
            </Text>
          )}
        </div>
        {product ? (
          <SaveButton kind="product" id={product.id} variant="icon" toastBottom={toastBottom} className={styles.save} />
        ) : null}
      </div>
    </div>
  );
}

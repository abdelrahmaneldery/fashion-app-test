import { formatPrice, lookImage, productImage, products, type Look } from '@/data/catalog';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useViewport } from '@/hooks/useViewport';
import { useTheme } from '@/theme/theme';
import { BottomSheet, sheetDetent } from './BottomSheet';
import { CaretRightIcon, XIcon } from './icons';
import { IconButton } from './IconButton';
import { Image } from './Image';
import { LookCrop } from './LookCrop';
import styles from './PiecesSheet.module.css';
import { Switch } from './Switch';
import { Text } from './Text';

type Props = {
  look: Look;
  open: boolean;
  /** 0-based index of the piece the Look screen is currently on. */
  selected: number;
  markersOn: boolean;
  onMarkersChange: (on: boolean) => void;
  onSelect: (index: number) => void;
  onClose: () => void;
};

/** The photo at thumbnail size with every tag on it, so the list has somewhere to point. */
const MAP_WIDTH = 92;

/**
 * Every tag on a Look in one list, opened from the pieces pill. Each row — and each dot on the
 * little map — switches the Look screen to that piece.
 */
export function PiecesSheet({ look, open, selected, markersOn, onMarkersChange, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useViewport();
  const { colors } = useTheme();

  const header = (
    <div className={styles.header}>
      <Text variant="h3" as="h2" className={styles.title}>
        {`${look.pieces.length} pieces`}
      </Text>
      <IconButton icon={XIcon} aria-label="Close" onClick={onClose} />
    </div>
  );

  return (
    <BottomSheet
      open={open}
      heights={[sheetDetent(height, 0.82) + insets.bottom]}
      index={0}
      onIndexChange={() => {}}
      onRequestClose={onClose}
      scrim={[0.4, 0.4]}
      scrimClosesSheet
      handle={header}
      aria-label={`All ${look.pieces.length} pieces in this Look`}
    >
      <div className="scroll" style={{ height: '100%', paddingBottom: insets.bottom + 24 }}>
        <div className={styles.top}>
          <div className={styles.map} style={{ width: MAP_WIDTH, height: MAP_WIDTH / look.ratio }}>
            <Image src={lookImage(look.id)} transition={0} />
            {look.pieces.map((p, i) => (
              <button
                key={p.index}
                type="button"
                className={i === selected ? `${styles.dot} ${styles.dotOn}` : styles.dot}
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                aria-label={`Piece ${p.index}, ${p.label.toLowerCase()}`}
                onClick={() => onSelect(i)}
              />
            ))}
          </div>

          <div className={styles.topText}>
            <Text variant="caption" color="textSecondary" as="p">
              Tap a dot or a row to open that piece. The photo follows you.
            </Text>
            <button
              type="button"
              role="switch"
              aria-checked={markersOn}
              className={styles.markers}
              onClick={() => onMarkersChange(!markersOn)}
            >
              <span className={styles.markersText}>
                <Text variant="bodyMedium" as="div">
                  Markers
                </Text>
                <Text variant="caption" color="textMuted" as="div">
                  {markersOn ? 'On the photo' : 'Hidden'}
                </Text>
              </span>
              <Switch checked={markersOn} />
            </button>
          </div>
        </div>

        <ul className={styles.list}>
          {look.pieces.map((p, i) => {
            const product = p.productId ? products[p.productId] : undefined;
            const on = i === selected;
            return (
              <li key={p.index}>
                <button
                  type="button"
                  className={on ? `${styles.row} ${styles.rowOn}` : styles.row}
                  aria-current={on ? 'true' : undefined}
                  onClick={() => onSelect(i)}
                >
                  <span className={styles.thumb}>
                    {product ? (
                      <Image src={productImage(product.id)} transition={0} />
                    ) : (
                      <LookCrop look={look} x={p.x} y={p.y} width={46} height={58} />
                    )}
                  </span>
                  <span className={styles.text}>
                    <Text variant="label" color="textMuted" as="div">
                      {`${p.index} · ${p.label}`}
                    </Text>
                    <Text variant="bodyMedium" as="div" lines={1}>
                      {product ? product.name : 'Not identified yet'}
                    </Text>
                    <Text variant="caption" color="textMuted" as="div" lines={1} tabular>
                      {product ? `${product.brand} · ${formatPrice(product.price)}` : 'Find similar pieces'}
                    </Text>
                  </span>
                  <CaretRightIcon size={16} weight="bold" color={colors.iconSecondary} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </BottomSheet>
  );
}

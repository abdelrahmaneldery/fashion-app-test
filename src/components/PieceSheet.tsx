import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useViewport } from '@/hooks/useViewport';
import { track } from '@/lib/analytics';
import { shopAt } from '@/lib/shop';
import {
  alternativesFor,
  bandOf,
  formatPrice,
  lookImage,
  productImage,
  products,
  type Look,
  type PriceBand,
  type Product,
} from '@/data/catalog';
import { useSeamStore } from '@/store/useSeamStore';
import { useTheme } from '@/theme/theme';
import { layout, space } from '@/theme/tokens';
import { BottomSheet, sheetDetent, useSheetWidth } from './BottomSheet';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { ArrowUpRightIcon, CaretLeftIcon, CaretRightIcon, XIcon } from './icons';
import { Image } from './Image';
import { LookCrop } from './LookCrop';
import styles from './PieceSheet.module.css';
import { ProductCard } from './ProductCard';
import { SaveButton } from './SaveButton';
import { SegmentedControl } from './SegmentedControl';
import { Text } from './Text';

type Props = {
  look: Look;
  /** 0-based index of the selected piece. */
  selected: number;
  open: boolean;
  detent: number;
  onDetentChange: (d: number) => void;
  onSelect: (index: number) => void;
  onClose: () => void;
  onViewDetails: (productId: string) => void;
  /** Hands the way back to the list of every piece, which is where this was opened from. */
  onShowAll: () => void;
};

/** The piece sheet's resting height. Look Detail reads it too, to centre a hotspot above it. */
export const pieceSheetMedium = (screenH: number) => sheetDetent(screenH, 0.58);

const BAND_LABELS: Record<PriceBand, string> = { lower: 'Lower', similar: 'Similar', higher: 'Higher' };
const BUDGET_MAX = 400;

function useBands(product: Product | undefined) {
  const alternatives = useMemo(() => (product ? alternativesFor(product) : []), [product]);
  const byBand = useMemo(() => {
    const out: Record<PriceBand, Product[]> = { lower: [], similar: [], higher: [] };
    if (!product) return out;
    alternatives.forEach((p) => out[bandOf(product.price, p.price)].push(p));
    return out;
  }, [alternatives, product]);
  const initial = (): PriceBand => {
    const preferred: PriceBand = product && product.price > BUDGET_MAX ? 'lower' : 'similar';
    if (byBand[preferred].length) return preferred;
    return (['similar', 'lower', 'higher'] as PriceBand[]).find((b) => byBand[b].length) ?? 'similar';
  };
  // The chosen band belongs to one product; moving to another piece starts from that piece's default.
  const [choice, setChoice] = useState<{ productId?: string; band: PriceBand } | null>(null);
  const band = choice && choice.productId === product?.id ? choice.band : initial();
  const setBand = (b: PriceBand) => {
    setChoice({ productId: product?.id, band: b });
    if (product) track({ name: 'alternatives_band_changed', productId: product.id, band: b });
  };
  const segments = (['lower', 'similar', 'higher'] as PriceBand[]).map((key) => ({
    key,
    label: BAND_LABELS[key],
    disabled: byBand[key].length === 0,
  }));
  return { band, setBand, segments, items: byBand[band], count: alternatives.length };
}

export function PieceSheet({
  look,
  selected,
  open,
  detent,
  onDetentChange,
  onSelect,
  onClose,
  onViewDetails,
  onShowAll,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useViewport();
  const sheetW = useSheetWidth();
  const showToast = useSeamStore((s) => s.showToast);
  const progress = useMotionValue(0);

  const piece = look.pieces[selected];
  const product = piece?.productId ? products[piece.productId] : undefined;
  const { band, setBand, segments, items } = useBands(product);

  const mediumH = pieceSheetMedium(screenH) + insets.bottom;
  const largeH = screenH - (insets.top + 53);
  const heights = product ? [mediumH, largeH] : [mediumH];
  const footerH = 64 + insets.bottom;
  const toastBottom = mediumH + space.s8;
  const gridW = (sheetW - layout.margin * 2 - layout.gutter) / 2;

  const mediumOpacity = useTransform(progress, (p) => 1 - p);

  if (!piece) return null;

  const findSimilar = () => showToast({ message: 'Visual search arrives in the next build', bottom: toastBottom });

  const stock = product
    ? product.stock === 'in'
      ? { text: 'In stock', color: colors.textSecondary }
      : product.stock === 'low'
        ? { text: 'Low stock', color: colors.warning }
        : { text: 'Sold out', color: colors.textMuted }
    : null;

  const header = (
    <div className={styles.header}>
      <IconButton
        icon={CaretLeftIcon}
        aria-label="Previous piece"
        disabled={selected === 0}
        onClick={() => onSelect(selected - 1)}
      />
      <button
        type="button"
        className={styles.headerLabel}
        aria-haspopup="dialog"
        aria-label={`Piece ${piece.index} of ${look.pieces.length}, ${piece.label.toLowerCase()}. Show all pieces`}
        onClick={onShowAll}
      >
        <Text variant="label" color="textSecondary">
          {`${piece.index} of ${look.pieces.length} · ${piece.label}`}
        </Text>
      </button>
      <IconButton
        icon={CaretRightIcon}
        aria-label="Next piece"
        disabled={selected === look.pieces.length - 1}
        onClick={() => onSelect(selected + 1)}
      />
      <span className={styles.spacer} />
      <IconButton icon={XIcon} aria-label="Close" onClick={onClose} />
    </div>
  );

  const actions = product ? (
    <div className={styles.actions}>
      <SaveButton kind="product" id={product.id} variant="outlined" toastBottom={toastBottom} />
      <Button
        label="Shop"
        variant="secondary"
        trailingIcon={ArrowUpRightIcon}
        style={{ width: 140 }}
        onClick={() => shopAt(product, 'piece_sheet')}
      />
      <Button
        label="View details"
        style={{ flex: 1, paddingLeft: space.s12, paddingRight: space.s12 }}
        onClick={() => onViewDetails(product.id)}
      />
    </div>
  ) : (
    <Button label="Find similar" onClick={findSimilar} />
  );

  const bandHeader = (stacked: boolean) => (
    <div className={stacked ? `${styles.bandHeader} ${styles.bandHeaderStacked}` : styles.bandHeader}>
      <Text variant="label" color="textMuted">
        Alternatives
      </Text>
      <div style={stacked ? undefined : { width: 216 }}>
        <SegmentedControl segments={segments} value={band} onChange={setBand} height={32} aria-label="Price band" />
      </div>
    </div>
  );

  const alternatives = product ? (
    <div className={styles.alternatives}>
      {bandHeader(false)}
      <div className={`hscroll ${styles.rail}`}>
        {items.map((p) => (
          <ProductCard key={p.id} product={p} width={88} variant="mini" referencePrice={product.price} toastBottom={toastBottom} />
        ))}
      </div>
    </div>
  ) : null;

  return (
    <BottomSheet
      open={open}
      heights={heights}
      index={Math.min(detent, heights.length - 1)}
      onIndexChange={onDetentChange}
      onRequestClose={onClose}
      scrim={[0.2, 0.4]}
      handle={header}
      progress={progress}
      aria-label={`Piece ${piece.index} of ${look.pieces.length}`}
    >
      {/* Medium: the full piece block, actions, then a carousel cut by the fold */}
      <motion.div
        className={`${styles.layer} ${styles.pad}`}
        style={{ opacity: mediumOpacity, pointerEvents: detent === 0 ? 'auto' : 'none' }}
      >
        <div className={styles.block}>
          <div className={styles.tile}>
            {product ? (
              <Image src={productImage(product.id)} />
            ) : (
              <LookCrop look={look} x={piece.x} y={piece.y} width={96} height={120} />
            )}
          </div>
          <div className={styles.blockText}>
            <Text variant="label" color={product ? 'textPrimary' : 'textMuted'}>
              {product ? product.brand : piece.label}
            </Text>
            <Text variant="bodyL" lines={2}>
              {product ? product.name : 'Not identified yet'}
            </Text>
            {product && stock ? (
              <>
                <Text variant="bodyLMedium" tabular style={{ marginTop: space.s4 }}>
                  {formatPrice(product.price)}
                </Text>
                <Text variant="caption" style={{ color: stock.color }}>
                  {stock.text}
                  <Text variant="caption" color="textMuted">{` · at ${product.retailer}`}</Text>
                </Text>
              </>
            ) : (
              <Text variant="caption" color="textMuted">
                Search for similar pieces with the crop from this photo.
              </Text>
            )}
          </div>
        </div>
        {product?.stock === 'out' ? (
          <>
            {alternatives}
            <div style={{ height: space.s16 }} />
            {actions}
          </>
        ) : (
          <>
            {actions}
            <div style={{ height: space.s24 }} />
            {alternatives}
          </>
        )}
      </motion.div>

      {/* Large: compact summary, sticky price bands, scrolling grid, sticky footer */}
      {product ? (
        <motion.div className={styles.layer} style={{ opacity: progress, pointerEvents: detent === 1 ? 'auto' : 'none' }}>
          <div className={styles.summary}>
            <div className={styles.thumb}>
              <Image src={lookImage(look.id)} transition={0} />
              <span className={styles.thumbDot} style={{ left: piece.x * 32 - 2, top: piece.y * 40 - 2 }} />
            </div>
            <div className={styles.summaryPack}>
              <Image src={productImage(product.id)} transition={0} />
            </div>
            <div className={styles.summaryText}>
              <Text variant="captionMedium" lines={1}>{`${product.brand} · ${product.name}`}</Text>
              <Text variant="caption" color="textSecondary" tabular>
                {`${formatPrice(product.price)} · ${stock?.text}`}
              </Text>
            </div>
          </div>
          <div className={styles.pad}>{bandHeader(true)}</div>
          <div className="scroll" style={{ flex: 1 }}>
            <div className={styles.grid} style={{ paddingBottom: footerH + space.s16 }}>
              {items.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  width={gridW}
                  referencePrice={product.price}
                  toastBottom={footerH + space.s8}
                />
              ))}
            </div>
          </div>
          <div className={styles.footer} style={{ height: footerH, paddingBottom: insets.bottom }}>
            {actions}
          </div>
        </motion.div>
      ) : null}
    </BottomSheet>
  );
}

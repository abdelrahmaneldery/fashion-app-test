import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { ArrowUpRightIcon, CaretLeftIcon, ExportIcon, PlusIcon } from '@/components/icons';
import { Image } from '@/components/Image';
import { LookCard } from '@/components/LookCard';
import { ProductCard } from '@/components/ProductCard';
import { SaveButton } from '@/components/SaveButton';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Text } from '@/components/Text';
import {
  alternativesFor,
  bandOf,
  formatPrice,
  looksWithProduct,
  productImageSet,
  products,
  type PriceBand,
  type Product,
} from '@/data/catalog';
import { useElementSize } from '@/hooks/useElementSize';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { track } from '@/lib/analytics';
import { share } from '@/lib/platform';
import { shopAt } from '@/lib/shop';
import { selectTheme, useSeamStore } from '@/store/useSeamStore';
import { ThemeScope, useTheme, useThemeColorMeta } from '@/theme/theme';
import { layout, space, type ThemeName } from '@/theme/tokens';
import styles from './ProductDetail.module.css';

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const product = id ? products[id] : undefined;
  const scheme = useSeamStore(selectTheme);
  // Product facts get their own surface — paper under a light app, but never a lit page in a dark one.
  const surface: ThemeName = scheme === 'dark' ? 'dark' : 'bone';
  return <ThemeScope name={surface}>{product ? <Detail key={product.id} product={product} /> : <Missing />}</ThemeScope>;
}

function Missing() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: space.s16,
        height: '100%',
        padding: `${insets.top + space.s48}px ${layout.margin}px`,
        background: 'var(--c-bgPrimary)',
      }}
    >
      <Text variant="h2" as="h1">
        This piece is no longer listed
      </Text>
      <Text variant="body" color="textSecondary" style={{ maxWidth: 560 }}>
        The retailer removed it. Alternatives in the same category are on the Look it came from.
      </Text>
      <Button label="Go back" variant="secondary" onClick={() => navigate(-1)} style={{ alignSelf: 'flex-start' }} />
    </div>
  );
}

const ACCORDION = ['Description', 'Materials & care', 'Size & fit', 'Delivery & returns'] as const;

function Detail({ product }: { product: Product }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const [scrollRef, { width: W }] = useElementSize<HTMLDivElement>();
  const showToast = useSeamStore((s) => s.showToast);
  // Product facts always sit on Bone, so the browser chrome follows that surface rather than the app mode.
  useThemeColorMeta();
  useEffect(() => track({ name: 'product_viewed', productId: product.id }), [product.id]);

  const images = productImageSet(product.id);
  const galleryH = Math.round((W * 5) / 4);
  const [page, setPage] = useState(0);
  const [openSection, setOpenSection] = useState<(typeof ACCORDION)[number] | null>(null);

  // The bar is as tall as the controls in it, which are one touch target each.
  const topBarBottom = insets.top + layout.hit;
  const barH = 64 + insets.bottom;
  const toastBottom = barH + space.s8;

  // Sticky CTA appears only once the inline CTA row is fully out of view, with hysteresis so it doesn't flicker.
  const ctaRef = useRef<HTMLDivElement>(null);
  const [stickyVisible, setStickyVisible] = useState(false);
  const onScroll = () => {
    const el = ctaRef.current;
    const container = scrollRef.current;
    if (!el || !container) return;
    const containerTop = container.getBoundingClientRect().top;
    const top = el.getBoundingClientRect().top - containerTop;
    const bottom = top + el.offsetHeight;
    setStickyVisible((on) => (on ? !(top >= topBarBottom) : bottom <= topBarBottom));
  };

  const stock =
    product.stock === 'in'
      ? { text: 'In stock', color: colors.success }
      : product.stock === 'low'
        ? { text: 'Low stock', color: colors.warning }
        : { text: 'Sold out', color: colors.textMuted };

  const alternatives = useMemo(() => alternativesFor(product), [product]);
  const byBand = useMemo(() => {
    const out: Record<PriceBand, Product[]> = { lower: [], similar: [], higher: [] };
    alternatives.forEach((p) => out[bandOf(product.price, p.price)].push(p));
    return out;
  }, [alternatives, product.price]);
  const [band, setBand] = useState<PriceBand>(() =>
    byBand.similar.length ? 'similar' : byBand.lower.length ? 'lower' : 'higher',
  );
  const withPiece = looksWithProduct(product.id);
  const lookW = (W - layout.margin * 2 - layout.gutter) / 2;

  const details: Record<(typeof ACCORDION)[number], string> = {
    Description: product.description,
    'Materials & care': product.materials,
    'Size & fit': product.fit,
    'Delivery & returns': product.delivery,
  };

  const shopLabel = product.stock === 'out' ? 'Check availability' : `Shop at ${product.retailer}`;

  const onShare = async () => {
    const message = await share(`${product.brand} ${product.name}, ${formatPrice(product.price)}, on SEAM`);
    if (message) showToast({ message, bottom: toastBottom });
  };

  return (
    <div className={styles.screen}>
      <div ref={scrollRef} onScroll={onScroll} className={`scroll ${styles.feed}`}>
        <div style={{ paddingTop: topBarBottom, paddingBottom: barH + space.s32 }}>
          {/* Gallery: 4:5, packshots contained on Linen */}
          <div className={styles.gallery} style={{ height: galleryH }}>
            <div
              className={`hscroll ${styles.slides}`}
              onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / Math.max(1, W)))}
            >
              {images.map((src, i) => (
                <div key={i} className={styles.slide} style={{ height: galleryH }}>
                  <Image src={src} eager={i === 0} alt={`${product.brand} ${product.name}`} />
                </div>
              ))}
            </div>
            {images.length > 1 ? (
              <Text variant="micro" color="textSecondary" tabular className={styles.pager}>
                {`${page + 1} / ${images.length}`}
              </Text>
            ) : null}
          </div>

          {/* Facts */}
          <div className={styles.info}>
            <Text variant="label">{product.brand}</Text>
            <Text variant="h2" as="h1">
              {product.name}
            </Text>
            <div className={styles.priceRow}>
              <Text variant="bodyLMedium" tabular>
                {formatPrice(product.price)}
              </Text>
              <Text variant="caption" style={{ color: stock.color }}>
                {stock.text}
              </Text>
            </div>
            <Text variant="caption" color="textSecondary">{`Sold by ${product.retailer} · Ships in 3–5 days`}</Text>
          </div>

          {/* Inline CTA row */}
          <div ref={ctaRef} className={styles.cta}>
            <SaveButton kind="product" id={product.id} variant="outlined" toastBottom={toastBottom} />
            <Button
              label={shopLabel}
              trailingIcon={ArrowUpRightIcon}
              style={{ flex: 1 }}
              onClick={() => shopAt(product, 'product_detail')}
            />
          </div>

          {/* Accordions: one open at a time */}
          <div className={styles.accordions}>
            {ACCORDION.map((section) => {
              const open = openSection === section;
              return (
                <div key={section} className={styles.section}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenSection(open ? null : section)}
                    className={styles.accordion}
                  >
                    <Text variant="bodyMedium">{section}</Text>
                    <span className={open ? `${styles.plus} ${styles.plusOpen}` : styles.plus}>
                      <PlusIcon size={16} weight="regular" color={colors.iconPrimary} />
                    </span>
                  </button>
                  {open ? (
                    <Text variant="body" color="textSecondary" as="p" className={styles.accordionBody}>
                      {details[section]}
                    </Text>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Alternatives */}
          {alternatives.length ? (
            <div style={{ paddingTop: space.s48 }}>
              <div className={styles.sectionHead}>
                <Text variant="h1" as="h2">
                  Alternatives
                </Text>
                <SegmentedControl
                  segments={(['lower', 'similar', 'higher'] as PriceBand[]).map((k) => ({
                    key: k,
                    label: k[0].toUpperCase() + k.slice(1),
                    disabled: !byBand[k].length,
                  }))}
                  value={band}
                  onChange={setBand}
                  aria-label="Price band"
                />
              </div>
              <div className={`hscroll ${styles.rail}`}>
                {byBand[band].map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    width={140}
                    variant="rail"
                    referencePrice={product.price}
                    toastBottom={toastBottom}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {/* Looks with this piece */}
          {withPiece.length ? (
            <div style={{ paddingTop: space.s48 }}>
              <div className={styles.sectionHead}>
                <Text variant="h1" as="h2">
                  Looks with this piece
                </Text>
              </div>
              <div className={styles.lookGrid}>
                {withPiece.slice(0, 4).map((l) => (
                  <LookCard key={l.id} look={l} width={lookW} variant="compact" toastBottom={toastBottom} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Top bar */}
      <div className={styles.topBar} style={{ paddingTop: insets.top }}>
        <IconButton icon={CaretLeftIcon} disc aria-label="Back" onClick={() => navigate(-1)} />
        <motion.div
          className={styles.topTitle}
          initial={false}
          animate={{ opacity: stickyVisible ? 1 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <Text variant="captionMedium" tabular lines={1}>{`${product.brand} · ${formatPrice(product.price)}`}</Text>
        </motion.div>
        <IconButton icon={ExportIcon} disc aria-label="Share" onClick={onShare} />
      </div>

      {/* Sticky product action bar */}
      <motion.div
        className={styles.sticky}
        style={{ height: barH, paddingBottom: insets.bottom, pointerEvents: stickyVisible ? 'auto' : 'none' }}
        initial={false}
        animate={{ y: stickyVisible ? 0 : barH + 2 }}
        transition={{ duration: 0.2 }}
      >
        <SaveButton kind="product" id={product.id} variant="outlined" toastBottom={toastBottom} />
        <Button
          label={shopLabel}
          trailingIcon={ArrowUpRightIcon}
          style={{ flex: 1 }}
          onClick={() => shopAt(product, 'sticky_bar')}
        />
      </motion.div>
    </div>
  );
}

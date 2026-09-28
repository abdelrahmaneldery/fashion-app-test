import raw from './catalog.json';
import { avatarImages, lookImages, productImages } from './images';

export type StockState = 'in' | 'low' | 'out';
export type Slot = 'outer' | 'top' | 'bottom' | 'shoes' | 'bag';
export type Category = 'outer' | 'top' | 'bottom' | 'shoes' | 'bag' | 'dress';

export interface Product {
  id: string;
  brand: string;
  name: string;
  price: number;
  stock: StockState;
  retailer: string;
  category: Category;
  label: string;
  /** Hex the placeholder art is drawn with. */
  color: string;
  /** The same colour in words, so photography prompts and the swatch cannot drift apart. */
  colorName: string;
  alternatives?: string[];
  description: string;
  materials: string;
  fit: string;
  delivery: string;
}

export interface Creator {
  id: string;
  name: string;
  handle: string;
  bio: string;
  /** Their own site, shown on the About sheet. Absent when they have not added one. */
  website?: string;
}

export interface Piece {
  /** 1-based, head to toe, then accessories. */
  index: number;
  slot: Slot;
  productId: string | null;
  label: string;
  /**
   * Where this piece's tap marker sits, as a fraction of its Look's image (0–1 on both axes).
   * Authored per Look in catalog.json — never derived from the slot — so photographs can use
   * whatever pose and composition they like.
   */
  x: number;
  y: number;
}

export interface HeadlinePart {
  text: string;
  italic?: boolean;
}

export interface Look {
  id: string;
  creatorId: string;
  /** width / height */
  ratio: number;
  style: string;
  occasion: string;
  season: string;
  caption: string;
  /** Where Visit takes people: the link the creator attached when posting. Absent when there is none. */
  link?: string;
  pieces: Piece[];
  ai: boolean;
  editorial?: { kicker: string; headline: HeadlinePart[] };
}

const COPY: Record<Category, Pick<Product, 'description' | 'materials' | 'fit'>> = {
  outer: {
    description: 'Single-breasted with a soft shoulder and patch pockets. Unlined, so it wears light in heat.',
    materials: '100% linen. Dry clean or cool hand wash.',
    fit: 'Relaxed. Take your usual size; size down for a closer fit.',
  },
  top: {
    description: 'A clean, slightly boxy shape with a soft collar that sits open under tailoring.',
    materials: '100% cotton. Machine wash at 30°.',
    fit: 'True to size, with room through the body.',
  },
  bottom: {
    description: 'High rise with front pleats and a wide, straight leg that breaks on the shoe.',
    materials: 'Wool blend. Dry clean.',
    fit: 'True to size at the waist. Inseam 81 cm.',
  },
  shoes: {
    description: 'Hand-stitched moccasin construction with a penny strap and a flexible leather sole.',
    materials: 'Suede upper, leather lining and sole.',
    fit: 'True to size. Half sizes: size up.',
  },
  bag: {
    description: 'Structured body with a flat base and a top handle long enough for the shoulder.',
    materials: 'Smooth calf leather, cotton lining.',
    fit: 'Width 32 cm, height 26 cm, depth 12 cm.',
  },
  dress: {
    description: 'A long column in fine rib knit with a high neck and long sleeves.',
    materials: 'Merino wool. Hand wash cold, dry flat.',
    fit: 'Fitted but not tight. True to size.',
  },
};

const DELIVERY = 'Sold and shipped by the retailer. Delivery and returns follow their policy, shown at checkout.';

export const products: Record<string, Product> = Object.fromEntries(
  raw.products.map((p) => {
    const category = p.category as Category;
    const product: Product = {
      id: p.id,
      brand: p.brand,
      name: p.name,
      price: p.price,
      stock: p.stock as StockState,
      retailer: p.retailer,
      category,
      label: p.label,
      color: p.color,
      colorName: p.colorName,
      alternatives: 'alternatives' in p ? (p.alternatives as string[]) : undefined,
      ...COPY[category],
      delivery: DELIVERY,
    };
    return [p.id, product];
  }),
);

export const creators: Record<string, Creator> = Object.fromEntries(
  raw.creators.map((c) => [
    c.id,
    { id: c.id, name: c.name, handle: c.handle, bio: c.bio, website: 'website' in c ? String(c.website) : undefined },
  ]),
);

const SLOT_ORDER: Slot[] = ['outer', 'top', 'bottom', 'shoes', 'bag'];

export const looks: Record<string, Look> = Object.fromEntries(
  raw.looks.map((l) => {
    const ordered = [...l.pieces].sort(
      (a, b) => SLOT_ORDER.indexOf(a.slot as Slot) - SLOT_ORDER.indexOf(b.slot as Slot),
    );
    const pieces: Piece[] = ordered.map((pc, i) => {
      const product = pc.product ? products[pc.product] : undefined;
      return {
        index: i + 1,
        slot: pc.slot as Slot,
        productId: pc.product,
        label: product?.label ?? ('label' in pc ? String(pc.label) : 'PIECE'),
        // Authored per Look, so each photograph is free to use its own pose and composition.
        x: pc.x,
        y: pc.y,
      };
    });
    const look: Look = {
      id: l.id,
      creatorId: l.creator,
      ratio: l.ratio[0] / l.ratio[1],
      style: l.style,
      occasion: l.occasion,
      season: l.season,
      caption: l.caption,
      link: 'link' in l ? String(l.link) : undefined,
      pieces,
      ai: false,
      editorial: 'editorial' in l ? (l.editorial as Look['editorial']) : undefined,
    };
    return [l.id, look];
  }),
);

export const feed: Look[] = raw.feedOrder.map((id) => looks[id]);

export const styles = ['All', ...Array.from(new Set(feed.map((l) => l.style)))];

export const lookImage = (id: string): string => lookImages[id];
export const productImageSet = (id: string): string[] => productImages[id] ?? [];
export const productImage = (id: string): string => productImages[id]?.[0];
export const avatarImage = (id: string): string => avatarImages[id];

export function formatPrice(value: number) {
  return `$${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function formatDelta(delta: number) {
  if (delta === 0) return 'Same price';
  return `${delta < 0 ? '−' : '+'}${formatPrice(Math.abs(delta))}`;
}

/** Where Visit takes someone from a Look: its own link, else its creator's site, else nowhere. */
export function lookLink(look: Look): string | undefined {
  return look.link ?? creators[look.creatorId]?.website;
}

export function identifiedProducts(look: Look): Product[] {
  return look.pieces.flatMap((p) => (p.productId ? [products[p.productId]] : []));
}

export function lookTotal(look: Look) {
  return identifiedProducts(look).reduce((sum, p) => sum + p.price, 0);
}

/** 1–4, from the median price of the identified pieces. Same thresholds as Taste Setup. */
export function priceBand(look: Look): 1 | 2 | 3 | 4 {
  const prices = identifiedProducts(look)
    .map((p) => p.price)
    .sort((a, b) => a - b);
  if (!prices.length) return 1;
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
  if (median < 50) return 1;
  if (median < 150) return 2;
  if (median < 400) return 3;
  return 4;
}

export const BAND_RANGES = ['under $50', '$50 to $150', '$150 to $400', 'over $400'] as const;

export type PriceBand = 'lower' | 'similar' | 'higher';

export function bandOf(reference: number, price: number): PriceBand {
  if (price < reference * 0.85) return 'lower';
  if (price > reference * 1.15) return 'higher';
  return 'similar';
}

export function alternativesFor(product: Product): Product[] {
  const ids =
    product.alternatives ??
    Object.values(products)
      .filter((p) => p.category === product.category && p.id !== product.id)
      .map((p) => p.id);
  return ids.map((id) => products[id]).filter(Boolean);
}

export function looksWithProduct(productId: string): Look[] {
  return feed.filter((l) => l.pieces.some((p) => p.productId === productId));
}

export function similarLooks(look: Look): Look[] {
  const others = feed.filter((l) => l.id !== look.id);
  const score = (l: Look) => (l.style === look.style ? 2 : 0) + (l.occasion === look.occasion ? 1 : 0);
  return [...others].sort((a, b) => score(b) - score(a));
}

export function moreFromCreator(look: Look): Look[] {
  return feed.filter((l) => l.creatorId === look.creatorId && l.id !== look.id);
}

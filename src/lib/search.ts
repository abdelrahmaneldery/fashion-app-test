import {
  creators,
  feed,
  products,
  type Creator,
  type Look,
  type Product,
} from '@/data/catalog';

export type ResultKind = 'all' | 'looks' | 'pieces' | 'creators';

export interface SearchFilters {
  kind: ResultKind;
  /** Look styles to keep. Empty means every style. */
  styles: string[];
  /** Price bands 1–4 to keep. Empty means every band. */
  bands: number[];
  inStockOnly: boolean;
}

export const EMPTY_FILTERS: SearchFilters = { kind: 'all', styles: [], bands: [], inStockOnly: false };

export const filterCount = (f: SearchFilters) =>
  (f.kind === 'all' ? 0 : 1) + f.styles.length + f.bands.length + (f.inStockOnly ? 1 : 0);

export interface SearchResults {
  looks: Look[];
  products: Product[];
  creators: Creator[];
  total: number;
}

const norm = (s: string) => s.toLowerCase().trim();

/** Everything about a Look a query could reasonably match. */
const lookHaystack = (look: Look) =>
  norm(
    [
      look.style,
      look.occasion,
      look.season,
      look.caption,
      creators[look.creatorId]?.name ?? '',
      creators[look.creatorId]?.handle ?? '',
      ...look.pieces.map((p) => (p.productId ? products[p.productId]?.name ?? '' : p.label)),
      ...look.pieces.map((p) => (p.productId ? products[p.productId]?.brand ?? '' : '')),
    ].join(' '),
  );

const productHaystack = (product: Product) =>
  norm([product.brand, product.name, product.category, product.colorName, product.retailer].join(' '));

/** Price band of a single piece, on the same thresholds the Look-level band uses. */
export function bandOfPrice(price: number): 1 | 2 | 3 | 4 {
  if (price < 50) return 1;
  if (price < 150) return 2;
  if (price < 400) return 3;
  return 4;
}

/**
 * One pass over the bundled catalogue. Small enough that this runs on every keystroke without
 * memoising; when the API arrives this is the shape the endpoint should return.
 */
export function search(query: string, filters: SearchFilters = EMPTY_FILTERS): SearchResults {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  const matches = (hay: string) => terms.every((t) => hay.includes(t));

  let looks = terms.length ? feed.filter((l) => matches(lookHaystack(l))) : feed.slice();
  let pieces = terms.length
    ? Object.values(products).filter((p) => matches(productHaystack(p)))
    : Object.values(products);
  const people = terms.length
    ? Object.values(creators).filter((c) => matches(norm(`${c.name} ${c.handle} ${c.bio}`)))
    : [];

  if (filters.styles.length) looks = looks.filter((l) => filters.styles.includes(l.style));
  if (filters.bands.length) {
    looks = looks.filter((l) => filters.bands.includes(priceBandOf(l)));
    pieces = pieces.filter((p) => filters.bands.includes(bandOfPrice(p.price)));
  }
  if (filters.inStockOnly) pieces = pieces.filter((p) => p.stock !== 'out');

  if (filters.kind === 'looks') pieces = [];
  if (filters.kind === 'pieces') looks = [];
  if (filters.kind === 'creators') {
    looks = [];
    pieces = [];
  }

  return { looks, products: pieces, creators: people, total: looks.length + pieces.length + people.length };
}

/** Re-exported so the filter sheet and results share one definition. */
function priceBandOf(look: Look): number {
  const prices = look.pieces
    .flatMap((p) => (p.productId ? [products[p.productId].price] : []))
    .sort((a, b) => a - b);
  if (!prices.length) return 1;
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
  return bandOfPrice(median);
}

/** What to offer before anyone has typed anything. */
export const suggestedQueries = [
  'linen blazer',
  'wide-leg trousers',
  'suede loafers',
  'oatmeal knit',
  'black tailoring',
  'denim',
  'straw tote',
  'ankle boots',
];

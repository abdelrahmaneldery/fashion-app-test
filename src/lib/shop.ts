import type { Product } from '@/data/catalog';
import { track } from './analytics';
import { openExternal } from './platform';

export type ShopSurface = 'piece_sheet' | 'product_detail' | 'sticky_bar' | 'alternatives';

/** Every route out to a retailer goes through here, so the click is always counted. */
export function shopAt(product: Product, surface: ShopSurface) {
  track({ name: 'shop_clicked', productId: product.id, surface });
  openExternal(`https://example.com/shop/${product.id}`);
}

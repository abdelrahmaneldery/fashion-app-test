import { creators, feed, lookImage, productImage, products } from '@/data/catalog';
import type { ImportSourceKey } from '@/data/importSources';
import { ME } from '@/lib/social';
import type { ImportedImage } from '@/store/useSeamStore';

/** One photo on a connected account. `id` is the platform's own, stable between visits. */
export type AccountImage = { id: string; src: string; description: string };

/**
 * The only way SEAM talks to another platform. A real adapter signs in on the platform's own page
 * (so SEAM never sees a password) and fetches through SEAM's server; the screens only ever call these.
 */
export type ImportAdapter = {
  /** Resolves with the account's handle once the person has signed in. */
  signIn: () => Promise<{ handle: string }>;
  /** The account's photos, newest first. */
  listImages: () => Promise<AccountImage[]>;
  /** The picture behind an image already brought in, or undefined if the platform no longer has it. */
  imageFor: (id: string) => string | undefined;
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * A stand-in account that answers from the catalogue after a network-like pause, so every screen can
 * be built and tried before any platform has approved SEAM. Nothing here leaves the device.
 */
function demoAdapter(handle: string, images: AccountImage[]): ImportAdapter {
  const byId = new Map(images.map((image) => [image.id, image.src]));
  return {
    signIn: async () => {
      await wait(900);
      return { handle };
    },
    listImages: async () => {
      await wait(600);
      return images;
    },
    imageFor: (id) => byId.get(id),
  };
}

const me = creators[ME];
const username = me.handle.replace(/^@/, '');

// Instagram holds outfit photographs; the marketplaces hold pieces, cheapest to dearest across them.
const outfitPhotos: AccountImage[] = feed.map((look) => ({
  id: look.id,
  src: lookImage(look.id),
  description: look.caption,
}));
const listings = Object.values(products)
  .sort((a, b) => a.price - b.price)
  .map((p) => ({ id: p.id, src: productImage(p.id), description: `${p.brand} ${p.name}` }));
const third = Math.ceil(listings.length / 3);

export const importAdapters: Record<ImportSourceKey, ImportAdapter> = {
  instagram: demoAdapter(me.handle, outfitPhotos),
  vinted: demoAdapter(`@${username.replace('.', '_')}`, listings.slice(0, third)),
  depop: demoAdapter(`@${username.replace('.', '')}`, listings.slice(third, third * 2)),
  vestiaire: demoAdapter(`@${username}`, listings.slice(third * 2)),
};

/** The picture for an image someone brought into SEAM. */
export const importedImageSrc = (image: ImportedImage) => importAdapters[image.source].imageFor(image.sourceId) ?? '';

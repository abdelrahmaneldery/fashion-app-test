import { avatarFiles, lookFiles, productFiles } from './images.generated';

/**
 * The generated manifest holds file names; Vite resolves each one to a hashed, build-time URL.
 * These globs are statically analysed, so the arguments have to be written out at each call.
 */
const byName = (glob: Record<string, string>, dir: string) => {
  const map: Record<string, string> = {};
  for (const [path, href] of Object.entries(glob)) map[path.slice(path.lastIndexOf('/') + 1)] = href;
  return (file: string) => {
    const href = map[file];
    if (!href && import.meta.env.DEV) console.warn(`[images] missing ${dir}/${file} — run npm run images`);
    return href ?? '';
  };
};

const lookUrl = byName(
  import.meta.glob('../../assets/images/looks/*.jpg', { eager: true, query: '?url', import: 'default' }),
  'looks',
);
const productUrl = byName(
  import.meta.glob('../../assets/images/products/*.jpg', { eager: true, query: '?url', import: 'default' }),
  'products',
);
const avatarUrl = byName(
  import.meta.glob('../../assets/images/avatars/*.jpg', { eager: true, query: '?url', import: 'default' }),
  'avatars',
);

export const lookImages: Record<string, string> = Object.fromEntries(
  Object.entries(lookFiles).map(([id, file]) => [id, lookUrl(file)]),
);

export const productImages: Record<string, string[]> = Object.fromEntries(
  Object.entries(productFiles).map(([id, files]) => [id, files.map(productUrl)]),
);

export const avatarImages: Record<string, string> = Object.fromEntries(
  Object.entries(avatarFiles).map(([id, file]) => [id, avatarUrl(file)]),
);

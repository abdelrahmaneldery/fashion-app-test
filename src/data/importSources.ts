import depopLogo from '../../assets/logos/depop.svg';
import instagramLogo from '../../assets/logos/instagram.png';
import vestiaireLogo from '../../assets/logos/vestiaire-collective.png';
import vintedLogo from '../../assets/logos/vinted.svg';

/** A platform's logo, as the file the platform supplies, shown in its own colours. */
export type SourceMark = {
  src: string;
  /** The artwork's own width over its height, so empty space inside the file is cropped away. */
  aspect: number;
  /** Artwork height as a share of the row's icon size, tuned so each logo carries the same weight. */
  height: number;
  /** A wordmark that already reads as the platform's name, so the name is not written beside it. */
  spellsName?: boolean;
  /** A black logo, drawn in the page's light ink on dark surfaces so it does not vanish. */
  mono?: boolean;
};

export type ImportSource = {
  key: string;
  name: string;
  /** Where the platform's own sign-in page lives, shown in the address bar while you are on it. */
  domain: string;
  /** One line under the logo on Post a Look. */
  line: string;
  mark: SourceMark;
};

/**
 * Where a creator can bring a Look in from, in the order Post a Look lists them.
 * To add a platform: put its logo in assets/logos/ and add an entry.
 */
export const importSources = [
  {
    key: 'instagram',
    name: 'Instagram',
    domain: 'instagram.com',
    line: "Bring in a Look you've already posted.",
    // The app icon: a square that does not spell the name, so "Instagram" is written beside it.
    mark: { src: instagramLogo, aspect: 1, height: 1, spellsName: false },
  },
  {
    key: 'vinted',
    name: 'Vinted',
    domain: 'vinted.com',
    line: 'Bring in a Look from your Vinted wardrobe.',
    // The lettering spans rows 11–37.8 of the file's 48, across its full 83 width.
    mark: { src: vintedLogo, aspect: 83 / 26.8, height: 0.54, spellsName: true },
  },
  {
    key: 'depop',
    name: 'Depop',
    domain: 'depop.com',
    line: 'Bring in a Look from your Depop shop.',
    // Taller than the others: its d and p reach well above and below the lowercase.
    mark: { src: depopLogo, aspect: 1295 / 333, height: 0.62, spellsName: true },
  },
  {
    key: 'vestiaire',
    name: 'Vestiaire Collective',
    domain: 'vestiairecollective.com',
    line: 'Bring in a Look from your Vestiaire Collective listings.',
    // Shorter than the others: two long words, all set at cap height.
    mark: { src: vestiaireLogo, aspect: 574 / 51, height: 0.46, spellsName: true, mono: true },
  },
] as const satisfies readonly ImportSource[];

export type ImportSourceKey = (typeof importSources)[number]['key'];

export const importSourceByKey = Object.fromEntries(importSources.map((s) => [s.key, s])) as Record<
  ImportSourceKey,
  ImportSource
>;

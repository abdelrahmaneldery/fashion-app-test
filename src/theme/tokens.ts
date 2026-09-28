/** Primitives. Components never use these directly; they read semantic tokens via useTheme() or var(--c-*). */
export const palette = {
  /** Near black. Light-mode text, scrims, and the stage a photograph is shown on — never a page. */
  ink: '#0B0B0C',
  /**
   * The dark ground. Lifted well off black: a page this size at full black glares against its own
   * text, and every surface above it has to be brighter still to separate.
   */
  coal: '#17171B',
  onyx: '#1E1E23',
  graphite: '#26262C',
  slate: '#31313A',
  iron: '#3D3D47',
  steel: '#6A6A71',
  ash: '#9A9AA2',
  mist: '#C9C7C2',
  paper: '#FAF8F5',
  bone: '#F2EFEA',
  linen: '#E9E5DE',
  sand: '#DDD8CF',
  stone: '#857F75',
  clay: '#67635B',
  umber: '#55524B',
  sage: '#8FB89A',
  ochre: '#D9B36C',
  coral: '#E8847A',
  moss: '#2F6B45',
  bronze: '#7A5A12',
  brick: '#A8362B',
  ember: '#CC4436',
} as const;

const ink = (alpha: number) => `rgba(11, 11, 12, ${alpha})`;

/** dark and light follow the system; bone is the fixed surface for product facts (Product Detail). */
export type ThemeName = 'dark' | 'light' | 'bone';

export type ColorToken =
  | 'bgPrimary'
  | 'bgSecondary'
  | 'surfacePrimary'
  | 'surfaceElevated'
  | 'surfaceEditorial'
  | 'surfaceTile'
  | 'surfaceCard'
  | 'surfaceSubtle'
  | 'borderSubtle'
  | 'borderStrong'
  | 'textPrimary'
  | 'textSecondary'
  | 'textMuted'
  | 'iconPrimary'
  | 'iconSecondary'
  | 'actionPrimary'
  | 'actionInverse'
  | 'actionOverlay'
  | 'accent'
  | 'accentInverse'
  | 'success'
  | 'warning'
  | 'error'
  | 'scrim20'
  | 'scrim40'
  | 'scrim60';

/**
 * Semantic tokens. Dark and Light are the two app-wide modes (following the system appearance);
 * Bone is the product-facts surface used by Product Detail in both modes.
 * Every text/background pair passes WCAG AA; see README for the ratios.
 */
export const themes: Record<ThemeName, Record<ColorToken, string>> = {
  dark: {
    bgPrimary: palette.coal,
    bgSecondary: palette.onyx,
    surfacePrimary: palette.onyx,
    surfaceElevated: palette.graphite,
    surfaceEditorial: palette.graphite,
    surfaceTile: palette.linen,
    surfaceCard: palette.graphite,
    surfaceSubtle: palette.slate,
    borderSubtle: palette.iron,
    borderStrong: palette.steel,
    textPrimary: palette.bone,
    textSecondary: palette.mist,
    textMuted: palette.ash,
    iconPrimary: palette.bone,
    iconSecondary: palette.ash,
    actionPrimary: palette.bone,
    actionInverse: palette.ink,
    actionOverlay: ink(0.6),
    accent: palette.ember,
    accentInverse: '#FFFFFF',
    success: palette.sage,
    warning: palette.ochre,
    error: palette.coral,
    scrim20: ink(0.2),
    scrim40: ink(0.4),
    scrim60: ink(0.6),
  },
  light: {
    bgPrimary: palette.paper,
    bgSecondary: palette.bone,
    surfacePrimary: palette.paper,
    surfaceElevated: palette.paper,
    surfaceEditorial: palette.bone,
    surfaceTile: palette.linen,
    surfaceCard: '#FFFFFF',
    surfaceSubtle: palette.bone,
    borderSubtle: palette.sand,
    borderStrong: palette.stone,
    textPrimary: palette.ink,
    textSecondary: palette.umber,
    textMuted: palette.clay,
    iconPrimary: palette.ink,
    iconSecondary: palette.clay,
    actionPrimary: palette.ink,
    actionInverse: palette.bone,
    actionOverlay: ink(0.6),
    accent: palette.brick,
    accentInverse: '#FFFFFF',
    success: palette.moss,
    warning: palette.bronze,
    error: palette.brick,
    scrim20: ink(0.2),
    scrim40: ink(0.4),
    scrim60: ink(0.6),
  },
  bone: {
    bgPrimary: palette.bone,
    bgSecondary: palette.linen,
    surfacePrimary: palette.bone,
    surfaceElevated: palette.paper,
    surfaceEditorial: palette.bone,
    surfaceTile: palette.linen,
    surfaceCard: '#FFFFFF',
    surfaceSubtle: palette.linen,
    borderSubtle: palette.sand,
    borderStrong: palette.stone,
    textPrimary: palette.ink,
    textSecondary: palette.umber,
    textMuted: palette.clay,
    iconPrimary: palette.ink,
    iconSecondary: palette.clay,
    actionPrimary: palette.ink,
    actionInverse: palette.bone,
    actionOverlay: ink(0.6),
    accent: palette.brick,
    accentInverse: '#FFFFFF',
    success: palette.moss,
    warning: palette.bronze,
    error: palette.brick,
    scrim20: ink(0.2),
    scrim40: ink(0.4),
    scrim60: ink(0.6),
  },
};

/** Eight spacing values on the 4 px grid. */
export const space = { s4: 4, s8: 8, s12: 12, s16: 16, s24: 24, s32: 32, s48: 48, s64: 64 } as const;

/**
 * Eight values, each with one job. `card` is the one you reach for by default; everything on the
 * feed is a card. See the Foundations board in the mockups for where each belongs.
 */
export const radius = {
  none: 0,
  xs: 4,
  /** Small boxes inside a sheet or a card: a checkbox, a piece thumbnail. */
  tile: 8,
  /** The feed's photographs, where the picture should read before its frame does. */
  pin: 10,
  /** Thumbnails nested inside a card: packshots, mosaic cells. */
  sm: 12,
  /** Floating square controls that sit on a photograph. */
  button: 14,
  /** Pins, product tiles, board covers, list cards. */
  card: 16,
  /** The foot of a full-bleed hero, where the photo meets content. */
  hero: 24,
  /** Top corners of sheets and menus. */
  sheet: 28,
  full: 999,
} as const;

export const layout = { margin: 16, gutter: 8, hairline: 1, seam: 3, hit: 48 } as const;

/**
 * How tall a card's photograph stands. Clothes are shot full length, so the frame is generous:
 * the taller it stands, the more of the Look survives the crop and the further a card carries
 * down the feed.
 */
export const cardPhoto = {
  /** Tiles that choose their own height — packshots, board covers, profile and result grids. */
  tile: 1.5,
  /** A Look keeps the shape it was photographed at, drawn this much taller than that shape. */
  stretch: 1.18,
} as const;

/**
 * Elevation, per theme. A shadow alone cannot lift a dark surface off a dark ground, so the dark
 * set leads with a hairline edge and carries a deeper, blacker glow behind it.
 */
export const elevation: Record<ThemeName, { sheet: string; float: string; toast: string }> = {
  dark: {
    sheet: '0 -1px 0 #3D3D47, 0 -12px 44px rgba(0, 0, 0, 0.64)',
    float: '0 0 0 1px rgba(255, 255, 255, 0.08), 0 2px 12px rgba(0, 0, 0, 0.55)',
    toast: '0 0 0 1px #3D3D47, 0 8px 28px rgba(0, 0, 0, 0.62)',
  },
  light: {
    sheet: '0 -1px 0 rgba(11, 11, 12, 0.06), 0 -10px 40px rgba(11, 11, 12, 0.16)',
    float: '0 2px 10px rgba(11, 11, 12, 0.12)',
    toast: '0 6px 24px rgba(11, 11, 12, 0.22)',
  },
  bone: {
    sheet: '0 -1px 0 rgba(11, 11, 12, 0.08), 0 -10px 40px rgba(11, 11, 12, 0.18)',
    float: '0 2px 10px rgba(11, 11, 12, 0.14)',
    toast: '0 6px 24px rgba(11, 11, 12, 0.24)',
  },
};

export const motion = { fast: 150, base: 200, medium: 250, slow: 300, slower: 350 } as const;

/**
 * Breakpoints. The design is a phone canvas; past `wide` the feed gains columns and the
 * app column stops growing, so line lengths and card sizes stay as drawn.
 */
export const breakpoint = { tablet: 680, wide: 1024 } as const;

/** The app column never exceeds this; the page centres it. */
export const APP_MAX_WIDTH = 1120;

export const fontStack = {
  sans: "'Figtree Variable', Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

export type FontToken = { fontFamily: string; fontWeight: number; fontStyle: 'normal' | 'italic' };

export const fonts = {
  regular: { fontFamily: fontStack.sans, fontWeight: 400, fontStyle: 'normal' },
  medium: { fontFamily: fontStack.sans, fontWeight: 500, fontStyle: 'normal' },
  semibold: { fontFamily: fontStack.sans, fontWeight: 600, fontStyle: 'normal' },
  bold: { fontFamily: fontStack.sans, fontWeight: 700, fontStyle: 'normal' },
  heavy: { fontFamily: fontStack.sans, fontWeight: 800, fontStyle: 'normal' },
} as const satisfies Record<string, FontToken>;

export type TypeStyle = {
  font: FontToken;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  textTransform?: 'uppercase';
};

export const typeScale = {
  displayXL: { font: fonts.heavy, fontSize: 34, lineHeight: 40, letterSpacing: -1 },
  displayL: { font: fonts.heavy, fontSize: 26, lineHeight: 32, letterSpacing: -0.7 },
  h1: { font: fonts.heavy, fontSize: 22, lineHeight: 28, letterSpacing: -0.5 },
  h2: { font: fonts.heavy, fontSize: 19, lineHeight: 25, letterSpacing: -0.3 },
  h3: { font: fonts.bold, fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  price: { font: fonts.heavy, fontSize: 22, lineHeight: 28, letterSpacing: -0.5 },
  bodyL: { font: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyLMedium: { font: fonts.semibold, fontSize: 16, lineHeight: 24 },
  body: { font: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { font: fonts.semibold, fontSize: 15, lineHeight: 22 },
  action: { font: fonts.bold, fontSize: 15, lineHeight: 20 },
  label: { font: fonts.bold, fontSize: 11, lineHeight: 15, letterSpacing: 0.7, textTransform: 'uppercase' },
  caption: { font: fonts.regular, fontSize: 13, lineHeight: 18 },
  captionMedium: { font: fonts.semibold, fontSize: 13, lineHeight: 18 },
  micro: { font: fonts.semibold, fontSize: 12, lineHeight: 16 },
  microUpper: { font: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.5, textTransform: 'uppercase' },
} as const satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof typeScale;

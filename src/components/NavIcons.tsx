/**
 * The navigation icon set, drawn rather than imported: rounded polygons with an outlined and a
 * filled cut, so a tab can swap weight the moment it becomes the one you are on. Each filled
 * glyph carves its detail out with `evenodd` instead of painting it a colour, so it reads on any
 * surface — white bar, ink bar or a green disc.
 */
export type NavIconProps = { size?: number; color: string; filled?: boolean };

type Glyph = {
  /** The body of the icon, closed. */
  body: string;
  /** The detail inside it, closed, so it can be cut out of the body when the icon is filled. */
  detail?: string;
  /**
   * What to draw in place of `detail` when the icon is outlined. A cut has to be a closed shape,
   * but the same detail drawn as an outline wants a single stroke down its middle.
   */
  outline?: string;
};

const HOME: Glyph = {
  body:
    'M9.57 4.56 Q12.00 2.80 14.43 4.56 L18.70 7.67 Q21.13 9.43 20.20 12.29 L18.57 17.31 ' +
    'Q17.64 20.17 14.64 20.17 L9.36 20.17 Q6.36 20.17 5.43 17.31 L3.80 12.29 Q2.87 9.43 5.30 7.67 Z',
  detail: 'M9.7 15.65 H14.3 A0.75 0.75 0 0 1 14.3 17.15 H9.7 A0.75 0.75 0 0 1 9.7 15.65 Z',
  outline: 'M9.7 16.4 H14.3',
};

const EXPLORE: Glyph = {
  body:
    'M9.06 4.00 Q12.00 2.30 14.94 4.00 L17.46 5.45 Q20.40 7.15 20.40 10.55 L20.40 13.45 ' +
    'Q20.40 16.85 17.46 18.55 L14.94 20.00 Q12.00 21.70 9.06 20.00 L6.54 18.55 ' +
    'Q3.60 16.85 3.60 13.45 L3.60 10.55 Q3.60 7.15 6.54 5.45 Z',
  detail: 'M9.30 13.89 A3.3 1.6 -35 0 1 14.70 10.11 A3.3 1.6 -35 0 1 9.30 13.89 Z',
};

const ADD: Glyph = {
  body:
    'M8 2.75 H16 A5.25 5.25 0 0 1 21.25 8 V16 A5.25 5.25 0 0 1 16 21.25 H8 ' +
    'A5.25 5.25 0 0 1 2.75 16 V8 A5.25 5.25 0 0 1 8 2.75 Z',
  detail:
    'M11.15 8.2 A0.85 0.85 0 0 1 12.85 8.2 V11.15 H15.8 A0.85 0.85 0 0 1 15.8 12.85 H12.85 ' +
    'V15.8 A0.85 0.85 0 0 1 11.15 15.8 V12.85 H8.2 A0.85 0.85 0 0 1 8.2 11.15 H11.15 Z',
  outline: 'M12 8.2 V15.8 M8.2 12 H15.8',
};

const BOOKMARK: Glyph = {
  body:
    'M6.5 3.3 H17.5 A2.2 2.2 0 0 1 19.7 5.5 V20 A0.8 0.8 0 0 1 18.44 20.66 L12 16.3 ' +
    'L5.56 20.66 A0.8 0.8 0 0 1 4.3 20 V5.5 A2.2 2.2 0 0 1 6.5 3.3 Z',
};

const PROFILE: Glyph = {
  body: 'M2.5 12 A9.5 9.5 0 0 1 21.5 12 A9.5 9.5 0 0 1 2.5 12 Z',
  detail:
    'M8.8 9.8 A3.2 3.2 0 0 1 15.2 9.8 A3.2 3.2 0 0 1 8.8 9.8 Z ' +
    'M5.88 18.6 C7.0 16.2 9.3 14.9 12 14.9 C14.7 14.9 17.0 16.2 18.12 18.6 A9 9 0 0 1 5.88 18.6 Z',
  // Outlined, the shoulders are one open curve; the arc that closes them for the cut is the
  // circle itself, and drawing it would double the ring.
  outline:
    'M8.8 9.8 A3.2 3.2 0 0 1 15.2 9.8 A3.2 3.2 0 0 1 8.8 9.8 Z ' +
    'M5.88 18.6 C7.0 16.2 9.3 14.9 12 14.9 C14.7 14.9 17.0 16.2 18.12 18.6',
};

function draw(glyph: Glyph, { size = 24, color, filled }: NavIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      {filled ? (
        <path d={glyph.detail ? `${glyph.body} ${glyph.detail}` : glyph.body} fill={color} fillRule="evenodd" />
      ) : (
        <>
          <path d={glyph.body} stroke={color} strokeWidth={1.3} strokeLinejoin="round" />
          {glyph.outline ?? glyph.detail ? (
            <path
              d={glyph.outline ?? glyph.detail}
              stroke={color}
              strokeWidth={1.3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </>
      )}
    </svg>
  );
}

export type NavIcon = (props: NavIconProps) => ReturnType<typeof draw>;

export const HomeIcon: NavIcon = (props) => draw(HOME, props);
export const ExploreIcon: NavIcon = (props) => draw(EXPLORE, props);
export const AddIcon: NavIcon = (props) => draw(ADD, props);
export const BookmarkIcon: NavIcon = (props) => draw(BOOKMARK, props);
export const ProfileIcon: NavIcon = (props) => draw(PROFILE, props);

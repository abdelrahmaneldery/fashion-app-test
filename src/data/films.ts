/**
 * A film is a Look shot in motion: the same post as a photograph, with a moving frame instead of
 * a still one. No footage has been shot yet, so this returns nothing and the Videos tab shows its
 * empty state. When clips exist they land here, and the grid fills without the profile changing.
 */
export interface Film {
  id: string;
  /** The Look the film belongs to: its poster frame, its caption and its pieces. */
  lookId: string;
  /** Runtime in seconds, for the corner of the tile. */
  seconds: number;
}

export const filmsBy = (_creatorId: string): Film[] => [];

/** m:ss, the way a clip's length is written over its first frame. */
export const formatRuntime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;

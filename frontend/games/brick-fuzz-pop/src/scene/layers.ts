/**
 * The layers the field is drawn in, back to front, in one list, so each
 * layer's place here is its depth: the field, its frame, its band, its
 * lintel and its grid's dots; the wall; the jump line and the danger line,
 * drawn over the wall, as the art draws them; the guide; what bursts from
 * the wall as things happen on it; and the fuzzballs, over everything, the
 * meter's pips under the one that waits.
 */
export const LAYERS = [
  "field",
  "wall",
  "lines",
  "guide",
  "bursts",
  "balls",
] as const;

/** One of the layers the field is drawn in. */
export type Layer = (typeof LAYERS)[number];

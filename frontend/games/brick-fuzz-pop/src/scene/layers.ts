/**
 * The layers the field is drawn in, back to front, in one list, so each
 * layer's place here is its depth: the field, its band and its grid's dots;
 * the wall; the jump line and the danger line, drawn over the wall, as the
 * art draws them; the guide; the jump line's count, over the guide, so an
 * outline under it leaves its dots whole; what bursts from the wall as
 * things happen on it; the fuzzballs, the meter's pips under the one that
 * waits; and the field's rim, its lintel, its ceiling and its frame, over
 * everything, so nothing that bursts from the wall or flies covers them.
 */
export const LAYERS = [
  "field",
  "wall",
  "lines",
  "guide",
  "count",
  "bursts",
  "balls",
  "rim",
] as const;

/** One of the layers the field is drawn in. */
export type Layer = (typeof LAYERS)[number];

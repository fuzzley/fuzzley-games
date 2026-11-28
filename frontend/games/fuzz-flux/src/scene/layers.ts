// The layers the board is drawn in, back to front, in one list, so each
// layer's place in it is its depth.

/**
 * The layers the board is drawn in, back to front: the squares' wells and
 * the dust on them, and the puffs of dust a sweep raises; the pieces
 * falling in from past the board's edge; the rim, the page round the
 * board, which hides each such piece until it reaches the board; the
 * pieces on the board, which nothing clips, as a special swells and
 * stretches past its edge, with the board's dimming among them; the
 * rings, the dashers' streaks, the frizzballs' bolts and the flash; a
 * gust's lines of wind; the waves' marks; the loose bits a move throws
 * about; the fuzzballs' copies flying to their goals, as the sketch draws
 * them; and the hint's hand, over them all.
 */
export const LAYERS = [
  "squares",
  "puffs",
  "falling",
  "rim",
  "pieces",
  "rings",
  "streaks",
  "bolts",
  "flash",
  "gusts",
  "marks",
  "loose",
  "flights",
  "hand",
] as const satisfies readonly string[];

/** One of the layers the board is drawn in, such as "pieces". */
export type Layer = (typeof LAYERS)[number];

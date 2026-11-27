// The layers the board is drawn in, back to front, in one list, so each
// layer's place in it is its depth.

/**
 * The layers the board is drawn in, back to front: the squares' wells, the
 * dust on them, and the puffs of dust a sweep raises; the pieces falling in
 * from past the board's edge; the rim, the page round the board, which
 * hides each such piece until it reaches the board; the pieces on the
 * board, which nothing clips, as a special swells and stretches past its
 * edge, with the board's dimming among them; the rings, the dashers'
 * streaks, the frizzballs' bolts and the flash; the waves' marks; and the
 * loose bits a move throws about, over them all, as the sketch draws them.
 */
export const LAYERS = [
  "squares",
  "dust",
  "puffs",
  "falling",
  "rim",
  "pieces",
  "rings",
  "streaks",
  "bolts",
  "flash",
  "marks",
  "loose",
] as const satisfies readonly string[];

/** One of the layers the board is drawn in, such as "pieces". */
export type Layer = (typeof LAYERS)[number];

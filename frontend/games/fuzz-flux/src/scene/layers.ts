// The layers the board is drawn in, back to front, in one list, so each
// layer's place in it is its depth.

/**
 * The layers the board is drawn in, back to front: the squares' wells, and
 * the dust on them; the pieces falling in from past the board's edge; the
 * rim, the page round the board, which hides each such piece until it
 * reaches the board; the pieces on the board, which nothing clips, as a
 * special swells and stretches past its edge; the loose sprites a move
 * throws about; and the waves' marks, over them all.
 */
export const LAYERS = [
  "squares",
  "dust",
  "falling",
  "rim",
  "pieces",
  "loose",
  "marks",
] as const satisfies readonly string[];

/** One of the layers the board is drawn in, such as "pieces". */
export type Layer = (typeof LAYERS)[number];

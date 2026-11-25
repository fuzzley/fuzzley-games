// The layers Rickashay's field is drawn in, back to front, in one list, so
// each layer's place in it is its depth.

/**
 * The layers the field is drawn in, back to front: the field, its band and its
 * grid's dots; the rally, small and faint under the danger line, under all that
 * plays over it; the floor bounces' springs in the band; the wall; the jump
 * line and the danger line, drawn over the wall; the guide, over them; the jump
 * line's count, over the guide, which keeps clear of it; the flourishes that
 * burst from the wall and flash on the field, over them all; the fuzzball, over
 * the guide's start; and the field's rim, its lintel, its ceiling and its
 * frame, over everything, so nothing that flies covers them.
 */
export const LAYERS = [
  "field",
  "rally",
  "springs",
  "wall",
  "lines",
  "guide",
  "count",
  "bursts",
  "balls",
  "rim",
] as const satisfies readonly string[];

/** One of the layers the field is drawn in, such as "wall". */
export type Layer = (typeof LAYERS)[number];

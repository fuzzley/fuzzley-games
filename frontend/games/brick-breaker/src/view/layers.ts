/**
 * The layers the field is drawn in, back to front, in one list, so each
 * layer's depth is its place here: the field and its wall, the bricks,
 * what bursts from them as they break (shards and rings), the capsules,
 * the bolts, the paddle, the tags of the effects in play, below it, and
 * the balls, which nothing hides.
 */
export const LAYERS = [
  "field",
  "bricks",
  "bursts",
  "capsules",
  "bolts",
  "paddle",
  "tags",
  "balls",
] as const;

/** One of the layers the field is drawn in. */
export type Layer = (typeof LAYERS)[number];

/** Returns a layer's depth: the higher, the nearer the front. */
export function depthOf(layer: Layer): number {
  return LAYERS.indexOf(layer);
}

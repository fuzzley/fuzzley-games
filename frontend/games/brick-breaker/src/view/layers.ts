/**
 * The layers the field is drawn in, back to front, in one list, so each
 * layer's depth is its place here: the field and its wall, the bricks,
 * what breaking them leaves (shards and rings), the capsules, the bolts,
 * the paddle, the balls, which nothing hides, and the tags of the effects
 * in play.
 */
export const LAYERS = [
  "field",
  "bricks",
  "effects",
  "capsules",
  "bolts",
  "paddle",
  "balls",
  "tags",
] as const;

/** One of the layers the field is drawn in. */
export type Layer = (typeof LAYERS)[number];

/** Returns a layer's depth: the higher, the nearer the front. */
export function depthOf(layer: Layer): number {
  return LAYERS.indexOf(layer);
}

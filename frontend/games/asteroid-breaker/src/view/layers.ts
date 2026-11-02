/**
 * The layers the field is drawn in, back to front, in one list, so each
 * layer's depth is its place here: the field and its specks; the tags of
 * the effects in play, under all that moves, so they hide nothing a player
 * must see; the rocks; the pickups; the strays adrift and the pilots
 * bailing out; the comets and their warnings; the shots; the ship and its
 * pilot; the shards, rings and exhaust; the points rising; and the frame
 * and the deck.
 *
 * The field's camera shows the field's rectangle alone, so the frame,
 * which lies around it, is drawn by the deck's camera over the whole
 * canvas, as the deck is, and stays still as the field shakes.
 */
export const LAYERS = [
  "field",
  "tags",
  "rocks",
  "pickups",
  "strays",
  "hazards",
  "shots",
  "ship",
  "effects",
  "points",
  "frame",
  "deck",
] as const;

/** One of the layers the field is drawn in. */
export type Layer = (typeof LAYERS)[number];

/** Returns a layer's depth: the higher, the nearer the front. */
export function depthOf(layer: Layer): number {
  return LAYERS.indexOf(layer);
}

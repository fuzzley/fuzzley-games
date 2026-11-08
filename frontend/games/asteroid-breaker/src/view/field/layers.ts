/**
 * The layers the field is drawn in, back to front, in one list, each drawn
 * over those before it, as the scene adds them in this order: the field and
 * its specks; the tags of the effects in play, under all that moves, so they
 * hide nothing a player must see; the rocks; the pickups; the strays adrift
 * and the pilots bailing out; the comets and their warnings; the shots; the
 * ship and its pilot; a held hit's flash; the flourishes, back to front a
 * dash's trail, the exhaust, the shards, the dust, the sparks and the rings;
 * the points rising; and the frame and the deck.
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
  "flash",
  "effects",
  "points",
  "frame",
  "deck",
] as const;

/** One of the layers the field is drawn in. */
export type Layer = (typeof LAYERS)[number];

/**
 * One of the two cameras the scene draws with: the field's, over the
 * field's rectangle, which scrolls as the field kicks and shakes, and the
 * deck's, over the whole canvas, which stands still.
 */
export type LayerCamera = "field" | "deck";

/**
 * The camera that draws each layer: the field's, but for the frame, which
 * lies around the field's rectangle, and the deck, which lies off it, so
 * neither moves as the field shakes.
 */
export const LAYER_CAMERAS: Readonly<Record<Layer, LayerCamera>> = {
  field: "field",
  tags: "field",
  rocks: "field",
  pickups: "field",
  strays: "field",
  hazards: "field",
  shots: "field",
  ship: "field",
  flash: "field",
  effects: "field",
  points: "field",
  frame: "deck",
  deck: "deck",
};

/** Returns the layers a camera draws, back to front. */
export function drawnBy(camera: LayerCamera): readonly Layer[] {
  return LAYERS.filter((layer) => LAYER_CAMERAS[layer] === camera);
}

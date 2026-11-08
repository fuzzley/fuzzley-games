import type { Place } from "../../rules/torus";
import type { PointsFont } from "../../view/art/points_art";
import type { BeltPalette } from "../../view/colors/palette";
import type { FieldMetrics } from "../../view/field/field_metrics";
import type { Drawn, FieldView } from "../../view/field/frame";
import type { Deck } from "../../view/steering/deck";
import type { SteeringView } from "../../view/steering/steering";

/**
 * Says what a frame is drawn from: the field, and how the scene stands as
 * it draws it.
 *
 * The scene writes one over each frame, so drawing makes nothing.
 */
export interface PaintContext {
  /** The field as of its last step. */
  field: FieldView;
  /** How far the field is from its last step to its next, from 0 to 1. */
  alpha: number;
  /**
   * Where the ship in play is drawn and how far it is turned, between its
   * last place and turn and its next, or null between one ship and the next.
   */
  shipDrawn: Readonly<Drawn> | null;
  /** The run's seed, which the field's specks are strewn from. */
  seed: number;
  /**
   * Where an Endless wave's constellation lies, its middle as shares of the
   * field's width and height, or null for none.
   */
  constellation: Readonly<Place> | null;
  /** Where the deck's parts lie on the canvas, or null where it doesn't show. */
  deck: Deck | null;
  /**
   * What the deck's painter reads of the steering: the stick, and which of
   * the deck's buttons a finger presses. The scene sets it once, the live
   * steering it reads each frame.
   */
  readonly steering: SteeringView;
  /** Where the field lies on the canvas. */
  metrics: FieldMetrics;
  /** The palette the field is drawn in, which the atlas was baked in. */
  palette: BeltPalette;
  /** The font the points are written in, which a new record letters anew. */
  font: PointsFont;
  /**
   * How much larger the field draws than the atlas was baked: its unit over
   * the baked unit, which is its unit rounded down to a whole device pixel,
   * up to the bake's largest.
   */
  zoom: number;
  /** The scene's time, in milliseconds, by which the flourishes and idle motions run. */
  now: number;
  /** Whether the player welcomes motion. */
  motion: boolean;
}

/**
 * Draws a part of the field, in the layers it was given, each frame; the
 * scene starts it on each new field and refreshes it after each bake.
 */
export interface Painter {
  /** Draws its part of the field as the frame has it. */
  draw(context: Readonly<PaintContext>): void;
  /**
   * Starts on a new field: stops what the last one set off, and makes the
   * images this one needs that the last didn't, so a frame of play makes
   * none.
   */
  start?(field: FieldView): void;
  /**
   * Takes up its frames again, where it draws from the atlas, once the atlas
   * has been baked again.
   */
  refresh?(): void;
}

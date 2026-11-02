import type { FieldMetrics } from "../view/field_metrics";
import type { FieldView } from "../view/frame";
import type { BeltPalette } from "../view/palette";

/** Says what the atlas was last baked at: the field's layout and the palette. */
export interface Baked {
  /** Where the field lies on the canvas. */
  metrics: FieldMetrics;
  /** The palette the atlas was baked in. */
  palette: BeltPalette;
  /** How much larger the field draws than the atlas was baked: its unit over the baked unit, above 1 only past the bake's largest. */
  zoom: number;
}

/**
 * Says what a frame is drawn from: the field, and how the scene stands as
 * it draws it.
 *
 * The scene writes one over each frame, so drawing makes nothing.
 */
export interface PaintContext extends Baked {
  /** The field as of its last step. */
  field: FieldView;
  /** How far the field is from its last step to its next, from 0 to 1. */
  alpha: number;
  /** The run's seed, which the field's specks are strewn from. */
  seed: number;
  /** The scene's time, in milliseconds, by which the flourishes and idle motions run. */
  now: number;
  /** Whether the player welcomes motion. */
  motion: boolean;
}

/** Draws a part of the field, in the layers it was given, each frame. */
export interface Painter {
  /** Draws its part of the field as the frame has it. */
  draw(context: Readonly<PaintContext>): void;
  /** Takes up its frames again, where it draws from the atlas, once the atlas has been baked again. */
  refresh?(baked: Readonly<Baked>): void;
}

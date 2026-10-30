import type { FieldMetrics } from "../view/field_metrics";
import type { FieldView } from "../view/frame";
import type { BricksPalette } from "../view/palette";

/** Says what the atlas was last baked at: the field's layout and the palette. */
export interface Baked {
  /** Where the field lies on the canvas. */
  metrics: FieldMetrics;
  /** The palette the atlas was baked in. */
  palette: BricksPalette;
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
  /** The scene's time, in milliseconds, by which the flourishes run. */
  now: number;
  /** Whether the player welcomes motion. */
  motion: boolean;
  /** The field's step at which its last brick broke, or it was first drawn. */
  brokeAt: number;
}

/** Draws a part of the field, in the layers it was given, each frame. */
export interface Painter {
  /** Draws its part of the field as the frame has it. */
  draw(context: Readonly<PaintContext>): void;
  /** Takes up its frames again, where it draws from the atlas, once the atlas has been baked again. */
  refresh?(baked: Readonly<Baked>): void;
}

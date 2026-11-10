import type { ArtScale } from "@fz/phaser/shapes";
import type { WallPalette } from "../../view/colors/palette";
import type { FieldMetrics, FieldShape } from "../../view/field/field_metrics";
import type { RoundView } from "../../view/round_play";

/**
 * Says what a frame is drawn from: the round as the view has it, the field
 * as it was last laid out, the atlas as it was last baked, and whether the
 * player welcomes motion.
 *
 * The scene writes one over each frame, so drawing makes nothing.
 */
export interface PaintContext {
  /** The round in play as the view draws it at this moment. */
  view: RoundView;
  /** The field's shape it was laid out by: its depth, its band and its lintel. */
  shape: FieldShape;
  /** Where the field lies on the canvas. */
  metrics: FieldMetrics;
  /** The scale the atlas was baked at, which a larger unit shows scaled up. */
  baked: ArtScale;
  /** The palette the atlas was baked in. */
  palette: WallPalette;
  /** Whether the player welcomes motion. */
  motion: boolean;
}

/** Draws a part of the field, in the layers it was given, each frame. */
export interface Painter {
  /** Draws its part of the field as the frame has it. */
  draw(context: Readonly<PaintContext>): void;
}

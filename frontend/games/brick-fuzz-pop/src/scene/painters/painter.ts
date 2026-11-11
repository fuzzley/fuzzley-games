import type { ArtScale } from "@fz/phaser/shapes";
import type { Guide } from "../../rules/flight/guide";
import type { Boon } from "../../rules/shot";
import type { WallPalette } from "../../view/colors/palette";
import type { FieldMetrics, FieldShape } from "../../view/field/field_metrics";
import type { RoundView } from "../../view/round_play";
import type { Steer } from "../../view/steering/steering";

/**
 * Says what a frame is drawn from: the round as the view has it, the
 * steering, where the fuzzball waits and the guide, the field as it was
 * last laid out, the atlas as it was last baked, the scene's time, and
 * whether the player welcomes motion.
 *
 * The scene writes one over each frame, so drawing makes nothing.
 */
export interface PaintContext {
  /** The round in play as the view draws it at this moment. */
  view: RoundView;
  /** The shot being aimed: the aim the waiting fuzzball looks along, and the charge the meter shows. */
  steer: Readonly<Steer>;
  /** Where the player's fuzzball waits on the floor, across the field, or null while it is in the air. */
  waitingX: number | null;
  /** The boon the waiting fuzzball carries, which it wears, or null. */
  boon: Boon | null;
  /** The guide to draw, or null where none shows. */
  guide: Guide | null;
  /** The field's shape it was laid out by: its depth, its band and its lintel. */
  shape: FieldShape;
  /** Where the field lies on the canvas. */
  metrics: FieldMetrics;
  /** The scale the atlas was baked at, which a larger unit shows scaled up. */
  baked: ArtScale;
  /** The palette the atlas was baked in. */
  palette: WallPalette;
  /** The scene's time, in milliseconds, which every flourish is timed by. */
  now: number;
  /** Whether the player welcomes motion. */
  motion: boolean;
}

/** Draws a part of the field, in the layers it was given, each frame. */
export interface Painter {
  /** Draws its part of the field as the frame has it. */
  draw(context: Readonly<PaintContext>): void;
}

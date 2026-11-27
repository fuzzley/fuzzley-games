// How a special's body stirs from the moment it is made, between moves
// and through them, its eyes left still: a puffer breathes, a wisp's
// seed-head sways, and the frizzball's static crackles round. Each is the
// time sampled, so a frame is a time, and each puffer and wisp is set out
// of step with the others by its id.

import type { Piece } from "../../rules/catalog/pieces";
import type { FeelTuning } from "../timeline/feel";

/**
 * Describes how a piece's body stirs at a moment, on top of what its track
 * gives it: a record the scene keeps for each piece's sprite, which the
 * sampling writes into. It moves the body's frame alone, which wears a
 * special's second fur, and never the eyes.
 */
export interface Breath {
  /** How much the body is scaled, 1 for not at all, as a puffer breathes. */
  scale: number;
  /** How far the body is turned, in radians, as a wisp's seed-head sways and the frizzball's static crackles round. */
  turn: number;
}

/**
 * Writes how a piece's body stirs at a moment on the scene's clock into a
 * record, and returns it: not at all for any piece but a puffer, a wisp and
 * the frizzball, nor for a loose sprite's record, which draws no piece.
 */
export function breathAt(
  piece: Piece | null,
  feel: FeelTuning,
  ms: number,
  into: Breath,
): Breath {
  into.scale = 1;
  into.turn = 0;
  if (piece?.what === "frizzball") {
    into.turn =
      (Math.floor(ms / feel.staticStepMs) % feel.staticSteps) * feel.staticStep;
  } else if (piece?.what === "fuzzball" && piece.special === "puffer") {
    into.scale =
      1 +
      Math.sin(ms / feel.pufferBreathRadianMs + piece.id) * feel.pufferBreath;
  } else if (piece?.what === "fuzzball" && piece.special === "wisp") {
    into.turn = Math.sin(ms / feel.wispSwayRadianMs + piece.id) * feel.wispSway;
  }
  return into;
}

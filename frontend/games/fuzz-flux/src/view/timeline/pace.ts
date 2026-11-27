// How fast a move plays: at the speed the player sets in Settings, Normal
// or Fast, and each wave after a move's first a little quicker than the
// one before, so a long move speeds up as it climbs. The encore's hurry is
// no pace of the timeline's: a tap runs the scene's clock faster through
// the timeline already built, as `FeelTuning`'s `hurriedPace` says.

import { keysOf, recordOf } from "@fz/core/records";
import { GAPPED } from "../effects/sounds";
import type { FeelTuning } from "./feel";

/** Every speed a player can set moves to play at. */
export const SPEEDS = ["normal", "fast"] as const satisfies readonly string[];

/** A speed a player sets, such as "fast". */
export type Speed = (typeof SPEEDS)[number];

/**
 * The feel's times that hold in the player's own time at any speed: the
 * limits on flashes and sounds; how long a tuft flies, which the scene
 * keeps and the limit on loose bits counts by; how long a cushion and a
 * button thrown off a brick fly, beside the tufts thrown with them, their
 * speeds given in the player's own seconds as a tuft's are; how fast a
 * shake dies away, which the sketch takes off a frame at a time; and the
 * board's life between moves, its blinks, its breaths and its hints,
 * which no move plays.
 */
const UNPACED: ReadonlySet<keyof FeelTuning> = new Set([
  "flashGapMs",
  ...Object.values(GAPPED),
  "tuftLifeMs",
  "tuftLifeSpreadMs",
  "cushionMs",
  "cushionPlumpMs",
  "buttonMs",
  "shakeHalfLifeMs",
  "blinkLeastMs",
  "blinkMostMs",
  "hintWaitMs",
  "pufferBreathRadianMs",
  "wispSwayRadianMs",
  "staticStepMs",
  "hintLookMs",
  "hintUpMs",
  "hintDownMs",
  "hintHopGapMs",
  "handLoopMs",
]);

/**
 * Returns the feel a move plays by at a speed: each of its times shortened
 * by it, but those that hold in the player's own time.
 */
export function pacedFeel(feel: FeelTuning, speed: Speed): FeelTuning {
  const times = speed === "fast" ? feel.fastPace : 1;
  return recordOf(keysOf(feel), (field) =>
    field.endsWith("Ms") && !UNPACED.has(field)
      ? feel[field] / times
      : feel[field],
  );
}

/**
 * Returns the share of its own time a wave of a move takes to play: the
 * whole for the first, and less for each after it, to the feel's
 * quickest.
 *
 * @param wave The wave's place in its move, from 1; a gust's first fall,
 *   wave 0, plays as the first.
 */
export function quickeningOf(wave: number, feel: FeelTuning): number {
  return Math.max(
    feel.quickest,
    1 - feel.quickenPerWave * Math.max(0, wave - 1),
  );
}

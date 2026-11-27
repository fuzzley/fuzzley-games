// The ladder a move's waves climb, as the scene and the sound lab play it:
// the sprite holds a bunch's notes, its bubbles and the frizzball's zaps at
// the ladder's foot, C5, and each wave raises them by its cents.

import { ladderCentsOf } from "@fz/core/note_ladder";

/**
 * How far each wave's note rises above a move's first, in cents, a wave at
 * a time from the first: a step of C major's five-note scale a wave, C5,
 * D5, E5, G5, A5, C6, D6, E6, G6 and A6, where it holds. They are the
 * sound kit's steps of the key (`@fz/dev/synth`'s `centsOf()`), copied, as
 * the game imports nothing of `@fz/dev`.
 */
export const LADDER_CENTS = [
  0, 200, 400, 700, 900, 1200, 1400, 1600, 1900, 2100,
] as const satisfies readonly number[];

/** How much softer a bunch's note plays a wave up the ladder, in dB, as the design's notes do. */
const SOFTER_A_WAVE_DB = 0.4;

/**
 * Returns how many cents a wave's note rises: none at a move's first wave
 * or before it, and the ladder's top from the tenth on.
 */
export function waveCentsOf(wave: number): number {
  return ladderCentsOf(wave, LADDER_CENTS);
}

/**
 * Returns how loud a bunch's note plays at a wave, against the first
 * wave's: a little softer a step up the ladder, and as soft as the top's
 * past it.
 */
export function noteVolumeOf(wave: number): number {
  const steps = Math.min(Math.max(wave, 1), LADDER_CENTS.length) - 1;
  return 10 ** ((-SOFTER_A_WAVE_DB * steps) / 20);
}

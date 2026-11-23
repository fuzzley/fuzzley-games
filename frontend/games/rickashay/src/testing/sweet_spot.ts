// Room for a hand (docs/rickashay/design.md, "The guarantee", check 5): as
// a level opens, with the fuzzball waiting at the left, the middle and the
// right of the floor, the widest run of neighbouring aims whose flights each
// rally LONG_RALLY or more, at the mean of the three, as the sketch's
// sweetSpot() measured it over everyAim(). A long flight that hangs on a
// quarter of a degree is a pixel hunt. The scripts load it through Vite
// beside the solver, so it is held as the rules are (eslint.config.js), to
// their fence and their exact arithmetic.

import { AIM_COUNT, AIMS_PER_DEGREE } from "@fz/brick-wall/rules/aims";
import type { RoundStart } from "../rules/flight/events";
import type { RoundPlay } from "./line_play";

/** The rally a flight reaches for its aim to count toward a sweet spot: a long flight. */
export const LONG_RALLY = 8;

/** Where the fuzzball waits as a level's sweet spot is measured: the middles of the floor's second, fifth and eighth cells, its left, its middle and its right. */
export const SWEET_SPOT_XS = [
  1.5, 4.5, 7.5,
] as const satisfies readonly number[];

/** The narrowest sweet spot a level may leave on any depth, in degrees: three aims side by side, 0.75°. */
export const LEAST_SWEET_SPOT = 3 / AIMS_PER_DEGREE;

/** Returns the rally of each aim's round from where a round starts, aim by aim. */
export function ralliesFrom(
  play: RoundPlay,
  start: RoundStart,
): readonly number[] {
  return Array.from(
    { length: AIM_COUNT },
    (_, aim) => play.play(start, aim).outcome.rally,
  );
}

/** Returns how many aims the widest run of neighbouring aims holds whose rallies, aim by aim, each reach {@link LONG_RALLY}. */
export function widestLongRun(rallies: readonly number[]): number {
  let run = 0;
  let widest = 0;
  for (const rally of rallies) {
    run = rally >= LONG_RALLY ? run + 1 : 0;
    widest = Math.max(widest, run);
  }
  return widest;
}

/**
 * Returns a level's sweet spot as it opens, in degrees: the widest run of
 * neighbouring aims whose rounds each rally {@link LONG_RALLY} or more, with
 * the fuzzball waiting at each of {@link SWEET_SPOT_XS}, at the mean of the
 * three, wherever the level's own opening has it wait.
 */
export function sweetSpotOf(play: RoundPlay): number {
  let aims = 0;
  for (const x of SWEET_SPOT_XS) {
    aims += widestLongRun(ralliesFrom(play, { ...play.opening, x }));
  }
  // Summed in aims and divided once, so three runs of three aims make
  // exactly LEAST_SWEET_SPOT.
  return aims / (SWEET_SPOT_XS.length * AIMS_PER_DEGREE);
}

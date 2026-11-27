// The takes the sprite holds of each sound that climbs the ladder: one at
// its foot, C5, under the sound's own name, and three up it, each named for
// its note, each made at its own rung's pitch, so the scene raises none far
// from it (src/view/effects/ladder.ts, which plays a rung from the nearest).

/** @import { Recipe } from "../build-sounds.mjs" */
/** @import { Signal } from "@fz/dev/synth" */

/**
 * A sound that climbs the ladder, as its part of play's module describes
 * it: made at any rung, the sprite holding it at a few.
 *
 * @typedef {object} LadderedRecipe
 * @property {string} name Its name, and its take's at the foot.
 * @property {number} peak Each take's loudest sample, in dB below full scale.
 * @property {(rung: number) => Signal} makeAt Returns its samples, at any level, at a rung of the ladder, 0 at its foot, which is the step of the scale `@fz/dev/synth`'s `degree()` counts.
 */

/**
 * Each take up the ladder, by what its name adds to its sound's, and the
 * rung it is made at, 0 at the foot.
 */
const TAKES = [
  { named: "", rung: 0 },
  { named: "-g5", rung: 3 },
  { named: "-d6", rung: 6 },
  { named: "-a6", rung: 9 },
];

/**
 * Returns the recipes of a laddered sound's takes, from the foot up.
 *
 * @param {LadderedRecipe} laddered
 * @returns {Recipe[]}
 */
export function takesUpTheLadder({ name, peak, makeAt }) {
  return TAKES.map(({ named, rung }) => ({
    name: `${name}${named}`,
    peak,
    make: () => makeAt(rung),
  }));
}

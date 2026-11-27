// The move's sounds: a fuzzball picked up, two swapped, a swap refused,
// fuzzballs landing, the note a bunch plays, and the bubble of each
// fuzzball hopping off. The note and the bubble climb the ladder, the
// sprite holding each at a few of its rungs.

import { degree, filter, mix, noise, osc, pitch, points } from "@fz/dev/synth";
import { takesUpTheLadder } from "./ladder.mjs";
import { mallet, shaped, toward, whoosh } from "./voices.mjs";

/** @import { Recipe } from "../build-sounds.mjs" */
/** @import { Signal } from "@fz/dev/synth" */
/** @import { LadderedRecipe } from "./ladder.mjs" */

/**
 * Returns a bubble's blip at a step of the ladder: the step's note and its
 * octave, rising an octave in 70 ms.
 *
 * @param {number} step
 * @returns {Signal}
 */
function bubble(step) {
  const rising = (/** @type {number} */ t) =>
    degree(step) * 2 ** Math.min(1, t / 0.07);
  return mix([
    {
      x: shaped(osc("sine", rising, 0.16), {
        attack: 0.004,
        hold: 0.03,
        decay: 0.022,
      }),
      gain: 0.8,
    },
    {
      x: shaped(
        osc("sine", (t) => 2 * rising(t), 0.16),
        { attack: 0.004, hold: 0.02, decay: 0.018 },
      ),
      gain: 0.3,
    },
  ]);
}

/**
 * A bunch's note: a mallet's.
 *
 * @type {LadderedRecipe}
 */
export const NOTE = {
  name: "note",
  peak: -10,
  makeAt: (step) => mallet(degree(step), { air: 0.32 }),
};

/**
 * One fuzzball hopping off the board: a bubble.
 *
 * @type {LadderedRecipe}
 */
export const POP = { name: "pop", peak: -16, makeAt: bubble };

/**
 * The move's recipes, in the sprite's order.
 *
 * @type {readonly Recipe[]}
 */
export const RECIPES = [
  // A fuzzball picked up: a soft sine that lifts and is held a moment.
  {
    name: "pick",
    peak: -18,
    make: () =>
      shaped(
        osc(
          "sine",
          points(
            [
              [0, 620],
              [0.04, 760],
            ],
            0.06,
          ),
          0.06,
        ),
        {
          attack: 0.006,
          hold: 0.01,
          decay: 0.012,
        },
      ),
  },
  // Two fuzzballs trading places: a zip rising an octave, in a rush of air
  // that peaks late.
  {
    name: "swap",
    peak: -15,
    make: () =>
      mix([
        {
          x: shaped(
            osc(
              "sine",
              points(
                [
                  [0, 400],
                  [0.09, 800],
                ],
                0.1,
              ),
              0.1,
            ),
            { attack: 0.008, hold: 0.04, decay: 0.02 },
          ),
          gain: 0.6,
        },
        {
          x: whoosh({
            seconds: 0.1,
            from: 900,
            peak: 2400,
            to: 1800,
            q: 1.2,
            seed: 2,
            lean: 0.7,
          }),
          gain: 0.5,
        },
      ]),
  },
  // A swap that makes no bunch, the two going back: a dull note that shakes
  // as a head does, sinking as it goes.
  {
    name: "refuse",
    peak: -12,
    make: () => {
      const shaken = (/** @type {number} */ t) =>
        pitch("A4") *
        2 ** ((-2 * Math.min(1, t / 0.18)) / 12) *
        (1 + 0.05 * Math.exp(-t / 0.07) * Math.sin(2 * Math.PI * 12 * t));
      // From the bottom of its swing, as the design's triangles start.
      return shaped(
        filter(osc("tri", shaken, 0.2, { phase: 0.75 }), "lp", 1500),
        {
          attack: 0.008,
          hold: 0.05,
          decay: 0.045,
        },
      );
    },
  },
  // Fuzzballs coming to rest after a fall: a soft thud that settles, its
  // octave over it, and a pat of dull noise.
  {
    name: "land",
    peak: -19,
    make: () =>
      mix([
        {
          x: shaped(osc("sine", toward(340, 280, 0.02), 0.06), {
            attack: 0.003,
            decay: 0.013,
          }),
          gain: 0.8,
        },
        {
          x: shaped(osc("sine", toward(680, 560, 0.02), 0.06), {
            attack: 0.003,
            decay: 0.009,
          }),
          gain: 0.4,
        },
        {
          x: shaped(filter(noise("white", 0.03, 7), "lp", 1400), {
            attack: 0.002,
            decay: 0.006,
          }),
          gain: 0.35,
        },
      ]),
  },
  ...takesUpTheLadder(NOTE),
  ...takesUpTheLadder(POP),
];

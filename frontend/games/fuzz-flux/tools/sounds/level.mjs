// The level's sounds: the encore's spare moves after a win, the win and
// each of its stars, the loss, and the two that answer the player: a hint,
// and a button on a card.

import { degree, filter, mix, noise, osc, points } from "@fz/dev/synth";
import { bell, mallet, room, shaped, sparkle } from "./voices.mjs";

/** @import { Recipe } from "../build-sounds.mjs" */
/** @import { Signal } from "@fz/dev/synth" */

/**
 * Returns a star lit: a bell note and a few bright specks, in a small room.
 *
 * @param {number} freq The bell's pitch, in Hz.
 * @param {number} specks
 * @param {number} seed The specks'.
 * @returns {Signal}
 */
function star(freq, specks, seed) {
  return room(
    mix([
      bell(freq, 0.14),
      { x: sparkle(0.12, specks, seed), at: 0.02, gain: 0.3 },
    ]),
    { seconds: 0.25, wet: 0.14 },
  );
}

/**
 * Returns a soft, dull note at a pitch, in Hz: a triangle that swells
 * gently and fades.
 *
 * @param {number} freq
 * @returns {Signal}
 */
function soft(freq) {
  return filter(
    // From the bottom of its swing, as the design's triangles start.
    shaped(osc("tri", freq, 0.4, { phase: 0.75 }), {
      attack: 0.03,
      hold: 0.08,
      decay: 0.09,
      curve: 1.5,
    }),
    "lp",
    1600,
  );
}

/**
 * The level's recipes, in the sprite's order.
 *
 * @type {readonly Recipe[]}
 */
export const RECIPES = [
  // After a win, a spare move turning a fuzzball into a special one: a
  // sine leaping an octave from A5, and a small bell on A6.
  {
    name: "encore",
    peak: -13,
    make: () =>
      mix([
        {
          x: shaped(
            osc(
              "sine",
              points(
                [
                  [0, degree(4)],
                  [0.06, degree(9)],
                ],
                0.09,
              ),
              0.09,
            ),
            { attack: 0.004, hold: 0.02, decay: 0.015 },
          ),
          gain: 0.8,
        },
        { x: bell(degree(9), 0.05), at: 0.05, gain: 0.4 },
      ]),
  },
  // A level cleared: mallet notes climbing C5, E5, G5, C6, E6 and G6, then
  // a ringing chord of bells, C6, E6, G6 and D7, and a long sparkle, in a
  // larger room.
  {
    name: "win",
    peak: -4,
    fadeOut: 0.12,
    make: () =>
      room(
        mix([
          ...[0, 2, 3, 5, 7, 8].map((step, n) => ({
            x: mallet(degree(step), { decay: 0.08, air: 0.2 }),
            at: n * 0.075,
            gain: 0.75,
          })),
          ...[
            { step: 5, gain: 0.7 },
            { step: 7, gain: 0.6 },
            { step: 8, gain: 0.55 },
            { step: 11, gain: 0.3 },
          ].map(({ step, gain }) => ({
            x: bell(degree(step), 0.42),
            at: 0.5,
            gain,
          })),
          { x: sparkle(0.7, 16, 11), at: 0.5, gain: 0.45 },
        ]),
        { seconds: 0.7, wet: 0.22 },
      ),
  },
  // The first star: a bell on E6.
  {
    name: "star-1",
    peak: -8,
    fadeOut: 0.04,
    make: () => star(degree(7), 2, 1),
  },
  // The second: a bell on G6.
  {
    name: "star-2",
    peak: -8,
    fadeOut: 0.04,
    make: () => star(degree(8), 3, 2),
  },
  // The third: a bell on C7 over a fainter one on C6, and more specks.
  {
    name: "star-3",
    peak: -7,
    fadeOut: 0.05,
    make: () =>
      room(
        mix([
          bell(degree(10), 0.18),
          { x: bell(degree(5), 0.18), gain: 0.4 },
          { x: sparkle(0.2, 5, 3), at: 0.02, gain: 0.4 },
        ]),
        { seconds: 0.35, wet: 0.16 },
      ),
  },
  // The moves running out: a falling third, E5 to C5, and nothing more.
  {
    name: "lose",
    peak: -10,
    fadeOut: 0.08,
    make: () =>
      room(
        mix([
          { x: soft(degree(2)), gain: 0.9 },
          { x: soft(degree(0)), at: 0.26, gain: 0.9 },
        ]),
        { seconds: 0.3, wet: 0.14 },
      ),
  },
  // A bunch the player could make giving a hop: two quick mallet notes on
  // A6, the second softer.
  {
    name: "hint",
    peak: -16,
    make: () => {
      const hop = () => mallet(degree(9), { decay: 0.03, air: 0.1 });
      return mix([
        { x: hop(), gain: 0.8 },
        { x: hop(), at: 0.11, gain: 0.6 },
      ]);
    },
  },
  // A button on a card: a click on A5 and a tick of noise.
  {
    name: "button",
    peak: -18,
    make: () =>
      mix([
        {
          x: shaped(osc("sine", degree(4), 0.04), {
            attack: 0.002,
            decay: 0.008,
          }),
          gain: 0.8,
        },
        {
          x: shaped(filter(noise("white", 0.01, 91), "bp", 2000, 1), {
            attack: 0.001,
            decay: 0.003,
          }),
          gain: 0.3,
        },
      ]),
  },
];

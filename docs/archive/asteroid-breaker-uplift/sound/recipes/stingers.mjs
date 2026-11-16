// The stingers and the menus' sounds: the short phrases that mark a run's
// start, a wave's start and its clearing, a sector's clearing, a run's end,
// a new best and a level gained, and the small ticks of the tally and the
// buttons. One instrument plays them all, a mallet with a glass bell over
// it, on the notes of the game's key: the rewards on C, E and G and ending
// on C, the run's end on A, C and E and left open.

import { degree } from "../lib/music.mjs";
import {
  glass,
  keys,
  mallet,
  pad,
  phrase,
  roomed,
  sparkle,
  unit,
} from "../lib/parts-ship.mjs";
import { filter, fit, gain, lfo, mix } from "../lib/synth.mjs";

/** @import { Recipe } from "../build.mjs" */
/** @import { Note } from "../lib/parts-ship.mjs" */
/** @import { Signal } from "../lib/synth.mjs" */

/**
 * Returns a fanfare's note: the mallet and its bell with a pad's short note
 * under them, which is what makes a phrase of them sound blown as well as
 * struck.
 *
 * @param {number} freq
 * @param {number} ring
 * @param {number} seed
 * @returns {Signal}
 */
function fanfare(freq, ring, seed) {
  return mix([
    keys(freq, ring, seed),
    {
      x: pad(freq, ring * 0.8, {
        attack: 0.015,
        release: ring * 0.35,
        bright: 1.3,
      }),
      gain: 0.3,
    },
  ]);
}

/**
 * Returns a chord held by pads, one to a step of the scale, swelling in
 * and let go together.
 *
 * @param {readonly number[]} steps Steps of the scale above C5.
 * @param {number} seconds
 * @param {{ attack?: number, release?: number, bright?: number }} [how]
 * @returns {Signal}
 */
function held(steps, seconds, how = {}) {
  return mix(
    steps.map((step) => ({
      x: pad(degree(step), seconds, how),
      gain: 1 / Math.sqrt(steps.length),
    })),
  );
}

/**
 * Returns a pair of notes on the mallet, the second a little after the
 * first: the shape of the menus' and the pause's sounds.
 *
 * @param {number} first A step of the scale above C5.
 * @param {number} second
 * @param {number} seed
 * @param {{ gap?: number, ring?: number }} [how] The time between them and how long the second rings, in seconds.
 * @returns {Signal}
 */
function pair(first, second, seed, { gap = 0.055, ring = 0.12 } = {}) {
  return phrase(
    [
      { step: first, at: 0, ring: ring * 0.6, gain: 0.8 },
      { step: second, at: gap, ring },
    ],
    (freq, lasts, at) => mallet(freq, lasts, at, { bright: 0.7 }),
    seed,
  );
}

/** @type {Recipe[]} */
export const SOUNDS = [
  {
    name: "run-start",
    about:
      "A run begins: four warm notes rising, G4, C5, E5 and G5, on the mallet and its bell, over a soft pad on C4 and G4, left open on the fifth.",
    level: "medium",
    plays: ["run started"],
    make: (_take, seed) => {
      /** @type {Note[]} */
      const rising = [
        { step: -2, at: 0, ring: 0.6, gain: 0.7 },
        { step: 0, at: 0.13, ring: 0.6, gain: 0.8 },
        { step: 2, at: 0.26, ring: 0.6, gain: 0.9 },
        { step: 3, at: 0.42, ring: 0.7 },
      ];
      return roomed(
        mix([
          phrase(rising, (f, r, s) => keys(f, r, s, 0.6), seed),
          {
            x: held([-5, -2], 0.85, {
              attack: 0.14,
              release: 0.4,
              bright: 0.8,
            }),
            gain: 0.09,
          },
        ]),
        0.95,
        { decay: 0.5, mix: 0.16 },
      );
    },
  },
  {
    name: "wave-start",
    about:
      "The player's first move starts a wave: a soft two-note lift on the mallet, G4 up to C5.",
    level: "small",
    plays: ["wave started (the first move)"],
    make: (_take, seed) =>
      roomed(
        phrase(
          [
            { step: -2, at: 0, ring: 0.16, gain: 0.8 },
            { step: 0, at: 0.11, ring: 0.28 },
          ],
          (f, r, s) => keys(f, r, s, 0.5),
          seed,
        ),
        0.42,
        { decay: 0.3, mix: 0.14 },
      ),
  },
  {
    name: "wave-clear",
    about:
      "A wave cleared: five bright notes, E5, G5, A5, G5 and a leap to C6, the last ringing over the C below it, with sparkle falling after.",
    level: "large",
    plays: ["wave cleared"],
    make: (_take, seed) => {
      /** @type {Note[]} */
      const tune = [
        { step: 2, at: 0, ring: 0.32, gain: 0.8 },
        { step: 3, at: 0.1, ring: 0.32, gain: 0.85 },
        { step: 4, at: 0.2, ring: 0.32, gain: 0.9 },
        { step: 3, at: 0.3, ring: 0.34, gain: 0.85 },
        { step: 5, at: 0.43, ring: 0.7 },
        { step: 0, at: 0.43, ring: 0.6, gain: 0.5 },
      ];
      return roomed(
        mix([
          phrase(tune, (f, r, s) => keys(f, r, s, 1.5), seed),
          {
            x: sparkle({ seconds: 0.4, seed: seed + 1, count: 9, ring: 0.08 }),
            at: 0.5,
            gain: 0.22,
          },
        ]),
        1.15,
        { decay: 0.6, mix: 0.18 },
      );
    },
  },
  {
    name: "sector-clear",
    about:
      "A sector's tenth wave cleared: a small fanfare, G4, C5 and E5 quick up to a held G5, then A5, G5 and C6, struck and blown at once, landing on a C chord from C4 to C6 that is held under two more bells and sparkle.",
    level: "large",
    plays: ["sector cleared"],
    make: (_take, seed) => {
      /** @type {Note[]} */
      const call = [
        { step: -2, at: 0, ring: 0.2, gain: 0.75 },
        { step: 0, at: 0.1, ring: 0.2, gain: 0.8 },
        { step: 2, at: 0.2, ring: 0.2, gain: 0.85 },
        { step: 3, at: 0.3, ring: 0.42, gain: 0.95 },
        { step: 4, at: 0.56, ring: 0.2, gain: 0.85 },
        { step: 3, at: 0.66, ring: 0.22, gain: 0.85 },
      ];
      const land = 0.8;
      /** @type {Note[]} */
      const chord = [
        { step: -5, at: land, ring: 1.1, gain: 0.6 },
        { step: -2, at: land, ring: 1.1, gain: 0.55 },
        { step: 0, at: land, ring: 1.1, gain: 0.6 },
        { step: 2, at: land, ring: 1.1, gain: 0.55 },
        { step: 3, at: land, ring: 1.1, gain: 0.55 },
        { step: 5, at: land, ring: 1.15, gain: 0.9 },
        { step: 7, at: land + 0.14, ring: 0.9, gain: 0.5 },
        { step: 8, at: land + 0.28, ring: 0.8, gain: 0.45 },
      ];
      const under = gain(
        held([-5, -2, 0, 2, 3], 1.15, {
          attack: 0.05,
          release: 0.6,
          bright: 1.1,
        }),
        lfo(0.9, 0.1, 5, 1.15),
      );
      return roomed(
        mix([
          phrase(call, fanfare, seed),
          phrase(chord, keys, seed + 500),
          { x: under, at: land, gain: 0.3 },
          {
            x: sparkle({ seconds: 0.8, seed: seed + 1, count: 14, ring: 0.09 }),
            at: land + 0.15,
            gain: 0.13,
          },
        ]),
        2.05,
        { decay: 0.9, mix: 0.2 },
      );
    },
  },
  {
    name: "run-end",
    about:
      "The run is over and everyone has floated home: a gentle fall on the mallet alone, A5, G5, E5 and C5, each later than the last, then a D5 left hanging over a soft pad on A3 and E4, unresolved.",
    level: "large",
    plays: ["run ended"],
    make: (_take, seed) => {
      /** @type {Note[]} */
      const falling = [
        { step: 4, at: 0, ring: 0.8, gain: 0.9 },
        { step: 3, at: 0.22, ring: 0.8, gain: 0.85 },
        { step: 2, at: 0.46, ring: 0.8, gain: 0.85 },
        { step: 0, at: 0.74, ring: 0.9, gain: 0.8 },
        { step: 1, at: 1.08, ring: 0.72, gain: 0.9 },
      ];
      return roomed(
        filter(
          mix([
            phrase(
              falling,
              (f, r, s) => mallet(f, r, s, { attack: 0.008, bright: 0.6 }),
              seed,
            ),
            {
              x: held([-6, -3], 1.05, {
                attack: 0.3,
                release: 0.6,
                bright: 0.8,
              }),
              at: 0.7,
              gain: 0.07,
            },
          ]),
          "lp",
          3500,
        ),
        1.85,
        { decay: 0.9, mix: 0.22 },
      );
    },
  },
  {
    name: "new-best",
    about:
      "A new best score: a run of eleven notes up the scale from C5 to C7, ever quicker and louder, then E7 and G7 over the top, a pad's C chord blooming under them and a shower of sparkle falling after.",
    level: "large",
    plays: ["new best set"],
    make: (_take, seed) => {
      /** @type {Note[]} */
      const run = [];
      let at = 0;
      for (let step = 0; step <= 10; step++) {
        run.push({
          step,
          at,
          ring: 0.2 + 0.02 * step,
          gain: 0.55 + 0.04 * step,
        });
        at += 0.062 - 0.002 * step;
      }
      /** @type {Note[]} */
      const top = [
        { step: 12, at: at + 0.03, ring: 0.3, gain: 0.6 },
        { step: 13, at: at + 0.11, ring: 0.3, gain: 0.5 },
        { step: 10, at: at + 0.11, ring: 0.6, gain: 0.7 },
        { step: 5, at: at + 0.11, ring: 0.6, gain: 0.6 },
      ];
      return roomed(
        mix([
          phrase(run, keys, seed),
          phrase(top, (f, r, s) => glass(f, r, s), seed + 500),
          {
            x: held([0, 2, 3], 0.95, { attack: 0.2, release: 0.5 }),
            at: at - 0.1,
            gain: 0.25,
          },
          {
            x: sparkle({
              seconds: 0.8,
              seed: seed + 1,
              count: 20,
              low: 10,
              high: 17,
              ring: 0.08,
              bias: 1.2,
            }),
            at: at + 0.1,
            gain: 0.18,
          },
        ]),
        1.55,
        { decay: 0.8, mix: 0.2 },
      );
    },
  },
  {
    name: "level-up",
    about:
      "A level gained, kept for a progression system: four notes rolled up the C chord, C5, E5, G5 and C6, each held, into a pad's chord from C4 to E6 that blooms and trembles, with a bell on G6 over it.",
    level: "large",
    plays: ["level gained (held back for a progression system)"],
    make: (_take, seed) => {
      /** @type {Note[]} */
      const roll = [
        { step: 0, at: 0, ring: 0.8, gain: 0.8 },
        { step: 2, at: 0.07, ring: 0.8, gain: 0.85 },
        { step: 3, at: 0.14, ring: 0.8, gain: 0.9 },
        { step: 5, at: 0.21, ring: 0.8 },
        { step: 8, at: 0.4, ring: 0.5, gain: 0.5 },
      ];
      const bloom = gain(
        held([-5, 0, 2, 3, 5, 7], 0.78, {
          attack: 0.16,
          release: 0.45,
          bright: 1.4,
        }),
        lfo(0.85, 0.15, 7, 0.78),
      );
      return roomed(
        mix([phrase(roll, keys, seed), { x: bloom, at: 0.22, gain: 0.5 }]),
        1.05,
        { decay: 0.6, mix: 0.18 },
      );
    },
  },
  {
    name: "tally-tick",
    about:
      "The tally counting up on the card between waves: a tiny damped mallet tick on G5, dry, which the game raises as it counts.",
    level: "tick",
    plays: ["tally counted (raised as it counts)"],
    make: (_take, seed) =>
      fit(mallet(degree(3), 0.04, seed, { attack: 0.002, bright: 0.8 }), 0.05),
  },
  {
    name: "ui-move",
    about:
      "Moving between buttons: one short soft mallet note on G5, the note the other two menu sounds start from.",
    level: "tick",
    plays: ["focus moved between buttons"],
    make: (_take, seed) =>
      roomed(mallet(degree(3), 0.07, seed, { bright: 0.7 }), 0.09, {
        decay: 0.1,
        mix: 0.06,
      }),
  },
  {
    name: "ui-select",
    about:
      "Choosing a button: the menu's G5 and at once a step up to C6 on the mallet, with a touch of glass on the C.",
    level: "tick",
    plays: ["button chosen"],
    make: (_take, seed) =>
      roomed(
        mix([
          pair(3, 5, seed),
          { x: glass(degree(5), 0.1, seed + 9), at: 0.055, gain: 0.25 },
        ]),
        0.2,
        { decay: 0.15, mix: 0.08 },
      ),
  },
  {
    name: "ui-back",
    about:
      "Going back: the menu's G5 and at once a step down to E5 on the mallet.",
    level: "tick",
    plays: ["went back or closed"],
    make: (_take, seed) =>
      roomed(pair(3, 2, seed), 0.2, { decay: 0.15, mix: 0.08 }),
  },
  {
    name: "pause",
    about: "The game pauses: a soft falling pair on the mallet, E5 down to A4.",
    level: "small",
    plays: ["paused"],
    make: (_take, seed) =>
      roomed(unit(pair(2, -1, seed, { gap: 0.12, ring: 0.26 })), 0.42, {
        decay: 0.3,
        mix: 0.14,
      }),
  },
  {
    name: "resume",
    about:
      "The game goes on: the pause's pair turned round, A4 up to E5, on the mallet.",
    level: "small",
    plays: ["resumed"],
    make: (_take, seed) =>
      roomed(unit(pair(-1, 2, seed, { gap: 0.12, ring: 0.26 })), 0.42, {
        decay: 0.3,
        mix: 0.14,
      }),
  },
];

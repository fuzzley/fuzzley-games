// The specials' sounds: each special fuzzball made, and each going off,
// alone or two swapped together. A special made rings a rising fifth on a
// small bell, with something of what it will do; going off, each has a
// voice of its own: a rush of air for the dasher, a breath in and a soft
// thump for the puffer, a flutter for the wisp, and for the frizzball a
// tick of static for each fuzzball it reaches, then a chord, a bell and a
// sparkle as they all hop off.

import {
  degree,
  drive,
  filter,
  gain,
  lfo,
  mix,
  noise,
  osc,
  points,
} from "@fz/dev/synth";
import {
  bell,
  buzz,
  mallet,
  room,
  shaped,
  sparkle,
  toward,
  whoosh,
} from "./voices.mjs";

/** @import { Recipe } from "../build-sounds.mjs" */
/** @import { Layer, Signal } from "@fz/dev/synth" */

/**
 * Returns a special made: two notes of a small bell a fifth apart, the
 * second a tenth of a second after the first, then a few bright specks,
 * over what is laid under them, in a small room.
 *
 * @param {number} root The first note's pitch, in Hz.
 * @param {Layer} under What it will do, as it is heard while it is made.
 * @param {number} seed The specks'.
 * @returns {Signal}
 */
function made(root, under, seed) {
  return room(
    mix([
      { x: bell(root, 0.1), gain: 0.8 },
      { x: bell(root * 1.5, 0.14), at: 0.1, gain: 0.9 },
      under,
      { x: sparkle(0.2, 3, seed), at: 0.12, gain: 0.35 },
    ]),
    { seconds: 0.3, wet: 0.14 },
  );
}

/**
 * Returns a frizzball made: four bell notes rising up the ladder's top
 * octave, C6, E6, G6 and A6, under a crackle of static and a sparkle.
 *
 * @returns {Signal}
 */
function frizzballMade() {
  const crackle = mix(
    Array.from({ length: 14 }, (_, n) => ({
      x: shaped(
        filter(noise("white", 0.012, 40 + n), "bp", 3000 + (n % 4) * 500, 2),
        { attack: 0.001, decay: 0.003 },
      ),
      at: 0.02 + ((n * 37) % 100) / 240,
      gain: 0.5,
    })),
  );
  return room(
    mix([
      ...[5, 7, 8, 9].map((step, n) => ({
        x: bell(degree(step), 0.13),
        at: n * 0.05,
        gain: 0.7,
      })),
      { x: crackle, gain: 0.45 },
      { x: sparkle(0.35, 6, 3), at: 0.15, gain: 0.5 },
    ]),
    { seconds: 0.4, wet: 0.18 },
  );
}

/**
 * Returns a puffer going off: a breath drawn in, then a soft, low thump
 * that falls as it blooms, a burst of air and the air settling, in a small
 * room; bigger and lower for two set off together, with a sparkle over
 * them.
 *
 * @param {boolean} big
 * @returns {Signal}
 */
function puffed(big) {
  const root = big ? 165 : 220;
  const stretch = big ? 1.5 : 1;
  const breath = gain(
    filter(
      noise("white", 0.14, 31),
      "bp",
      points(
        [
          [0, 400],
          [0.14, 1900],
        ],
        0.14,
      ),
      1.4,
    ),
    (t) => (t / 0.14) ** 2.2,
  );
  // The thump's four harmonics, each falling as it blooms, the higher ones
  // dying sooner.
  const thump = [0.55, 0.7, 0.5, 0.25].map((level, k) => {
    const pitch = root * (k + 1);
    return {
      x: shaped(
        osc("sine", toward(pitch * 1.25, pitch * 0.6, 0.07), 0.5 * stretch),
        { attack: 0.005, decay: (0.11 * stretch) / (k + 1) ** 0.4 },
      ),
      at: 0.14,
      gain: level,
    };
  });
  const burst = shaped(
    filter(
      noise("white", 0.6 * stretch, 33),
      "lp",
      toward(4200, 800, 0.1 * stretch),
    ),
    { attack: 0.004, decay: 0.11 * stretch },
  );
  const settling = shaped(
    filter(noise("white", 0.7 * stretch, 35), "bp", 950, 0.7),
    { attack: 0.02, decay: 0.2 * stretch },
  );
  return room(
    drive(
      mix([
        { x: breath, gain: 0.5 },
        ...thump,
        { x: burst, at: 0.14, gain: 1.1 },
        { x: settling, at: 0.14, gain: 0.4 },
        ...(big ? [{ x: sparkle(0.5, 8, 4), at: 0.2, gain: 0.3 }] : []),
      ]),
      1.3,
    ),
    { seconds: 0.4 * stretch, wet: 0.16 },
  );
}

/**
 * The specials' recipes, in the sprite's order.
 *
 * @type {readonly Recipe[]}
 */
export const RECIPES = [
  // A line of 4 makes a dasher: E5 and its fifth, in a rush of air that
  // rises to a peak late.
  {
    name: "born-dasher",
    peak: -7,
    fadeOut: 0.04,
    make: () =>
      made(
        degree(2),
        {
          x: whoosh({
            seconds: 0.16,
            from: 700,
            peak: 3200,
            to: 2400,
            q: 2,
            lean: 0.8,
          }),
          at: 0.02,
          gain: 0.5,
        },
        6,
      ),
  },
  // Two lines that meet make a puffer: C5 and its fifth, over a soft, low
  // swell that rises, and its octave.
  {
    name: "born-puffer",
    peak: -7,
    fadeOut: 0.04,
    make: () => {
      const swell = (/** @type {number} */ times) =>
        shaped(
          osc(
            "sine",
            points(
              [
                [0, 200 * times],
                [0.16, 330 * times],
              ],
              0.24,
            ),
            0.24,
          ),
          { attack: 0.09, decay: 0.05, curve: 2 },
        );
      return made(
        degree(0),
        {
          x: mix([
            { x: swell(1), gain: 0.6 },
            { x: swell(2), gain: 0.3 },
          ]),
        },
        6,
      );
    },
  },
  // A square makes a wisp: C6 and its fifth, over air that flutters.
  {
    name: "born-wisp",
    peak: -7,
    fadeOut: 0.04,
    make: () =>
      made(
        degree(5),
        {
          x: gain(
            whoosh({
              seconds: 0.26,
              from: 1400,
              peak: 2600,
              to: 2000,
              q: 2.5,
              seed: 8,
            }),
            lfo(0.6, 0.4, 22, 0.26),
          ),
          at: 0.02,
          gain: 0.4,
        },
        4,
      ),
  },
  // A line of 5 makes a frizzball.
  { name: "born-frizz", peak: -6, fadeOut: 0.05, make: frizzballMade },
  // A dasher dashing down its row or column: a long rush of air, with a
  // faint whistle that swells and bends up and back.
  {
    name: "dash",
    peak: -8,
    fadeOut: 0.04,
    make: () =>
      mix([
        whoosh({
          seconds: 0.4,
          from: 500,
          peak: 3000,
          to: 700,
          q: 1.6,
          seed: 12,
          lean: 0.35,
        }),
        {
          x: gain(
            osc(
              "sine",
              (t) =>
                700 * 2 ** (1.2 * Math.sin((Math.PI * Math.min(t, 0.4)) / 0.4)),
              0.4,
            ),
            (t) => Math.sin((Math.PI * t) / 0.4) ** 2,
          ),
          gain: 0.16,
        },
      ]),
  },
  // A puffer breathing in and going off.
  { name: "puff", peak: -5, fadeOut: 0.06, make: () => puffed(false) },
  // A wisp floating off to the square it has chosen: a whistle that bends
  // up a fourth and back, in fluttering air.
  {
    name: "wisp",
    peak: -13,
    fadeOut: 0.04,
    make: () => {
      const whistle = gain(
        gain(
          osc(
            "sine",
            (t) => 1250 * 2 ** ((5 * Math.sin((Math.PI * t) / 0.45)) / 12),
            0.45,
          ),
          (t) => Math.sin((Math.PI * t) / 0.45) ** 1.5,
        ),
        lfo(0.7, 0.3, 15, 0.45),
      );
      const air = gain(
        whoosh({
          seconds: 0.45,
          from: 1200,
          peak: 2400,
          to: 1500,
          q: 2.2,
          seed: 14,
        }),
        lfo(0.6, 0.4, 15, 0.45),
      );
      return mix([
        { x: whistle, gain: 0.5 },
        { x: air, gain: 0.7 },
      ]);
    },
  },
  // Static leaping from a frizzball to one fuzzball: a blip on C6, the
  // ladder's foot an octave up, and a tick. The scene raises each a step
  // up the ladder as the frizzball takes the fuzzballs in turn.
  {
    name: "zap",
    peak: -16,
    make: () =>
      filter(
        mix([
          {
            // From the bottom of its swing, as the design's triangles start.
            x: shaped(osc("tri", degree(5), 0.07, { phase: 0.75 }), {
              attack: 0.002,
              decay: 0.012,
            }),
            gain: 0.7,
          },
          {
            x: shaped(filter(noise("white", 0.02, 21), "bp", 3600, 1.2), {
              attack: 0.001,
              decay: 0.004,
            }),
            gain: 0.5,
          },
        ]),
        "lp",
        5600,
      ),
  },
  // Every fuzzball a frizzball reached hopping off at once: mallet notes
  // up a chord, a bell over them, a long sparkle and a rush of air, in a
  // larger room.
  {
    name: "frizz",
    peak: -4,
    fadeOut: 0.08,
    make: () =>
      room(
        mix([
          ...[0, 2, 3, 6].map((step, n) => ({
            x: mallet(degree(step), { decay: 0.14, air: 0.2 }),
            at: n * 0.012,
            gain: 0.7,
          })),
          { x: bell(degree(5), 0.3), at: 0.03, gain: 0.5 },
          { x: sparkle(0.55, 14, 9), at: 0.05, gain: 0.6 },
          {
            x: whoosh({
              seconds: 0.5,
              from: 600,
              peak: 3200,
              to: 1200,
              q: 1,
              seed: 17,
              lean: 0.2,
            }),
            gain: 0.4,
          },
        ]),
        { seconds: 0.6, wet: 0.22 },
      ),
  },
  // Two special fuzzballs swapped together, before what they do: a buzz
  // that climbs and brightens as it winds up, in air that rises to the
  // very end.
  {
    name: "pair",
    peak: -9,
    fadeOut: 0.02,
    make: () => {
      const charge = gain(
        buzz(
          points(
            [
              [0, 300],
              [0.3, 900],
            ],
            0.32,
          ),
          0.32,
          4500,
          1.4,
        ),
        (t) => (t / 0.32) ** 1.6,
      );
      return mix([
        {
          x: filter(
            charge,
            "lp",
            points(
              [
                [0, 900],
                [0.3, 4200],
              ],
              0.32,
            ),
          ),
          gain: 0.5,
        },
        {
          x: whoosh({
            seconds: 0.32,
            from: 500,
            peak: 3400,
            to: 3000,
            q: 2,
            seed: 19,
            lean: 0.92,
          }),
          gain: 0.8,
        },
      ]);
    },
  },
  // Two puffers going off as one.
  { name: "big-puff", peak: -4, fadeOut: 0.06, make: () => puffed(true) },
];

// The board's sounds: a brick losing a layer and its last bursting, a cage
// opened and its friend's yip, a square dusted, a burr brushed off and one
// spreading, a sleepyhead put to bed, the wind turning, the board
// shuffled, a fuzzball counted and a goal met, the moves running low, and
// the board's cheers as a move's waves pile up.
//
// A thick brick comes apart in tune: its springing note is C4 with 3
// layers left, D4 with 2 and E4 with 1, and its burst G4, the ladder's
// first four steps an octave under the bunches' notes.

import {
  degree,
  drive,
  filter,
  fm,
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
  chirped,
  mallet,
  room,
  shaped,
  sparkle,
  steep,
  swell,
  toward,
  whoosh,
} from "./voices.mjs";

/** @import { Recipe } from "../build-sounds.mjs" */
/** @import { Signal } from "@fz/dev/synth" */

/**
 * Returns a cushion knocked off a brick: a soft thump, the cloth leaving,
 * and the pile under it springing up to its note, swooping up to it and
 * wobbling once, with its octave, which a phone's speaker carries where it
 * drops the note itself.
 *
 * @param {number} left The layers the brick has left, 1 to 3.
 * @returns {Signal}
 */
function knocked(left) {
  const sprung = (/** @type {number} */ t) =>
    degree(3 - left, 4) *
    2 ** ((-6 * Math.exp(-t / 0.028)) / 12) *
    (1 + 0.018 * Math.sin(2 * Math.PI * 17 * t) * Math.exp(-t / 0.09));
  return mix([
    {
      x: shaped(osc("sine", toward(430, 270, 0.04), 0.09), {
        attack: 0.004,
        decay: 0.02,
      }),
      gain: 0.7,
    },
    {
      x: whoosh({
        seconds: 0.12,
        from: 600,
        peak: 2300,
        to: 1100,
        q: 1,
        seed: 40 + left,
        lean: 0.3,
      }),
      at: 0.008,
      gain: 0.42,
    },
    {
      x: shaped(osc("sine", sprung, 0.3), { attack: 0.014, decay: 0.055 }),
      at: 0.05,
      gain: 0.6,
    },
    {
      x: shaped(
        osc("sine", (t) => 2 * sprung(t), 0.24),
        { attack: 0.012, decay: 0.04 },
      ),
      at: 0.05,
      gain: 0.34,
    },
  ]);
}

/**
 * Returns a cage's ping at a pitch, in Hz: a struck bar of metal, bright
 * as it is struck and mellowing as it rings.
 *
 * @param {number} freq
 * @returns {Signal}
 */
function ping(freq) {
  const struck = shaped(
    fm(freq, 1.41, (t) => 3 * Math.exp(-t / 0.03), 0.3),
    {
      attack: 0.002,
      decay: 0.05,
    },
  );
  return steep(struck, 5200);
}

/**
 * Returns a sleepyhead's yawn: a buzz that rises, then sinks an octave,
 * through two resonances closing slowly from "ah" toward "oh".
 *
 * @returns {Signal}
 */
function yawn() {
  const sighed = (/** @type {number} */ t) =>
    t < 0.22
      ? 500 * 2 ** ((5 * t) / 0.22 / 12)
      : 667 * 2 ** ((-12 * Math.min(1, (t - 0.22) / 0.4)) / 12);
  const source = buzz(sighed, 0.66, 5000, 1.2);
  return gain(
    mix([
      filter(
        source,
        "bp",
        points(
          [
            [0, 700],
            [0.6, 420],
          ],
          0.66,
        ),
        4,
      ),
      {
        x: filter(
          source,
          "bp",
          points(
            [
              [0, 1300],
              [0.6, 900],
            ],
            0.66,
          ),
          6,
        ),
        gain: 0.6,
      },
    ]),
    swell(0.66, 0.8),
  );
}

/**
 * Returns a blow of the wind: noise through a narrow band that swells up
 * and back down over most of a second.
 *
 * @param {number} seed
 * @param {number} times How many times as high its band is as the lowest blow's.
 * @returns {Signal}
 */
function blow(seed, times) {
  const rising = swell(0.8, 2);
  const band = filter(
    noise("white", 0.8, seed),
    "bp",
    (t) => times * (500 + 900 * rising(t)),
    3,
  );
  return gain(steep(band, 6000), swell(0.8, 1.4));
}

/**
 * Returns a squeak at a pitch, in Hz, rising a third in 50 ms.
 *
 * @param {number} freq
 * @returns {Signal}
 */
function squeak(freq) {
  return shaped(
    osc(
      "sine",
      points(
        [
          [0, freq],
          [0.05, freq * 1.25],
        ],
        0.07,
      ),
      0.07,
    ),
    { attack: 0.01, decay: 0.015 },
  );
}

/**
 * Returns a woodblock's tok: a short sine, and a fainter one a fifth above.
 *
 * @returns {Signal}
 */
function tok() {
  return mix([
    {
      x: shaped(osc("sine", 620, 0.08), { attack: 0.003, decay: 0.02 }),
      gain: 0.8,
    },
    {
      x: shaped(osc("sine", 930, 0.05), { attack: 0.003, decay: 0.01 }),
      gain: 0.3,
    },
  ]);
}

/** The pitch each tier of the board's cheer starts on, in Hz. */
const CHEER_PITCHES = { 1: 500, 2: 560, 3: 620, 4: 700 };

/**
 * Returns the board's cheer as a move's waves pile up: a chirp that
 * climbs, higher, longer and fuller by the tier, a second chirp a third
 * above it from the third tier, and a third a fifth above from the fourth.
 *
 * @param {1 | 2 | 3 | 4} tier
 * @returns {Signal}
 */
function cheer(tier) {
  const sung = (/** @type {number} */ times) =>
    chirped({
      from: CHEER_PITCHES[tier] * times,
      rise: 3 + tier,
      seconds: 0.15 + tier * 0.04,
    });
  return drive(
    mix([
      sung(1),
      ...(tier >= 3 ? [{ x: sung(1.26), at: 0.02, gain: 0.6 }] : []),
      ...(tier >= 4 ? [{ x: sung(1.5), at: 0.04, gain: 0.5 }] : []),
    ]),
    1.2,
  );
}

/**
 * The board's recipes, in the sprite's order.
 *
 * @type {readonly Recipe[]}
 */
export const RECIPES = [
  // A brick losing a layer, with 3 left, 2 left or 1 left.
  { name: "knock-3", peak: -14, make: () => knocked(3) },
  { name: "knock-2", peak: -14, make: () => knocked(2) },
  { name: "knock-1", peak: -14, make: () => knocked(1) },
  // A brick's last layer bursting into fluff: a thump, a puff of air that
  // falls, a soft note on G4 and a few bright specks, in a small room.
  {
    name: "break",
    peak: -11,
    make: () =>
      room(
        mix([
          {
            x: shaped(osc("sine", toward(290, 170, 0.05), 0.12), {
              attack: 0.004,
              decay: 0.026,
            }),
            gain: 0.8,
          },
          {
            x: whoosh({
              seconds: 0.24,
              from: 2200,
              peak: 1500,
              to: 420,
              q: 0.8,
              seed: 51,
              lean: 0.12,
            }),
            at: 0.012,
            gain: 0.54,
          },
          {
            x: mallet(degree(3, 4), { decay: 0.085, scoop: 4, air: 0 }),
            at: 0.02,
            gain: 0.55,
          },
          { x: sparkle(0.16, 4, 53), at: 0.07, gain: 0.22 },
        ]),
        { seconds: 0.22, wet: 0.1 },
      ),
  },
  // A cage opening: two pings, E6 and then A6.
  {
    name: "cage",
    peak: -10,
    fadeOut: 0.03,
    make: () =>
      mix([
        { x: ping(degree(7)), gain: 0.7 },
        { x: ping(degree(9)), at: 0.07, gain: 0.8 },
      ]),
  },
  // A friend hopping out of its cage: a quick, bright chirp that climbs
  // half an octave.
  {
    name: "yip",
    peak: -13,
    make: () =>
      chirped({
        from: 700,
        rise: 6,
        seconds: 0.13,
        over: 0.06,
        open: [400, 2000],
        close: [320, 2300],
        wobble: 0,
      }),
  },
  // A square dusted off: a soft brush of noise.
  {
    name: "dust",
    peak: -16,
    make: () =>
      shaped(steep(filter(noise("white", 0.14, 27), "bp", 2500, 0.6), 4500), {
        attack: 0.02,
        hold: 0.02,
        decay: 0.03,
        curve: 1.5,
      }),
  },
  // A burr brushed off: a band of noise torn in quick strips, under a
  // tick.
  {
    name: "burr-off",
    peak: -12,
    make: () => {
      const torn = gain(
        filter(noise("white", 0.1, 29), "bp", 3800, 3),
        (t) =>
          (0.35 + 0.65 * (Math.sin(2 * Math.PI * 95 * t) > 0 ? 1 : 0)) *
          Math.exp(-t / 0.035),
      );
      return mix([
        // Each strip's edge clicks, so the low-pass comes after the tearing.
        { x: steep(torn, 4800), at: 0.01, gain: 0.9 },
        {
          x: shaped(osc("sine", 1200, 0.03), { attack: 0.001, decay: 0.006 }),
          gain: 0.4,
        },
      ]);
    },
  },
  // A burr catching on the fuzzball beside it: a creak that rises a
  // little, then a tick.
  {
    name: "burr-spread",
    peak: -13,
    make: () => {
      const rising = points(
        [
          [0, 300],
          [0.14, 420],
        ],
        0.16,
      );
      const creak = gain(
        gain(
          filter(buzz(rising, 0.16, 3000, 1.2), "lp", 1800),
          lfo(0.6, 0.4, 34, 0.16),
        ),
        swell(0.16),
      );
      return mix([
        { x: creak, gain: 0.8 },
        {
          x: shaped(filter(noise("white", 0.02, 61), "bp", 2000, 1.5), {
            attack: 0.001,
            decay: 0.005,
          }),
          at: 0.14,
          gain: 0.6,
        },
      ]);
    },
  },
  // A sleepyhead reaching the bottom row: a yawn, and three bell notes
  // down, G5, E5 and C5, in a small room.
  {
    name: "bed",
    peak: -9,
    fadeOut: 0.06,
    make: () =>
      room(
        mix([
          { x: yawn(), gain: 0.8 },
          ...[3, 2, 0].map((step, n) => ({
            x: bell(degree(step), 0.14),
            at: 0.6 + n * 0.15,
            gain: 0.6,
          })),
        ]),
        { seconds: 0.4, wet: 0.16 },
      ),
  },
  // The wind turning: two blows, one higher and fainter, and two faint
  // squeaks.
  {
    name: "gust",
    peak: -9,
    fadeOut: 0.08,
    make: () =>
      mix([
        blow(71, 1),
        { x: blow(73, 1.6), at: 0.03, gain: 0.4 },
        { x: squeak(1150), at: 0.3, gain: 0.1 },
        { x: squeak(1300), at: 0.42, gain: 0.08 },
      ]),
  },
  // No move left, and the fuzzballs trading places: nine soft pats a
  // little apart, each with its octave, in a rush of air.
  {
    name: "shuffle",
    peak: -11,
    fadeOut: 0.03,
    make: () =>
      mix([
        ...Array.from({ length: 9 }, (_, n) => n).flatMap((n) => {
          const freq = 300 + ((n * 97) % 160);
          return [
            {
              x: shaped(osc("sine", toward(freq * 1.15, freq, 0.02), 0.06), {
                attack: 0.003,
                decay: 0.012,
              }),
              at: n * 0.04 + ((n * 13) % 7) / 400,
              gain: 0.6,
            },
            {
              x: shaped(osc("sine", freq * 2, 0.05), {
                attack: 0.003,
                decay: 0.008,
              }),
              at: n * 0.04,
              gain: 0.25,
            },
          ];
        }),
        {
          x: whoosh({
            seconds: 0.42,
            from: 500,
            peak: 2200,
            to: 1600,
            q: 1.2,
            seed: 77,
            lean: 0.8,
          }),
          gain: 0.5,
        },
      ]),
  },
  // A gathered fuzzball reaching its goal's count: a tick on A6.
  {
    name: "tick",
    peak: -19,
    make: () =>
      shaped(osc("sine", degree(9), 0.04), { attack: 0.002, decay: 0.007 }),
  },
  // One of a level's goals met: two bell notes, E6 and then A6, in a small
  // room.
  {
    name: "goal",
    peak: -9,
    fadeOut: 0.05,
    make: () =>
      room(
        mix([
          { x: bell(degree(7), 0.16), gain: 0.8 },
          { x: bell(degree(9), 0.2), at: 0.07, gain: 0.9 },
        ]),
        { seconds: 0.3, wet: 0.14 },
      ),
  },
  // 5 moves left: two toks.
  {
    name: "low",
    peak: -13,
    make: () => mix([tok(), { x: tok(), at: 0.13, gain: 0.8 }]),
  },
  // The board cheering at a move's 3rd, 5th, 7th and 9th wave.
  { name: "chirp-1", peak: -13.2, make: () => cheer(1) },
  { name: "chirp-2", peak: -12.4, make: () => cheer(2) },
  { name: "chirp-3", peak: -11.6, make: () => cheer(3) },
  { name: "chirp-4", peak: -10.8, make: () => cheer(4) },
];

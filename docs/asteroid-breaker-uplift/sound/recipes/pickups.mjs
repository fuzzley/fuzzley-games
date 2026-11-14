// The pickups' sounds, and the sparks': a glass orb let go by a broken rock,
// blinking out, or caught, each kind caught with a signature of its own that
// is told by its shape before its notes; an effect running out; the field
// slowing and coming back; and the tick of each spark gathered, which the
// game raises up the scale. The orbs are glass, so their voice is the small
// glass bell, and every pitch is a note of the game's key, the same in every
// take, since the game never detunes a tuned sound.

import { degree, pitch } from "../lib/music.mjs";
import {
  TAU,
  click,
  glass,
  mallet,
  pad,
  puff,
  roomed,
  sing,
  sparkle,
  unit,
  warp,
} from "../lib/parts-ship.mjs";
import {
  filter,
  fit,
  gain,
  glide,
  lfo,
  mix,
  modes,
  points,
  seeded,
} from "../lib/synth.mjs";

/** @import { Recipe } from "../build.mjs" */
/** @import { Signal } from "../lib/synth.mjs" */

/**
 * Returns something turning, for the field's slowing to slow: the C chord
 * held by pads that tremble sixteen times a second, with a glass tick on
 * every tremble, C6 and G6 by turns, so that played ever slower its pitch,
 * its brightness and its beat all sink together, as a record's do.
 *
 * @param {number} seconds
 * @param {number} seed
 * @returns {Signal}
 */
function turning(seconds, seed) {
  const beat = 1 / 16;
  const chord = mix(
    [0, 2, 3, 5].map((step) => ({
      x: pad(degree(step), seconds, {
        attack: 0.01,
        release: 0.03,
        bright: 1.6,
      }),
      gain: 0.4,
    })),
  );
  const ticks = mix(
    Array.from({ length: Math.floor(seconds / beat) }, (_, k) => ({
      x: glass(degree(k % 2 ? 8 : 5), 0.08, seed + k),
      at: k * beat,
      gain: 0.5,
    })),
  );
  return mix([gain(chord, lfo(0.75, 0.25, 16, seconds)), ticks]);
}

/**
 * Returns the glint a caught pickup ends on, as a layer to mix in: a few
 * pings of sparkle two octaves and more above the staff, which is what
 * the orbs share whatever their signatures do.
 *
 * @param {number} seed
 * @param {number} at When it starts, in seconds.
 * @returns {{ x: Signal, at: number, gain: number }}
 */
function glint(seed, at) {
  return {
    x: sparkle({
      seconds: 0.1,
      seed,
      count: 4,
      low: 10,
      high: 15,
      ring: 0.06,
    }),
    at,
    gain: 0.16,
  };
}

/** @type {Recipe[]} */
export const SOUNDS = [
  {
    name: "pickup-drop",
    about:
      "A pickup let go by a broken rock: a small glass bell on G6 with a second a moment after, on C7 in one take and E7 in the other, and a few pings of sparkle.",
    takes: 2,
    level: "small",
    plays: ["pickup dropped"],
    make: (take, seed) => {
      const over = [10, 12][take % 2] ?? 10;
      return roomed(
        mix([
          glass(pitch("G6"), 0.16, seed),
          { x: glass(degree(over), 0.12, seed + 1), at: 0.03, gain: 0.5 },
          { x: click(seed + 2, { seconds: 0.002, freq: 3000 }), gain: 0.12 },
          {
            x: sparkle({
              seconds: 0.12,
              seed: seed + 3,
              count: 4,
              low: 12,
              high: 16,
              ring: 0.05,
            }),
            at: 0.045,
            gain: 0.22,
          },
        ]),
        0.21,
        { decay: 0.2, mix: 0.1 },
      );
    },
  },
  {
    name: "pickup-fade",
    about:
      "A pickup blinks out uncaught: a tiny sigh, a nearly pure tone sliding from E6 down to A5 under a breath of air that falls with it.",
    level: "tick",
    plays: ["pickup faded"],
    make: (_take, seed) => {
      const seconds = 0.17;
      const shape = points(
        [
          [0, 0],
          [0.02, 1],
          [0.16, 0],
        ],
        seconds,
      );
      const sigh = sing(
        glide(pitch("E6"), pitch("A5"), 0.13, seconds),
        seconds,
        { index: 0.3 },
      );
      const breath = filter(
        puff(seed, seconds, {
          freq: glide(3500, 1500, 0.13, seconds),
          q: 1,
          attack: 0.02,
          decay: 0.14,
        }),
        "lp",
        5000,
      );
      return roomed(
        mix([gain(sigh, shape), { x: breath, gain: 0.5 }]),
        seconds,
        { decay: 0.12, mix: 0.08 },
      );
    },
  },
  {
    name: "pickup-spread",
    about:
      "The Spread caught: one sung C5 that fans out into three, sliding up to E5, G5 and C6 at once, where three glass bells strike the chord under a glint of sparkle.",
    level: "medium",
    plays: ["pickup caught (Spread)"],
    make: (_take, seed) => {
      const split = 0.06;
      const fan = 0.08;
      const from = degree(0);
      const to = [2, 3, 5];
      const voices = mix(
        to.map((step, k) => ({
          x: sing(
            (t) =>
              from *
              (degree(step) / from) **
                Math.min(1, Math.max(0, t - split) / fan),
            0.4,
            { index: 0.8, detune: 4 + k },
          ),
          gain: 0.4,
        })),
      );
      const shape = points(
        [
          [0, 0],
          [0.005, 1],
          [split, 0.7],
          [split + fan, 1],
          [0.4, 0],
        ],
        0.4,
      );
      const chord = mix(
        to.map((step, k) => ({
          x: glass(degree(step), 0.28, seed + k),
          gain: 0.5,
        })),
      );
      return roomed(
        mix([
          { x: glass(from, 0.1, seed + 9), gain: 0.5 },
          gain(voices, shape),
          { x: chord, at: split + fan, gain: 0.55 },
          glint(seed + 30, split + fan + 0.02),
        ]),
        0.45,
        { decay: 0.35, mix: 0.14 },
      );
    },
  },
  {
    name: "pickup-rapid",
    about:
      "The Rapid caught: one note stuttered, five quick damped glass strikes of G5 a twenty-fourth of a second apart, each louder and brighter, the last left to ring with the G above it and a glint of sparkle.",
    level: "medium",
    plays: ["pickup caught (Rapid)"],
    make: (_take, seed) => {
      const gap = 0.042;
      const note = pitch("G5");
      const strikes = mix(
        [0, 1, 2, 3, 4].map((k) => ({
          x: mix([
            glass(note, k === 4 ? 0.24 : 0.045, seed + k, {
              bright: 0.7 + 0.15 * k,
            }),
            {
              x: click(seed + 20 + k, { seconds: 0.002, freq: 2500 }),
              gain: 0.12,
            },
          ]),
          at: gap * k,
          gain: 0.5 + 0.12 * k,
        })),
      );
      return roomed(
        mix([
          strikes,
          { x: glass(note * 2, 0.2, seed + 9), at: gap * 4, gain: 0.3 },
          glint(seed + 30, gap * 4 + 0.02),
        ]),
        0.42,
        { decay: 0.28, mix: 0.12 },
      );
    },
  },
  {
    name: "pickup-lance",
    about:
      "The Lance caught: one long clean line, a nearly pure tone sliding two octaves from C5 to C7 as it swells, a glass bell on C7 where it arrives and a thread of air after it.",
    level: "medium",
    plays: ["pickup caught (Lance)"],
    make: (_take, seed) => {
      const rise = 0.28;
      const seconds = 0.4;
      const line = gain(
        sing(glide(degree(0), degree(10), rise, seconds), seconds, {
          index: 0.35,
          detune: 3,
        }),
        points(
          [
            [0, 0],
            [0.02, 0.5],
            [rise, 1],
            [rise + 0.03, 0.55],
            [seconds, 0],
          ],
          seconds,
        ),
      );
      const thread = puff(seed + 1, 0.32, {
        freq: glide(2500, 8000, rise, 0.32),
        q: 2.5,
        attack: 0.2,
        decay: 0.12,
      });
      return roomed(
        mix([
          { x: line, gain: 0.55 },
          { x: glass(degree(10), 0.18, seed), at: rise, gain: 0.7 },
          { x: thread, gain: 0.3 },
        ]),
        0.44,
        { decay: 0.3, mix: 0.13 },
      );
    },
  },
  {
    name: "pickup-shield",
    about:
      "The Shield caught: a glass chord that closes, bells struck in pairs from the outside in, C5 with C7, E5 with G6, G5 with E6, and C6 last in the middle with a soft knock and a glint of sparkle.",
    level: "medium",
    plays: ["pickup caught (Shield)"],
    make: (_take, seed) => {
      const gap = 0.055;
      const pairs = [
        [0, 10],
        [2, 8],
        [3, 7],
      ];
      const closing = mix(
        pairs.flatMap(([low = 0, high = 0], k) => [
          {
            x: glass(degree(low), 0.3 - 0.02 * k, seed + 2 * k),
            at: gap * k,
            gain: 0.5,
          },
          {
            x: glass(degree(high), 0.26 - 0.02 * k, seed + 2 * k + 1),
            at: gap * k,
            gain: 0.38,
          },
        ]),
      );
      const shut = mix([
        glass(degree(5), 0.24, seed + 10),
        { x: mallet(degree(5), 0.1, seed + 11), gain: 0.5 },
      ]);
      return roomed(
        mix([
          closing,
          { x: shut, at: gap * 3, gain: 0.75 },
          glint(seed + 30, gap * 3 + 0.02),
        ]),
        0.45,
        { decay: 0.35, mix: 0.15 },
      );
    },
  },
  {
    name: "pickup-magnet",
    about:
      "The Magnet caught: two sung tones, one from E5 below and one from G6 above, wobble as they are pulled together onto C6, the wobble narrowing as they close, and meet with a click, a glass bell and a glint of sparkle.",
    level: "medium",
    plays: ["pickup caught (Magnet)"],
    make: (_take, seed) => {
      const pull = 0.28;
      const seconds = 0.42;
      const target = degree(5);
      /**
       * @param {number} from
       * @param {number} side
       * @returns {(t: number) => number}
       */
      const pulled = (from, side) => (t) =>
        from *
        (target / from) ** (Math.min(1, t / pull) ** 0.7) *
        2 **
          ((side *
            170 *
            Math.max(0, 1 - t / pull) ** 1.5 *
            Math.sin(TAU * 11 * t)) /
            1200);
      const shape = points(
        [
          [0, 0],
          [0.012, 1],
          [pull, 0.9],
          [seconds, 0],
        ],
        seconds,
      );
      const pair = mix([
        { x: sing(pulled(pitch("E5"), 1), seconds, { index: 0.6 }), gain: 0.6 },
        {
          x: sing(pulled(pitch("G6"), -1), seconds, { index: 0.4 }),
          gain: 0.45,
        },
      ]);
      return roomed(
        mix([
          gain(pair, shape),
          { x: glass(target, 0.2, seed), at: pull, gain: 0.5 },
          {
            x: click(seed + 1, { seconds: 0.003, freq: 2000 }),
            at: pull,
            gain: 0.2,
          },
          glint(seed + 30, pull + 0.02),
        ]),
        0.45,
        { decay: 0.3, mix: 0.13 },
      );
    },
  },
  {
    name: "pickup-slow",
    about:
      "The Slow caught: glass bells that sink and stretch, E6, C6, G5 and C5, each later than the last by more, each ringing longer and sagging further in pitch, under a low-pass that closes.",
    level: "medium",
    plays: ["pickup caught (Slow)"],
    make: (_take, seed) => {
      const sinking = [
        { step: 7, at: 0, ring: 0.1, bend: 25 },
        { step: 5, at: 0.055, ring: 0.14, bend: 45 },
        { step: 3, at: 0.135, ring: 0.2, bend: 80 },
        { step: 0, at: 0.24, ring: 0.185, bend: 140 },
      ];
      const bells = mix(
        sinking.map(({ step, at, ring, bend }, k) => ({
          x: glass(degree(step), ring, seed + k, {
            bend,
            attack: 0.003 + 0.002 * k,
          }),
          at,
          gain: 0.75 + 0.08 * k,
        })),
      );
      return roomed(filter(bells, "lp", glide(9000, 1600, 0.4, 0.45)), 0.45, {
        decay: 0.3,
        mix: 0.13,
      });
    },
  },
  {
    name: "effect-end",
    about:
      "A pickup's effect runs out: a soft two-note fall on glass, G5 then E5, the second quieter, with the highs taken off.",
    level: "small",
    plays: ["effect ended"],
    make: (_take, seed) =>
      roomed(
        filter(
          mix([
            glass(pitch("G5"), 0.16, seed, { attack: 0.006, bright: 0.7 }),
            {
              x: glass(pitch("E5"), 0.24, seed + 1, {
                attack: 0.006,
                bright: 0.7,
              }),
              at: 0.11,
              gain: 0.75,
            },
          ]),
          "lp",
          4500,
        ),
        0.38,
        { decay: 0.3, mix: 0.14 },
      ),
  },
  {
    name: "slow-on",
    about:
      "The field slows: the C chord, trembling, with a glass tick on every tremble, played ever slower, down to a third of its speed, so its pitch, its beat and its brightness sink together as a record's do.",
    level: "medium",
    plays: ["slow started"],
    make: (_take, seed) => {
      const seconds = 0.62;
      const slowed = warp(
        turning(0.45, seed),
        (t) => 1 - 0.68 * Math.min(1, t / 0.55) ** 0.7,
        seconds,
      );
      return roomed(
        gain(
          filter(slowed, "lp", glide(8000, 500, 0.55, seconds), 0.8),
          points(
            [
              [0, 0],
              [0.008, 1],
              [0.35, 0.85],
              [0.6, 0],
            ],
            seconds,
          ),
        ),
        0.64,
        { decay: 0.3, mix: 0.12 },
      );
    },
  },
  {
    name: "slow-off",
    about:
      "The field comes back: the same trembling chord and ticks spun up from a third of their speed to full, a low-pass opening over them, and a glass C6 and G6 as they arrive.",
    level: "medium",
    plays: ["slow ended"],
    make: (_take, seed) => {
      const back = 0.3;
      const seconds = 0.4;
      const spun = warp(
        turning(0.4, seed),
        (t) => 0.32 + 0.68 * Math.min(1, t / back) ** 1.6,
        seconds,
      );
      const arrived = mix([
        glass(degree(5), 0.14, seed + 50),
        { x: glass(degree(8), 0.12, seed + 51), gain: 0.6 },
      ]);
      return roomed(
        mix([
          gain(
            filter(spun, "lp", glide(500, 9000, back, seconds), 0.8),
            points(
              [
                [0, 0],
                [0.03, 0.7],
                [back, 1],
                [seconds, 0],
              ],
              seconds,
            ),
          ),
          { x: unit(arrived), at: back, gain: 0.5 },
        ]),
        0.44,
        { decay: 0.28, mix: 0.12 },
      );
    },
  },
  {
    name: "spark",
    about:
      "One spark gathered: a tiny glass tick on C6, a fundamental with a faint octave and nothing above it, so it stays soft when the game raises it an octave and a half and plays twenty a second.",
    takes: 3,
    level: "tick",
    plays: ["spark gathered (raised up the ladder)"],
    make: (_take, seed) => {
      const random = seeded(seed);
      const seconds = 0.065;
      const note = degree(5);
      const body = modes(
        [
          { freq: note, decay: 0.048 + 0.012 * random(), gain: 1 },
          {
            freq: note * 2,
            decay: 0.02 + 0.008 * random(),
            gain: 0.2 + 0.1 * random(),
            phase: random(),
          },
          {
            freq: note * 3,
            decay: 0.01,
            gain: 0.03 + 0.05 * random(),
            phase: random(),
          },
        ],
        seconds,
      );
      const tick = puff(seed + 1, 0.004, {
        freq: 2600,
        q: 1,
        attack: 0.0003,
        decay: 0.003,
      });
      return fit(
        gain(
          mix([body, { x: tick, gain: 0.25 }]),
          points(
            [
              [0, 0],
              [0.0012, 1],
            ],
            seconds,
          ),
        ),
        seconds,
      );
    },
  },
];

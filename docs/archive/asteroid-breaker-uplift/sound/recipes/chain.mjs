// The chain's voice: the ping that sounds under every break of a chain and
// climbs the scale with it, and the three chimes as the multiplier steps
// up. The game plays one ping, recorded at C5, raised by the cents
// `lib/music.mjs`'s CHAIN_CENTS gives for the break's place in its chain.

import { degree } from "../lib/music.mjs";
import {
  filter,
  mix,
  modes,
  noise,
  perc,
  gain,
  reverb,
  seeded,
} from "../lib/synth.mjs";

/** @import { Recipe } from "../build.mjs" */

/**
 * Returns a small glass bell at a pitch: a clear fundamental, an octave
 * and a twelfth above it that die sooner, and a breath of air at its start.
 *
 * @param {number} freq
 * @param {number} ring How long it rings, in seconds.
 * @param {number} seed
 * @returns {Float64Array}
 */
export function bell(freq, ring, seed) {
  const random = seeded(seed);
  const body = modes(
    [
      { freq, decay: ring, gain: 1 },
      { freq: freq * 2.003, decay: ring * 0.55, gain: 0.32, phase: random() },
      { freq: freq * 3.01, decay: ring * 0.3, gain: 0.16, phase: random() },
      { freq: freq * 5.4, decay: ring * 0.12, gain: 0.07, phase: random() },
    ],
    ring * 1.1,
  );
  const air = gain(
    filter(noise("white", 0.03, seed), "bp", Math.min(9000, freq * 6), 1.2),
    perc(0.001, 0.025, 0.03),
  );
  return mix([body, { x: air, gain: 0.12 }]);
}

/** @type {Recipe[]} */
export const SOUNDS = [
  {
    name: "chain-ping",
    about:
      "Under every break of a chain: a small glass bell at C5, which the game raises up the scale by the break's place in its chain.",
    level: "small",
    plays: ["broken (with its chain's step)"],
    make: (_take, seed) =>
      reverb(bell(degree(0), 0.32, seed), { decay: 0.25, mix: 0.1 }),
  },
  ...[2, 3, 4].map((times, i) => ({
    name: `chain-x${times}`,
    about: `The multiplier reaches x${times}: ${i + 2} bells up the scale, quick, ending on C.`,
    level: /** @type {const} */ ("medium"),
    plays: [`chain reaches x${times}`],
    make: (/** @type {number} */ _take, /** @type {number} */ seed) => {
      // Up to a C: G and C; G, A and C; then C, E, G and the C above.
      const steps =
        [
          [3, 5],
          [3, 4, 5],
          [5, 7, 8, 10],
        ][i] ?? [];
      const octave = 5;
      return reverb(
        mix(
          steps.map((step, k) => ({
            x: bell(degree(step, octave), 0.34 + 0.1 * k, seed + k),
            at: k * 0.055,
            gain: 0.8 + 0.1 * k,
          })),
        ),
        { decay: 0.4, mix: 0.14 },
      );
    },
  })),
];

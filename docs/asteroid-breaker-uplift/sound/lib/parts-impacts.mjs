// The parts the rocks' and the hazards' sounds are built from: what a thing
// struck, cracked or shattered is heard to do, each a layer with one job. A
// crack says when, a knock or a clank says what and how big, and what falls
// after says what it broke into.

import {
  drive,
  fade,
  filter,
  fm,
  gain,
  glide,
  mix,
  modes,
  noise,
  normalize,
  osc,
  perc,
  scatter,
  seeded,
} from "./synth.mjs";

/** @import { Signal } from "./synth.mjs" */

/**
 * Returns a number near 1, off by up to a share of it either way: a take's
 * own pitch, or its own decay.
 *
 * @param {() => number} random
 * @param {number} share
 * @returns {number}
 */
export function near(random, share) {
  return 1 + (random() * 2 - 1) * share;
}

/**
 * Returns a number between two, drawn evenly by ratio, as pitches and times
 * spread.
 *
 * @param {() => number} random
 * @param {number} low
 * @param {number} high
 * @returns {number}
 */
export function between(random, low, high) {
  return low * (high / low) ** random();
}

/**
 * Returns a signal at full scale, so layers mix by the gains they are given.
 *
 * @param {Signal} x
 * @returns {Signal}
 */
export function unit(x) {
  return normalize(x, 0);
}

/**
 * Returns a crack: snaps of bright noise a few milliseconds apart, as a
 * fracture runs, the first the loudest. Each reaches up into the air, which
 * is what says the break is near.
 *
 * @param {{ seed: number, snaps?: number, over?: number, low?: number, high?: number, snap?: number }} how
 *   How many snaps, the time they run over, the band their noise lies in,
 *   in Hz, and a snap's length.
 * @returns {Signal}
 */
export function crack({
  seed,
  snaps = 2,
  over = 0.006,
  low = 2500,
  high = 9000,
  snap = 0.0035,
}) {
  const random = seeded(seed);
  return mix(
    Array.from({ length: snaps }, (_, k) => {
      const length = snap * between(random, 0.7, 1.3) * (k === 0 ? 1 : 0.7);
      const hiss = noise("white", length + 0.001, seed + 31 * k + 1);
      const burst = mix([
        filter(hiss, "hp", low, 0.707),
        { x: filter(hiss, "bp", between(random, low, high), 1.1), gain: 1.4 },
      ]);
      return {
        x: gain(burst, perc(0.0002, length, length + 0.001)),
        at:
          k === 0
            ? 0
            : (over * (k - 0.3 + 0.6 * random())) / Math.max(1, snaps - 1),
        gain: k === 0 ? 1 : 0.8 ** k * between(random, 0.5, 0.9),
      };
    }),
  );
}

/** How the modes of a solid lump lie over its lowest: scattered, none a whole multiple. */
export const LUMP = [1, 1.47, 1.93, 2.58, 3.37];

/**
 * A large lump's modes: the same, and more of them, since a phone hears a
 * large thing only by the modes that lie above 300 Hz.
 */
export const MASS = [...LUMP, 4.2, 5.3, 6.6];

/**
 * Returns a knock: the few low modes of a solid lump, struck once and dying
 * fast, over a thud of dull noise, driven so it has an edge. Its lowest
 * mode says how big the lump is.
 *
 * @param {{ freq: number, decay: number, seed: number, ratios?: readonly number[], tilt?: number, bend?: number, dull?: number, hard?: number }} how
 *   Its lowest mode, in Hz, the seconds it rings, how its modes lie over
 *   the lowest, how fast they grow fainter and shorter up the list (near 0
 *   for a large thing, whose upper modes carry it), the cents they fall as
 *   they ring, how much of it is thud, and how hard it is driven.
 * @returns {Signal}
 */
export function knock({
  freq,
  decay,
  seed,
  ratios = LUMP,
  tilt = 0.7,
  bend = 70,
  dull = 0.5,
  hard = 2,
}) {
  const random = seeded(seed);
  const length = decay * 1.25;
  const struck = modes(
    ratios.map((ratio, k) => ({
      freq: freq * ratio * (k === 0 ? 1 : near(random, 0.05)),
      decay: (decay * near(random, 0.15)) / (1 + 0.7 * tilt * k),
      gain: (k === 0 ? 1 : near(random, 0.35)) / (1 + tilt * k),
      phase: k === 0 ? 0 : random(),
      bend,
    })),
    length,
  );
  const thud = gain(
    filter(noise("pink", length, seed + 17), "bp", freq * 2.4, 0.6),
    perc(0.0006, decay * 0.5, length),
  );
  // It comes in over a millisecond: the crack over it is the click, and two
  // clicks at once only make a peak.
  return fade(
    drive(mix([unit(struck), { x: unit(thud), gain: dull }]), hard),
    0.001,
    0,
  );
}

/**
 * Returns a thump: a low tone falling in pitch, with its octave over it,
 * driven until it speaks two and three times higher, where a phone's
 * speaker can still be heard saying how heavy the thing was.
 *
 * @param {{ from: number, to: number, over: number, decay: number, hard?: number }} how
 *   The pitch it falls from and to, in Hz, over how long, the seconds it
 *   takes to die, and how hard it is driven.
 * @returns {Signal}
 */
export function thump({ from, to, over, decay, hard = 3 }) {
  const seconds = decay * 1.1;
  const low = glide(from, to, over, seconds, 1.6);
  const tone = mix([
    osc("sine", low, seconds),
    { x: osc("tri", gain(low, 2), seconds), gain: 0.35 },
  ]);
  return drive(gain(tone, perc(0.003, decay, seconds)), hard);
}

/**
 * Returns grit: a band of noise that comes in lumps, as a crowd of grains
 * too many to count grinds and slides, dying away and falling in pitch as
 * it settles. It is what joins a crumble's separate grains into one fall.
 *
 * @param {{ seconds: number, seed: number, low: number, high: number, lump?: number }} how
 *   How long it takes to die, the band it lies in, in Hz, and how long a
 *   lump of it lasts.
 * @returns {Signal}
 */
export function grit({ seconds, seed, low, high, lump = 0.012 }) {
  const middle = Math.sqrt(low * high);
  const lumps = unit(
    filter(noise("white", seconds, seed + 5), "lp", 0.6 / lump),
  );
  const fall = gain(
    gain(
      filter(
        noise("white", seconds, seed + 6),
        "bp",
        glide(middle * 1.3, middle * 0.7, seconds, seconds),
        0.6,
      ),
      lumps.map((v) => 0.25 + 0.75 * Math.abs(v)),
    ),
    // It falls 30 dB over its time and is faded out over its last third,
    // so the fall is heard to its end rather than vanishing under the knock.
    perc(0.003, seconds * 2, seconds),
  );
  return unit(fade(fall, 0, seconds * 0.35));
}

/**
 * Returns debris: grains of noise and pebbles' small knocks, scattered and
 * thinning out, lower as they settle, over the grit of all the grains too
 * small to hear one by one.
 *
 * @param {{ count: number, seconds: number, seed: number, low: number, high: number, grain?: number, bias?: number, pebbles?: number, bed?: number }} how
 *   How many grains over how long, the band they lie in, in Hz, a grain's
 *   length, how early most of them fall (`scatter()`'s bias), the share of
 *   them that knock rather than hiss, and how loud the grit under them is.
 * @returns {Signal}
 */
export function rubble({
  count,
  seconds,
  seed,
  low,
  high,
  grain = 0.012,
  bias = 1.8,
  pebbles = 0.35,
  bed = 0.5,
}) {
  return mix([
    { x: grit({ seconds, seed, low, high, lump: grain }), gain: bed },
    grains({ count, seconds, seed, low, high, grain, bias, pebbles }),
  ]);
}

/**
 * Returns the grains of a fall of debris, each heard by itself.
 *
 * @param {{ count: number, seconds: number, seed: number, low: number, high: number, grain: number, bias: number, pebbles: number }} how
 * @returns {Signal}
 */
function grains({ count, seconds, seed, low, high, grain, bias, pebbles }) {
  return scatter({
    count,
    seconds,
    seed,
    bias,
    grain: (i, random, share) => {
      const length = grain * between(random, 0.5, 1.8);
      const center = between(random, low, high) * (1 - 0.35 * share);
      const level = between(random, 0.35, 1);
      if (random() < pebbles) {
        return gain(
          modes(
            [
              { freq: center * 0.6, decay: length * 2.2 },
              {
                freq: center * 0.6 * between(random, 1.4, 1.75),
                decay: length * 1.4,
                gain: 0.5,
                phase: random(),
              },
            ],
            length * 2.6,
          ),
          level * 0.7,
        );
      }
      return gain(
        filter(
          noise("white", length, seed + 101 * i + 7),
          "bp",
          center,
          between(random, 1.2, 4),
        ),
        gain(perc(0.0005, length, length), level),
      );
    },
    level: (share) => 0.15 + 0.85 * (1 - share) ** 1.3,
  });
}

/**
 * Returns slivers: small glassy pings, each a few partials that die in a
 * blink, scattered and thinning out, as shards of ice or crystal tinkle
 * against each other.
 *
 * @param {{ count: number, seconds: number, seed: number, low: number, high: number, ring?: number, bias?: number }} how
 *   How many pings over how long, the band their lowest partials lie in,
 *   in Hz, the seconds one rings, and how early most of them fall.
 * @returns {Signal}
 */
export function slivers({
  count,
  seconds,
  seed,
  low,
  high,
  ring = 0.04,
  bias = 1.6,
}) {
  return scatter({
    count,
    seconds,
    seed,
    bias,
    grain: (_i, random) => {
      const freq = between(random, low, high);
      const decay = ring * between(random, 0.5, 1.5);
      return gain(
        modes(
          [
            { freq, decay },
            {
              freq: freq * between(random, 1.35, 1.6),
              decay: decay * 0.6,
              gain: 0.5,
              phase: random(),
            },
            {
              freq: freq * between(random, 2.1, 2.9),
              decay: decay * 0.35,
              gain: 0.3,
              phase: random(),
            },
          ],
          decay * 1.2,
        ),
        between(random, 0.35, 1),
      );
    },
    level: (share) => 1 - 0.75 * share,
  });
}

/**
 * Returns a crackle: specks of bright noise a millisecond or two long,
 * scattered, as embers spit or a hot thing sizzles.
 *
 * @param {{ count: number, seconds: number, seed: number, low?: number, high?: number, bias?: number, fade?: number }} how
 *   How many specks over how long, the band each one's floor is drawn
 *   from, in Hz, how early most of them fall, and how much fainter the last
 *   are than the first.
 * @returns {Signal}
 */
export function crackle({
  count,
  seconds,
  seed,
  low = 2500,
  high = 8000,
  bias = 1.5,
  fade = 0.8,
}) {
  return scatter({
    count,
    seconds,
    seed,
    bias,
    grain: (i, random) => {
      const length = between(random, 0.0006, 0.0025);
      return gain(
        filter(
          noise("white", length + 0.0005, seed + 53 * i + 11),
          "hp",
          between(random, low, high),
          0.9,
        ),
        gain(perc(0.0001, length, length + 0.0005), between(random, 0.3, 1)),
      );
    },
    level: (share) => 1 - fade * share,
  });
}

/**
 * How the partials of a struck lump of iron lie over its lowest: none a
 * whole multiple of another, so they disagree, which is what a clank is.
 */
export const IRON = [1, 1.44, 2.07, 2.76, 3.48, 4.31, 5.4, 6.83];

/**
 * Returns a clank: a lump of iron struck once. A rough burst of bent tone
 * and a tick of air are the strike, a very short, loud hit; under it the
 * lump's partials ring on, the low ones longest, two pairs of them close
 * enough to beat.
 *
 * @param {{ freq: number, ring: number, seed: number, lump?: number, weights?: readonly number[], ratios?: readonly number[], strike?: number }} how
 *   Its lowest partial, in Hz, the seconds that one rings, the seed of the
 *   strike, the seed of the lump's own tuning (the strike's unless given,
 *   so one lump can be struck many ways), how loud each partial rings for
 *   this strike, how the partials lie, and how loud the strike is against
 *   the ring.
 * @returns {Signal}
 */
export function clank({
  freq,
  ring,
  seed,
  lump = seed,
  weights = [],
  ratios = IRON,
  strike = 0.7,
}) {
  const tuning = seeded(lump);
  const random = seeded(seed + 3);
  const rung = modes(
    ratios.flatMap((ratio, k) => {
      const partial = {
        freq: freq * ratio * near(tuning, 0.012),
        decay: (ring * near(random, 0.15)) / (1 + 0.42 * k),
        gain: ((weights[k] ?? 1) * near(random, 0.3)) / (1 + 0.25 * k),
        phase: random(),
        bend: 8,
      };
      return k === 1 || k === 3
        ? [
            partial,
            {
              ...partial,
              freq: partial.freq * 1.007,
              gain: partial.gain * 0.6,
              phase: random(),
            },
          ]
        : [partial];
    }),
    ring * 1.2,
  );
  const length = 0.035;
  const rough = gain(
    filter(
      fm(freq * 2.76, 1.414, gain(perc(0.0001, 0.03, length), 7), length, {
        feedback: 0.4,
      }),
      "bp",
      Math.min(6500, freq * 3.2),
      0.8,
    ),
    perc(0.0003, 0.03, length),
  );
  const tick = gain(
    filter(noise("white", 0.006, seed + 5), "hp", 4500, 0.707),
    perc(0.0002, 0.005, 0.006),
  );
  return mix([
    unit(rung),
    { x: unit(rough), gain: strike },
    { x: tick, gain: strike * 0.8 },
  ]);
}

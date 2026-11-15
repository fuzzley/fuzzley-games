// The instrument of struck materials: what a thing struck, cracked or
// shattered is heard to do, each a layer with one job. A crack says when, a
// knock or a clank says what and how big, and what falls after says what it
// broke into.

import {
  type Mode,
  type Signal,
  drive,
  fade,
  filter,
  fm,
  gain,
  glide,
  mix,
  modes,
  noise,
  osc,
  perc,
  scatter,
  seeded,
  unit,
} from "./synth_signal.ts";

/**
 * Returns a number near 1, off by up to a share of it either way: a take's
 * own pitch, or its own decay.
 */
export function near(random: () => number, share: number): number {
  return 1 + (random() * 2 - 1) * share;
}

/** Returns a number between two, drawn evenly by ratio, as pitches and times spread. */
export function between(
  random: () => number,
  low: number,
  high: number,
): number {
  return low * (high / low) ** random();
}

/** Describes a crack. */
export interface CrackHow {
  readonly seed: number;
  /** How many snaps, 2 unless given. */
  readonly snaps?: number;
  /** The seconds the snaps run over. */
  readonly over?: number;
  /** The lowest of the band their noise lies in, in Hz. */
  readonly low?: number;
  /** The highest of that band, in Hz. */
  readonly high?: number;
  /** A snap's length, in seconds. */
  readonly snap?: number;
}

/**
 * Returns a crack: snaps of bright noise a few milliseconds apart, as a
 * fracture runs, the first the loudest. Each reaches up into the air, which
 * is what says the break is near.
 */
export function crack({
  seed,
  snaps = 2,
  over = 0.006,
  low = 2500,
  high = 9000,
  snap = 0.0035,
}: CrackHow): Signal {
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
export const LUMP: readonly number[] = [1, 1.47, 1.93, 2.58, 3.37];

/**
 * A large lump's modes: the same, and more of them, since a phone hears a
 * large thing only by the modes that lie above 300 Hz.
 */
export const MASS: readonly number[] = [...LUMP, 4.2, 5.3, 6.6];

/** Describes a knock. */
export interface KnockHow {
  /** Its lowest mode, in Hz, which says how big the lump is. */
  readonly freq: number;
  /** The seconds it rings. */
  readonly decay: number;
  readonly seed: number;
  /** How its modes lie over the lowest, {@link LUMP}'s unless given. */
  readonly ratios?: readonly number[];
  /** How fast its modes grow fainter and shorter up the list: near 0 for a large thing, whose upper modes carry it. */
  readonly tilt?: number;
  /** The cents its modes fall as they ring. */
  readonly bend?: number;
  /** How much of it is thud. */
  readonly dull?: number;
  /** How hard it is driven. */
  readonly hard?: number;
}

/**
 * Returns a knock: the few low modes of a solid lump, struck once and dying
 * fast, over a thud of dull noise, driven so it has an edge.
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
}: KnockHow): Signal {
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

/** Describes a thump. */
export interface ThumpHow {
  /** The pitch it falls from, in Hz. */
  readonly from: number;
  /** The pitch it falls to, in Hz. */
  readonly to: number;
  /** The seconds it falls over. */
  readonly over: number;
  /** The seconds it takes to die. */
  readonly decay: number;
  /** How hard it is driven. */
  readonly hard?: number;
}

/**
 * Returns a thump: a low tone falling in pitch, with its octave over it,
 * driven until it speaks two and three times higher, where a phone's
 * speaker can still be heard saying how heavy the thing was.
 */
export function thump({ from, to, over, decay, hard = 3 }: ThumpHow): Signal {
  const seconds = decay * 1.1;
  const low = glide(from, to, over, seconds, 1.6);
  const tone = mix([
    osc("sine", low, seconds),
    { x: osc("tri", gain(low, 2), seconds), gain: 0.35 },
  ]);
  return drive(gain(tone, perc(0.003, decay, seconds)), hard);
}

/** Describes grit. */
export interface GritHow {
  /** The seconds it takes to die. */
  readonly seconds: number;
  readonly seed: number;
  /** The lowest of the band it lies in, in Hz. */
  readonly low: number;
  /** The highest of that band, in Hz. */
  readonly high: number;
  /** How long a lump of it lasts, in seconds. */
  readonly lump?: number;
}

/**
 * Returns grit: a band of noise that comes in lumps, as a crowd of grains
 * too many to count grinds and slides, dying away and falling in pitch as
 * it settles. It is what joins a crumble's separate grains into one fall.
 */
export function grit({
  seconds,
  seed,
  low,
  high,
  lump = 0.012,
}: GritHow): Signal {
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

/** Describes debris. */
export interface RubbleHow {
  /** How many grains. */
  readonly count: number;
  /** The time they fall over. */
  readonly seconds: number;
  readonly seed: number;
  /** The lowest of the band they lie in, in Hz. */
  readonly low: number;
  /** The highest of that band, in Hz. */
  readonly high: number;
  /** A grain's length, in seconds. */
  readonly grain?: number;
  /** How early most of them fall, as {@link scatter}'s bias. */
  readonly bias?: number;
  /** The share of them that knock rather than hiss. */
  readonly pebbles?: number;
  /** How loud the grit under them is. */
  readonly bed?: number;
}

/**
 * Returns debris: grains of noise and pebbles' small knocks, scattered and
 * thinning out, lower as they settle, over the grit of all the grains too
 * small to hear one by one.
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
}: RubbleHow): Signal {
  return mix([
    { x: grit({ seconds, seed, low, high, lump: grain }), gain: bed },
    grains({ count, seconds, seed, low, high, grain, bias, pebbles }),
  ]);
}

/** Returns the grains of a fall of debris, each heard by itself. */
function grains({
  count,
  seconds,
  seed,
  low,
  high,
  grain,
  bias,
  pebbles,
}: Required<Omit<RubbleHow, "bed">>): Signal {
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

/** Describes slivers. */
export interface SliversHow {
  /** How many pings. */
  readonly count: number;
  /** The time they fall over. */
  readonly seconds: number;
  readonly seed: number;
  /** The lowest of the band their lowest partials lie in, in Hz. */
  readonly low: number;
  /** The highest of that band, in Hz. */
  readonly high: number;
  /** The seconds one rings. */
  readonly ring?: number;
  /** How early most of them fall, as {@link scatter}'s bias. */
  readonly bias?: number;
}

/**
 * Returns slivers: small glassy pings, each a few partials that die in a
 * blink, scattered and thinning out, as shards of ice or crystal tinkle
 * against each other.
 */
export function slivers({
  count,
  seconds,
  seed,
  low,
  high,
  ring = 0.04,
  bias = 1.6,
}: SliversHow): Signal {
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

/** Describes a crackle. */
export interface CrackleHow {
  /** How many specks. */
  readonly count: number;
  /** The time they fall over. */
  readonly seconds: number;
  readonly seed: number;
  /** The lowest of the band each one's floor is drawn from, in Hz. */
  readonly low?: number;
  /** The highest of that band, in Hz. */
  readonly high?: number;
  /** How early most of them fall, as {@link scatter}'s bias. */
  readonly bias?: number;
  /** How much fainter the last are than the first, from 0 to 1. */
  readonly fade?: number;
}

/**
 * Returns a crackle: specks of bright noise a millisecond or two long,
 * scattered, as embers spit or a hot thing sizzles.
 */
export function crackle({
  count,
  seconds,
  seed,
  low = 2500,
  high = 8000,
  bias = 1.5,
  fade: fading = 0.8,
}: CrackleHow): Signal {
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
    level: (share) => 1 - fading * share,
  });
}

/**
 * How the partials of a struck lump of iron lie over its lowest: none a
 * whole multiple of another, so they disagree, which is what a clank is.
 */
export const IRON: readonly number[] = [
  1, 1.44, 2.07, 2.76, 3.48, 4.31, 5.4, 6.83,
];

/** Describes a clank. */
export interface ClankHow {
  /** Its lowest partial, in Hz. */
  readonly freq: number;
  /** The seconds that partial rings. */
  readonly ring: number;
  /** The seed of the strike. */
  readonly seed: number;
  /** The seed of the lump's own tuning, the strike's unless given, so one lump can be struck many ways. */
  readonly lump?: number;
  /** How loud each partial rings for this strike, 1 for each not given. */
  readonly weights?: readonly number[];
  /** How the partials lie, {@link IRON}'s unless given. */
  readonly ratios?: readonly number[];
  /** How loud the strike is against the ring. */
  readonly strike?: number;
}

/**
 * Returns a clank: a lump of iron struck once. A rough burst of bent tone
 * and a tick of air are the strike, a very short, loud hit; under it the
 * lump's partials ring on, the low ones longest, two pairs of them close
 * enough to beat.
 */
export function clank({
  freq,
  ring,
  seed,
  lump = seed,
  weights = [],
  ratios = IRON,
  strike = 0.7,
}: ClankHow): Signal {
  const tuning = seeded(lump);
  const random = seeded(seed + 3);
  const rung = modes(
    ratios.flatMap((ratio, k): Mode[] => {
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

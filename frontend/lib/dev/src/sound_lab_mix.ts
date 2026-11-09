// What the sound lab works out of samples and of each play: how loud a
// sound is, so a candidate is heard as loud as the sound it would replace, a
// loop's seam, and how a play is varied and placed across the field.

/** The stretch a sound's loudness is measured over, in seconds: about as long as the ear sums a short sound over. */
const LOUDNESS_WINDOW_S = 0.05;

/** How far apart the stretches measured start, in seconds. */
const LOUDNESS_HOP_S = 0.01;

/** How far a varied play is raised or lowered at most, in cents. */
export const VARY_CENTS = 60;

/** How much louder or quieter a varied play is at most, in decibels. */
export const VARY_DECIBELS = 1.5;

/** How far to one side a sound at the field's edge is panned, from 0 to 1. */
export const PAN_WIDTH = 0.7;

/** Describes how a play is varied. */
export interface Variation {
  /** How far it is raised, in cents, below 0 for lowered. */
  readonly detune: number;
  /** What its loudness is multiplied by. */
  readonly gain: number;
}

/**
 * Returns how loud samples are: the RMS of their loudest stretch of 50 ms,
 * or of them all where they are shorter, which tells a short, sharp sound
 * from a long, quiet one as the ear does, where the RMS of the whole would
 * count the tail's silence against it.
 */
export function loudnessOf(samples: Float32Array, sampleRate: number): number {
  const window = Math.max(1, Math.round(LOUDNESS_WINDOW_S * sampleRate));
  const hop = Math.max(1, Math.round(LOUDNESS_HOP_S * sampleRate));
  let loudest = 0;
  for (let from = 0; from === 0 || from + window <= samples.length;) {
    const to = Math.min(from + window, samples.length);
    let sum = 0;
    for (let i = from; i < to; i++) sum += (samples[i] ?? 0) ** 2;
    loudest = Math.max(loudest, Math.sqrt(sum / Math.max(to - from, 1)));
    from += hop;
  }
  return loudest;
}

/** Returns what to multiply a sound by to make it as loud as another, or 1 where it is silent. */
export function gainToMatch(loudness: number, target: number): number {
  return loudness > 0 ? target / loudness : 1;
}

/** Returns a gain in decibels. */
export function decibelsOf(gain: number): number {
  return 20 * Math.log10(gain);
}

/**
 * Returns samples that loop without a seam: the last `fadeSeconds` of them
 * faded into their first, at an even loudness, and cut off, so the loop's
 * end runs on into its start. It throws where the fade is longer than half
 * of them, which would fade the start into itself.
 */
export function seamless(
  samples: Float32Array,
  sampleRate: number,
  fadeSeconds: number,
): Float32Array<ArrayBuffer> {
  const fade = Math.round(fadeSeconds * sampleRate);
  if (fade * 2 > samples.length) {
    throw new RangeError("A loop's fade must be at most half its length.");
  }
  const loop = samples.slice(0, samples.length - fade);
  for (let i = 0; i < fade; i++) {
    // Equal-power weights, as the start and the tail are unrelated.
    const into = ((i / fade) * Math.PI) / 2;
    loop[i] =
      Math.sin(into) * (samples[i] ?? 0) +
      Math.cos(into) * (samples[samples.length - fade + i] ?? 0);
  }
  return loop;
}

/**
 * Returns how a play is varied, from two numbers from 0 up to 1 that
 * `random` draws: raised or lowered by up to {@link VARY_CENTS}, and up to
 * {@link VARY_DECIBELS} louder or quieter, so a sound heard many times a
 * second never repeats itself exactly.
 */
export function variedPlay(random: () => number): Variation {
  const detune = (random() * 2 - 1) * VARY_CENTS;
  const decibels = (random() * 2 - 1) * VARY_DECIBELS;
  return { detune, gain: 10 ** (decibels / 20) };
}

/** Returns the pan of a sound played at a place across the field, from -1 at its left edge to 1 at its right. */
export function panOf(x: number): number {
  return Math.min(Math.max(x, -1), 1) * PAN_WIDTH;
}

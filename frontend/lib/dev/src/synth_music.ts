// The one key every pitched sound is in, so that a shot, a chime, a voice
// and the bed under them never clash, and a chain of breaks climbs a scale
// instead of a siren.
//
// The key is C major pentatonic, which is A minor pentatonic too: the notes
// C, D, E, G and A. No two of them are a semitone apart, so any of them
// sound well together, in any order, however many play at once. Rewards
// lean on C, E and G (bright); danger and loss lean on A, C and E (dark).

import { hz } from "./synth_signal.ts";

/** The scale's steps above C, in semitones. */
export const PENTATONIC: readonly number[] = [0, 2, 4, 7, 9];

/** MIDI's number for the C of each octave a game's sounds use. */
export const OCTAVE_C = { 2: 36, 3: 48, 4: 60, 5: 72, 6: 84, 7: 96 } as const;

/** An octave a game's sounds use, by its number, 5 being C5's. */
export type Octave = keyof typeof OCTAVE_C;

/** The semitones of each note's letter above C. */
const LETTERS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as const;

/**
 * Returns how many semitones a step of the scale lies above step 0, or
 * throws for a step that isn't whole, which the scale has none of.
 */
function semitonesOf(step: number): number {
  if (!Number.isInteger(step)) {
    throw new RangeError(`The scale has no step ${String(step)}.`);
  }
  const turn = Math.floor(step / PENTATONIC.length);
  return 12 * turn + PENTATONIC[step - turn * PENTATONIC.length]!;
}

/**
 * Returns the pitch of a step of the scale, in Hz: step 0 is the C of an
 * octave, step 5 the C above it, and so on up; negative steps go down. It
 * throws for a step that isn't whole.
 */
export function degree(step: number, octave: Octave = 5): number {
  return hz(OCTAVE_C[octave] + semitonesOf(step));
}

/** Returns the MIDI note of a name such as "C5", "A3" or "G#4", or throws for one that names none. */
export function note(name: string): number {
  const match = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!match) throw new RangeError(`"${name}" names no note.`);
  const letter = match[1] as keyof typeof LETTERS;
  const shift = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  return 12 * (Number(match[3]) + 1) + LETTERS[letter] + shift;
}

/** Returns a named note's pitch, in Hz. */
export function pitch(name: string): number {
  return hz(note(name));
}

/**
 * The chain's ladder: the scale step the ping under a break plays for each
 * break of a chain, from the first. It climbs four notes, lands on the next
 * octave's C as the multiplier steps up at the fifth and the tenth break,
 * then circles in the top octave rather than climbing out of hearing, and
 * rings a fifth above at the twentieth. A game plays one ping, recorded at
 * step 0 (C5), raised by `CHAIN_CENTS[count - 1]`.
 */
export const CHAIN_STEPS: readonly number[] = [
  // x1: C5 D5 E5 G5
  0, 1, 2, 3,
  // x2 from the fifth: C6, then D6 E6 G6 A6
  5, 6, 7, 8, 9,
  // x3 from the tenth: C7, then a turn about it
  10, 11, 12, 13, 12, 11, 12, 13, 12, 11,
  // x4 from the twentieth: G7, and it holds between C7 and G7 after
  13,
];

/** Returns how far a step of the scale lies above step 0, in cents, or throws for a step that isn't whole. */
export function centsOf(step: number): number {
  return semitonesOf(step) * 100;
}

/** The ladder in cents above the ping as recorded, for a game's detune. */
export const CHAIN_CENTS: readonly number[] = CHAIN_STEPS.map(centsOf);

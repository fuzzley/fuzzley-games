// The one key every pitched sound of the game is in, so that a shot, a
// chime, a voice and the bed under them never clash, and a chain of breaks
// climbs a scale instead of a siren.
//
// The key is C major pentatonic, which is A minor pentatonic too: the notes
// C, D, E, G and A. No two of them are a semitone apart, so any of them
// sound well together, in any order, however many play at once. Rewards
// lean on C, E and G (bright); danger and loss lean on A, C and E (dark).

import { hz } from "./synth.mjs";

/** The scale's steps above C, in semitones. */
export const PENTATONIC = [0, 2, 4, 7, 9];

/** MIDI's number for the C of each octave the game uses. */
export const C = { 2: 36, 3: 48, 4: 60, 5: 72, 6: 84, 7: 96 };

/**
 * Returns the pitch of a step of the scale, in Hz: step 0 is the C of an
 * octave, step 5 the C above it, and so on up; negative steps go down.
 *
 * @param {number} step
 * @param {keyof typeof C} [octave]
 * @returns {number}
 */
export function degree(step, octave = 5) {
  const turn = Math.floor(step / PENTATONIC.length);
  const within = step - turn * PENTATONIC.length;
  return hz(C[octave] + 12 * turn + (PENTATONIC[within] ?? 0));
}

/**
 * Returns the MIDI note of a name such as "C5", "A3" or "G#4".
 *
 * @param {string} name
 * @returns {number}
 */
export function note(name) {
  const match = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!match) throw new RangeError(`"${name}" names no note.`);
  const steps = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const letter = /** @type {keyof typeof steps} */ (match[1]);
  const shift = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  return 12 * (Number(match[3]) + 1) + steps[letter] + shift;
}

/**
 * Returns a named note's pitch, in Hz.
 *
 * @param {string} name
 * @returns {number}
 */
export function pitch(name) {
  return hz(note(name));
}

/**
 * The chain's ladder: the scale step the ping under a break plays for each
 * break of a chain, from the first. It climbs four notes, lands on the next
 * octave's C as the multiplier steps up at the fifth and the tenth break,
 * then circles in the top octave rather than climbing out of hearing, and
 * rings a fifth above at the twentieth. The game plays one ping, recorded
 * at step 0 (C5), raised by `CHAIN_CENTS[count - 1]`.
 */
export const CHAIN_STEPS = [
  // x1: C5 D5 E5 G5
  0, 1, 2, 3,
  // x2 from the fifth: C6, then D6 E6 G6 A6
  5, 6, 7, 8, 9,
  // x3 from the tenth: C7, then a turn about it
  10, 11, 12, 13, 12, 11, 12, 13, 12, 11,
  // x4 from the twentieth: G7, and it holds between C7 and G7 after
  13,
];

/**
 * Returns how far a step of the scale lies above step 0, in cents.
 *
 * @param {number} step
 * @returns {number}
 */
export function centsOf(step) {
  const turn = Math.floor(step / PENTATONIC.length);
  return (12 * turn + (PENTATONIC[step - turn * PENTATONIC.length] ?? 0)) * 100;
}

/** The ladder in cents above the ping as recorded, for the game's detune. */
export const CHAIN_CENTS = CHAIN_STEPS.map(centsOf);

// How far a note up a ladder rises, in cents, for a play's detune, the
// ladder handed in, such as a chain's or a rally's. It stands apart from
// `sound_mix.ts`, so a view that climbs a ladder brings only this into its
// chunk, not the whole mix.

/**
 * The ladder a chain of breaks climbs, in cents above its first note, for
 * each break from the first: the sound kit's (`@fz/dev/synth`'s
 * `CHAIN_CENTS`), written out, since a game imports nothing of `@fz/dev`.
 * It climbs the key, lands on C at its fifth and tenth notes, then circles
 * in the top octave, and rings a fifth above at its twentieth.
 */
export const CHAIN_CENTS: readonly number[] = [
  0, 200, 400, 700, 1200, 1400, 1600, 1900, 2100, 2400, 2600, 2800, 3100, 2800,
  2600, 2800, 3100, 2800, 2600, 3100,
];

/**
 * Returns how far a note of a ladder, counted from 1, rises, in cents, from
 * the ladder's cents for each note from the first: the first's for a note
 * before it, the last's for one past it, and none on a ladder of no notes.
 */
export function ladderCentsOf(note: number, ladder: readonly number[]): number {
  const step = Math.min(Math.max(note, 1), ladder.length) - 1;
  return ladder[step] ?? 0;
}

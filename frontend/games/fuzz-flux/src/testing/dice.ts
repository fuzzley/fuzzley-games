// The casual player's dice: whole numbers rolled from a seed, the same
// numbers the design's sketch rolls from it, bit for bit, so the casual
// player's games are the sketch's. They set each level's moves, so this is
// held as the rules are (eslint.config.js), to their fence and their exact
// arithmetic.

/** Rolls a die of so many sides, returning the side it lands on, counted from 0. */
export type Dice = (sides: number) => number;

/**
 * Returns dice that roll the same numbers for the same seed: a 32-bit
 * xorshift, the seed taken by its low 32 bits, and 0 taken as 1, since a
 * xorshift from 0 rolls nothing but 0.
 */
export function seededDice(seed: number): Dice {
  let state = seed >>> 0 || 1;
  return (sides) => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state % sides;
  };
}

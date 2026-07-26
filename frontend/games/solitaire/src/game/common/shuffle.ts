/**
 * Shuffles `items` in place using a Fisher-Yates shuffle.
 *
 * @param items The array to shuffle. Mutated.
 * @param random Source of randomness returning a value in [0, 1). Defaults to
 *   Math.random. Injectable so callers (and tests) can supply a deterministic
 *   sequence.
 */
export function shuffle<T>(
  items: T[],
  random: () => number = Math.random,
): void {
  for (let i = items.length - 1; i > 0; i--) {
    const swapIndex = Math.floor(random() * (i + 1));
    [items[i], items[swapIndex]] = [items[swapIndex], items[i]];
  }
}

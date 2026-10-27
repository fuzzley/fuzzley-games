/**
 * Returns numbers from 0 up to 1, the same sequence for the same seed.
 *
 * The sequence never changes: the screenshot scripts' deals and a game saved
 * as only its seed rely on it, and `random.spec.ts` pins its first numbers.
 */
export function createRandom(seed: number): () => number {
  // Mulberry32: small and fast, and plenty for a game's deals.
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns a seed for a new deal. */
export function randomSeed(random: () => number = Math.random): number {
  return Math.floor(random() * 2 ** 32) | 0;
}

/** Returns a list's items in a random order. */
export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const pool = [...items];
  const result: T[] = [];
  while (pool.length > 0) {
    result.push(...pool.splice(Math.floor(random() * pool.length), 1));
  }
  return result;
}

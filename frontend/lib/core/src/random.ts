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

/**
 * Returns a number from 0 up to 1 for a seed and a count of draws: the first
 * number of `createRandom()` seeded with the two mixed in the `"draw"`
 * stream, so no draw needs those before it.
 *
 * Its numbers never change, since Snake's, Brick Breaker's and Asteroid
 * Breaker's saved games keep only a seed and a count, and `random.spec.ts`
 * pins the first of them.
 */
export function drawAt(seed: number, n: number): number {
  return createRandom(mixSeed(seed, n, "draw"))();
}

/**
 * The multiplier each stream mixes a number into a seed with: odd, so each
 * number mixes a seed of its own in a stream, and its own, so the streams part
 * for any number a game counts to.
 */
const SEED_STREAMS = {
  draw: 0x9e3779b1,
  field: 0x85ebca6b,
  makeup: 0xc2b2ae35,
  scenery: 0x165667b1,
} as const;

/**
 * Names what a seed is mixed for: `"draw"`, the `n`th draw of a game that
 * counts its draws ({@link drawAt}); `"field"`, a level's or a wave's field,
 * from its run's seed and its number; `"makeup"`, what a wave made from a
 * seed holds, apart from its field's draws; and `"scenery"`, what is drawn
 * for a level or a wave but never played.
 */
export type SeedStream = keyof typeof SEED_STREAMS;

/**
 * Returns a seed mixed with a number in a stream: a seed of its own for each
 * number, apart from the other streams' for any number a game counts to.
 *
 * Its numbers never change, since Brick Breaker's and Asteroid Breaker's
 * saved games keep a run's seed rather than its level's or its wave's, and
 * Endless's waves are made again from it, and `random.spec.ts` pins the first
 * of each stream's.
 */
export function mixSeed(seed: number, n: number, stream: SeedStream): number {
  return seed ^ Math.imul(n, SEED_STREAMS[stream]);
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

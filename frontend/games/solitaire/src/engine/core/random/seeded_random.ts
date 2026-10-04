/**
 * Returns a stand-in for `Math.random` that yields the same sequence for the
 * same seed.
 *
 * Mulberry32: small, fast, and spread well enough to shuffle a deck.
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns a seed for {@link seededRandom} that depends on every part given. */
export function seedFrom(parts: readonly string[]): number {
  // FNV-1a, with a separator so ["ab", "c"] and ["a", "bc"] seed differently.
  let hash = 0x811c9dc5;
  for (const part of parts) {
    for (let index = 0; index < part.length; index++) {
      hash = Math.imul(hash ^ part.charCodeAt(index), 0x01000193);
    }
    hash = Math.imul(hash ^ 0x1f, 0x01000193);
  }
  return hash >>> 0;
}

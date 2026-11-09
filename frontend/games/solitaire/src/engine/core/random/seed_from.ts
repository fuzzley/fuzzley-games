/**
 * Returns a seed that depends on every part given, for `@fz/core/random`'s
 * `createRandom()`.
 *
 * Its numbers never change: Montana draws a kept game's gaps again from a
 * seed of its order on each restart.
 */
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

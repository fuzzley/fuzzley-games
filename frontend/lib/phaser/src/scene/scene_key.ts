/** How many keys each prefix has been given, by prefix, for the page's life. */
const given = new Map<string, number>();

/**
 * Returns a key no other scene of the page shares: the prefix, then how many
 * keys it has been given, from 1, as `"snake-scene-3"`.
 *
 * A host swaps a new scene into its game before the last has gone, and
 * Phaser throws on a key in use.
 */
export function uniqueSceneKey(prefix: string): string {
  const count = (given.get(prefix) ?? 0) + 1;
  given.set(prefix, count);
  return `${prefix}-${String(count)}`;
}

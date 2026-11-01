/**
 * Returns a record's keys, typed as its own.
 *
 * `Object.keys()` types them as strings, since an object may hold keys its
 * type doesn't name; so this is for a record that holds only the keys its
 * type names, as a catalog written as a literal does.
 */
export function keysOf<K extends string>(
  record: Readonly<Record<K, unknown>>,
): readonly K[] {
  return Object.keys(record) as K[];
}

/** Returns a record with an entry for each key, made from the key, in the keys' order. */
export function recordOf<K extends string, V>(
  keys: readonly K[],
  make: (key: K) => V,
): Record<K, V> {
  const entries = keys.map((key) => [key, make(key)] as const);
  // Object.fromEntries() types its keys as strings; these are the keys given.
  return Object.fromEntries(entries) as Record<K, V>;
}

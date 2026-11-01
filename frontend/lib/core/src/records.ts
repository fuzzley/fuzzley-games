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

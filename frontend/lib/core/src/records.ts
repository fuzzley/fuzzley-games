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

/**
 * Returns whether a value is a key of a record's own, as an id read from
 * storage or a data file must be one its catalog has.
 */
export function isKeyOf<K extends string>(
  value: unknown,
  record: Readonly<Record<K, unknown>>,
): value is K {
  return typeof value === "string" && Object.hasOwn(record, value);
}

/**
 * Returns whether a value is one of those given, as a choice read from
 * storage must be one on offer.
 */
export function isOneOf<T>(value: unknown, options: readonly T[]): value is T {
  return options.some((option) => option === value);
}

/** Returns a copy of a record's entries under the keys given. */
export function pick<T, K extends keyof T & string>(
  record: T,
  keys: readonly K[],
): Pick<T, K> {
  const entries = keys.map((key) => [key, record[key]] as const);
  // Object.fromEntries() types its keys as strings; these are the keys given.
  return Object.fromEntries(entries) as Pick<T, K>;
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

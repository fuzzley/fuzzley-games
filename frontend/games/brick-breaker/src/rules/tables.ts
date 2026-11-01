/** Returns a copy of a record's entries under the keys given. */
export function pick<T, K extends keyof T & string>(
  record: T,
  keys: readonly K[],
): Pick<T, K> {
  const entries = keys.map((key) => [key, record[key]] as const);
  // Object.fromEntries() types its keys as strings; these are the keys given.
  return Object.fromEntries(entries) as Pick<T, K>;
}

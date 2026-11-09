/** Returns whether a value read from JSON is an object, and not a list. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Returns whether a value read from JSON is a whole number. */
export function isWhole(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

/**
 * Returns whether a value read from JSON is a count: a whole number not
 * below nothing, and small enough that adding one to it still counts.
 */
export function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/**
 * Returns whether a value read from JSON is a number JSON can hold: neither
 * infinite nor not a number.
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Returns the items of a list read from JSON, each as it reads, or null for
 * a value that isn't a list or holds an item that doesn't read, which
 * `read` says by returning null.
 */
export function listOf<T>(
  value: unknown,
  read: (item: unknown) => T | null,
): T[] | null {
  if (!Array.isArray(value)) return null;
  const stored: readonly unknown[] = value;
  const items: T[] = [];
  for (const each of stored) {
    const item = read(each);
    if (item === null) return null;
    items.push(item);
  }
  return items;
}

/**
 * Returns whether a value read from JSON is a list whose every item passes
 * a check, for a list kept as it is rather than read into another.
 */
export function isListOf<T>(
  value: unknown,
  isItem: (item: unknown) => item is T,
): value is T[] {
  // The check is handed each item alone, not every()'s index and list too.
  return Array.isArray(value) && value.every((item: unknown) => isItem(item));
}

/**
 * Returns a value read from JSON if it is a yes or a no, else a fallback,
 * as a setting stored before it was offered takes its default.
 */
export function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * Returns the first key of a value read from JSON that the known keys lack,
 * or null, so a key a typo misspells isn't left unread.
 *
 * Type the known keys as `Readonly<Record<keyof Data, true>>`, for the type
 * of the data, so a key the type gains fails to compile until it is known.
 */
export function unknownKey(
  value: object,
  known: Readonly<Record<string, true>>,
): string | null {
  return Object.keys(value).find((key) => !Object.hasOwn(known, key)) ?? null;
}

/**
 * Returns the known ids a list read from JSON holds, or none for a value
 * that isn't a list.
 */
export function knownIdsOf(
  value: unknown,
  known: ReadonlySet<string>,
): ReadonlySet<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(
    value.filter(
      (id: unknown): id is string => typeof id === "string" && known.has(id),
    ),
  );
}

/** Holds counts by id, each id's under some of the keys `K`, as a game's bests at each speed for each of its levels. */
export type CountsById<K extends string> = Readonly<
  Record<string, Readonly<Partial<Record<K, number>>>>
>;

/**
 * Returns the counts a record read from JSON holds for each id given, under
 * the keys given, leaving out an id with none, as a game's bests at each
 * speed for each of its levels.
 */
export function countsByIdOf<K extends string>(
  value: unknown,
  ids: readonly string[],
  keys: readonly K[],
): CountsById<K> {
  const stored = isRecord(value) ? value : {};
  return Object.fromEntries(
    ids.flatMap((id) => {
      const counts = countsOf(stored[id], keys);
      return counts ? [[id, counts]] : [];
    }),
  );
}

/**
 * Returns the counts with an id's count under a key raised to a value
 * higher than the one kept, as a best is beaten, or the same counts, not a
 * copy, for a value no higher.
 */
export function withHigherCount<K extends string>(
  counts: CountsById<K>,
  id: string,
  key: K,
  value: number,
): CountsById<K> {
  const kept = counts[id];
  if (value <= (kept?.[key] ?? -Infinity)) return counts;
  const raised: Partial<Record<K, number>> = { ...kept };
  raised[key] = value;
  return { ...counts, [id]: raised };
}

/**
 * Returns the counts a record read from JSON holds under the keys given,
 * each that is a count, or null for a value that isn't a record or holds
 * none.
 */
function countsOf<K extends string>(
  value: unknown,
  keys: readonly K[],
): Partial<Record<K, number>> | null {
  if (!isRecord(value)) return null;
  const counts: Partial<Record<K, number>> = {};
  for (const key of keys) {
    const count = value[key];
    if (isCount(count)) counts[key] = count;
  }
  return Object.keys(counts).length > 0 ? counts : null;
}

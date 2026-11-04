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

/**
 * Returns the counts a record read from JSON holds for each id given, under
 * the keys given, leaving out an id with none, as a game's bests at each
 * speed for each of its levels.
 */
export function countsByIdOf<K extends string>(
  value: unknown,
  ids: readonly string[],
  keys: readonly K[],
): Readonly<Record<string, Readonly<Partial<Record<K, number>>>>> {
  const stored = isRecord(value) ? value : {};
  return Object.fromEntries(
    ids.flatMap((id) => {
      const counts = countsOf(stored[id], keys);
      return counts ? [[id, counts]] : [];
    }),
  );
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

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

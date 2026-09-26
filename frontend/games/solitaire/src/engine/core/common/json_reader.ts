/**
 * Reads values from outside the program, such as parsed JSON, throwing an error
 * that names any bad value by its path.
 */

/** Reads one value, found at `path`, as a `T`. */
export type Reader<T> = (value: unknown, path: string) => T;

function fail(path: string, expected: string): never {
  throw new Error(`${path} is not ${expected}.`);
}

/** Reads an object, leaving its fields for the caller to read one by one. */
export function readObject(
  value: unknown,
  path: string,
): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(path, "an object");
  }
  return value as Readonly<Record<string, unknown>>;
}

/** Reads an object used as a map, reading every value with `readValue`. */
export function readRecord<T>(
  value: unknown,
  path: string,
  readValue: Reader<T>,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(readObject(value, path)).map(([key, item]) => [
      key,
      readValue(item, `${path}.${key}`),
    ]),
  );
}

/** Reads a list, reading every item with `readItem`. */
export function readList<T>(
  value: unknown,
  path: string,
  readItem: Reader<T>,
): T[] {
  if (!Array.isArray(value)) fail(path, "a list");
  return value.map((item: unknown, index) =>
    readItem(item, `${path}[${index}]`),
  );
}

/** Reads a string. */
export function readString(value: unknown, path: string): string {
  if (typeof value !== "string") fail(path, "text");
  return value;
}

/** Reads true or false. */
export function readBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") fail(path, "true or false");
  return value;
}

/** Reads a finite number. */
export function readNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(path, "a number");
  }
  return value;
}

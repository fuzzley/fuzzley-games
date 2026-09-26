/**
 * Readers for values from outside the program, such as parsed JSON. Each
 * returns the value typed, or throws an error naming it by its path.
 */

/** Reads one value, found at `path`, as a `T`. */
export type Reader<T> = (value: unknown, path: string) => T;

function fail(path: string, expected: string): never {
  throw new Error(`${path} is not ${expected}.`);
}

/** An object, whose fields the caller reads one by one. */
export function readObject(
  value: unknown,
  path: string,
): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(path, "an object");
  }
  return value as Readonly<Record<string, unknown>>;
}

/** An object used as a map, with every value read by `readValue`. */
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

/** A list, with every item read by `readItem`. */
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

/** A string. */
export function readString(value: unknown, path: string): string {
  if (typeof value !== "string") fail(path, "text");
  return value;
}

/** True or false. */
export function readBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") fail(path, "true or false");
  return value;
}

/** A finite number. */
export function readNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(path, "a number");
  }
  return value;
}

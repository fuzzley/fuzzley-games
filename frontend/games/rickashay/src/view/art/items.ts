// Lists the art's frames are found in by a place, such as a kind's layers
// by a brick's tint.

/**
 * Returns the item at a place in a list.
 *
 * @throws {RangeError} for a place the list hasn't.
 */
export function itemAt<T>(items: readonly T[], at: number): T {
  const item = items[at];
  if (item === undefined) {
    throw new RangeError(`Nothing at ${String(at)}`);
  }
  return item;
}

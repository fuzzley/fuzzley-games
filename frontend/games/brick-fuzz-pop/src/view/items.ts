/**
 * Returns the item at a place in a list made once, such as a tile's frame
 * by its tint, so finding it makes nothing.
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

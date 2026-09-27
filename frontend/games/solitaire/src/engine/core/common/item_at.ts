/**
 * Returns the item at an index the caller knows is in range, throwing rather
 * than handing back undefined if it is not.
 *
 * For a position a loop or a deal guarantees, where a missing item would be a
 * bug to report rather than a case to handle.
 */
export function itemAt<T>(items: readonly T[], index: number): T {
  if (!Number.isInteger(index) || index < 0 || index >= items.length) {
    throw new RangeError(`No item at ${index} in a list of ${items.length}.`);
  }
  return items[index] as T;
}

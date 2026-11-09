import { itemAt } from "@/engine/core/common/item_at";

/**
 * Shuffles `items` in place with a Fisher-Yates shuffle and returns the array.
 *
 * Its order for a given source never changes, since Montana draws a kept
 * game's gaps again with it on each restart; `@fz/core/random`'s `shuffled()`
 * gives another.
 *
 * @param random Returns a number in [0, 1), like `Math.random`.
 */
export function shuffle<T>(
  items: T[],
  random: () => number = Math.random,
): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const swapIndex = Math.floor(random() * (i + 1));
    [items[i], items[swapIndex]] = [itemAt(items, swapIndex), itemAt(items, i)];
  }
  return items;
}

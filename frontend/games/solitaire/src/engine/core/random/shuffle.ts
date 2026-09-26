/**
 * Shuffles `items` in place with a Fisher-Yates shuffle and returns the array.
 *
 * @param random Returns a number in [0, 1), like `Math.random`.
 */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const swapIndex = Math.floor(random() * (i + 1));
    [items[i], items[swapIndex]] = [items[swapIndex], items[i]];
  }
  return items;
}

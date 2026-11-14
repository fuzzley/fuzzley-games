import type { MultiplierTier } from "./math";

/** Returns a count with its noun, such as "1 hint" or "2 hints". */
export function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Writes points as a player reads them, with a comma in the thousands: "4,250". */
export function formatPoints(points: number): string {
  return points.toLocaleString("en-US");
}

/**
 * Returns words as a list, as a sentence says one: "a, b and c", the last
 * two joined by "and", one word as it is and none as nothing.
 */
export function listed(words: readonly string[]): string {
  const last = words.at(-1) ?? "";
  return words.length > 1
    ? `${words.slice(0, -1).join(", ")} and ${last}`
    : last;
}

/**
 * Returns a ladder of multipliers in words, from the least, as How to play
 * says it: "×2 from 5 bricks, ×3 from 10 bricks".
 *
 * @param tiers The ladder, listed from the highest, as `multiplierAt()`
 *   reads it.
 * @param noun What the count counts, in the plural, as each tier starts
 *   past one.
 */
export function tierWords(
  tiers: readonly MultiplierTier[],
  noun: string,
): string {
  return [...tiers]
    .reverse()
    .map(({ from, times }) => `×${String(times)} from ${String(from)} ${noun}`)
    .join(", ");
}

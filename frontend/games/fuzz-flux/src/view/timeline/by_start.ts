// A list of what a move plays put in the order it starts, as the timeline
// keeps each of its lists.

/** Returns a list in the order its items start, those that start together in the order given. */
export function byStart<T extends { readonly atMs: number }>(
  items: readonly T[],
): readonly T[] {
  return [...items].sort((a, b) => a.atMs - b.atMs);
}

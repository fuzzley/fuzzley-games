// A wall game's par for each of its levels on each depth, set from the
// rounds of the level's certificate there: the game's certifying script
// writes the table, as JSON, and its rules read a level's par from it.

/** Holds each level's par, by the level's id, then by the depth of the field it began on, as a game's table of them keeps it. */
export type Pars = Readonly<Record<string, Readonly<Record<string, number>>>>;

/**
 * Returns par on a depth from the rounds of the level's certificate there,
 * times a game's share, rounded up: a share of 1.5 sets par at half as many
 * rounds again.
 */
export function parFrom(certified: number, share: number): number {
  return Math.ceil(certified * share);
}

/**
 * Returns a level's par on a field of a depth, by the level's id, from a
 * game's table of them, or throws for a level or a depth the table doesn't
 * hold: a game holds each of its levels to having one on every depth.
 */
export function parOf(id: string, depth: number, pars: Pars): number {
  const found = pars[id]?.[String(depth)];
  if (found === undefined) {
    throw new RangeError(
      `Level "${id}" has no par on a field ${String(depth)} deep.`,
    );
  }
  return found;
}

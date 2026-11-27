// A game's levels, numbered from its sets and found by their number, and
// how far a player has come through them: the levels they have cleared,
// kept by id, which open the levels a run may start at. Which levels the
// game has, and in what order, is the game's own.

import { knownIdsOf } from "./json";

/** Describes a level as a game's progress and its records know it: by the id its data gives it for good. */
export interface IdentifiedLevel {
  readonly data: { readonly id: string };
}

/**
 * Returns a game's level by its number, from 1, or throws for a number the
 * game has no level of.
 */
export function levelAt<L>(levels: readonly L[], level: number): L {
  const entry = levels[level - 1];
  if (entry === undefined) {
    throw new RangeError(
      `There is no level ${String(level)}: the levels run from 1 to ${String(levels.length)}.`,
    );
  }
  return entry;
}

/** Returns the id of a game's level by its number, from 1, or throws for a number the game has no level of. */
export function levelIdOf(
  levels: readonly IdentifiedLevel[],
  level: number,
): string {
  return levelAt(levels, level).data.id;
}

/** Describes a set of a game's levels, so far as its list numbers them: its levels, in the order played. */
export interface LevelSet<D> {
  readonly levels: readonly D[];
}

/** Describes a level in a game's list: its place in the game, from 1, its set, and its data. */
export interface NumberedLevel<S, D> {
  readonly number: number;
  readonly set: S;
  readonly data: D;
}

/** Returns the levels of a game's sets, in the order played, numbered from 1. */
export function levelsOf<S extends LevelSet<unknown>>(
  sets: readonly S[],
): NumberedLevel<S, S["levels"][number]>[] {
  return sets
    .flatMap((set) => set.levels.map((data) => ({ set, data })))
    .map((entry, index) => ({ ...entry, number: index + 1 }));
}

/**
 * Returns whether a run may start at a level, by its number: the first, any
 * level cleared, and the level after one cleared.
 */
export function isOpen(
  levels: readonly IdentifiedLevel[],
  cleared: ReadonlySet<string>,
  level: number,
): boolean {
  if (level === 1) return true;
  const entry = levels[level - 1];
  const before = levels[level - 2];
  if (entry === undefined || before === undefined) return false;
  return cleared.has(entry.data.id) || cleared.has(before.data.id);
}

/** Returns the ids of the levels cleared, as stored, keeping only those of a level the game still has. */
export function clearedOf(
  value: unknown,
  levels: readonly IdentifiedLevel[],
): ReadonlySet<string> {
  return knownIdsOf(value, new Set(levels.map(({ data: { id } }) => id)));
}

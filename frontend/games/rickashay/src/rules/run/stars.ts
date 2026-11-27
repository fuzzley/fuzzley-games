// A level's stars (C11): three flags, each kept once earned in any game that
// clears the level. One for clearing it; one for clearing it within par,
// the rounds of its certificate on the depth it began on and half as many
// again, rounded up; and one for a flight at its rally mark for that depth,
// the middle one of the careless player's best rallies there. Each level's
// par and rally mark on each depth are kept in its set's
// `marks/<set>.json`, which the scripts that certify the levels write and
// the game hands in; Brick Fuzz Pop's tiers against par are its own.

import type { Pars } from "@fz/brick-wall/rules/par";
import type { LevelPlay } from "@fz/brick-wall/rules/run";
import { type IdentifiedLevel, levelIdOf } from "@fz/core/levels";
import type { LevelTally } from "./scoring";

/** Every star a level earns, by its id, in the order the Cleared card names them: cleared, within par, and the rally mark. */
export const STARS = [
  "cleared",
  "par",
  "mark",
] as const satisfies readonly string[];

/** A star's id, such as "mark". */
export type Star = (typeof STARS)[number];

/** Holds which of a level's stars are earned. */
export type StarFlags = Readonly<Record<Star, boolean>>;

/** The most stars a level earns. */
export const MOST_STARS = STARS.length;

/**
 * Holds each level's par and rally mark on each depth, as a set's
 * `marks/<set>.json` keeps them: two tables, each by the level's id and
 * then by the depth of the field it began on.
 */
export interface Marks {
  /** Each level's par, the most rounds in which clearing it earns its star for par. */
  readonly par: Pars;
  /** Each level's rally mark, the rally a flight earns its star at. */
  readonly rally: Pars;
}

/** Returns the marks of every level of several sets, from each set's. */
export function marksOf(sets: readonly Marks[]): Marks {
  return {
    par: Object.fromEntries(sets.flatMap(({ par }) => Object.entries(par))),
    rally: Object.fromEntries(
      sets.flatMap(({ rally }) => Object.entries(rally)),
    ),
  };
}

/**
 * Returns a level's rally mark on a field of a depth, by the level's id, or
 * throws for a level or a depth the marks don't hold: the game holds each of
 * its levels to having one on every depth.
 */
export function rallyMarkOf(
  id: string,
  depth: number,
  marks: Pick<Marks, "rally">,
): number {
  const found = marks.rally[id]?.[String(depth)];
  if (found === undefined) {
    throw new RangeError(
      `Level "${id}" has no rally mark on a field ${String(depth)} deep.`,
    );
  }
  return found;
}

/** Describes a level cleared as its stars are worked out: its rounds against its par, and its best rally against its rally mark. */
export interface ClearedPlay {
  readonly rounds: number;
  readonly par: number;
  /** The best rally of its flights. */
  readonly rally: number;
  /** Its rally mark on the depth it began on. */
  readonly mark: number;
}

/**
 * Returns the stars a level cleared earns: the star for clearing it; the
 * star for par, in as many rounds as its par or fewer; and the rally mark's,
 * with a flight whose rally reached it.
 */
export function starsFor({ rounds, par, rally, mark }: ClearedPlay): StarFlags {
  return { cleared: true, par: rounds <= par, mark: rally >= mark };
}

/**
 * Returns the stars the level in play earns as it is cleared, as the run
 * has played it: its rounds against its par, and the best rally of its
 * flights against its rally mark on the depth it began on, which its par
 * is set for too. It throws for a level the marks hold no rally mark of on
 * that depth.
 */
export function starsEarned(
  play: LevelPlay<LevelTally>,
  levels: readonly IdentifiedLevel[],
  marks: Pick<Marks, "rally">,
): StarFlags {
  const id = levelIdOf(levels, play.level);
  return starsFor({
    rounds: play.rounds,
    par: play.par,
    rally: play.tally.bestRally,
    mark: rallyMarkOf(id, play.depth, marks),
  });
}

/** Returns how many stars are earned. */
export function starCount(stars: StarFlags): number {
  return STARS.filter((star) => stars[star]).length;
}

/**
 * Returns the stars a level's record keeps once another game has cleared
 * it: each that either earned, or the stars kept themselves, not a copy,
 * where the game earned none they lack.
 */
export function withStarsEarned(kept: StarFlags, earned: StarFlags): StarFlags {
  if (STARS.every((star) => kept[star] || !earned[star])) return kept;
  const either = (star: Star): boolean => kept[star] || earned[star];
  return {
    cleared: either("cleared"),
    par: either("par"),
    mark: either("mark"),
  };
}

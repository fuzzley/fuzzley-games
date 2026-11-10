import par from "../levels/par.json";
import { PAR_SHARE, TWO_STARS_PAST_PAR } from "../tuning";
import type { Run } from "./run";

/** How many stars a cleared level earns: one for clearing it, two near its par, three within it. */
export type Stars = 1 | 2 | 3;

/** The most stars a level earns. */
export const MOST_STARS = 3 satisfies Stars;

/** Holds each level's par, by the level's id, then by the depth of the field it began on. */
export type Pars = Readonly<Record<string, Readonly<Record<string, number>>>>;

/**
 * Each level's par on each depth, from `src/rules/levels/par.json`, which
 * the levels' certificates set.
 */
export const PARS: Pars = par;

/**
 * Returns par on a depth from the rounds of the level's certificate there:
 * half as many rounds again, rounded up.
 */
export function parFrom(certified: number): number {
  return Math.ceil(certified * PAR_SHARE);
}

/**
 * Returns a level's par on a field of a depth, by the level's id, or throws
 * for a level or a depth the pars don't hold: `stars.spec.ts` holds every
 * level of the game to having one on every depth.
 */
export function parOf(id: string, depth: number, pars: Pars = PARS): number {
  const found = pars[id]?.[String(depth)];
  if (found === undefined) {
    throw new RangeError(
      `Level "${id}" has no par on a field ${String(depth)} deep.`,
    );
  }
  return found;
}

/** Returns the stars a level cleared in so many rounds earns against its par. */
export function starsFor(rounds: number, par: number): Stars {
  if (rounds <= par) return MOST_STARS;
  return rounds <= par + TWO_STARS_PAST_PAR ? 2 : 1;
}

/** Returns the stars the level in play has earned: none until it is cleared. */
export function starsOf(
  run: Pick<Run, "outcome" | "rounds" | "par">,
): Stars | 0 {
  const cleared = run.outcome === "cleared" || run.outcome === "won";
  return cleared ? starsFor(run.rounds, run.par) : 0;
}

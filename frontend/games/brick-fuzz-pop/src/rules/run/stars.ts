import type { Pars } from "@fz/brick-wall/rules/par";
import { isLevelCleared } from "@fz/brick-wall/rules/run";
import par from "../levels/par.json";
import { TWO_STARS_PAST_PAR } from "../tuning";
import type { Run } from "./run";

/** How many stars a cleared level earns: one for clearing it, two near its par, three within it. */
export type Stars = 1 | 2 | 3;

/** The most stars a level earns. */
export const MOST_STARS = 3 satisfies Stars;

/**
 * Each level's par on each depth, from `src/rules/levels/par.json`, which
 * the levels' certificates set: `stars.spec.ts` holds every level of the
 * game to having one on every depth.
 */
export const PARS: Pars = par;

/** Returns the stars a level cleared in so many rounds earns against its par. */
export function starsFor(rounds: number, par: number): Stars {
  if (rounds <= par) return MOST_STARS;
  return rounds <= par + TWO_STARS_PAST_PAR ? 2 : 1;
}

/** Returns the stars the level in play has earned: none until it is cleared. */
export function starsOf(
  run: Pick<Run, "outcome" | "rounds" | "par">,
): Stars | 0 {
  return isLevelCleared(run) ? starsFor(run.rounds, run.par) : 0;
}

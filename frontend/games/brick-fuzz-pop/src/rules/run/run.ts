import { levelAt } from "@fz/brick-wall/rules/progress";
import type { Run as WallRun, RunRules } from "@fz/brick-wall/rules/run";
import {
  type Level,
  type LevelEntry,
  levelStart,
  parseLevel,
} from "../levels/levels";
import type { RoundOutcome, RoundStart } from "../round/round";
import { STAR_POINTS } from "../tuning";
import { PARS, starsFor } from "./stars";

/** Describes what the game tallies of the level in play's rounds. */
export interface LevelCounts {
  /** How many of them jumped the wall. */
  readonly jumps: number;
}

/**
 * Describes a run of the game, `@fz/brick-wall/rules/run`'s over what it
 * tallies of a level. Where the level in play's next round starts is the
 * round's own, `RoundStart`, which the run leaves to the view.
 */
export type Run = WallRun<LevelCounts>;

/** What a run takes from a round played. */
export type RoundTaken = Pick<RoundOutcome, "points" | "jumped" | "result">;

/**
 * What the game's run is handed: the levels' pars, a level's jumps counted,
 * and a level cleared earning its stars by tiers against its par, each
 * worth its points.
 */
export const RUN_RULES: RunRules<LevelCounts, RoundTaken> = {
  pars: PARS,
  untallied: { jumps: 0 },
  tallied: ({ jumps }, { jumped }) => ({ jumps: jumps + (jumped ? 1 : 0) }),
  starsOf: ({ rounds, par }) => starsFor(rounds, par),
  starPoints: STAR_POINTS,
};

/** Returns the level in play, ready to play. */
export function levelOf(
  run: Pick<Run, "level">,
  levels: readonly LevelEntry[],
): Level {
  return parseLevel(levelAt(levels, run.level).data);
}

/**
 * Returns where the level in play's first round starts: the level laid out
 * on the depth it began on, which its par is set for and the saved game
 * reads its wall against, so lay a level out with this alone.
 */
export function openingOf(run: Pick<Run, "depth">, level: Level): RoundStart {
  return levelStart(level, run.depth);
}

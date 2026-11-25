// Rickashay's run, @fz/brick-wall/rules/run's over what it tallies of a
// level's rounds: a level's par from its set's marks, its rounds' jumps,
// floor bounces and best rally tallied, and a level cleared earning its
// three stars, each worth STAR_POINTS. Where the level in play's next round
// starts is the round's own, RoundStart, which the run leaves to the shell.

import { levelOpening } from "@fz/brick-wall/rules/level_picture";
import { type IdentifiedLevel, levelAt } from "@fz/brick-wall/rules/progress";
import {
  type RunRules,
  type Run as WallRun,
  isLevelCleared,
} from "@fz/brick-wall/rules/run";
import type { RoundOutcome, RoundStart } from "../flight/events";
import { type Level, type LevelEntry, parseLevel } from "../levels/levels";
import { STAR_POINTS } from "../tuning";
import {
  type LevelTally,
  type RoundCounts,
  UNTALLIED,
  tallied,
} from "./scoring";
import { type Marks, type StarFlags, starCount, starsEarned } from "./stars";

/** Describes a run of the game, `@fz/brick-wall/rules/run`'s over what it tallies of a level's rounds. */
export type Run = WallRun<LevelTally>;

/** Describes what the run takes in of a round as it is released: its points, how it leaves its level, and what its tally counts. */
export type RoundTaken = Pick<RoundOutcome, "points" | "result"> & RoundCounts;

/**
 * Returns what the game's run is handed: each level's par from the marks,
 * a level's rounds tallied, and a level cleared earning its stars against
 * its par and its rally mark, each worth `STAR_POINTS`.
 */
export function runRulesOf(
  levels: readonly IdentifiedLevel[],
  marks: Marks,
): RunRules<LevelTally, RoundTaken> {
  return {
    pars: marks.par,
    untallied: UNTALLIED,
    tallied,
    starsOf: (play) => starCount(starsEarned(play, levels, marks)),
    starPoints: STAR_POINTS,
  };
}

/** Returns the stars the level in play has earned, or null until it is cleared. */
export function starsOf(
  run: Run,
  levels: readonly IdentifiedLevel[],
  marks: Pick<Marks, "rally">,
): StarFlags | null {
  return isLevelCleared(run) ? starsEarned(run, levels, marks) : null;
}

/** Returns the level in play, ready to play. */
export function levelOf(
  run: Pick<Run, "level">,
  levels: readonly LevelEntry[],
): Level {
  return parseLevel(levelAt(levels, run.level).data);
}

/**
 * Returns where a level's first round starts on a field of a depth: its
 * wall's lowest row where a jump would land it, the fuzzball waiting at the
 * floor's middle, and a plain shot.
 *
 * It throws for a depth no field has, as `levelOpening()` does.
 */
export function levelStart(level: Level, depth: number): RoundStart {
  return { ...levelOpening(level, depth), depth, hot: false };
}

/**
 * Returns where the level in play's first round starts: the level laid out
 * on the depth it began on, which its par is set for and the saved game
 * reads its wall against, so lay a level out with this alone.
 */
export function openingOf(run: Pick<Run, "depth">, level: Level): RoundStart {
  return levelStart(level, run.depth);
}

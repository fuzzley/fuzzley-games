// The run under way as the game's saved game keeps it, between rounds, and
// read back: @fz/brick-wall/rules/saved_wall's frame, the level's tally
// beside its rounds, and where the level's next round starts, which is the
// level's wall as play has left it, the field's depth, where the fuzzball
// waits and whether the shot is hot. A round is kept as it is released,
// the run having taken its outcome in, and the frame keeps the run as it
// stands once the round lands, so a page reloaded mid-flight comes back
// after it.

import { COLUMNS, SIDE_MARGIN } from "@fz/brick-wall/rules/field";
import {
  type Kept,
  type KeptWall,
  type RunKeeping,
  type SavedRun,
  type TakenUp as WallTakenUp,
  hasDepth,
  keptWallOf,
  readWall,
  restoreRun,
  saveRun,
} from "@fz/brick-wall/rules/saved_wall";
import { isCount, isFiniteNumber, isRecord } from "@fz/core/json";
import { WALL_RULES } from "../bricks/wall_rules";
import type { RoundStart } from "../flight/events";
import type { Level, LevelEntry } from "../levels/levels";
import { BOUNCE_POINTS, JUMP_POINTS } from "../tuning";
import { type Run, levelOf, openingOf, runRulesOf } from "./run";
import { type LevelTally, rallyPoints } from "./scoring";
import { MOST_STARS, type Marks } from "./stars";

/**
 * The version of `SavedGame`, which the shell keeps a run under; the
 * shell's reader drops any other.
 *
 * A key added to it later is read as optional, with a default, so a game
 * kept before it still comes back; only a change to a key it keeps now
 * takes a new version.
 */
export const SAVED_GAME_VERSION = 1;

/** Where a round starts as storage keeps it: what play has changed of its level's wall, and the rest of the round's start. */
export interface SavedStart extends KeptWall {
  /** The field's depth as the round was kept, which the room may change. */
  readonly depth: number;
  /** Where the fuzzball waits on the floor. */
  readonly x: number;
  /** Whether the shot is a hot shot, which the round before's jump earned. */
  readonly hot: boolean;
}

/** A run under way as storage keeps it, between rounds: `@fz/brick-wall/rules/saved_wall`'s, the level's tally beside its rounds. */
export type SavedGame = SavedRun<LevelTally, SavedStart>;

/** A run storage kept, taken up: the run, paused, where its next round starts, and how it was played. */
export type TakenUp = WallTakenUp<LevelTally, RoundStart>;

/**
 * Returns a run under way and where its level's next round starts as
 * storage keeps them, or null for a run with nothing to keep, as
 * `saveRun()` says: call it with the round in flight's next start while
 * one flies, so the round is kept as it is released.
 */
export function saveGame(
  run: Run,
  next: RoundStart,
  levels: readonly LevelEntry[],
  keeping: RunKeeping,
  marks: Marks,
): SavedGame | null {
  return saveRun(run, next, levels, keeping, {
    ...runRulesOf(levels, marks),
    keptStart: savedStartOf,
  });
}

/**
 * Returns the run storage kept, paused, under a new id, with where its
 * next round starts, its par worked out from the marks, or null if it
 * can't be trusted, as `restoreRun()` says.
 */
export function restoreGame(
  value: unknown,
  levels: readonly LevelEntry[],
  id: number,
  marks: Marks,
): TakenUp | null {
  return restoreRun(value, levels, id, {
    ...runRulesOf(levels, marks),
    mostStars: MOST_STARS,
    readTally,
    openingOf: (run) => openingOf(run, levelOf(run, levels)),
    readStart: (kept, run) => readStart(kept, levelOf(run, levels), run),
  });
}

/** Returns what storage keeps of where a round starts. */
export function savedStartOf({ wall, depth, x, hot }: RoundStart): SavedStart {
  return { ...keptWallOf(wall), depth, x, hot };
}

/**
 * Returns what a run kept tallied of its level, or null if it can't be
 * trusted: a count that isn't one, more jumps than rounds, or fewer points
 * on the level than its best rally, its floor bounces and its jumps
 * scored.
 */
export function readTally(
  value: Kept,
  { rounds, banked, score }: Pick<Run, "rounds" | "banked" | "score">,
): LevelTally | null {
  const { jumps, earned, bestRally } = value;
  if (!isCount(jumps) || !isCount(earned) || !isCount(bestRally)) return null;
  const least =
    rallyPoints(bestRally) + earned * BOUNCE_POINTS + jumps * JUMP_POINTS;
  return jumps <= rounds && score - banked >= least
    ? { jumps, earned, bestRally }
    : null;
}

/**
 * Returns where a round of a run's level starts as storage kept it, or
 * null if it fails a check: its depth, where the fuzzball waits, a hot shot
 * no jump earned, or the wall.
 */
export function readStart(
  value: unknown,
  level: Level,
  run: Pick<Run, "depth" | "rounds" | "tally">,
): RoundStart | null {
  if (
    !isRecord(value) ||
    !hasDepth(value) ||
    !hasSoundPlace(value) ||
    !hasEarnedShot(value, run.tally.jumps)
  ) {
    return null;
  }
  const played = {
    depth: run.depth,
    rounds: run.rounds,
    jumps: run.tally.jumps,
  };
  const wall = readWall(value, level, played, WALL_RULES);
  if (!wall) return null;
  const { depth, x, hot } = value;
  return { wall, depth, x, hot };
}

/** Returns whether a round's start kept has its fuzzball waiting on the floor, no nearer a side wall than it may. */
export function hasSoundPlace(
  value: Kept,
): value is Kept & Pick<SavedStart, "x"> {
  const { x } = value;
  return isFiniteNumber(x) && x >= SIDE_MARGIN && x <= COLUMNS - SIDE_MARGIN;
}

/** Returns whether a round's start kept has a plain shot, or a hot one after a jump of the level, which alone earns one. */
export function hasEarnedShot(
  value: Kept,
  jumps: number,
): value is Kept & Pick<SavedStart, "hot"> {
  const { hot } = value;
  return hot === false || (hot === true && jumps > 0);
}

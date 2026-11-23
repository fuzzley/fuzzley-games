import { COLUMNS, SIDE_MARGIN } from "@fz/brick-wall/rules/field";
import type { Pars } from "@fz/brick-wall/rules/par";
import type { RunRules } from "@fz/brick-wall/rules/run";
import {
  type Kept,
  type KeptWall,
  type RunKeeping,
  type SavedRules,
  type SavedRun,
  type TakenUp as WallTakenUp,
  hasDepth,
  keptWallOf,
  readWall,
  restoreRun,
  saveRun,
} from "@fz/brick-wall/rules/saved_wall";
import { isCount, isFiniteNumber, isListOf, isRecord } from "@fz/core/json";
import type { Level, LevelEntry } from "../levels/levels";
import type { RoundStart } from "../round/round";
import { type Boon, isBoon } from "../shot";
import { FRIEND_INKS, JUMP_POINTS, MOST_FRIENDS } from "../tuning";
import { WALL_RULES } from "../wall/wall";
import {
  type LevelCounts,
  RUN_RULES,
  type RoundTaken,
  type Run,
  levelOf,
  openingOf,
} from "./run";
import { MOST_STARS, PARS } from "./stars";

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
  /** Each friend's ink, in the order they were freed. */
  readonly friends: readonly number[];
  /** The boon the next shot carries, or none. */
  readonly boon: Boon | null;
}

/** A run under way as storage keeps it, between rounds: `@fz/brick-wall/rules/saved_wall`'s, the level's jumps beside its rounds. */
export type SavedGame = SavedRun<LevelCounts, SavedStart>;

/** A run storage kept, taken up: the run, paused, where its next round starts, and how it was played. */
export type TakenUp = WallTakenUp<LevelCounts, RoundStart>;

/** What the saved game is handed of the game, but for where a level's rounds start, which reads its levels. */
const SAVED_RULES: RunRules<LevelCounts, RoundTaken> &
  Omit<
    SavedRules<LevelCounts, SavedStart, RoundStart>,
    "openingOf" | "readStart"
  > = {
  ...RUN_RULES,
  mostStars: MOST_STARS,
  keptStart: savedStartOf,
  readTally: readCounts,
};

/**
 * Returns a run under way and where its level's next round starts as
 * storage keeps them, or null for a run with nothing to keep, as
 * `saveRun()` says: call it with the round in flight's next start while
 * one flies.
 */
export function saveGame(
  run: Run,
  next: RoundStart,
  levels: readonly LevelEntry[],
  keeping: RunKeeping,
): SavedGame | null {
  return saveRun(run, next, levels, keeping, SAVED_RULES);
}

/**
 * Returns the run storage kept, paused, under a new id, with where its
 * next round starts, its par worked out from the pars handed, or null if
 * it can't be trusted, as `restoreRun()` says.
 */
export function restoreGame(
  value: unknown,
  levels: readonly LevelEntry[],
  id: number,
  pars: Pars = PARS,
): TakenUp | null {
  return restoreRun(value, levels, id, {
    ...SAVED_RULES,
    pars,
    openingOf: (run) => openingOf(run, levelOf(run, levels)),
    readStart: (kept, run) => readStart(kept, levelOf(run, levels), run),
  });
}

/** Returns what storage keeps of where a round starts. */
export function savedStartOf({
  wall,
  depth,
  x,
  crew,
  boon,
}: RoundStart): SavedStart {
  return { ...keptWallOf(wall), depth, x, friends: crew.friends, boon };
}

/**
 * Returns the jumps a run kept counted on its level, as what the game
 * tallies of it, or null if they can't be trusted: more than its rounds,
 * or more than its points on the level hold.
 */
export function readCounts(
  value: Kept,
  { rounds, banked, score }: Pick<Run, "rounds" | "banked" | "score">,
): LevelCounts | null {
  const { jumps } = value;
  const sound =
    isCount(jumps) && jumps <= rounds && score - banked >= jumps * JUMP_POINTS;
  return sound ? { jumps } : null;
}

/**
 * Returns where a round of a run's level starts as storage kept it, or
 * null if it fails a check: its depth, where the fuzzball waits, the crew,
 * the boon or the wall.
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
    !hasSoundCrew(value) ||
    !hasEarnedBoon(value, level, run.tally.jumps)
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
  const { depth, x, friends, boon } = value;
  return { wall, depth, x, crew: { friends }, boon };
}

/** Returns whether a round's start kept has its fuzzball waiting on the floor, no nearer a side wall than it may. */
export function hasSoundPlace(
  value: Kept,
): value is Kept & Pick<SavedStart, "x"> {
  const { x } = value;
  return isFiniteNumber(x) && x >= SIDE_MARGIN && x <= COLUMNS - SIDE_MARGIN;
}

/** Returns whether a round's start kept holds a crew of no more friends than one may, each in a friend's ink. */
export function hasSoundCrew(
  value: Kept,
): value is Kept & Pick<SavedStart, "friends"> {
  const { friends } = value;
  return isListOf(friends, isFriendInk) && friends.length <= MOST_FRIENDS;
}

/**
 * Returns whether a round's start kept carries no boon, or its level's,
 * which only a jump of the level's earns.
 */
export function hasEarnedBoon(
  value: Kept,
  level: Pick<Level, "boon">,
  jumps: number,
): value is Kept & Pick<SavedStart, "boon"> {
  const { boon } = value;
  return boon === null || (isBoon(boon) && boon === level.boon && jumps > 0);
}

/** Returns whether a value kept is a friend's ink, from 0. */
function isFriendInk(value: unknown): value is number {
  return isCount(value) && value < FRIEND_INKS;
}

import {
  isCount,
  isFiniteNumber,
  isListOf,
  isRecord,
  isWhole,
} from "@fz/core/json";
import type { Level } from "../levels/level";
import { type LevelEntry, levelEntryOf } from "../levels/levels";
import type { RoundStart } from "../round/round";
import { type Boon, isBoon } from "../shot";
import {
  COLUMNS,
  FRIEND_INKS,
  JUMP_POINTS,
  LEAST_DEPTH,
  MOST_DEPTH,
  MOST_FRIENDS,
  SIDE_MARGIN,
  STAR_POINTS,
} from "../tuning";
import { isCleared } from "../wall/lower";
import { type Brick, type Wall, thirdsOf } from "../wall/wall";
import {
  type Run,
  afterLanding,
  isInProgress,
  levelOf,
  openingOf,
} from "./run";
import { PARS, type Pars, parOf } from "./stars";

/**
 * The version of `SavedGame`, which the shell keeps a run under; the
 * shell's reader drops any other.
 *
 * A key added to it later is read as optional, with a default, so a game
 * kept before it still comes back; only a change to a key it keeps now
 * takes a new version.
 */
export const SAVED_GAME_VERSION = 1;

/** A run under way as storage keeps it, between rounds. */
export interface SavedGame {
  /** The id of the level in play, which must still be the level of its number. */
  readonly levelId: string;
  readonly level: number;
  readonly firstLevel: number;
  /** The depth the level in play began on, which its par is set for. */
  readonly depth: number;
  readonly rounds: number;
  readonly jumps: number;
  readonly banked: number;
  readonly score: number;
  /** Whether the run was played on numbers the debug menu tuned, so it keeps no records. */
  readonly tuned: boolean;
  /**
   * Where the level's next round starts, or null for a level with no round
   * played yet, which is laid out afresh.
   */
  readonly start: SavedStart | null;
}

/** Where a round starts as storage keeps it: what play has changed of its level's wall, and the rest of the round's start. */
export interface SavedStart {
  /** Each brick's hits left, by wall cell: null where the level has none, or it has broken or sunk. */
  readonly hits: readonly (number | null)[];
  /** The field row the wall's lowest row stands in, which says how far it has come down. */
  readonly lowestRow: number;
  /** The field's depth as the round was kept, which the room may change. */
  readonly depth: number;
  /** Where the fuzzball waits on the floor. */
  readonly x: number;
  /** Each friend's ink, in the order they were freed. */
  readonly friends: readonly number[];
  /** The boon the next shot carries, or none. */
  readonly boon: Boon | null;
}

/** What of the run the shell keeps beside it. */
export interface RunKeeping {
  /** Whether the run was played on numbers the debug menu tuned. */
  readonly tuned: boolean;
}

/** A run storage kept, taken up: the run, paused, where its next round starts, and how it was played. */
export interface TakenUp extends RunKeeping {
  readonly run: Run;
  readonly start: RoundStart;
}

/** The checks' view of a value read from storage. */
type Kept = Readonly<Record<string, unknown>>;

/**
 * Returns a run under way and where its level's next round starts as
 * storage keeps them, or null for a run with nothing to keep: one with no
 * round played and no level cleared, or one that has ended.
 *
 * Call it with the round in flight's next start while one flies, so a
 * round is kept as it is released and a page reloaded mid-flight comes back
 * after it: the run is kept as it stands once the round lands
 * (`afterLanding()`). A run whose level is cleared is kept at the start of
 * the next, on the depth the field has, so the page going away over the
 * Cleared card loses nothing; and a level with no round played yet is kept
 * as one to lay out afresh.
 */
export function saveGame(
  run: Run,
  next: RoundStart,
  levels: readonly LevelEntry[],
  { tuned }: RunKeeping,
): SavedGame | null {
  const landed = afterLanding(run);
  if (!isInProgress(landed)) return null;
  if (landed.outcome === "cleared") {
    // The next level as nextLevel() begins it, but for its par, which
    // storage doesn't keep.
    const begun = {
      ...landed,
      level: landed.level + 1,
      depth: next.depth,
      rounds: 0,
      jumps: 0,
      banked: landed.score,
    };
    return savedRun(begun, null, levels, tuned);
  }
  const kept = landed.rounds === 0 ? null : savedStart(next);
  return savedRun(landed, kept, levels, tuned);
}

/**
 * Returns the run storage kept, paused, under a new id, with where its
 * next round starts, or null if it can't be trusted: it fails one of the
 * run's checks or the round start's, or keeps a start for a level with no
 * round played or none for one with rounds.
 */
export function restoreGame(
  value: unknown,
  levels: readonly LevelEntry[],
  id: number,
  pars: Pars = PARS,
): TakenUp | null {
  if (!isRecord(value)) return null;
  const run = readRun(value, levels, id, pars);
  const { tuned, start: kept } = value;
  if (!run || typeof tuned !== "boolean") return null;
  const level = levelOf(run, levels);
  if (kept === null) {
    return run.rounds === 0
      ? { run, start: openingOf(run, level), tuned }
      : null;
  }
  const start = run.rounds === 0 ? null : readStart(kept, level, run);
  return start ? { run, start, tuned } : null;
}

/**
 * Returns the run storage kept, paused, under a new id, or null if it
 * fails a check: its level, its depth, its rounds or its score.
 */
export function readRun(
  value: Kept,
  levels: readonly LevelEntry[],
  id: number,
  pars: Pars = PARS,
): Run | null {
  if (
    !hasKnownLevel(value, levels) ||
    !hasDepth(value) ||
    !hasSoundRounds(value) ||
    !hasSoundScore(value, value.level - value.firstLevel, value)
  ) {
    return null;
  }
  const { levelId, level, firstLevel, depth, rounds, jumps } = value;
  return {
    id,
    lastLevel: levels.length,
    firstLevel,
    level,
    depth,
    par: parOf(levelId, depth, pars),
    rounds,
    jumps,
    banked: value.banked,
    score: value.score,
    ending: null,
    outcome: "paused",
  };
}

/**
 * Returns whether a run kept names a level the game has under its number,
 * by the id the game gives it there, and a first level from the first to
 * it.
 */
export function hasKnownLevel(
  value: Kept,
  levels: readonly LevelEntry[],
): value is Kept & Pick<SavedGame, "levelId" | "level" | "firstLevel"> {
  const { levelId, level, firstLevel } = value;
  return (
    typeof levelId === "string" &&
    isCount(level) &&
    isCount(firstLevel) &&
    firstLevel >= 1 &&
    firstLevel <= level &&
    levels[level - 1]?.data.id === levelId
  );
}

/** Returns whether a value kept holds a depth a field has, a whole number from 11 to 22. */
export function hasDepth(value: Kept): value is Kept & { depth: number } {
  const { depth } = value;
  return isWhole(depth) && depth >= LEAST_DEPTH && depth <= MOST_DEPTH;
}

/** Returns whether a run kept holds the rounds its level has played and no more jumps than them. */
export function hasSoundRounds(
  value: Kept,
): value is Kept & Pick<SavedGame, "rounds" | "jumps"> {
  const { rounds, jumps } = value;
  return isCount(rounds) && isCount(jumps) && jumps <= rounds;
}

/**
 * Returns whether a run kept holds the points of the levels it has
 * cleared, at least a star's for each and none if it has cleared none,
 * and a score past them by at least its level's jumps' points, and by none
 * before its level's first round.
 */
export function hasSoundScore(
  value: Kept,
  cleared: number,
  { rounds, jumps }: Pick<SavedGame, "rounds" | "jumps">,
): value is Kept & Pick<SavedGame, "banked" | "score"> {
  const { banked, score } = value;
  return (
    isCount(banked) &&
    isCount(score) &&
    banked >= cleared * STAR_POINTS &&
    (cleared > 0 || banked === 0) &&
    score - banked >= jumps * JUMP_POINTS &&
    (rounds > 0 || score === banked)
  );
}

/**
 * Returns where a round of a run's level starts as storage kept it, or
 * null if it fails a check: its depth, where the fuzzball waits, the crew,
 * the boon or the wall.
 */
export function readStart(
  value: unknown,
  level: Level,
  run: Pick<Run, "depth" | "rounds" | "jumps">,
): RoundStart | null {
  if (
    !isRecord(value) ||
    !hasDepth(value) ||
    !hasSoundPlace(value) ||
    !hasSoundCrew(value) ||
    !hasEarnedBoon(value, level, run.jumps)
  ) {
    return null;
  }
  const wall = readWall(value, level, run);
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

/**
 * Returns a level's wall as storage kept it, or null if it can't be
 * trusted: a brick where the level has none, hits a brick can't have, a
 * portal without its twin, a wall come down less than the run's rounds
 * bring it from where its level opened on the depth it began on, none
 * left that the level needs, or a brick still standing at the floor,
 * where it sinks or loses the level.
 */
export function readWall(
  value: Kept,
  level: Level,
  run: Pick<Run, "depth" | "rounds" | "jumps">,
): Wall | null {
  const { hits, lowestRow } = value;
  if (
    !Array.isArray(hits) ||
    hits.length !== level.bricks.length ||
    !isWhole(lowestRow) ||
    lowestRow > highestAfter(run)
  ) {
    return null;
  }
  const bricks: (Brick | null)[] = [];
  for (const [cell, placed] of level.bricks.entries()) {
    const kept: unknown = hits[cell];
    if (kept === null) {
      bricks.push(null);
    } else if (placed && isHitsOf(placed, kept)) {
      bricks.push(kept === placed.hits ? placed : { ...placed, hits: kept });
    } else {
      return null;
    }
  }
  const wall = { bricks, rows: level.rows, lowestRow };
  return hasTwins(wall) && !isCleared(wall) && !standsOnFloor(wall)
    ? wall
    : null;
}

/** Returns a run and where its next round starts as storage keeps them, naming its level by its id. */
function savedRun(
  run: Omit<Run, "id" | "lastLevel" | "par" | "ending" | "outcome">,
  start: SavedStart | null,
  levels: readonly LevelEntry[],
  tuned: boolean,
): SavedGame {
  return {
    levelId: levelEntryOf(levels, run.level).data.id,
    level: run.level,
    firstLevel: run.firstLevel,
    depth: run.depth,
    rounds: run.rounds,
    jumps: run.jumps,
    banked: run.banked,
    score: run.score,
    tuned,
    start,
  };
}

/** Returns what storage keeps of where a round starts. */
function savedStart({ wall, depth, x, crew, boon }: RoundStart): SavedStart {
  return {
    hits: wall.bricks.map((brick) => (brick === null ? null : brick.hits)),
    lowestRow: wall.lowestRow,
    depth,
    x,
    friends: crew.friends,
    boon,
  };
}

/**
 * Returns the highest field row a level's wall can stand in after a run's
 * rounds: each brought it down a row from where it opened, at least, and
 * each jump at least the shallowest field's jump.
 */
function highestAfter({
  depth,
  rounds,
  jumps,
}: Pick<Run, "depth" | "rounds" | "jumps">): number {
  const moreForAJump = thirdsOf(LEAST_DEPTH).jump - 1;
  return thirdsOf(depth).opensOn - rounds - jumps * moreForAJump;
}

/** Returns whether a value kept is a friend's ink, from 0. */
function isFriendInk(value: unknown): value is number {
  return isCount(value) && value < FRIEND_INKS;
}

/**
 * Returns whether a value kept is hits a brick of a level can have left:
 * none for a kind that never breaks, else from one to its hits whole.
 */
function isHitsOf(placed: Brick, kept: unknown): kept is number {
  if (!isCount(kept)) return false;
  return placed.full === 0 ? kept === 0 : kept >= 1 && kept <= placed.full;
}

/** Returns whether every portal of a wall has its twin, as a portal sinks with it. */
function hasTwins(wall: Wall): boolean {
  return wall.bricks.every((brick) => {
    const twin = brick?.twin ?? null;
    return twin === null || Boolean(wall.bricks[twin]);
  });
}

/** Returns whether a brick of a wall stands in the floor's row or under it, where none stands between rounds. */
function standsOnFloor(wall: Wall): boolean {
  const reached = Math.max(0, 1 - wall.lowestRow) * COLUMNS;
  return wall.bricks.slice(0, reached).some((brick) => brick !== null);
}

// A wall game's run as its saved game keeps it between rounds, and read
// back: the frame every wall game keeps of a run, around what a game
// tallies of the level in play and where its next round starts, and the
// level's wall as play has left it, read back against the level. What else
// a round's start holds, and how it is read back, is the game's own, in the
// SavedRules it hands in.

import { isCount, isRecord, isWhole } from "@fz/core/json";
import { COLUMNS, LEAST_DEPTH, isDepth } from "./field";
import type { LevelWall } from "./level_picture";
import { parOf } from "./par";
import { type IdentifiedLevel, levelIdOf } from "./progress";
import { type Run, type RunRules, afterLanding, isInProgress } from "./run";
import {
  type Brick,
  type Wall,
  type WallRules,
  isCleared,
  thirdsOf,
} from "./wall";

/** The checks' view of a value read from storage. */
export type Kept = Readonly<Record<string, unknown>>;

/** Describes a level's wall as a saved game keeps it: what play has changed of it. */
export interface KeptWall {
  /** Each brick's hits left, by wall cell: null where the level has none, or it has broken or sunk. */
  readonly hits: readonly (number | null)[];
  /** The field row the wall's lowest row stands in, which says how far it has come down. */
  readonly lowestRow: number;
}

/** Describes what of a run a kept wall is read against: the depth its level began on, its rounds and how many of them jumped the wall. */
export interface WallPlay {
  readonly depth: number;
  readonly rounds: number;
  readonly jumps: number;
}

/**
 * Describes the frame of a run as a wall game's saved game keeps it,
 * between rounds, around where the level's next round starts as the game
 * keeps it, `S`. The game's tally of the level in play is kept beside its
 * rounds, each of its fields as it is, so none may share a name with the
 * frame's, which `KeptTally` holds.
 */
export interface SavedFrame<S> {
  /** The id of the level in play, which must still be the level of its number. */
  readonly levelId: string;
  readonly level: number;
  readonly firstLevel: number;
  /** The depth the level in play began on, which its par is set for. */
  readonly depth: number;
  readonly rounds: number;
  readonly banked: number;
  /**
   * The stars the levels it has cleared earned. A game kept before its run
   * counted them lacks it, and is read as having earned one a level.
   */
  readonly stars: number;
  readonly score: number;
  /** Whether the run keeps no records, as a game's debug menu took it off the record. */
  readonly tuned: boolean;
  /** Where the level's next round starts, or null for a level with no round played yet, which is laid out afresh. */
  readonly start: S | null;
}

/**
 * Describes what a wall game may tally of a level for its saved game to
 * keep it beside the frame: an object with no field named as one of the
 * frame's, which it would overwrite.
 */
export type KeptTally = object & {
  readonly [K in keyof SavedFrame<unknown>]?: never;
};

/** Describes a run as a wall game's saved game keeps it: the frame, with what the game tallies of the level in play, `T`. */
export type SavedRun<T extends KeptTally, S> = SavedFrame<S> & T;

/** What of the run a game's shell keeps beside it. */
export interface RunKeeping {
  /** Whether the run keeps no records, as a game's debug menu took it off the record. */
  readonly tuned: boolean;
}

/** Describes a run a saved game kept, taken up: the run, paused, where its next round starts, `N`, and how it was played. */
export interface TakenUp<T, N> extends RunKeeping {
  readonly run: Run<T>;
  readonly start: N;
}

/**
 * Holds what a wall game's saved game is handed of the game, beside its
 * run's rules: how it keeps where a round starts, `N`, as `S`, and how it
 * reads its own back.
 */
export interface SavedRules<T, S, N> {
  /** The most stars a level earns, which the stars kept are held to. */
  readonly mostStars: number;
  /** Returns what a saved game keeps of where a round starts. */
  readonly keptStart: (start: N) => S;
  /**
   * Returns what the game tallies of the level in play as a run kept it,
   * read back, given the frame's rounds and points read before it, or null
   * where it can't be trusted.
   */
  readonly readTally: (
    value: Kept,
    frame: Pick<Run<T>, "rounds" | "banked" | "score">,
  ) => T | null;
  /** Returns where the level in play's first round starts, for a run kept before it. */
  readonly openingOf: (run: Run<T>) => N;
  /** Returns where the level in play's next round starts as kept, read back, or null where it can't be trusted. */
  readonly readStart: (value: unknown, run: Run<T>) => N | null;
}

/** Returns what a saved game keeps of a level's wall: each brick's hits, and where its lowest row stands. */
export function keptWallOf(
  wall: Pick<Wall<string>, "bricks" | "lowestRow">,
): KeptWall {
  return {
    hits: wall.bricks.map((brick) => (brick === null ? null : brick.hits)),
    lowestRow: wall.lowestRow,
  };
}

/**
 * Returns a level's wall as a saved game kept it, or null if it can't be
 * trusted: a brick where the level has none, hits a brick can't have, a
 * twin without its pair, a wall come down less than the run's rounds bring
 * it from where its level opened on the depth it began on, none left that
 * the level needs, or a brick still standing at the floor, where it sinks
 * or loses the level.
 */
export function readWall<K extends string>(
  value: Kept,
  level: LevelWall<K>,
  played: WallPlay,
  rules: Pick<WallRules<K>, "needed">,
): Wall<K> | null {
  const { hits, lowestRow } = value;
  if (
    !Array.isArray(hits) ||
    hits.length !== level.bricks.length ||
    !isWhole(lowestRow) ||
    lowestRow > highestAfter(played)
  ) {
    return null;
  }
  const kept: readonly unknown[] = hits;
  const bricks: (Brick<K> | null)[] = [];
  for (const [cell, placed] of level.bricks.entries()) {
    const left = kept[cell];
    if (left === null) {
      bricks.push(null);
    } else if (placed !== null && isHitsOf(placed, left)) {
      bricks.push(left === placed.hits ? placed : { ...placed, hits: left });
    } else {
      return null;
    }
  }
  const wall = { bricks, rows: level.rows, lowestRow };
  return hasTwins(wall) && !isCleared(wall, rules) && !standsOnFloor(wall)
    ? wall
    : null;
}

/**
 * Returns a run and where its next round starts as a saved game keeps
 * them, naming its level by its id, the game's tally kept beside its
 * rounds.
 */
export function savedRunOf<T extends KeptTally, S>(
  run: Pick<
    Run<T>,
    | "level"
    | "firstLevel"
    | "depth"
    | "rounds"
    | "tally"
    | "banked"
    | "stars"
    | "score"
  >,
  start: S | null,
  levels: readonly IdentifiedLevel[],
  tuned: boolean,
): SavedRun<T, S> {
  return {
    levelId: levelIdOf(levels, run.level),
    level: run.level,
    firstLevel: run.firstLevel,
    depth: run.depth,
    rounds: run.rounds,
    ...run.tally,
    banked: run.banked,
    stars: run.stars,
    score: run.score,
    tuned,
    start,
  };
}

/**
 * Returns a run under way and where its level's next round starts as a
 * saved game keeps them, or null for a run with nothing to keep: one with
 * no round played and no level cleared, or one that has ended.
 *
 * Call it with the round in flight's next start while one flies, so a
 * round is kept as it is released and a page reloaded mid-flight comes
 * back after it: the run is kept as it stands once the round lands
 * (`afterLanding()`). A run whose level is cleared is kept at the start of
 * the next, on the depth `next` has, so the page going away over a cleared
 * level's card loses nothing; and a level with no round played yet is kept
 * as one to lay out afresh.
 */
export function saveRun<
  T extends KeptTally,
  S,
  N extends { readonly depth: number },
>(
  run: Run<T>,
  next: N,
  levels: readonly IdentifiedLevel[],
  { tuned }: RunKeeping,
  rules: Pick<RunRules<T>, "untallied" | "starsOf" | "starPoints"> &
    Pick<SavedRules<T, S, N>, "keptStart">,
): SavedRun<T, S> | null {
  const landed = afterLanding(run, rules);
  if (!isInProgress(landed)) return null;
  if (landed.outcome === "cleared") {
    // The next level as nextLevel() begins it, but for its par, which a
    // saved game doesn't keep.
    const begun = {
      ...landed,
      level: landed.level + 1,
      depth: next.depth,
      rounds: 0,
      tally: rules.untallied,
      banked: landed.score,
    };
    return savedRunOf<T, S>(begun, null, levels, tuned);
  }
  const kept = landed.rounds === 0 ? null : rules.keptStart(next);
  return savedRunOf(landed, kept, levels, tuned);
}

/**
 * Returns the run a saved game kept, paused, under a new id, with where its
 * next round starts, or null if it can't be trusted: it fails one of the
 * run's checks or the round start's, or keeps a start for a level with no
 * round played or none for one with rounds.
 */
export function restoreRun<T, N>(
  value: unknown,
  levels: readonly IdentifiedLevel[],
  id: number,
  rules: Pick<RunRules<T>, "pars" | "starPoints"> &
    Pick<
      SavedRules<T, unknown, N>,
      "mostStars" | "readTally" | "openingOf" | "readStart"
    >,
): TakenUp<T, N> | null {
  if (!isRecord(value)) return null;
  const run = readSavedRun(value, levels, id, rules);
  const { tuned, start: kept } = value;
  if (run === null || typeof tuned !== "boolean") return null;
  if (kept === null) {
    return run.rounds === 0
      ? { run, start: rules.openingOf(run), tuned }
      : null;
  }
  const start = run.rounds === 0 ? null : rules.readStart(kept, run);
  return start === null ? null : { run, start, tuned };
}

/**
 * Returns the run a saved game kept, paused, under a new id, its par
 * worked out afresh, or null if it fails a check: its level, its depth,
 * its rounds, its stars, its points or the game's tally.
 */
export function readSavedRun<T>(
  value: Kept,
  levels: readonly IdentifiedLevel[],
  id: number,
  rules: Pick<RunRules<T>, "pars" | "starPoints"> &
    Pick<SavedRules<T, unknown, unknown>, "mostStars" | "readTally">,
): Run<T> | null {
  if (!hasKnownLevel(value, levels) || !hasDepth(value)) return null;
  const { levelId, level, firstLevel, depth, rounds } = value;
  if (!isCount(rounds)) return null;
  const stars = readStars(value, level - firstLevel, rules.mostStars);
  if (stars === null || !hasSoundScore(value, stars, rounds, rules)) {
    return null;
  }
  const { banked, score } = value;
  const tally = rules.readTally(value, { rounds, banked, score });
  if (tally === null) return null;
  return {
    id,
    lastLevel: levels.length,
    firstLevel,
    level,
    depth,
    par: parOf(levelId, depth, rules.pars),
    rounds,
    tally,
    banked,
    stars,
    score,
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
  levels: readonly IdentifiedLevel[],
): value is Kept &
  Pick<SavedFrame<unknown>, "levelId" | "level" | "firstLevel"> {
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

/** Returns whether a value kept holds a depth a field has, as `isDepth()` says. */
export function hasDepth(value: Kept): value is Kept & { depth: number } {
  const { depth } = value;
  return isDepth(depth);
}

/**
 * Returns the stars a run kept has earned in the levels it has cleared,
 * from one to the most a level, one a level for a game kept before the run
 * counted them, or null if they can't be trusted.
 */
export function readStars(
  value: Kept,
  cleared: number,
  mostStars: number,
): number | null {
  const { stars } = value;
  if (stars === undefined) return cleared;
  const earned =
    isCount(stars) && stars >= cleared && stars <= cleared * mostStars;
  return earned ? stars : null;
}

/**
 * Returns whether a run kept holds the points of the levels it has
 * cleared, at least its stars' and none if it has earned none, and a score
 * of at least those, past them by none before its level's first round.
 */
export function hasSoundScore(
  value: Kept,
  stars: number,
  rounds: number,
  { starPoints }: Pick<RunRules<unknown>, "starPoints">,
): value is Kept & Pick<SavedFrame<unknown>, "banked" | "score"> {
  const { banked, score } = value;
  return (
    isCount(banked) &&
    isCount(score) &&
    banked >= stars * starPoints &&
    (stars > 0 || banked === 0) &&
    score >= banked &&
    (rounds > 0 || score === banked)
  );
}

/**
 * Returns the highest field row a level's wall can stand in after a run's
 * rounds: each brought it down a row from where it opened, at least, and
 * each jump at least the shallowest field's jump.
 */
function highestAfter({ depth, rounds, jumps }: WallPlay): number {
  const moreForAJump = thirdsOf(LEAST_DEPTH).jump - 1;
  return thirdsOf(depth).opensOn - rounds - jumps * moreForAJump;
}

/**
 * Returns whether a value kept is hits a brick of a level can have left:
 * none for a kind that never breaks, else from one to its hits whole.
 */
function isHitsOf(placed: Brick<string>, kept: unknown): kept is number {
  if (!isCount(kept)) return false;
  return placed.full === 0 ? kept === 0 : kept >= 1 && kept <= placed.full;
}

/** Returns whether every twin of a wall has its pair, as a twin sinks with it. */
function hasTwins(wall: Pick<Wall<string>, "bricks">): boolean {
  return wall.bricks.every((brick) => {
    const twin = brick?.twin ?? null;
    return twin === null || Boolean(wall.bricks[twin]);
  });
}

/** Returns whether a brick of a wall stands in the floor's row or under it, where none stands between rounds. */
function standsOnFloor(
  wall: Pick<Wall<string>, "bricks" | "lowestRow">,
): boolean {
  const reached = Math.max(0, 1 - wall.lowestRow) * COLUMNS;
  return wall.bricks.slice(0, reached).some((brick) => brick !== null);
}

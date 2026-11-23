// Rickashay's records, @fz/brick-wall/rules/stats' over a level's record:
// once a level is cleared, its best points, its fewest rounds, its best
// rally and its stars, each star kept once a game that clears the level
// earns it (C11). The records are kept as each flight lands (C10), by the
// shell, from the run as `afterLanding()` leaves it.

import type { IdentifiedLevel } from "@fz/brick-wall/rules/progress";
import type {
  StatsRules,
  Stats as WallStats,
} from "@fz/brick-wall/rules/stats";
import { isCount, isRecord } from "@fz/core/json";
import type { LevelTally } from "./scoring";
import {
  type Marks,
  type StarFlags,
  starsEarned,
  withStarsEarned,
} from "./stars";

/** Holds a level's record, once it is cleared, each the best of every game that cleared it. */
export interface LevelRecord {
  /** Its most points in a game, its stars' among them. */
  readonly points: number;
  /** Its fewest rounds. */
  readonly rounds: number;
  /** Its best rally, a flight's strikes. */
  readonly rally: number;
  /** Each star any game earned on it. */
  readonly stars: StarFlags;
}

/** Holds the records: the runs, and each level's, `@fz/brick-wall/rules/stats`' over a level's record. */
export type Stats = WallStats<LevelRecord>;

/**
 * Returns what the game's records are handed: a level's record read as
 * stored; a level cleared bringing its points, its rounds, its best rally
 * and the stars it earned against its par and its rally mark; and a result
 * beating a record by more points, fewer rounds, a better rally or a star
 * the record lacks.
 */
export function statsRulesOf(
  levels: readonly IdentifiedLevel[],
  marks: Pick<Marks, "rally">,
): StatsRules<LevelTally, LevelRecord> {
  return {
    readLevel: levelRecordOf,
    resultOf: (cleared) => ({
      points: cleared.points,
      rounds: cleared.rounds,
      rally: cleared.tally.bestRally,
      stars: starsEarned(cleared, levels, marks),
    }),
    merge: mergedRecord,
  };
}

/**
 * Returns a level's record as stored, or null for one no level could keep:
 * a count missing or not one, no rounds, or stars that aren't a flag each
 * or lack the star for clearing. It holds a record to nothing the tuning
 * sets, such as what a rally scores, since a record outlives the numbers it
 * was scored by.
 */
export function levelRecordOf(value: unknown): LevelRecord | null {
  if (!isRecord(value)) return null;
  const { points, rounds, rally } = value;
  const stars = storedStarsOf(value["stars"]);
  if (
    !isCount(points) ||
    !isCount(rounds) ||
    !isCount(rally) ||
    stars === null ||
    rounds < 1
  ) {
    return null;
  }
  return { points, rounds, rally, stars };
}

/**
 * Returns a level's record with what a result beats of it taken from it,
 * or the record itself where it beats none of it.
 */
function mergedRecord(kept: LevelRecord, result: LevelRecord): LevelRecord {
  const stars = withStarsEarned(kept.stars, result.stars);
  if (
    result.points <= kept.points &&
    result.rounds >= kept.rounds &&
    result.rally <= kept.rally &&
    stars === kept.stars
  ) {
    return kept;
  }
  return {
    points: Math.max(kept.points, result.points),
    rounds: Math.min(kept.rounds, result.rounds),
    rally: Math.max(kept.rally, result.rally),
    stars,
  };
}

/** Returns a level's stars as stored, or null where they aren't a flag each with the star for clearing earned. */
function storedStarsOf(value: unknown): StarFlags | null {
  if (!isRecord(value)) return null;
  const { cleared, par, mark } = value;
  if (
    cleared !== true ||
    typeof par !== "boolean" ||
    typeof mark !== "boolean"
  ) {
    return null;
  }
  return { cleared, par, mark };
}

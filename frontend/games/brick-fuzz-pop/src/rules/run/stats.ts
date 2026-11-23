import type {
  Stats as WallStats,
  StatsRules,
} from "@fz/brick-wall/rules/stats";
import { isCount, isRecord } from "@fz/core/json";
import type { LevelCounts } from "./run";
import { MOST_STARS, starsFor } from "./stars";

/** The records kept of each level cleared: its best points, its fewest rounds and its most stars. */
export const LEVEL_RECORDS = ["points", "rounds", "stars"] as const;

/** Names a record kept of a level cleared. */
export type LevelRecord = (typeof LEVEL_RECORDS)[number];

/** Holds a level's records as kept, each a count, any of them missing from a store that lost it. */
export type LevelRecords = Readonly<Partial<Record<LevelRecord, number>>>;

/** What a level cleared brings to its records: its points, its stars' among them, its rounds and its stars. */
export type LevelResult = Readonly<Record<LevelRecord, number>>;

/** Holds the records: the runs, and each level's bests, `@fz/brick-wall/rules/stats`' over a level's. */
export type Stats = WallStats<LevelRecords>;

/**
 * What the game's records are handed: a level's records read as each
 * that is a count, dropping those whose rounds or stars no level clears
 * in or earns; a level's result, with the stars its tiers earn; and a
 * result beating each record by more points, fewer rounds or more stars.
 */
export const STATS_RULES: StatsRules<LevelCounts, LevelRecords, LevelResult> = {
  readLevel: levelRecordsOf,
  resultOf: ({ points, rounds, par }) => ({
    points,
    rounds,
    stars: starsFor(rounds, par),
  }),
  merge: (kept, { points, rounds, stars }) => {
    const beaten: LevelRecords = {
      ...(points > (kept.points ?? -Infinity) ? { points } : {}),
      ...(rounds < (kept.rounds ?? Infinity) ? { rounds } : {}),
      ...(stars > (kept.stars ?? -Infinity) ? { stars } : {}),
    };
    return Object.keys(beaten).length === 0 ? kept : { ...kept, ...beaten };
  },
};

/**
 * Returns a level's records as stored, each that is a count, or null for
 * none, or for records no level could keep: cleared in no round, or with
 * no stars or more than a level earns.
 */
function levelRecordsOf(value: unknown): LevelRecords | null {
  if (!isRecord(value)) return null;
  const records: Partial<Record<LevelRecord, number>> = {};
  for (const key of LEVEL_RECORDS) {
    const count = value[key];
    if (isCount(count)) records[key] = count;
  }
  const { rounds = 1, stars = 1 } = records;
  const sound = rounds >= 1 && stars >= 1 && stars <= MOST_STARS;
  return Object.keys(records).length > 0 && sound ? records : null;
}

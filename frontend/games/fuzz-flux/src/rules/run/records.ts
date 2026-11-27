// A level's record (C4), as the game keeps it: the most stars it has
// earned and the most moves it was cleared with to spare, each from any
// game that clears it, and the place among its deals of the one it begins
// on next, which the first move made on a deal uses up, so Try again, Play
// again and coming back to a level play the next of its deals, and a deal
// no move was made on is played again.

import { type CountsById, countsByIdOf, withHigherCount } from "@fz/core/json";
import { itemAt } from "@fz/core/records";
import type { Level } from "../levels/level";

/** What a level's record counts: the place of the deal it begins on next, its most stars, and its most moves to spare. */
const RECORD_COUNTS = [
  "nextDeal",
  "stars",
  "spare",
] as const satisfies readonly string[];

/** Holds each level's record by its id, a level with none left out, and a count it has none of yet left out of its record. */
export type LevelRecords = CountsById<(typeof RECORD_COUNTS)[number]>;

/** Returns each level's record as storage kept it, of the levels the game has, by their ids, a count that isn't one read as none. */
export function levelRecordsOf(
  saved: unknown,
  ids: readonly string[],
): LevelRecords {
  return countsByIdOf(saved, ids, RECORD_COUNTS);
}

/** Returns the seed of the deal a level begins on next: its first, until a move is made on it. */
export function nextDealOf(records: LevelRecords, level: Level): number {
  return itemAt(level.deals, nextPlaceOf(records, level));
}

/**
 * Returns the records with a level's deal used up, as the first move is
 * made on it, where it is the one the level was to begin on next, so the
 * level begins next on the one after it, its first after its last; or the
 * same records for another deal, as Restart plays again.
 */
export function withDealUsed(
  records: LevelRecords,
  level: Level,
  seed: number,
): LevelRecords {
  const place = nextPlaceOf(records, level);
  if (itemAt(level.deals, place) !== seed) return records;
  const nextDeal = (place + 1) % level.deals.length;
  return { ...records, [level.id]: { ...records[level.id], nextDeal } };
}

/**
 * Returns the records with a level cleared, earning so many stars with so
 * many moves to spare: its most stars and its most moves to spare each
 * raised to the game's, where it beats them.
 */
export function withCleared(
  records: LevelRecords,
  level: Level,
  stars: number,
  spare: number,
): LevelRecords {
  const raised: LevelRecords = withHigherCount(
    records,
    level.id,
    "stars",
    stars,
  );
  return withHigherCount(raised, level.id, "spare", spare);
}

/** Returns the place among a level's deals of the one it begins on next. */
function nextPlaceOf(records: LevelRecords, level: Level): number {
  const place = records[level.id]?.nextDeal ?? 0;
  return place % level.deals.length;
}

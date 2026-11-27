// The special fuzzballs, what a bunch can leave behind, and every blast:
// each special and the frizzball going off alone, and each pair the
// design's "Swapped together" lists.

/**
 * Every special fuzzball, by the fur it wears: a dasher whose streaks run
 * across its row or down its column, a puffer and a wisp.
 *
 * A dasher's way is the board's own frame's, so a quarter turn of the
 * frame makes a dasher across one that runs down, and on the screen it
 * still runs the way it did.
 */
export const SPECIAL_IDS = [
  "dasher-across",
  "dasher-down",
  "puffer",
  "wisp",
] as const satisfies readonly string[];

/** A special fuzzball, such as "dasher-across". */
export type SpecialId = (typeof SPECIAL_IDS)[number];

/** Everything a bunch can leave behind: a special fuzzball, or the frizzball. */
export const MADE_IDS = [
  ...SPECIAL_IDS,
  "frizzball",
] as const satisfies readonly string[];

/** What a bunch leaves behind, such as "puffer". */
export type MadeId = (typeof MADE_IDS)[number];

/**
 * Every blast: whatever a bunch leaves going off alone, then each pair the
 * design's "Swapped together" lists, in its order.
 *
 * A wisp swapped with a dasher or a puffer carries it to its square, so
 * that pair's blast is the flight, and the special it carried goes off
 * there as a blast of its own.
 */
export const BLAST_IDS = [
  ...MADE_IDS,
  "two-dashers",
  "dasher-and-puffer",
  "two-puffers",
  "two-wisps",
  "wisp-and-dasher-across",
  "wisp-and-dasher-down",
  "wisp-and-puffer",
  "frizzball-and-dasher",
  "frizzball-and-puffer",
  "frizzball-and-wisp",
  "two-frizzballs",
] as const satisfies readonly string[];

/** A blast, such as "two-puffers". */
export type BlastId = (typeof BLAST_IDS)[number];

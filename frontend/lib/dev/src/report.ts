// The table a game's report prints of how its autopilot plays each wave or
// level at each speed, as Asteroid Breaker's `report:waves` and Brick
// Breaker's `report:levels` print theirs.

import { type Stop, misread } from "./script.ts";

/** A wave or a level a report plays: its place in the game, from 1, and its name. */
export interface ReportEntry {
  readonly number: number;
  readonly data: { readonly name: string };
}

/** Says which columns a report shows of an entry's plays at one speed. */
export interface ReportColumns<Play> {
  /** The heading of each column. */
  readonly headings: readonly string[];
  /** How wide each column is, its cells right-aligned in it. */
  readonly widths: readonly number[];
  /** Returns the cells of an entry's plays at one speed, a column each. */
  readonly cellsOf: (plays: readonly Play[]) => readonly string[];
}

/** Says what a report plays, and which columns it shows of it. */
export interface ReportTable<
  Entry extends ReportEntry,
  Speed extends string,
  Play,
> extends ReportColumns<Play> {
  /** The entries, in the order played. */
  readonly entries: readonly Entry[];
  /** The speeds, slowest first. */
  readonly speeds: readonly Speed[];
  /**
   * How many seeds of its own each entry is played from at each speed, or
   * none, for its number alone.
   */
  readonly seeds: number | undefined;
  /** Plays an entry at a speed from a seed. */
  readonly play: (entry: Entry, speed: Speed, seed: number) => Play;
}

/** Counts the plays a report marks, and says what it says of them under its table. */
export interface Tally {
  /** How many plays it marked. */
  readonly count: number;
  /**
   * What the report says of them, after their count and "plays", such as
   * "didn't clear their wave in time (-)".
   */
  readonly says: string;
  /** Whether a play it marked fails the report. */
  readonly fails: boolean;
}

/** What lies between the names and each speed's columns. */
const GAP = "   ";

/**
 * How far apart each entry's seeds start with `--seeds`, so no two entries
 * share one.
 */
export const SEED_STRIDE = 1000;

/** The option every report takes, how many seeds each entry is played from. */
export const SEEDS_OPTION = { seeds: { type: "string" } } as const;

/**
 * Prints a report's table, a line at a time, an entry's line as it is
 * played, then, under a blank line, how many plays each tally marked, where
 * it marked any; and returns the code to exit with, 1 where a tally that
 * fails the report marked a play, and 0 otherwise.
 *
 * The names are laid out as wide as the longest, each after its number.
 */
export function printReport<
  Entry extends ReportEntry,
  Speed extends string,
  Play,
>(
  table: ReportTable<Entry, Speed, Play>,
  talliesOf: (plays: readonly Play[]) => readonly Tally[],
  print: (line: string) => void,
): 0 | 1 {
  const nameWidth = Math.max(
    0,
    ...table.entries.map((entry) => nameOf(entry).length),
  );
  const headings = columns(table.headings, table);
  print(
    "".padEnd(nameWidth) +
      GAP +
      table.speeds
        .map((speed) => speed.padEnd(headings.length))
        .join(GAP)
        .trimEnd(),
  );
  print(
    "".padEnd(nameWidth) + GAP + table.speeds.map(() => headings).join(GAP),
  );
  const played: Play[] = [];
  for (const entry of table.entries) {
    const cells = table.speeds.map((speed) => {
      const plays = seedsOf(entry, table.seeds).map((seed) =>
        table.play(entry, speed, seed),
      );
      played.push(...plays);
      return columns(table.cellsOf(plays), table);
    });
    print(nameOf(entry).padEnd(nameWidth) + GAP + cells.join(GAP));
  }
  const marked = talliesOf(played).filter((tally) => tally.count > 0);
  if (marked.length > 0) print("");
  for (const tally of marked) {
    print(`${String(tally.count)} plays ${tally.says}.`);
  }
  return marked.some((tally) => tally.fails) ? 1 : 0;
}

/** Returns an entry's name as a report writes it, after its number. */
function nameOf(entry: ReportEntry): string {
  return `${String(entry.number).padStart(2)} ${entry.data.name}`;
}

/**
 * Returns the seeds an entry is played from: its number alone, or as many
 * as asked of its own, {@link SEED_STRIDE} apart from the next entry's.
 */
function seedsOf(entry: ReportEntry, count: number | undefined): number[] {
  if (count === undefined) return [entry.number];
  return Array.from(
    { length: count },
    (_, i) => entry.number * SEED_STRIDE + i,
  );
}

/** Returns a speed's cells, or their headings, each right-aligned in its column. */
function columns(
  cells: readonly string[],
  { widths }: { readonly widths: readonly number[] },
): string {
  return cells.map((cell, i) => cell.padStart(widths[i] ?? 0)).join(" ");
}

/**
 * Returns how many seeds `--seeds` asks for, none where it isn't given, or,
 * for one that isn't a whole number from 1, what to print and the code to
 * exit with.
 */
export function readSeeds(
  given: string | undefined,
  usage: string,
): number | undefined | Stop {
  if (given === undefined) return undefined;
  const seeds = Number(given);
  if (!Number.isInteger(seeds) || seeds < 1) {
    return misread(
      `--seeds takes a whole number from 1, not "${given}".`,
      usage,
    );
  }
  return seeds;
}

/**
 * Returns a count of steps as the game time it takes, in minutes and
 * seconds, or `-` for none, or an endless count, as of a play that didn't
 * clear what it played.
 */
export function timeOf(steps: number | undefined, stepSeconds: number): string {
  if (steps === undefined || steps === Number.POSITIVE_INFINITY) return "-";
  const seconds = Math.round(steps * stepSeconds);
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Returns the middle of some plays' counts, the higher of the two middles
 * for an even number of them, and the most, or none of either for no plays.
 */
export function middleAndMost(
  counts: readonly number[],
): readonly [number | undefined, number | undefined] {
  const sorted = [...counts].sort((a, b) => a - b);
  return [sorted[Math.floor(sorted.length / 2)], sorted.at(-1)];
}

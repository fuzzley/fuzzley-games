// Rickashay's levels: each set's file in this folder, nine levels a set.
// These files are the levels' source: a level redrawn is edited here, not in
// docs/rickashay/levels/.

import {
  type LevelWall,
  pictureProblem,
  wallFrom,
} from "@fz/brick-wall/rules/level_picture";
import { unknownKey } from "@fz/core/json";
import type { KindId } from "../catalog/kinds";
import angles from "./angles.json";
import { PICTURE_RULES } from "./level_rules";
import tricks from "./tricks.json";
import warmUp from "./warm-up.json";

/** Describes a level, ready to play: its wall as its picture lays it out. */
export type Level = LevelWall<KindId>;

/** Describes a level as its set's file holds it. */
export interface LevelData {
  /** Names it for good: its records are kept by it, so it never changes. */
  readonly id: string;
  /** Names it to the player. */
  readonly name: string;
  /** What its wall is built around, as the design's table of the drafts says it, which the Ready card shows the player. */
  readonly around: string;
  /** A picture of its wall, top row first, nine of the legend's characters a row. */
  readonly bricks: readonly string[];
}

/** Describes a set of levels, as its file holds it. */
export interface LevelSetData {
  readonly id: string;
  readonly name: string;
  readonly levels: readonly LevelData[];
}

/** Describes a level of the game: its data, its set, and its number. */
export interface LevelEntry {
  /** Its place in the game, from 1. */
  readonly number: number;
  readonly set: LevelSetData;
  readonly data: LevelData;
}

/** Every set of levels, in the order they are played. */
export const LEVEL_SETS: readonly LevelSetData[] = [warmUp, angles, tricks];

/** Returns the levels of sets, in the order played, numbered from 1. */
export function levelsOf(sets: readonly LevelSetData[]): LevelEntry[] {
  return sets
    .flatMap((set) => set.levels.map((data) => ({ set, data })))
    .map((entry, index) => ({ ...entry, number: index + 1 }));
}

/** Every level, in the order they are played. */
export const LEVELS: readonly LevelEntry[] = levelsOf(LEVEL_SETS);

/** Returns the level of a number among levels, or throws for a number they have no level of. */
export function levelEntryOf(
  levels: readonly LevelEntry[],
  number: number,
): LevelEntry {
  const entry = levels[number - 1];
  if (entry === undefined) {
    throw new RangeError(
      `There is no level ${String(number)}: the levels run from 1 to ${String(levels.length)}.`,
    );
  }
  return entry;
}

/** The keys a level's data may have, so one a typo misspells isn't left unread. */
const LEVEL_KEYS: Readonly<Record<keyof LevelData, true>> = {
  id: true,
  name: true,
  around: true,
  bricks: true,
};

/**
 * Returns a level ready to play from its data, or throws an error that
 * names the level and what is wrong with it.
 *
 * It holds a level to its keys and to `PICTURE_RULES`, all a wall needs to
 * be laid out. The rest of the rules a level keeps are `levelProblem()`'s,
 * which takes the level's number too.
 */
export function parseLevel(data: LevelData): Level {
  const extra = unknownKey(data, LEVEL_KEYS);
  if (extra !== null) {
    throw wrong(data, `it has a "${extra}", which no level has`);
  }
  const problem = pictureProblem(data.bricks, PICTURE_RULES);
  if (problem !== null) {
    throw wrong(data, problem);
  }
  const { bricks, rows } = wallFrom(data.bricks, PICTURE_RULES.legend);
  return { bricks, rows };
}

/** Returns an error that names what is wrong with a level's data. */
function wrong(data: LevelData, problem: string): Error {
  return new Error(`Level "${data.id}": ${problem}.`);
}

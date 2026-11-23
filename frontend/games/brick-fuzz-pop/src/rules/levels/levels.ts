import { COLUMNS } from "@fz/brick-wall/rules/field";
import { wallRowOf } from "@fz/brick-wall/rules/grid";
import {
  type LevelWall,
  type PictureRules,
  levelOpening,
  pictureProblem,
  wallFrom,
} from "@fz/brick-wall/rules/level_picture";
import { unknownKey } from "@fz/core/json";
import type { BrickKindId } from "../catalog/bricks";
import type { RoundStart } from "../round/round";
import { type Boon, isBoon } from "../shot";
import type { Wall } from "../wall/wall";
import { NO_BRICK, WALL_LEGEND } from "./legend";
import sparks from "./sparks.json";
import thickWalls from "./thick-walls.json";
import tricks from "./tricks.json";
import warmUp from "./warm-up.json";

/** Describes a level, ready to play: its wall as its picture lays it out, and its boon. */
export interface Level extends LevelWall<BrickKindId> {
  /** The boon each jump of its wall earns the next shot. */
  readonly boon: Boon;
}

/**
 * Returns where a level's first round starts on a field of a depth: its
 * wall's lowest row where a jump would land it, the fuzzball waiting at the
 * floor's middle, with no friend freed and no boon.
 *
 * It throws for a depth no field has, as `levelOpening()` does.
 */
export function levelStart(level: Level, depth: number): RoundStart {
  return {
    ...levelOpening(level, depth),
    depth,
    crew: { friends: [] },
    boon: null,
  };
}

/** Describes a level as its set's file holds it, its boon text until {@link parseLevel} checks it. */
export interface LevelData {
  /** Names it for good: its records are kept by it, so it never changes. */
  readonly id: string;
  /** Names it to the player. */
  readonly name: string;
  /** The boon each jump of its wall earns the next shot: "hot" or "triple". */
  readonly boon: string;
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
export const LEVEL_SETS: readonly LevelSetData[] = [
  warmUp,
  sparks,
  tricks,
  thickWalls,
];

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
  if (!entry) {
    throw new RangeError(
      `There is no level ${String(number)}: the levels run from 1 to ${String(levels.length)}.`,
    );
  }
  return entry;
}

/** The fewest and the most rows a level's wall has. */
export const WALL_ROWS = { least: 12, most: 40 } as const;

/** The most rows of air a wall holds together, so a jump is earned by breaking bricks, not handed over by a gap. */
export const MOST_AIR = 2;

/** The most rows a portal's twin stands from it, so both stand in the shallowest field at once. */
export const TWIN_ROWS = 4;

/** The rules a level's picture keeps, read against the game's legend. */
const PICTURE_RULES: PictureRules<BrickKindId> = {
  legend: WALL_LEGEND,
  rows: WALL_ROWS,
  mostAir: MOST_AIR,
  twinRows: TWIN_ROWS,
};

/** A row of a picture with no brick. */
const AIR = NO_BRICK.repeat(COLUMNS);

/** The keys a level's data may have, so one a typo misspells isn't left unread. */
const LEVEL_KEYS: Readonly<Record<keyof LevelData, true>> = {
  id: true,
  name: true,
  boon: true,
  bricks: true,
};

/**
 * Returns a level ready to play from its data, or throws an error that
 * names the level and what is wrong with it.
 *
 * It holds a level to the first four of plan.md's "The rules a level
 * keeps", but an id and a name no other level has, which `levels.spec.ts`
 * holds every level to.
 */
export function parseLevel(data: LevelData): Level {
  const extra = unknownKey(data, LEVEL_KEYS);
  if (extra !== null) {
    throw wrong(data, `it has a "${extra}", which no level has`);
  }
  const { boon } = data;
  if (!isBoon(boon)) {
    throw wrong(data, `its boon, "${boon}", is no boon`);
  }
  const problem = pictureProblem(data.bricks, PICTURE_RULES);
  if (problem !== null) {
    throw wrong(data, problem);
  }
  const { bricks, rows } = wallFrom(data.bricks, PICTURE_RULES.legend);
  checkSteel(data, bricks);
  return { boon, bricks, rows };
}

/** Returns an error that names what is wrong with a level's data. */
function wrong(data: LevelData, problem: string): Error {
  return new Error(`Level "${data.id}": ${problem}.`);
}

/**
 * Throws unless every row of steel from side to side stands in a wall's top
 * course: over everything, or with no air over it and a portal past it.
 */
function checkSteel(data: LevelData, bricks: Wall["bricks"]): void {
  const rows = data.bricks.length;
  for (let row = 0; row < rows; row++) {
    const line = bricks.slice(row * COLUMNS, (row + 1) * COLUMNS);
    if (row === rows - 1 || !line.every((brick) => brick?.kind === "steel")) {
      continue;
    }
    // The picture's rows over this one, top first.
    const above = data.bricks.slice(0, rows - 1 - row);
    const passed = bricks.some(
      (brick, cell) =>
        brick !== null &&
        brick.twin !== null &&
        wallRowOf(cell) < row &&
        wallRowOf(brick.twin) > row,
    );
    if (above.includes(AIR) || !passed) {
      throw wrong(
        data,
        `row ${String(rows - row)} of its picture is steel from side to side, neither over everything nor passed by a portal in its top course`,
      );
    }
  }
}

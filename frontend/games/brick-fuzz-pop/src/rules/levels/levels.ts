import { unknownKey } from "@fz/core/json";
import { isKeyOf } from "@fz/core/records";
import { isBrickKindId } from "../catalog/bricks";
import { wallRowOf } from "../grid";
import { isBoon } from "../shot";
import { COLUMNS } from "../tuning";
import type { Brick } from "../wall/wall";
import { LEGEND, NO_BRICK, PORTAL_MARKS, tintOf } from "./legend";
import type { Level } from "./level";
import sparks from "./sparks.json";
import warmUp from "./warm-up.json";

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
export const LEVEL_SETS: readonly LevelSetData[] = [warmUp, sparks];

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
 * holds every level to. It also refuses a kind no set has brought in yet.
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
  checkPicture(data);
  // The picture's characters by wall cell, its lowest row first.
  const characters = [...data.bricks].reverse().join("");
  const twins = twinsOf(data, characters);
  checkSteel(data, characters, twins);
  return {
    boon,
    bricks: twins.map((twin, cell) => brickAt(data, characters, cell, twin)),
    rows: data.bricks.length,
  };
}

/** Returns an error that names what is wrong with a level's data. */
function wrong(data: LevelData, problem: string): Error {
  return new Error(`Level "${data.id}": ${problem}.`);
}

/**
 * Throws unless a level's picture has a wall's rows, each nine of the
 * legend's characters, its highest and lowest not air, and no more than
 * {@link MOST_AIR} rows of air together.
 */
function checkPicture(data: LevelData): void {
  const { bricks } = data;
  const { least, most } = WALL_ROWS;
  if (bricks.length < least || bricks.length > most) {
    throw wrong(
      data,
      `its wall has ${String(bricks.length)} rows, not ${String(least)} to ${String(most)}`,
    );
  }
  let air = 0;
  for (const [index, row] of bricks.entries()) {
    if (row.length !== COLUMNS) {
      throw wrong(
        data,
        `row ${String(index + 1)} of its picture is ${String(row.length)} long, not ${String(COLUMNS)}`,
      );
    }
    const stray = row
      .split("")
      .find(
        (character) => character !== NO_BRICK && !isKeyOf(character, LEGEND),
      );
    if (stray !== undefined) {
      throw wrong(
        data,
        `"${stray}", in row ${String(index + 1)} of its picture, stands for no brick`,
      );
    }
    air = row === AIR ? air + 1 : 0;
    if (air > MOST_AIR) {
      throw wrong(
        data,
        `rows ${String(index + 1 - MOST_AIR)} to ${String(index + 1)} of its picture are air, more than ${String(MOST_AIR)} together`,
      );
    }
  }
  if (bricks.at(0) === AIR) {
    throw wrong(data, "its wall's highest row is air");
  }
  if (bricks.at(-1) === AIR) {
    throw wrong(data, "its wall's lowest row is air");
  }
}

/**
 * Returns each wall cell's twin, the cell of the other portal of its pair,
 * or null for a cell that holds no portal, throwing unless each mark of
 * {@link PORTAL_MARKS} a picture uses makes one pair, no more than
 * {@link TWIN_ROWS} rows apart, and a second pair comes with a first.
 */
function twinsOf(data: LevelData, characters: string): (number | null)[] {
  const twins: (number | null)[] = characters.split("").map(() => null);
  let pairs = 0;
  for (const mark of PORTAL_MARKS) {
    const cells = characters
      .split("")
      .flatMap((character, cell) => (character === mark ? [cell] : []));
    if (cells.length === 0) {
      continue;
    }
    if (mark !== PORTAL_MARKS[pairs]) {
      throw wrong(
        data,
        `its portals "${mark}" are a second pair, with no first, "${PORTAL_MARKS[0]}"`,
      );
    }
    pairs += 1;
    const [one, other] = cells;
    if (one === undefined || other === undefined || cells.length > 2) {
      throw wrong(
        data,
        `it has ${String(cells.length)} of the portal "${mark}", where a pair has 2`,
      );
    }
    const apart = wallRowOf(other) - wallRowOf(one);
    if (apart > TWIN_ROWS) {
      throw wrong(
        data,
        `its portals "${mark}" stand ${String(apart)} rows apart, more than ${String(TWIN_ROWS)}`,
      );
    }
    twins[one] = other;
    twins[other] = one;
  }
  return twins;
}

/**
 * Throws unless every row of steel from side to side stands in a wall's top
 * course: over everything, or with no air over it and a portal past it.
 */
function checkSteel(
  data: LevelData,
  characters: string,
  twins: readonly (number | null)[],
): void {
  const rows = data.bricks.length;
  for (let row = 0; row < rows; row++) {
    const line = characters.slice(row * COLUMNS, (row + 1) * COLUMNS);
    if (row === rows - 1 || !line.split("").every(isSteel)) {
      continue;
    }
    // The picture's rows over this one, top first.
    const above = data.bricks.slice(0, rows - 1 - row);
    const passed = twins.some(
      (twin, cell) =>
        twin !== null && wallRowOf(cell) < row && wallRowOf(twin) > row,
    );
    if (above.includes(AIR) || !passed) {
      throw wrong(
        data,
        `row ${String(rows - row)} of its picture is steel from side to side, neither over everything nor passed by a portal in its top course`,
      );
    }
  }
}

/** Returns whether a character of a picture stands for steel. */
function isSteel(character: string): boolean {
  return isKeyOf(character, LEGEND) && LEGEND[character].kind === "steel";
}

/**
 * Returns the brick a level lays in a wall cell, whole, or null for none,
 * throwing for a kind no set has brought in yet.
 */
function brickAt(
  data: LevelData,
  characters: string,
  cell: number,
  twin: number | null,
): Brick | null {
  const character = characters.charAt(cell);
  // The picture is checked, so a character the legend lacks is no brick's.
  if (!isKeyOf(character, LEGEND)) {
    return null;
  }
  const { kind, hits, plates } = LEGEND[character];
  if (!isBrickKindId(kind)) {
    throw wrong(
      data,
      `"${character}", in row ${String(data.bricks.length - wallRowOf(cell))} of its picture, is a "${kind}", which no set has brought in yet`,
    );
  }
  return {
    kind,
    hits,
    full: hits,
    plates,
    tint: tintOf(characters, cell),
    twin,
  };
}

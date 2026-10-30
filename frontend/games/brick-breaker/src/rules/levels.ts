import { brickKind, hasTrait, isBrickKindId } from "./catalog/bricks";
import {
  CAPSULE_IDS,
  type CapsuleId,
  capsule,
  isCapsuleId,
} from "./catalog/capsules";
import { CELLS, columnOf, rowOf } from "./grid";
import { type BrickSpec, LEGEND, NO_BRICK, brickOf } from "./legend";
import { type Level, type LevelBrick, TINTS } from "./level";
import basics from "./levels/basics.json";
import { COLUMNS, ROWS } from "./tuning";

/** Describes a brick a level's own legend adds, as its file holds it. */
export interface BrickSpecData {
  readonly kind: string;
  readonly hits?: number;
  readonly capsule?: string;
}

/**
 * Describes a level as its set's file holds it, its ids text until
 * {@link parseLevel} checks them.
 */
export interface LevelData {
  /** Names it for good: its records are kept by it, so it never changes. */
  readonly id: string;
  /** Names it to the player. */
  readonly name: string;
  /** Its bricks, a row of 13 characters for each of up to 16 rows. */
  readonly bricks: readonly string[];
  /**
   * Each brick's tint, 1 to 8, in the same shape, `.` for its row's; else
   * each row takes the next of the eight, as stripes.
   */
  readonly tints?: readonly string[];
  /** The ball's speed against the speed's own, 1 by default. */
  readonly pace?: number;
  /** The chance a needed brick lets a capsule fall; else its set's. */
  readonly drops?: number;
  /** The capsules that can fall; else every one whose level has come. */
  readonly capsules?: readonly string[];
  /** Characters of its own, beside the shared legend's. */
  readonly legend?: Readonly<Record<string, BrickSpecData>>;
}

/** Describes a set of levels, as its file holds it. */
export interface LevelSetData {
  readonly id: string;
  readonly name: string;
  /** The chance a needed brick lets a capsule fall, in a level that doesn't say. */
  readonly drops: number;
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
export const LEVEL_SETS: readonly LevelSetData[] = [basics];

/** Returns the levels of sets, in the order played, numbered from 1. */
export function levelsOf(sets: readonly LevelSetData[]): LevelEntry[] {
  return sets
    .flatMap((set) => set.levels.map((data) => ({ set, data })))
    .map((entry, i) => ({ ...entry, number: i + 1 }));
}

/** Every level, in the order they are played. */
export const LEVELS: readonly LevelEntry[] = levelsOf(LEVEL_SETS);

/** The slowest and the fastest a level's pace may be. */
const PACE = { least: 0.8, most: 1.4 } as const;

/** The keys a level's data may have, so one a typo misspells isn't left unread. */
const LEVEL_KEYS: Readonly<Record<keyof LevelData, true>> = {
  id: true,
  name: true,
  bricks: true,
  tints: true,
  pace: true,
  drops: true,
  capsules: true,
  legend: true,
};

/** The keys a brick of a level's legend may have. */
const SPEC_KEYS: Readonly<Record<keyof BrickSpecData, true>> = {
  kind: true,
  hits: true,
  capsule: true,
};

/**
 * Returns a level ready to play from its entry, or throws an error that
 * names what is wrong with its data.
 */
export function parseLevel({ number, set, data }: LevelEntry): Level {
  const extra = unknownKey(data, LEVEL_KEYS);
  if (extra !== null) {
    throw wrong(data, `it has a "${extra}", which no level has`);
  }
  const legend = legendOf(data);
  checkGrid(data, data.bricks, "bricks");
  if (data.tints) checkTints(data, data.tints);
  const pace = data.pace ?? 1;
  if (pace < PACE.least || pace > PACE.most) {
    throw wrong(
      data,
      `its pace, ${String(pace)}, is outside ${String(PACE.least)} to ${String(PACE.most)}`,
    );
  }
  const drops = data.drops ?? set.drops;
  if (drops < 0 || drops > 1) {
    throw wrong(
      data,
      `its chance of a capsule, ${String(drops)}, is no chance`,
    );
  }
  return {
    cells: Array.from({ length: CELLS }, (_, cell) =>
      brickAt(data, legend, cell),
    ),
    pace,
    drops,
    capsules: poolOf(data, number),
  };
}

/** Returns an error that names what is wrong with a level's data. */
function wrong(data: LevelData, problem: string): Error {
  return new Error(`Level "${data.id}": ${problem}.`);
}

/** Returns the first key of a value that the known keys lack, or null. */
function unknownKey(
  value: object,
  known: Readonly<Record<string, true>>,
): string | null {
  return Object.keys(value).find((key) => !Object.hasOwn(known, key)) ?? null;
}

/** Throws unless a grid of a level's has at most 16 rows, each 13 long. */
function checkGrid(
  data: LevelData,
  rows: readonly string[],
  what: "bricks" | "tints",
): void {
  if (rows.length > ROWS) {
    throw wrong(
      data,
      `its ${what} have ${String(rows.length)} rows, more than ${String(ROWS)}`,
    );
  }
  for (const [i, row] of rows.entries()) {
    if (row.length !== COLUMNS) {
      throw wrong(
        data,
        `row ${String(i + 1)} of its ${what} is ${String(row.length)} long, not ${String(COLUMNS)}`,
      );
    }
  }
}

/**
 * Throws unless a level's tints are its bricks' shape, with nothing but `.`
 * where there is no brick, so tints shifted from their bricks are found.
 */
function checkTints(data: LevelData, tints: readonly string[]): void {
  checkGrid(data, tints, "tints");
  if (tints.length !== data.bricks.length) {
    throw wrong(
      data,
      `its tints have ${String(tints.length)} rows, its bricks ${String(data.bricks.length)}`,
    );
  }
  for (const [row, line] of tints.entries()) {
    for (let column = 0; column < line.length; column++) {
      const character = line[column] ?? NO_BRICK;
      if (character !== NO_BRICK && data.bricks[row]?.[column] === NO_BRICK) {
        throw wrong(
          data,
          `"${character}", in row ${String(row + 1)} of its tints, tints no brick`,
        );
      }
    }
  }
}

/** Returns the shared legend with a level's own characters, checked. */
function legendOf(data: LevelData): Readonly<Record<string, BrickSpec>> {
  const legend: Record<string, BrickSpec> = { ...LEGEND };
  for (const [character, spec] of Object.entries(data.legend ?? {})) {
    if (
      character.length !== 1 ||
      character === NO_BRICK ||
      Object.hasOwn(LEGEND, character)
    ) {
      throw wrong(data, `its legend may not define "${character}"`);
    }
    legend[character] = specOf(data, character, spec);
  }
  return legend;
}

/** Returns the brick a character of a level's own legend stands for, checked. */
function specOf(
  data: LevelData,
  character: string,
  spec: BrickSpecData,
): BrickSpec {
  const extra = unknownKey(spec, SPEC_KEYS);
  if (extra !== null) {
    throw wrong(data, `"${character}" has a "${extra}", which no brick has`);
  }
  const { kind, hits, capsule: id } = spec;
  if (!isBrickKindId(kind)) {
    throw wrong(data, `"${character}" is a "${kind}", which is no brick`);
  }
  const { hits: least, mostHits } = brickKind(kind);
  if (
    hits !== undefined &&
    (least === "never" ||
      !Number.isInteger(hits) ||
      hits < least ||
      hits > mostHits)
  ) {
    throw wrong(
      data,
      `"${character}" has ${String(hits)} for its hits, which a ${kind} brick can't take`,
    );
  }
  if (id === undefined) return { kind, hits };
  if (!hasTrait(kind, "gives")) {
    throw wrong(
      data,
      `"${character}" gives "${id}", but a ${kind} brick gives nothing`,
    );
  }
  if (!isCapsuleId(id)) {
    throw wrong(data, `"${character}" gives "${id}", which is no capsule`);
  }
  return { kind, hits, capsule: id };
}

/** Returns the brick a level lays in a cell, or null for none. */
function brickAt(
  data: LevelData,
  legend: Readonly<Record<string, BrickSpec>>,
  cell: number,
): LevelBrick | null {
  const column = columnOf(cell);
  const row = rowOf(cell);
  const character = data.bricks[row]?.[column] ?? NO_BRICK;
  if (character === NO_BRICK) return null;
  const spec = legend[character];
  if (!spec) {
    throw wrong(
      data,
      `"${character}", in row ${String(row + 1)}, stands for no brick`,
    );
  }
  return brickOf(spec, tintAt(data, column, row));
}

/** Returns the tint of a level's brick, from 0 to 7. */
function tintAt(data: LevelData, column: number, row: number): number {
  const character = data.tints?.[row]?.[column] ?? NO_BRICK;
  if (character === NO_BRICK) return row % TINTS;
  const tint = Number(character);
  if (!Number.isInteger(tint) || tint < 1 || tint > TINTS) {
    throw wrong(
      data,
      `"${character}", in row ${String(row + 1)} of its tints, is no tint`,
    );
  }
  return tint - 1;
}

/** Returns the capsules that can fall in a level: its own, or those whose level has come. */
function poolOf(data: LevelData, number: number): CapsuleId[] {
  if (!data.capsules) {
    return CAPSULE_IDS.filter((id) => capsule(id).from <= number);
  }
  return data.capsules.map((id) => {
    if (!isCapsuleId(id)) {
      throw wrong(data, `its capsules name "${id}", which is no capsule`);
    }
    return id;
  });
}

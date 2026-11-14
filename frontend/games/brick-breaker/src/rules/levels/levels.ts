import { unknownKey } from "@fz/core/json";
import { isOneOf } from "@fz/core/records";
import { brickKind, hasTrait, isBrickKindId } from "../catalog/bricks";
import {
  CAPSULE_IDS,
  type CapsuleId,
  capsule,
  isCapsuleId,
} from "../catalog/capsules";
import { CELLS, columnOf, rowOf } from "../grid";
import { COLUMNS, ROWS } from "../tuning";
import basics from "./basics.json";
import friends from "./friends.json";
import { type BrickSpec, LEGEND, NO_BRICK, brickOf } from "./legend";
import {
  FIRST_LAYOUT,
  type Level,
  type LevelBrick,
  NUDGES,
  type Nudge,
  TINTS,
} from "./level";
import machines from "./machines.json";
import steel from "./steel.json";
import tricks from "./tricks.json";

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
  /**
   * The number of the layout its bricks are in, a whole number from 1, 1 by
   * default, which a redraw raises, so the bests made on another are let go.
   */
  readonly layout?: number;
  /** Its bricks, a row of 13 characters for each of up to 16 rows. */
  readonly bricks: readonly string[];
  /**
   * Each brick's tint, 1 to 8, in the same shape, `.` for its row's; else
   * each row takes the next of the eight, as stripes.
   */
  readonly tints?: readonly string[];
  /** The ball's speed against the speed's own, 1 by default. */
  readonly pace?: number;
  /**
   * The streak its third star asks for, a whole number from 1, which
   * `yarn report:levels --marks` sets for every level by one rule.
   */
  readonly mark: number;
  /** The chance a needed brick lets a capsule fall; else its set's. */
  readonly drops?: number;
  /** The capsules that can fall; else every one whose level has come. */
  readonly capsules?: readonly string[];
  /** Characters of its own, beside the shared legend's. */
  readonly legend?: Readonly<Record<string, BrickSpecData>>;
}

/** Every place a set of levels can be in. */
export const PLACES = [
  "playroom",
  "workshop",
  "funfair",
  "garden",
  "arcade",
] as const;

/** Names a place a set of levels is in. */
export type Place = (typeof PLACES)[number];

/** Describes a set of levels, as its file holds it. */
export interface LevelSetData {
  readonly id: string;
  readonly name: string;
  /** The place it is in, a {@link Place} as text until {@link placeOf} checks it. */
  readonly place: string;
  /** The chance a needed brick lets a capsule fall, in a level that doesn't say. */
  readonly drops: number;
  /**
   * Where a lull's nudge turns a ball in its levels, a {@link Nudge} as text
   * until {@link parseLevel} checks it: at the walls alone by default.
   */
  readonly nudge?: string;
  readonly levels: readonly LevelData[];
}

/** Describes a level of the game: its data, its set, and its number. */
export interface LevelEntry {
  /** Its number in the order played, from 1. */
  readonly number: number;
  readonly set: LevelSetData;
  readonly data: LevelData;
}

/** Every set of levels, in the order they are played. */
export const LEVEL_SETS: readonly LevelSetData[] = [
  basics,
  steel,
  tricks,
  friends,
  machines,
];

/** Returns the levels of sets, in the order played, numbered from 1. */
export function levelsOf(sets: readonly LevelSetData[]): LevelEntry[] {
  return sets
    .flatMap((set) => set.levels.map((data) => ({ set, data })))
    .map((entry, i) => ({ ...entry, number: i + 1 }));
}

/** Every level, in the order they are played. */
export const LEVELS: readonly LevelEntry[] = levelsOf(LEVEL_SETS);

/**
 * Returns the place a set of levels is in, or throws an error that names a
 * place it can't be in.
 */
export function placeOf(set: LevelSetData): Place {
  if (!isOneOf(set.place, PLACES)) {
    throw new Error(`Set "${set.id}": its place, "${set.place}", is no place.`);
  }
  return set.place;
}

/** Returns the number of the layout a level's bricks are in, unchecked: {@link parseLevel} checks it. */
export function layoutOf(data: Pick<LevelData, "layout">): number {
  return data.layout ?? FIRST_LAYOUT;
}

/** The slowest and the fastest a level's pace may be. */
const PACE = { least: 0.8, most: 1.4 } as const;

/** The keys a level's data may have, so one a typo misspells isn't left unread. */
const LEVEL_KEYS: Readonly<Record<keyof LevelData, true>> = {
  id: true,
  name: true,
  layout: true,
  bricks: true,
  tints: true,
  pace: true,
  mark: true,
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
  const layout = layoutOf(data);
  if (!Number.isInteger(layout) || layout < FIRST_LAYOUT) {
    throw wrong(
      data,
      `its layout, ${String(layout)}, is no whole number from ${String(FIRST_LAYOUT)}`,
    );
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
  if (!Number.isInteger(data.mark) || data.mark < 1) {
    throw wrong(
      data,
      `its mark, ${String(data.mark)}, is no whole number from 1`,
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
    layout,
    cells: Array.from({ length: CELLS }, (_, cell) =>
      brickAt(data, legend, cell),
    ),
    pace,
    mark: data.mark,
    drops,
    capsules: poolOf(data, number),
    nudge: nudgeOf(set),
  };
}

/** Returns an error that names what is wrong with a level's data. */
function wrong(data: LevelData, problem: string): Error {
  return new Error(`Level "${data.id}": ${problem}.`);
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
  if (hasTrait(kind, "jumps")) {
    throw wrong(
      data,
      `"${character}" is a portal, which only the shared legend's "@" and "%" draw, each of its pair`,
    );
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
  const brick: BrickSpec = hits === undefined ? { kind } : { kind, hits };
  if (id === undefined) return brick;
  if (!hasTrait(kind, "gives")) {
    throw wrong(
      data,
      `"${character}" gives "${id}", but a ${kind} brick gives nothing`,
    );
  }
  if (!isCapsuleId(id)) {
    throw wrong(data, `"${character}" gives "${id}", which is no capsule`);
  }
  return { ...brick, capsule: id };
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

/**
 * Returns where a lull's nudge turns a ball in a set's levels, as it says,
 * at the walls alone where it doesn't, or throws an error that names a
 * nudge there is none of.
 */
function nudgeOf(set: LevelSetData): Nudge {
  const nudge = set.nudge ?? "walls";
  if (!isOneOf(nudge, NUDGES)) {
    throw new Error(`Set "${set.id}": its nudge, "${nudge}", is no nudge.`);
  }
  return nudge;
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

// A level's wall drawn as a picture, a row of nine characters for each of its
// rows from the top, read against a wall game's legend: a spec draws the wall
// it plays rather than building its bricks, and a level's file holds its
// wall the same way, held to the game's PictureRules. What each character
// stands for, and what else a game holds its levels to, is the game's own.

import { COLUMNS, FIRST_X } from "./field";
import { wallRowOf } from "./grid";
import { type Brick, type Wall, thirdsOf } from "./wall";

/** Describes the brick a character of a legend stands for, whole. */
export interface LegendBrick<K extends string> {
  readonly kind: K;
  /** Its hits when whole: 0 for a kind that never breaks. */
  readonly hits: number;
  /** Its plated faces, as a brick's `plates` holds them. */
  readonly plates: number;
}

/** Describes how a wall game reads its pictures. */
export interface Legend<K extends string> {
  /** The character of a cell with no brick. */
  readonly none: string;
  /** Each character that stands for a brick, with the brick it stands for. */
  readonly bricks: Readonly<Record<string, LegendBrick<K>>>;
  /** The marks of a wall's pairs of twins, its first pair's first: a picture uses each twice or not at all, a second only with the first. */
  readonly twinMarks: readonly string[];
  /** Returns the ink of the brick in a wall cell, from the picture's characters by wall cell, its lowest row first. */
  readonly tintOf: (characters: string, cell: number) => number;
}

/** Describes what a level's picture is held to, beside its game's legend. */
export interface PictureRules<K extends string> {
  readonly legend: Legend<K>;
  /** The fewest and the most rows a level's wall has. */
  readonly rows: { readonly least: number; readonly most: number };
  /** The most rows of air a level's wall holds together, so a jump is earned by breaking bricks, not handed over. */
  readonly mostAir: number;
  /** The most rows a twin stands from its twin, so both stand in the shallowest field at once. */
  readonly twinRows: number;
}

/** Says where a pictured wall stands, where a spec cares. */
export interface PictureOptions {
  /** The field row the picture's lowest row stands in: 1 by default, the lowest a brick stands in, over the floor's. */
  readonly lowestRow?: number;
}

/** Describes a level's wall as its picture lays it out, before it stands in a field. */
export type LevelWall<K extends string> = Pick<Wall<K>, "bricks" | "rows">;

/** Describes where a level opens on a field: its wall standing, and where its fuzzball waits. */
export interface Opening<K extends string> {
  readonly wall: Wall<K>;
  readonly x: number;
}

/**
 * Returns a wall laid out from a picture, a row of nine characters for each
 * of its rows from the top, in a legend's characters.
 *
 * Each brick is whole, and takes the tint the legend's `tintOf()` gives its
 * cell, and a twin the other of its pair. It throws for a row not nine
 * wide, a character the legend lacks, or a twin's mark used once or more
 * than twice, so a spec plays the wall it draws.
 */
export function wallFrom<K extends string>(
  picture: readonly string[],
  legend: Legend<K>,
  { lowestRow = 1 }: PictureOptions = {},
): Wall<K> {
  const wrong = picture.find((line) => line.length !== COLUMNS);
  if (wrong !== undefined) {
    throw new RangeError(
      `A wall's picture is ${String(COLUMNS)} characters wide a row, not "${wrong}".`,
    );
  }
  const characters = charactersOf(picture);
  const bricks = twinsIn(characters, legend.twinMarks).map((twin, cell) =>
    brickOf(characters, legend, cell, twin),
  );
  return { bricks, rows: picture.length, lowestRow };
}

/**
 * Returns each wall cell's twin, the cell of the other of its pair, or null
 * for a cell that holds no twin, from the characters of a wall's picture by
 * wall cell, each of the marks pairing its two cells, throwing for a mark
 * used once or more than twice.
 */
function twinsIn(
  characters: string,
  twinMarks: readonly string[],
): (number | null)[] {
  const twins: (number | null)[] = Array.from(characters, () => null);
  for (const mark of twinMarks) {
    const cells = cellsMarked(characters, mark);
    if (cells.length === 0) {
      continue;
    }
    const pair = pairOf(cells);
    if (pair === null) {
      throw new RangeError(
        `A wall's picture holds ${String(cells.length)} of the twin "${mark}", where a pair has 2.`,
      );
    }
    const [one, other] = pair;
    twins[one] = other;
    twins[other] = one;
  }
  return twins;
}

/** Returns a picture's characters by wall cell, its lowest row first. */
function charactersOf(picture: readonly string[]): string {
  return [...picture].reverse().join("");
}

/** Returns the wall cells a twin's mark stands in, from the characters of a wall's picture by wall cell. */
function cellsMarked(characters: string, mark: string): number[] {
  return Array.from(characters).flatMap((character, cell) =>
    character === mark ? [cell] : [],
  );
}

/** Returns the two cells of a pair of twins, or null for a mark in some other number of cells. */
function pairOf(cells: readonly number[]): readonly [number, number] | null {
  const [one, other] = cells;
  return one === undefined || other === undefined || cells.length > 2
    ? null
    : [one, other];
}

/**
 * Returns the whole brick a picture's character stands for, with its tint
 * and its twin, or null for no brick, throwing for a character the legend
 * lacks.
 */
function brickOf<K extends string>(
  characters: string,
  legend: Legend<K>,
  cell: number,
  twin: number | null,
): Brick<K> | null {
  const character = characters.charAt(cell);
  if (character === legend.none) {
    return null;
  }
  const brick = legend.bricks[character];
  if (brick === undefined) {
    throw new RangeError(
      `A wall's picture holds "${character}", which the legend lacks.`,
    );
  }
  const { kind, hits, plates } = brick;
  return {
    kind,
    hits,
    full: hits,
    plates,
    tint: legend.tintOf(characters, cell),
    twin,
  };
}

/**
 * Returns what keeps a picture from being a level's wall under a game's
 * rules, a sentence for the first a reader would fix, or null for a
 * picture that keeps them: its rows, each nine of the legend's characters,
 * its highest and lowest not air, no more air together than the rules let,
 * and each twin's mark used twice, a second pair only with a first, no
 * farther apart than the rules let.
 *
 * Each other rule its game holds a level to stays the game's own.
 */
export function pictureProblem<K extends string>(
  picture: readonly string[],
  rules: PictureRules<K>,
): string | null {
  const { legend } = rules;
  const { least, most } = rules.rows;
  if (picture.length < least || picture.length > most) {
    return `its wall has ${String(picture.length)} rows, not ${String(least)} to ${String(most)}`;
  }
  const air = legend.none.repeat(COLUMNS);
  let airRun = 0;
  for (const [index, row] of picture.entries()) {
    if (row.length !== COLUMNS) {
      return `row ${String(index + 1)} of its picture is ${String(row.length)} long, not ${String(COLUMNS)}`;
    }
    const stray = Array.from(row).find(
      (character) =>
        character !== legend.none && legend.bricks[character] === undefined,
    );
    if (stray !== undefined) {
      return `"${stray}", in row ${String(index + 1)} of its picture, stands for no brick`;
    }
    airRun = row === air ? airRun + 1 : 0;
    if (airRun > rules.mostAir) {
      return `rows ${String(index + 1 - rules.mostAir)} to ${String(index + 1)} of its picture are air, more than ${String(rules.mostAir)} together`;
    }
  }
  if (picture.at(0) === air) {
    return "its wall's highest row is air";
  }
  if (picture.at(-1) === air) {
    return "its wall's lowest row is air";
  }
  return twinProblem(picture, rules);
}

/** Returns what keeps a checked picture's twins from their rules, or null where they keep them. */
function twinProblem<K extends string>(
  picture: readonly string[],
  { legend, twinRows }: PictureRules<K>,
): string | null {
  const characters = charactersOf(picture);
  let pairs = 0;
  for (const mark of legend.twinMarks) {
    const cells = cellsMarked(characters, mark);
    if (cells.length === 0) {
      continue;
    }
    if (mark !== legend.twinMarks[pairs]) {
      return `its twins "${mark}" are a second pair, with no first, "${String(legend.twinMarks[0])}"`;
    }
    pairs += 1;
    const pair = pairOf(cells);
    if (pair === null) {
      return `it has ${String(cells.length)} of the twin "${mark}", where a pair has 2`;
    }
    const [one, other] = pair;
    const apart = wallRowOf(other) - wallRowOf(one);
    if (apart > twinRows) {
      return `its twins "${mark}" stand ${String(apart)} rows apart, more than ${String(twinRows)}`;
    }
  }
  return null;
}

/**
 * Returns where a level opens on a field of a depth: its wall's lowest row
 * where a jump would land it, the fuzzball waiting at the floor's middle.
 *
 * It throws for a depth no field has, as {@link thirdsOf} does.
 */
export function levelOpening<K extends string>(
  level: LevelWall<K>,
  depth: number,
): Opening<K> {
  return {
    wall: {
      bricks: level.bricks,
      rows: level.rows,
      lowestRow: thirdsOf(depth).opensOn,
    },
    x: FIRST_X,
  };
}

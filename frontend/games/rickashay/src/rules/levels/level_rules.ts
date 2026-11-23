// The rules every level keeps, as the design's "The rules a level keeps"
// gives them, on @fz/brick-wall's checks of a picture: its rows, its air and
// its portals, then what its wall holds for its place among the levels, in
// its lowest row and beside its hatches. Two of the design's rules aren't
// here: that a set's last level mixes what it taught and that it has a rest,
// which the drafts were drawn to, and the guarantee, that a level can be
// cleared on every depth, which takes a solver rather than a picture.

import { COLUMNS } from "@fz/brick-wall/rules/field";
import {
  type LevelWall,
  type PictureRules,
  pictureProblem,
  wallFrom,
} from "@fz/brick-wall/rules/level_picture";
import { isOneOf } from "@fz/core/records";
import {
  type Brick,
  type KindId,
  kindIntroducedAt,
  kindOf,
} from "../catalog/kinds";
import { WALL_LEGEND } from "./legend";

/** The fewest and the most rows a level's wall has. */
export const WALL_ROWS = { least: 13, most: 33 } as const;

/** The most rows of air a level's wall holds together, so a gap is one row and a jump is earned by breaking bricks. */
export const MOST_AIR = 1;

/** The most rows a portal stands from its twin, so one is never long in the field without the other. */
export const TWIN_ROWS = 3;

/** The most hits a brick in a wall's lowest row has, the row a level opens on and the first a round must thin. */
export const LOWEST_HITS = 4;

/**
 * The kinds a row with a hatch may not hold: the steel brick, and the ramp,
 * a steel wedge, since each turns a fuzzball and never breaks, and one held
 * over a hatch floor must be striking something it can break.
 */
const STEEL = ["steel", "ramp"] as const satisfies readonly KindId[];

/**
 * The rules a level's picture keeps, read against the game's legend: its
 * rows, no air at its top or its foot and never two rows of it together,
 * and its portals in twos, a pair no more than {@link TWIN_ROWS} rows apart.
 * The legend writes a wall's two pairs as `@` and `&`, and no third, so a
 * level holds two pairs at most.
 */
export const PICTURE_RULES: PictureRules<KindId> = {
  legend: WALL_LEGEND,
  rows: WALL_ROWS,
  mostAir: MOST_AIR,
  twinRows: TWIN_ROWS,
};

/**
 * Returns what keeps a level's picture from the rules a level keeps, a
 * sentence for the first a reader would fix, or null for one that keeps
 * them all: {@link PICTURE_RULES}; no kind before the level that brings it
 * in, and that level, by its number from 1, holding it, so a level brings
 * one new kind in at most; nothing in its wall's lowest row of more than
 * {@link LOWEST_HITS} hits, and no lock; and no steel brick or ramp in a
 * row with a hatch.
 */
export function levelProblem(
  picture: readonly string[],
  number: number,
): string | null {
  const problem = pictureProblem(picture, PICTURE_RULES);
  if (problem !== null) {
    return problem;
  }
  const rows = rowsOf(wallFrom(picture, WALL_LEGEND));
  return (
    kindProblem(rows, number) ??
    lowestRowProblem(rows.slice(-1).flat()) ??
    hatchProblem(rows)
  );
}

/** A wall's bricks, row by row as its picture draws them. */
type Rows = readonly (readonly (Brick | null)[])[];

/** Returns a laid-out wall's rows of bricks in its picture's order, the top row first. */
function rowsOf({ bricks, rows }: LevelWall<KindId>): Rows {
  return Array.from({ length: rows }, (_, row) =>
    bricks.slice((rows - row - 1) * COLUMNS, (rows - row) * COLUMNS),
  );
}

/** Returns a kind's name as a sentence names it, such as "steel brick". */
function nameOf(kind: KindId): string {
  return kindOf(kind).name.toLowerCase();
}

/**
 * Returns what keeps a wall's kinds from its level's place, by its number:
 * a kind no level before it may hold, or the kind it brings in missing.
 */
function kindProblem(rows: Rows, number: number): string | null {
  for (const [row, bricks] of rows.entries()) {
    const early = bricks.find(
      (brick): brick is Brick =>
        brick !== null && kindOf(brick.kind).firstLevel > number,
    );
    if (early !== undefined) {
      return `row ${String(row + 1)} of its picture holds a ${nameOf(early.kind)}, which no level before ${String(kindOf(early.kind).firstLevel)} holds`;
    }
  }
  const brought = kindIntroducedAt(number);
  if (
    brought !== null &&
    !rows.some((bricks) => bricks.some((brick) => brick?.kind === brought))
  ) {
    return `it brings in the ${nameOf(brought)} and holds none`;
  }
  return null;
}

/** Returns what keeps a wall's lowest row, its bricks, from being workable, or null where it is. */
function lowestRowProblem(lowest: readonly (Brick | null)[]): string | null {
  const heavy = lowest.find(
    (brick): brick is Brick => brick !== null && brick.hits > LOWEST_HITS,
  );
  if (heavy !== undefined) {
    return `its wall's lowest row holds a brick of ${String(heavy.hits)} hits, more than ${String(LOWEST_HITS)}`;
  }
  return lowest.some((brick) => brick?.kind === "lock")
    ? "its wall's lowest row holds a lock"
    : null;
}

/** Returns what puts steel in a wall's row with a hatch, naming the first such row, or null for a wall with none. */
function hatchProblem(rows: Rows): string | null {
  for (const [row, bricks] of rows.entries()) {
    const steel = bricks.find(
      (brick): brick is Brick => brick !== null && isOneOf(brick.kind, STEEL),
    );
    if (
      steel !== undefined &&
      bricks.some((brick) => brick?.kind === "hatch")
    ) {
      return `row ${String(row + 1)} of its picture holds both a hatch and a ${nameOf(steel.kind)}`;
    }
  }
  return null;
}

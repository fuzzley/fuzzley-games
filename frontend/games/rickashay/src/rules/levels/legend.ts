// Rickashay's legend, the characters a level's picture is written in, each
// with the brick it stands for, as the design's "The bricks" gives them:
// `x`, `y` and `z` are locks, where Brick Fuzz Pop's `x` is a zapper. What a
// character says beyond a kind, its hits and a plated brick's plates, a ramp's
// corner and a lock's bolts, it says through the brick's plates and tint.

import {
  CEILINGWARD,
  FLOORWARD,
  LEFT,
  RIGHT,
  wallRowOf,
} from "@fz/brick-wall/rules/grid";
import type {
  Legend,
  LegendBrick as PictureBrick,
} from "@fz/brick-wall/rules/level_picture";
import { isKeyOf, isOneOf } from "@fz/core/records";
import type { KindId } from "../catalog/kinds";

/** Describes the brick a character of a level's picture stands for, of one of the eleven kinds. */
export type LegendBrick = PictureBrick<KindId>;

/** The character of a cell with no brick. */
export const NO_BRICK = ".";

/**
 * The characters every level's picture shares, each with the brick it
 * stands for, written in the catalog's order.
 *
 * A ramp's plates are the two faces of its cell its short sides lie along,
 * the corner its right angle sits in: `L` low left, `J` low right, `F` top
 * left and `7` top right. `@` is a wall's first pair of portals and `&` its
 * second, each the twin of the other of its character.
 */
export const LEGEND = {
  o: { kind: "brick", hits: 1, plates: 0 },
  "2": { kind: "tough", hits: 2, plates: 0 },
  "3": { kind: "tough", hits: 3, plates: 0 },
  "4": { kind: "tough", hits: 4, plates: 0 },
  "5": { kind: "tough", hits: 5, plates: 0 },
  "6": { kind: "tough", hits: 6, plates: 0 },
  "#": { kind: "steel", hits: 0, plates: 0 },
  L: { kind: "ramp", hits: 0, plates: FLOORWARD | LEFT },
  J: { kind: "ramp", hits: 0, plates: FLOORWARD | RIGHT },
  F: { kind: "ramp", hits: 0, plates: CEILINGWARD | LEFT },
  "7": { kind: "ramp", hits: 0, plates: CEILINGWARD | RIGHT },
  "=": { kind: "hatch", hits: 0, plates: 0 },
  S: { kind: "spring", hits: 1, plates: 0 },
  G: { kind: "gem", hits: 1, plates: 0 },
  "@": { kind: "portal", hits: 0, plates: 0 },
  "&": { kind: "portal", hits: 0, plates: 0 },
  v: { kind: "plated", hits: 2, plates: FLOORWARD },
  V: { kind: "plated", hits: 3, plates: FLOORWARD },
  U: { kind: "plated", hits: 2, plates: FLOORWARD | LEFT | RIGHT },
  M: { kind: "moss", hits: 2, plates: 0 },
  N: { kind: "moss", hits: 3, plates: 0 },
  x: { kind: "lock", hits: 1, plates: 0 },
  y: { kind: "lock", hits: 1, plates: 0 },
  z: { kind: "lock", hits: 1, plates: 0 },
} as const satisfies Readonly<Record<string, LegendBrick>>;

/** A character of the legend, such as "#". */
export type LegendCharacter = keyof typeof LEGEND;

/** The id of a kind the legend names, each one the catalog holds. */
export type LegendKindId = (typeof LEGEND)[LegendCharacter]["kind"];

/** The characters of a wall's portals, its first pair's and its second's, each pair's mark its place here. */
export const PORTAL_MARKS = [
  "@",
  "&",
] as const satisfies readonly LegendCharacter[];

/** The characters of a lock of 1, 2 and 3 bolts, each lock's bolts its place here and one more. */
export const LOCK_BOLTS = [
  "x",
  "y",
  "z",
] as const satisfies readonly LegendCharacter[];

/** How many inks plain and tough bricks and gems take in turn, a row each, from a wall's lowest row up. */
export const TINTS = 8;

/**
 * Returns what a wall cell's brick takes as `Brick.tint`, from the
 * characters of the wall's picture by wall cell, its lowest row first: a
 * plain or tough brick and a gem its wall row's ink, the rows taking the
 * {@link TINTS} in turn from the lowest up; a portal its pair's mark; a
 * lock its bolts, 1 to 3; and every other kind, or a cell with no brick,
 * 0, as it keeps an ink of its own.
 */
export function tintOf(characters: string, cell: number): number {
  const character = characters.charAt(cell);
  if (!isKeyOf(character, LEGEND)) {
    return 0;
  }
  const { kind } = LEGEND[character];
  if (kind === "brick" || kind === "tough" || kind === "gem") {
    return wallRowOf(cell) % TINTS;
  }
  if (isOneOf(character, PORTAL_MARKS)) {
    return PORTAL_MARKS.indexOf(character);
  }
  return isOneOf(character, LOCK_BOLTS) ? LOCK_BOLTS.indexOf(character) + 1 : 0;
}

/** How a level's picture is read: the legend's characters, `.` for no brick, the portals' marks as the twins', and each brick's tint. */
export const WALL_LEGEND: Legend<KindId> = {
  none: NO_BRICK,
  bricks: LEGEND,
  twinMarks: PORTAL_MARKS,
  tintOf,
};

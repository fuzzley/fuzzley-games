import { isKeyOf, isOneOf } from "@fz/core/records";
import type { BrickKindId } from "../catalog/bricks";
import { CEILINGWARD, FLOORWARD, LEFT, RIGHT, wallRowOf } from "../grid";

/** A plate's faces toward both side walls. */
const SIDES = LEFT | RIGHT;

/** Describes the brick a character of a level's picture stands for. */
export interface LegendBrick {
  /** Its kind's id. */
  readonly kind: BrickKindId;
  /** Its hits when whole: 0 for a kind that never breaks. */
  readonly hits: number;
  /** Its plated faces, as a brick's `plates` holds them. */
  readonly plates: number;
}

/** The character of a cell with no brick. */
export const NO_BRICK = ".";

/**
 * The characters every level's picture shares, each with the brick it
 * stands for. `@` is a wall's first pair of portals and `&` its second, each
 * the twin of the other of its character.
 */
export const LEGEND = {
  o: { kind: "brick", hits: 1, plates: 0 },
  "2": { kind: "tough", hits: 2, plates: 0 },
  "3": { kind: "tough", hits: 3, plates: 0 },
  "4": { kind: "tough", hits: 4, plates: 0 },
  "5": { kind: "tough", hits: 5, plates: 0 },
  "6": { kind: "tough", hits: 6, plates: 0 },
  "#": { kind: "steel", hits: 0, plates: 0 },
  "-": { kind: "rowZapper", hits: 1, plates: 0 },
  "|": { kind: "columnZapper", hits: 1, plates: 0 },
  "*": { kind: "bomb", hits: 1, plates: 0 },
  "+": { kind: "crossZapper", hits: 1, plates: 0 },
  x: { kind: "xZapper", hits: 1, plates: 0 },
  W: { kind: "wool", hits: 1, plates: 0 },
  C: { kind: "cage", hits: 2, plates: 0 },
  B: { kind: "bumper", hits: 0, plates: 0 },
  P: { kind: "prism", hits: 1, plates: 0 },
  "@": { kind: "portal", hits: 0, plates: 0 },
  "&": { kind: "portal", hits: 0, plates: 0 },
  v: { kind: "plated", hits: 2, plates: FLOORWARD },
  V: { kind: "plated", hits: 3, plates: FLOORWARD },
  U: { kind: "plated", hits: 2, plates: FLOORWARD | SIDES },
  "^": { kind: "plated", hits: 2, plates: CEILINGWARD },
  S: { kind: "shell", hits: 2, plates: 0 },
  T: { kind: "shell", hits: 3, plates: 0 },
  M: { kind: "moss", hits: 2, plates: 0 },
  N: { kind: "moss", hits: 3, plates: 0 },
} as const satisfies Readonly<Record<string, LegendBrick>>;

/** A character of the legend, such as "#". */
export type LegendCharacter = keyof typeof LEGEND;

/** The id of a kind the legend names, each one the catalog holds. */
export type LegendKindId = (typeof LEGEND)[LegendCharacter]["kind"];

/**
 * The characters of a wall's portals, its first pair's and its second's,
 * each pair's mark its place here, which tells the art's two marks apart.
 */
export const PORTAL_MARKS = [
  "@",
  "&",
] as const satisfies readonly LegendCharacter[];

/**
 * The badge the art draws on each pair's portals, by its mark's place in
 * {@link PORTAL_MARKS}, which R names a portal by: a dot on the first
 * pair's, a diamond on the second's.
 */
export const PORTAL_BADGES = ["dot", "diamond"] as const;

/** How many tints plain and tough bricks take in turn, a row each, from a wall's lowest row up. */
export const TINTS = 8;

/**
 * Returns the ink of the brick in a wall cell, as `Brick.tint` holds it,
 * from the characters of the wall's picture by wall cell, its lowest row
 * first: a plain or tough brick its wall row's, the rows taking the
 * {@link TINTS} in turn from the lowest up; a portal its pair's mark; a
 * cage the ink of the friend it holds, its number among the wall's cages
 * from the lowest row up and left to right, so a level's six never share
 * one; and every other kind, or a cell with no brick, 0, as it keeps an ink
 * of its own (answer 4).
 */
export function tintOf(characters: string, cell: number): number {
  const character = characters.charAt(cell);
  if (!isKeyOf(character, LEGEND)) {
    return 0;
  }
  const { kind } = LEGEND[character];
  if (kind === "brick" || kind === "tough") {
    return wallRowOf(cell) % TINTS;
  }
  if (kind === "cage") {
    return Array.from(characters.slice(0, cell)).filter(
      (before) => isKeyOf(before, LEGEND) && LEGEND[before].kind === "cage",
    ).length;
  }
  return isOneOf(character, PORTAL_MARKS) ? PORTAL_MARKS.indexOf(character) : 0;
}

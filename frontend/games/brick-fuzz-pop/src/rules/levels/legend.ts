import { isOneOf } from "@fz/core/records";
import { CEILINGWARD, FLOORWARD, LEFT, RIGHT } from "../grid";

/** A plate's faces toward both side walls. */
const SIDES = LEFT | RIGHT;

/** Describes the brick a character of a level's picture stands for. */
export interface LegendBrick {
  /**
   * Its kind's id: one the catalog holds, or one the catalog of a set yet
   * to be built will, which no level may use until it does.
   */
  readonly kind: string;
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

/** The id of a kind the legend names, which the catalog holds once its set is built. */
export type LegendKindId = (typeof LEGEND)[LegendCharacter]["kind"];

/**
 * The characters of a wall's portals, its first pair's and its second's,
 * each pair's mark its place here, which tells the art's two marks apart.
 */
export const PORTAL_MARKS = [
  "@",
  "&",
] as const satisfies readonly LegendCharacter[];

/** How many tints plain and tough bricks take in turn, a row each, from a wall's lowest row up. */
export const TINTS = 8;

/**
 * Returns the ink the brick a character stands for takes in a wall row, as
 * `Brick.tint` holds it and answer 4 gives it: a plain or tough brick its
 * row's, the rows taking the {@link TINTS} in turn from the wall's lowest
 * up; a portal its pair's mark; and every other kind 0, as it keeps an ink
 * of its own.
 */
export function tintOf(character: LegendCharacter, wallRow: number): number {
  const { kind } = LEGEND[character];
  if (kind === "brick" || kind === "tough") {
    return wallRow % TINTS;
  }
  return isOneOf(character, PORTAL_MARKS) ? PORTAL_MARKS.indexOf(character) : 0;
}

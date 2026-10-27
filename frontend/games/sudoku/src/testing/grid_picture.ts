import { CELLS, indexAt } from "../rules/cells";
import type { Level } from "../rules/difficulty";
import { setOf } from "../rules/digits";
import { type Grid, createGrid } from "../rules/grid";
import { parseDigits, puzzleFrom } from "../rules/puzzle";

/**
 * An easy puzzle with one solution, drawn as nine rows: digits are givens,
 * and `.` a blank.
 */
export const EASY = [
  "...5..2..",
  "287.4.9..",
  ".342..6.8",
  "7..86.1.3",
  "4.......6",
  "1.3.57..9",
  "8.6..539.",
  "..2.3.581",
  "..5..9...",
] as const;

/** `EASY`'s solution. */
export const EASY_SOLUTION = [
  "691578234",
  "287346915",
  "534291678",
  "759862143",
  "428913756",
  "163457829",
  "846125397",
  "972634581",
  "315789462",
] as const;

/** Says what a picture of a grid shows beyond its givens. */
export interface GridPicture {
  /** The player's digits, nine rows drawn like the givens, `.` for none. */
  readonly digits?: readonly string[];
  /** Notes by square: `r1c3` is row 1, column 3, as in `{ r1c3: "148" }`. */
  readonly notes?: Readonly<Record<string, string>>;
  readonly level?: Level;
  readonly hints?: number;
}

/**
 * Returns a grid drawn as pictures: the givens as nine rows, and what the
 * picture adds, with nothing to undo, as a game taken up where it was left.
 *
 * It refuses givens without exactly one solution, a digit drawn over a
 * given, and a note on a square with a digit, so a picture can't draw a grid
 * the game couldn't reach.
 */
export function gridFrom(
  givens: readonly string[],
  picture: GridPicture = {},
): Grid {
  const puzzle = puzzleFrom(digitsFrom(givens), picture.level ?? "easy");
  if (!puzzle) {
    throw new Error("The givens drawn don't have exactly one solution.");
  }
  const digits = [...puzzle.givens];
  const drawn = picture.digits ? digitsFrom(picture.digits) : [];
  drawn.forEach((digit, index) => {
    if (digit === 0) return;
    if (puzzle.givens[index] !== 0) {
      throw new Error(`Square ${index} holds a given.`);
    }
    digits[index] = digit;
  });
  const notes = new Array<number>(CELLS).fill(0);
  for (const [square, list] of Object.entries(picture.notes ?? {})) {
    const index = squareAt(square);
    if (digits[index] !== 0) throw new Error(`${square} holds a digit.`);
    notes[index] = setOf(Array.from(list, Number));
  }
  const solved = digits.every((digit, i) => digit === puzzle.solution[i]);
  return {
    ...createGrid(puzzle),
    digits,
    notes,
    hints: picture.hints ?? 0,
    outcome: solved ? "solved" : "playing",
  };
}

/** Returns a board's digits drawn as nine rows, `.` for a blank. */
export function rowsOf(digits: readonly number[]): string[] {
  const rows: string[] = [];
  for (let row = 0; row < 9; row++) {
    const line = digits.slice(row * 9, row * 9 + 9);
    rows.push(
      line.map((digit) => (digit === 0 ? "." : String(digit))).join(""),
    );
  }
  return rows;
}

/** Returns the square `r<row>c<column>` names, both counted from 1. */
export function squareAt(name: string): number {
  const match = /^r([1-9])c([1-9])$/.exec(name);
  if (!match) throw new Error(`${name} names no square.`);
  return indexAt(Number(match[1]) - 1, Number(match[2]) - 1);
}

/** Returns the digits nine rows draw. */
function digitsFrom(rows: readonly string[]): number[] {
  const digits = parseDigits(rows.join(""));
  if (rows.length !== 9 || !digits) {
    throw new Error("A picture is nine rows of nine digits or dots.");
  }
  return digits;
}

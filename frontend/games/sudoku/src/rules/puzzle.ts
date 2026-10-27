import { CELLS } from "./cells";
import type { Level } from "./difficulty";
import { countSolutions, solve } from "./solver";

/** Holds a puzzle: its givens, its one solution and its level. */
export interface Puzzle {
  /** Each square's given digit, or 0 where it starts blank. */
  readonly givens: readonly number[];
  readonly solution: readonly number[];
  readonly level: Level;
}

/**
 * Returns the digits 81 characters spell, row by row, with `.` or `0` for a
 * blank, or null for any other text.
 */
export function parseDigits(text: string): number[] | null {
  if (text.length !== CELLS || !/^[0-9.]+$/.test(text)) return null;
  return Array.from(text, (char) => (char === "." ? 0 : Number(char)));
}

/** Returns a board's digits as 81 characters, row by row, `.` for a blank. */
export function digitsText(digits: readonly number[]): string {
  return digits.map((digit) => (digit === 0 ? "." : String(digit))).join("");
}

/**
 * Returns the puzzle some givens make, with its solution, or null unless they
 * have exactly one.
 */
export function puzzleFrom(
  givens: readonly number[],
  level: Level,
): Puzzle | null {
  const solution = countSolutions(givens, 2) === 1 ? solve(givens) : null;
  return solution && { givens: [...givens], solution, level };
}

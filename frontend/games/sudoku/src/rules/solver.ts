import { CELLS, at, boxOf, colOf, rowOf } from "./cells";
import { ALL_DIGITS, bit, digitsIn, size } from "./digits";
import { shuffled } from "./random";

// A backtracking solver, which tries the square with the fewest candidates
// first. It checks the logic grader's work, and fills a grid at random for
// the generator; the player never sees it reason.

/** Holds a search under way: the board, and each unit's digits so far. */
interface Search {
  readonly cells: number[];
  readonly rows: number[];
  readonly cols: number[];
  readonly boxes: number[];
}

/**
 * Returns how many solutions a board's digits have, counting no further than
 * `limit`: 2 tells one solution from many. Digits that repeat in a unit have
 * none.
 */
export function countSolutions(
  digits: readonly number[],
  limit: number,
): number {
  const search = prepare(digits);
  if (!search) return 0;
  let found = 0;
  run(search, () => ++found >= limit, digitsIn);
  return found;
}

/** Returns a board's solution, the first found if there are several, or null. */
export function solve(digits: readonly number[]): number[] | null {
  const search = prepare(digits);
  if (!search) return null;
  let solution: number[] | null = null;
  run(
    search,
    () => {
      solution = [...search.cells];
      return true;
    },
    digitsIn,
  );
  return solution;
}

/**
 * Returns a solution found by trying each square's digits in a random order,
 * so an empty board comes back as a random full grid.
 */
export function solveRandomly(
  digits: readonly number[],
  random: () => number,
): number[] | null {
  const search = prepare(digits);
  if (!search) return null;
  let solution: number[] | null = null;
  run(
    search,
    () => {
      solution = [...search.cells];
      return true;
    },
    (set) => shuffled(digitsIn(set), random),
  );
  return solution;
}

/** Returns a search from a board's digits, or null if one repeats in a unit. */
function prepare(digits: readonly number[]): Search | null {
  const search: Search = {
    cells: new Array<number>(CELLS).fill(0),
    rows: new Array<number>(9).fill(0),
    cols: new Array<number>(9).fill(0),
    boxes: new Array<number>(9).fill(0),
  };
  for (let i = 0; i < CELLS; i++) {
    const digit = at(digits, i);
    if (digit === 0) continue;
    if (used(search, i) & bit(digit)) return null;
    place(search, i, digit);
  }
  return search;
}

/**
 * Fills the board's blank squares every way it can, calling `found` with each
 * full board until it returns true, and returns whether it did.
 */
function run(
  search: Search,
  found: () => boolean,
  order: (set: number) => readonly number[],
): boolean {
  let best = -1;
  let bestSet = 0;
  let bestSize = 10;
  for (let i = 0; i < CELLS; i++) {
    if (search.cells[i] !== 0) continue;
    const set = ALL_DIGITS & ~used(search, i);
    const n = size(set);
    if (n < bestSize) {
      best = i;
      bestSet = set;
      bestSize = n;
      if (n <= 1) break;
    }
  }
  if (best === -1) return found();
  for (const digit of order(bestSet)) {
    place(search, best, digit);
    if (run(search, found, order)) return true;
    unplace(search, best, digit);
  }
  return false;
}

/** Returns the digits a square's units already hold. */
function used(search: Search, i: number): number {
  return (
    at(search.rows, rowOf(i)) |
    at(search.cols, colOf(i)) |
    at(search.boxes, boxOf(i))
  );
}

function place(search: Search, i: number, digit: number): void {
  search.cells[i] = digit;
  toggle(search, i, bit(digit));
}

function unplace(search: Search, i: number, digit: number): void {
  search.cells[i] = 0;
  toggle(search, i, bit(digit));
}

function toggle(search: Search, i: number, b: number): void {
  const row = rowOf(i);
  const col = colOf(i);
  const box = boxOf(i);
  search.rows[row] = at(search.rows, row) ^ b;
  search.cols[col] = at(search.cols, col) ^ b;
  search.boxes[box] = at(search.boxes, box) ^ b;
}

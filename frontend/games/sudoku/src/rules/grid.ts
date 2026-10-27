import { CELLS, UNITS, type Unit, at, peersOf, unitsOf } from "./cells";
import { ALL_DIGITS, bit } from "./digits";
import type { Change, Move, Square } from "./history";
import type { Puzzle } from "./puzzle";

/** How a game can stand: in play, or solved, after which nothing changes. */
export type Outcome = "playing" | "solved";

/**
 * Holds one game of Sudoku in play: the puzzle, the digits and notes on the
 * board, the moves undo can take back, the hints used and how it stands.
 *
 * A grid never changes: every move returns a new one, so the shell can hold
 * it in a signal. Squares are numbered row by row from the top left.
 */
export interface Grid {
  readonly puzzle: Puzzle;
  /** Each square's digit, the givens' among them, or 0 where it is blank. */
  readonly digits: readonly number[];
  /** Each square's notes, a set of digits; a square with a digit has none. */
  readonly notes: readonly number[];
  /** The moves made, oldest first, which undo takes back newest first. */
  readonly history: readonly Move[];
  readonly hints: number;
  readonly outcome: Outcome;
}

/** Says how the assists change a move. */
export interface MoveOptions {
  /** Whether a digit placed comes out of its peers' notes. */
  readonly clearNotes: boolean;
}

/** Returns a fresh grid for a puzzle: its givens, and nothing else. */
export function createGrid(puzzle: Puzzle): Grid {
  return {
    puzzle,
    digits: [...puzzle.givens],
    notes: new Array<number>(CELLS).fill(0),
    history: [],
    hints: 0,
    outcome: "playing",
  };
}

/** Returns whether a square holds a given, which no move changes. */
export function isGiven(grid: Grid, index: number): boolean {
  return at(grid.puzzle.givens, index) !== 0;
}

/**
 * Returns the grid after the player puts a digit in a square: it takes the
 * square's notes, and with the assist on, comes out of its peers' notes.
 * Putting in the digit a square already holds takes it away. A given, or a
 * solved game, doesn't change.
 */
export function place(
  grid: Grid,
  index: number,
  digit: number,
  options: MoveOptions,
): Grid {
  if (!isOpen(grid, index)) return grid;
  if (grid.digits[index] === digit) return erase(grid, index);
  const changes: Change[] = [change(grid, index, { digit, notes: 0 })];
  if (options.clearNotes) {
    for (const peer of peersOf(index)) {
      const notes = at(grid.notes, peer);
      if (notes & bit(digit)) {
        changes.push(
          change(grid, peer, { digit: 0, notes: notes & ~bit(digit) }),
        );
      }
    }
  }
  return play(grid, changes);
}

/**
 * Returns the grid after the player clears a square of its digit, or of its
 * notes if it has none. A given, or a solved game, doesn't change.
 */
export function erase(grid: Grid, index: number): Grid {
  if (!isOpen(grid, index)) return grid;
  if (at(grid.digits, index) === 0 && at(grid.notes, index) === 0) {
    return grid;
  }
  return play(grid, [change(grid, index, { digit: 0, notes: 0 })]);
}

/**
 * Returns the grid after the player adds a note to a blank square, or takes
 * one away. A square with a digit, or a solved game, doesn't change.
 */
export function toggleNote(grid: Grid, index: number, digit: number): Grid {
  if (!isOpen(grid, index) || at(grid.digits, index) !== 0) return grid;
  const notes = at(grid.notes, index) ^ bit(digit);
  return play(grid, [change(grid, index, { digit: 0, notes })]);
}

/**
 * Returns the grid after the player notes, in one move, every digit each
 * blank square could still hold by the digits its row, column and box hold.
 * A square with notes keeps them, as the player's own, and a solved game
 * doesn't change.
 */
export function fillNotes(grid: Grid): Grid {
  if (grid.outcome !== "playing") return grid;
  const changes: Change[] = [];
  for (let index = 0; index < CELLS; index++) {
    if (at(grid.digits, index) !== 0 || at(grid.notes, index) !== 0) continue;
    let candidates = ALL_DIGITS;
    for (const peer of peersOf(index)) {
      const digit = at(grid.digits, peer);
      if (digit !== 0) candidates &= ~bit(digit);
    }
    if (candidates !== 0) {
      changes.push(change(grid, index, { digit: 0, notes: candidates }));
    }
  }
  return changes.length > 0 ? play(grid, changes) : grid;
}

/** Returns the grid as it was before the last move, or as it is with none. */
export function undo(grid: Grid): Grid {
  const move = grid.history.at(-1);
  if (!move || grid.outcome === "solved") return grid;
  const digits = [...grid.digits];
  const notes = [...grid.notes];
  for (const { index, before } of move) {
    digits[index] = before.digit;
    notes[index] = before.notes;
  }
  return { ...grid, digits, notes, history: grid.history.slice(0, -1) };
}

/**
 * Returns the same puzzle from the start: its givens, no notes and nothing to
 * undo. The hints used stay counted.
 */
export function restart(grid: Grid): Grid {
  return { ...createGrid(grid.puzzle), hints: grid.hints };
}

/** Returns the grid with one more hint counted. */
export function countHint(grid: Grid): Grid {
  return { ...grid, hints: grid.hints + 1 };
}

/** Returns the units in which a square's digit repeats, row, column, box. */
export function repeatsAt(grid: Grid, index: number): Unit[] {
  const digit = at(grid.digits, index);
  if (digit === 0) return [];
  return unitsOf(index).filter((unit) =>
    unit.cells.some((i) => i !== index && grid.digits[i] === digit),
  );
}

/** Returns which squares hold a digit that repeats in one of their units. */
export function repeats(grid: Grid): boolean[] {
  return Array.from(
    { length: CELLS },
    (_, index) => repeatsAt(grid, index).length > 0,
  );
}

/** Returns which squares hold a digit the solution doesn't. */
export function mistakes(grid: Grid): boolean[] {
  return grid.digits.map(
    (digit, index) => digit !== 0 && digit !== grid.puzzle.solution[index],
  );
}

/** Returns how many of a digit are still to place, never fewer than none. */
export function remaining(grid: Grid, digit: number): number {
  return Math.max(0, 9 - grid.digits.filter((each) => each === digit).length);
}

/** Returns whether every square holds a digit. */
export function isFull(grid: Grid): boolean {
  return grid.digits.every((digit) => digit !== 0);
}

/** Returns whether a unit holds every digit once. */
export function isDone(grid: Grid, unit: Unit): boolean {
  const digits = new Set(unit.cells.map((i) => at(grid.digits, i)));
  return !digits.has(0) && digits.size === 9;
}

/** Returns the units a move finished: done after it, and not before. */
export function unitsDone(before: Grid, after: Grid): Unit[] {
  return UNITS.filter((unit) => isDone(after, unit) && !isDone(before, unit));
}

/** Returns whether a move may change a square. */
function isOpen(grid: Grid, index: number): boolean {
  return (
    grid.outcome === "playing" &&
    index >= 0 &&
    index < CELLS &&
    !isGiven(grid, index)
  );
}

/** Returns how a square would change to hold what is given. */
function change(grid: Grid, index: number, after: Square): Change {
  return {
    index,
    before: { digit: at(grid.digits, index), notes: at(grid.notes, index) },
    after,
  };
}

/** Returns the grid after a move's changes, with the move in its history. */
function play(grid: Grid, move: Move): Grid {
  const digits = [...grid.digits];
  const notes = [...grid.notes];
  for (const { index, after } of move) {
    digits[index] = after.digit;
    notes[index] = after.notes;
  }
  const solved = digits.every(
    (digit, index) => digit === grid.puzzle.solution[index],
  );
  return {
    ...grid,
    digits,
    notes,
    history: [...grid.history, move],
    outcome: solved ? "solved" : "playing",
  };
}

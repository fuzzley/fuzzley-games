import { CELLS } from "./cells";
import { type Level, isLevel } from "./difficulty";
import { isDigitSet } from "./digits";
import { type Grid, isGiven } from "./grid";
import { packHistory, unpackHistory } from "./history";
import { isRecord, isWhole } from "./json";
import { digitsText, parseDigits, puzzleFrom } from "./puzzle";

/** A grid as it is stored: plain JSON. */
export interface SavedGrid {
  readonly version: 1;
  readonly level: Level;
  /** The givens, 81 characters with `.` for a blank. */
  readonly givens: string;
  /** Every square's digit, the givens' among them, the same way. */
  readonly digits: string;
  /** Each square's notes, a set of digits. */
  readonly notes: readonly number[];
  /** Each move, five numbers for each square it changed. */
  readonly history: readonly (readonly number[])[];
  readonly hints: number;
}

/** Returns a grid as it is stored. */
export function saveGrid(grid: Grid): SavedGrid {
  return {
    version: 1,
    level: grid.puzzle.level,
    givens: digitsText(grid.puzzle.givens),
    digits: digitsText(grid.digits),
    notes: [...grid.notes],
    history: packHistory(grid.history),
    hints: grid.hints,
  };
}

/**
 * Returns the grid a stored one describes, or null when it is not one the
 * game could have saved: from another version, cut short, or edited. The
 * solution is worked out again from the givens, so an edited one can't
 * hand the game a wrong one.
 */
export function restoreGrid(saved: unknown): Grid | null {
  if (!isRecord(saved) || saved["version"] !== 1) return null;
  const { level, hints, notes } = saved;
  const givens = parseText(saved["givens"]);
  const digits = parseText(saved["digits"]);
  const history = unpackHistory(saved["history"]);
  if (
    !isLevel(level) ||
    !isWhole(hints) ||
    hints < 0 ||
    !givens ||
    !digits ||
    !history ||
    !isNotes(notes)
  ) {
    return null;
  }
  const puzzle = puzzleFrom(givens, level);
  if (!puzzle) return null;
  const grid: Grid = {
    puzzle,
    digits,
    notes,
    history,
    hints,
    outcome: digits.every((digit, i) => digit === puzzle.solution[i])
      ? "solved"
      : "playing",
  };
  const fits = digits.every(
    (digit, i) =>
      (!isGiven(grid, i) || digit === givens[i]) &&
      (digit === 0 || notes[i] === 0),
  );
  const movesFit = history.every((move) =>
    move.every(({ index }) => !isGiven(grid, index)),
  );
  return fits && movesFit ? grid : null;
}

function parseText(value: unknown): number[] | null {
  return typeof value === "string" ? parseDigits(value) : null;
}

function isNotes(value: unknown): value is number[] {
  return (
    Array.isArray(value) && value.length === CELLS && value.every(isDigitSet)
  );
}

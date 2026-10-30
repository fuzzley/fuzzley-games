import { CELLS } from "./cells";
import { type Level, isLevel } from "./difficulty";
import { isDigitSet } from "./digits";
import { type Grid, isGiven } from "./grid";
import type { Change, Move, Square } from "./history";
import { isCount, isRecord } from "@fz/core/json";
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
 * hand the game a wrong one, and the last move must have left the board as
 * it is.
 */
export function restoreGrid(saved: unknown): Grid | null {
  if (!isRecord(saved) || saved["version"] !== 1) return null;
  const { level, hints, notes } = saved;
  const givens = parseText(saved["givens"]);
  const digits = parseText(saved["digits"]);
  const history = unpackHistory(saved["history"]);
  if (
    !isLevel(level) ||
    !isCount(hints) ||
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
  const lastFits = (history.at(-1) ?? []).every(
    ({ index, after }) =>
      digits[index] === after.digit && notes[index] === after.notes,
  );
  return fits && movesFit && lastFits ? grid : null;
}

/** Returns the digits a stored text of 81 holds, or null for anything else. */
function parseText(value: unknown): number[] | null {
  return typeof value === "string" ? parseDigits(value) : null;
}

/** Returns whether a stored value is 81 sets of notes. */
function isNotes(value: unknown): value is number[] {
  return (
    Array.isArray(value) && value.length === CELLS && value.every(isDigitSet)
  );
}

/** Returns the moves as they are stored: five numbers for each change. */
function packHistory(history: readonly Move[]): number[][] {
  return history.map((move) =>
    move.flatMap(({ index, before, after }) => [
      index,
      before.digit,
      before.notes,
      after.digit,
      after.notes,
    ]),
  );
}

/**
 * Returns the moves a stored history holds, or null if it isn't one the game
 * could have stored.
 */
function unpackHistory(value: unknown): Move[] | null {
  if (!Array.isArray(value)) return null;
  const history: Move[] = [];
  for (const packed of value) {
    const move = unpackMove(packed);
    if (!move) return null;
    history.push(move);
  }
  return history;
}

function unpackMove(value: unknown): Move | null {
  if (!Array.isArray(value) || value.length === 0 || value.length % 5 !== 0) {
    return null;
  }
  const numbers: unknown[] = value;
  const move: Change[] = [];
  for (let at = 0; at < numbers.length; at += 5) {
    const [index, digitBefore, notesBefore, digitAfter, notesAfter] =
      numbers.slice(at, at + 5);
    const before = squareOf(digitBefore, notesBefore);
    const after = squareOf(digitAfter, notesAfter);
    if (!isCount(index) || index >= CELLS || !before || !after) {
      return null;
    }
    move.push({ index, before, after });
  }
  return move;
}

/**
 * Returns what a stored square holds, or null for what no square can: a
 * digit past 9, notes past 9, or a digit with notes beside it.
 */
function squareOf(digit: unknown, notes: unknown): Square | null {
  if (!isDigit(digit) || !isDigitSet(notes)) return null;
  return digit !== 0 && notes !== 0 ? null : { digit, notes };
}

/** Returns whether a value is a square's digit, or 0 for none. */
function isDigit(value: unknown): value is number {
  return isCount(value) && value <= 9;
}

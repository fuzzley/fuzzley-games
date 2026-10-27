import { CELLS } from "./cells";
import { isDigitSet } from "./digits";
import { isWhole } from "./json";

/** Says what one square holds: a digit, or 0, and a set of notes. */
export interface Square {
  readonly digit: number;
  readonly notes: number;
}

/** Says how a move changed one square. */
export interface Change {
  readonly index: number;
  readonly before: Square;
  readonly after: Square;
}

/** Lists the squares one move changed, which undo takes back together. */
export type Move = readonly Change[];

/** Returns the moves as they are stored: five numbers for each change. */
export function packHistory(history: readonly Move[]): number[][] {
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
export function unpackHistory(value: unknown): Move[] | null {
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
    if (
      !isWhole(index) ||
      index < 0 ||
      index >= CELLS ||
      !isDigit(digitBefore) ||
      !isDigit(digitAfter) ||
      !isDigitSet(notesBefore) ||
      !isDigitSet(notesAfter)
    ) {
      return null;
    }
    move.push({
      index,
      before: { digit: digitBefore, notes: notesBefore },
      after: { digit: digitAfter, notes: notesAfter },
    });
  }
  return move;
}

/** Returns whether a value is a square's digit, or 0 for none. */
function isDigit(value: unknown): value is number {
  return isWhole(value) && value >= 0 && value <= 9;
}

import { type FieldSize, isValidLives } from "./difficulty";
import { type Field, type Outcome, type Square, layoutOf } from "./field";

/** A field as it is stored: plain JSON, a letter a square. */
export interface SavedField {
  readonly version: 1;
  readonly rows: number;
  readonly cols: number;
  readonly mines: number;
  readonly seed: number;
  /** The squares the mines lie on, or null before they are placed. */
  readonly mineSquares: readonly number[] | null;
  /** One letter a square, from `LETTERS`. */
  readonly squares: string;
  readonly lives: number;
  readonly livesLeft: number;
  readonly outcome: Outcome;
}

/** The letter each square is stored as. */
const LETTERS: Readonly<Record<Square, string>> = {
  hidden: "h",
  flagged: "f",
  revealed: "r",
  tripped: "t",
};

const SQUARES: readonly Square[] = ["hidden", "flagged", "revealed", "tripped"];

const OUTCOMES: readonly Outcome[] = ["ready", "playing", "won", "lost"];

/** Returns a field as it is stored. */
export function saveField(field: Field): SavedField {
  const mines = field.layout?.mines;
  return {
    version: 1,
    ...field.size,
    seed: field.seed,
    mineSquares: mines
      ? [...mines.keys()].filter((index) => mines[index])
      : null,
    squares: field.squares.map((square) => LETTERS[square]).join(""),
    lives: field.lives,
    livesLeft: field.livesLeft,
    outcome: field.outcome,
  };
}

/**
 * Returns the field a stored one describes, or null when it is not one the
 * game could have saved: from another version, cut short, or edited.
 */
export function restoreField(saved: unknown): Field | null {
  if (!isRecord(saved) || saved["version"] !== 1) return null;
  const { rows, cols, mines, seed, lives, livesLeft } = saved;
  if (
    !isWhole(rows) ||
    !isWhole(cols) ||
    !isWhole(mines) ||
    !isWhole(seed) ||
    !isWhole(lives) ||
    !isWhole(livesLeft) ||
    !isValidLives(lives) ||
    livesLeft < 0 ||
    livesLeft > lives ||
    rows < 1 ||
    cols < 1 ||
    mines < 1 ||
    mines >= rows * cols
  ) {
    return null;
  }
  const size: FieldSize = { rows, cols, mines };
  const outcome = OUTCOMES.find((each) => each === saved["outcome"]);
  const squares = parseSquares(saved["squares"], rows * cols);
  if (!outcome || !squares) return null;
  const mineSquares = saved["mineSquares"];
  if (mineSquares === null) {
    const untouched = squares.every((s) => s === "hidden" || s === "flagged");
    if (!untouched || outcome !== "ready" || livesLeft !== lives) return null;
    return { size, seed, layout: null, squares, lives, livesLeft, outcome };
  }
  const minesAt = parseMines(mineSquares, size);
  if (!minesAt) return null;
  // A revealed square never hides a mine, and a tripped one always does.
  const consistent = squares.every(
    (square, i) =>
      (square !== "revealed" || !minesAt[i]) &&
      (square !== "tripped" || minesAt[i]),
  );
  if (!consistent) return null;
  const layout = layoutOf(size, minesAt);
  return { size, seed, layout, squares, lives, livesLeft, outcome };
}

/** Returns the squares a stored string spells, or null if it spells none. */
function parseSquares(value: unknown, length: number): Square[] | null {
  if (typeof value !== "string" || value.length !== length) return null;
  const squares: Square[] = [];
  for (const letter of value) {
    const square = SQUARES.find((each) => LETTERS[each] === letter);
    if (!square) return null;
    squares.push(square);
  }
  return squares;
}

/** Returns where the stored mines lie, or null if they can't all be there. */
function parseMines(value: unknown, size: FieldSize): boolean[] | null {
  const total = size.rows * size.cols;
  if (!Array.isArray(value) || value.length !== size.mines) return null;
  const mines = new Array<boolean>(total).fill(false);
  for (const index of value) {
    if (!isWhole(index) || index < 0 || index >= total || mines[index]) {
      return null;
    }
    mines[index] = true;
  }
  return mines;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWhole(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

import type { FieldSize } from "./difficulty";
import { createRandom } from "./random";

/** Names what a square shows: a mine stepped on is `tripped`. */
export type Square = "hidden" | "flagged" | "revealed" | "tripped";

/**
 * Names how a game stands: `ready` until the first square is revealed, which
 * is when the mines are placed.
 */
export type Outcome = "ready" | "playing" | "won" | "lost";

/** Says where the mines lie, and how many lie around each square. */
export interface Layout {
  readonly mines: readonly boolean[];
  readonly counts: readonly number[];
}

/**
 * Holds one game of Minesweeper: its size, its mines, what each square shows,
 * the lives left and how it stands.
 *
 * A field never changes: every move returns a new one, so the shell can hold
 * it in a signal. Squares are numbered row by row from the top left.
 */
export interface Field {
  readonly size: FieldSize;
  /** What the mines are placed from, with the first square revealed. */
  readonly seed: number;
  /** Where the mines lie, or null until the first reveal places them. */
  readonly layout: Layout | null;
  readonly squares: readonly Square[];
  readonly lives: number;
  readonly livesLeft: number;
  readonly outcome: Outcome;
}

/** Returns a fresh field, its mines not yet placed. */
export function createField(
  size: FieldSize,
  lives: number,
  seed: number,
): Field {
  return {
    size,
    seed,
    layout: null,
    squares: new Array<Square>(size.rows * size.cols).fill("hidden"),
    lives,
    livesLeft: lives,
    outcome: "ready",
  };
}

/** Returns the same field from the start: the same mines, every square hidden. */
export function restart(field: Field): Field {
  return {
    ...field,
    squares: new Array<Square>(field.squares.length).fill("hidden"),
    livesLeft: field.lives,
    outcome: "ready",
  };
}

/** Returns the squares around one, in reading order. */
export function neighbors(size: FieldSize, index: number): number[] {
  const row = Math.floor(index / size.cols);
  const col = index % size.cols;
  const around: number[] = [];
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      const inside = r >= 0 && r < size.rows && c >= 0 && c < size.cols;
      if (inside && (r !== row || c !== col)) around.push(r * size.cols + c);
    }
  }
  return around;
}

/**
 * Returns where the mines lie for a seed, never on the first square revealed
 * or around it, so the first reveal always opens ground.
 */
export function layMines(size: FieldSize, seed: number, first: number): Layout {
  const total = size.rows * size.cols;
  const clear = new Set([first, ...neighbors(size, first)]);
  const spots = [...Array(total).keys()].filter((i) => !clear.has(i));
  const random = createRandom(seed);
  const mines = new Array<boolean>(total).fill(false);
  for (let placed = 0; placed < size.mines; placed++) {
    const [spot] = spots.splice(Math.floor(random() * spots.length), 1);
    if (spot !== undefined) mines[spot] = true;
  }
  return layoutOf(size, mines);
}

/** Returns a layout for mines already placed, with each square's count. */
export function layoutOf(size: FieldSize, mines: readonly boolean[]): Layout {
  const counts = mines.map(
    (_, i) => neighbors(size, i).filter((j) => mines[j]).length,
  );
  return { mines, counts };
}

/**
 * Returns the field after the player reveals a square.
 *
 * The first reveal places the mines. A hidden square opens, and a blank one
 * opens the ground around it; a mine costs a life, and the last life loses
 * the game. Revealing a number whose flags match it opens its other
 * neighbors. A flagged square, or a finished game, doesn't change.
 */
export function reveal(field: Field, index: number): Field {
  if (isOver(field)) return field;
  const square = field.squares[index];
  if (square === undefined || square === "flagged" || square === "tripped") {
    return field;
  }
  const layout = field.layout ?? layMines(field.size, field.seed, index);
  if (square === "revealed") return clearAround(field, layout, index);
  return settle({ ...field, layout, outcome: "playing" }, layout, [index]);
}

/**
 * Returns the field after the player flags a hidden square, or takes a flag
 * off one. A finished game doesn't change.
 */
export function toggleFlag(field: Field, index: number): Field {
  if (isOver(field)) return field;
  const square = field.squares[index];
  if (square !== "hidden" && square !== "flagged") return field;
  const squares = [...field.squares];
  squares[index] = square === "hidden" ? "flagged" : "hidden";
  return { ...field, squares };
}

/** Returns whether revealing a number would open the squares around it. */
export function canClearAround(field: Field, index: number): boolean {
  const layout = field.layout;
  if (!layout || field.squares[index] !== "revealed") return false;
  const around = neighbors(field.size, index);
  const marked = around.filter((i) => isMarked(field.squares[i])).length;
  return (
    marked === layout.counts[index] &&
    around.some((i) => field.squares[i] === "hidden")
  );
}

/** Opens the hidden neighbors of a number whose flags match it. */
function clearAround(field: Field, layout: Layout, index: number): Field {
  if (!canClearAround(field, index)) return field;
  const hidden = neighbors(field.size, index).filter(
    (i) => field.squares[i] === "hidden",
  );
  return settle(field, layout, hidden);
}

/**
 * Opens each of the squares given, flooding out from blank ones, then charges
 * a life for each mine among them and decides the game.
 */
function settle(
  field: Field,
  layout: Layout,
  opened: readonly number[],
): Field {
  const squares = [...field.squares];
  let livesLeft = field.livesLeft;
  const stack: number[] = [];
  for (const index of opened) {
    if (layout.mines[index]) {
      squares[index] = "tripped";
      livesLeft = Math.max(0, livesLeft - 1);
    } else {
      stack.push(index);
    }
  }
  // A loop rather than recursion, which a large blank field would overflow.
  for (let index = stack.pop(); index !== undefined; index = stack.pop()) {
    if (squares[index] !== "hidden") continue;
    squares[index] = "revealed";
    if (layout.counts[index] === 0) stack.push(...neighbors(field.size, index));
  }
  const settled = { ...field, squares, livesLeft };
  if (livesLeft === 0) return { ...settled, outcome: "lost" };
  if (revealedCount(settled) === safeCount(settled)) {
    // Won: every mine left standing is shown flagged.
    const flagged = squares.map((s, i) =>
      layout.mines[i] && s === "hidden" ? "flagged" : s,
    );
    return { ...settled, squares: flagged, outcome: "won" };
  }
  return settled;
}

/** Returns whether a square is marked as a mine: flagged, or stepped on. */
function isMarked(square: Square | undefined): boolean {
  return square === "flagged" || square === "tripped";
}

/** Returns the mines not yet flagged or stepped on. */
export function minesLeft(field: Field): number {
  return field.size.mines - field.squares.filter(isMarked).length;
}

/** Returns how many mines the player has found: flagged, or stepped on. */
export function minesFound(field: Field): number {
  const mines = field.layout?.mines;
  if (!mines) return 0;
  return field.squares.filter(
    (square, i) => square === "tripped" || (square === "flagged" && mines[i]),
  ).length;
}

/** Returns how many squares are revealed. */
export function revealedCount(field: Field): number {
  return field.squares.filter((s) => s === "revealed").length;
}

/** Returns how many squares hide no mine. */
function safeCount(field: Field): number {
  return field.squares.length - field.size.mines;
}

/** Returns how much of the field's safe ground is revealed, from 0 to 1. */
export function clearedShare(field: Field): number {
  return revealedCount(field) / safeCount(field);
}

/** Returns whether the game is over, won or lost. */
export function isOver(field: Field): boolean {
  return field.outcome === "won" || field.outcome === "lost";
}

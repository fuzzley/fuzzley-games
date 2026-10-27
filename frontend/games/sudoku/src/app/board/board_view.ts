import { CELLS, LINES, at, colOf, rowOf, sees } from "../../rules/cells";
import { describeSquare } from "../../rules/describe";
import { DIGITS, has } from "../../rules/digits";
import { type Grid, isGiven, mistakes, repeats } from "../../rules/grid";
import type { Hint } from "../../rules/hint";

/** How long each square's flash of the solved board's wave runs, in ms. */
export const WAVE_RUN_MS = 600;

/** How much later the wave reaches each square one step further on, in ms. */
export const WAVE_STEP_MS = 40;

/**
 * How long the whole wave runs, in ms: the delay of the last square, 16 steps
 * from the first, and its flash.
 */
export const WAVE_MS = 16 * WAVE_STEP_MS + WAVE_RUN_MS;

/**
 * Names how a square is shaded, the strongest reason first: a hint points at
 * it, it is selected, it holds the selected square's digit, it is one of the
 * squares a hint's words name, it is in the unit a hint's square is the one
 * place left in, or it shares a unit with the selected square.
 */
export type Shade =
  "hinted" | "selected" | "same" | "pattern" | "unit" | "related";

/** Describes one place in a square's notes. */
export interface NoteView {
  /** The digit noted there, or nothing. */
  readonly text: string;
  /** Whether it is the selected square's digit, which stands out. */
  readonly match: boolean;
}

/** Describes one square as the board draws it. */
export interface CellView {
  /** The square's place on the board, which the rules know it by. */
  readonly index: number;
  readonly row: number;
  readonly col: number;
  /** The digit it holds, or 0. */
  readonly digit: number;
  readonly given: boolean;
  /** Its notes, a place for each digit, or null with none to show. */
  readonly notes: readonly NoteView[] | null;
  readonly shade: Shade | null;
  /**
   * Whether its digit repeats in a unit, or is wrong with the assist on. A
   * marked square is never shaded, as the danger color clears 4.5:1 only on
   * the board's own color.
   */
  readonly marked: boolean;
  readonly selected: boolean;
  /** 0 for the selected square, the board's one tab stop; -1 for the rest. */
  readonly tabIndex: 0 | -1;
  readonly label: string;
}

/** Says what the board shows the squares against. */
export interface BoardState {
  readonly grid: Grid;
  readonly selected: number;
  /** The hint showing, or null. */
  readonly hint: Pick<Hint, "index" | "pattern" | "unit"> | null;
  /** Whether a digit the solution doesn't hold is marked. */
  readonly markMistakes: boolean;
}

/** Returns the board's squares, a row at a time, as the board draws them. */
export function boardView(state: BoardState): CellView[][] {
  const { grid, selected, markMistakes } = state;
  const repeated = repeats(grid);
  const wrong = mistakes(grid);
  const digit = at(grid.digits, selected);
  const cells = Array.from({ length: CELLS }, (_, index): CellView => {
    const given = isGiven(grid, index);
    const marked =
      repeated[index] === true ||
      (markMistakes && !given && wrong[index] === true);
    return {
      index,
      row: rowOf(index),
      col: colOf(index),
      digit: at(grid.digits, index),
      given,
      notes: notesView(at(grid.notes, index), digit),
      shade: marked ? null : shadeOf(state, index),
      marked,
      selected: index === selected,
      tabIndex: index === selected ? 0 : -1,
      label: describeSquare(grid, index, markMistakes),
    };
  });
  return LINES.map((row) => cells.slice(row * 9, row * 9 + 9));
}

/**
 * Returns how a square is shaded, the strongest reason first, or null for
 * none. It doesn't know whether the square is marked, which `boardView()`
 * checks first.
 */
export function shadeOf(state: BoardState, index: number): Shade | null {
  const { grid, selected, hint } = state;
  const digit = at(grid.digits, selected);
  if (index === hint?.index) return "hinted";
  if (index === selected) return "selected";
  if (digit !== 0 && at(grid.digits, index) === digit) return "same";
  if (hint?.pattern.includes(index)) return "pattern";
  if (hint?.unit.includes(index)) return "unit";
  return sees(index, selected) ? "related" : null;
}

/** Returns a square's notes, a place for each digit, or null for none. */
function notesView(notes: number, selectedDigit: number): NoteView[] | null {
  if (notes === 0) return null;
  return DIGITS.map((each) => ({
    text: has(notes, each) ? String(each) : "",
    match: has(notes, each) && each === selectedDigit,
  }));
}

import { at } from "./cells";
import {
  describeChain,
  describeMissingNote,
  describeMistake,
} from "./describe";
import { has } from "./digits";
import {
  type Grid,
  type MoveOptions,
  erase,
  mistakes,
  place,
  toggleNote,
} from "./grid";
import { type Chain, agrees, nextPlacement, shownBy } from "./logic";

/** Says what a hint points at, until the board changes. */
export interface Hint {
  /**
   * `mistake` points at a wrong digit; `note`, at notes that leave out the
   * square's digit; `step`, at the square logic fills next.
   */
  readonly kind: "mistake" | "note" | "step";
  /** The square it is about. */
  readonly index: number;
  /**
   * The digit a step fills in, or the note it adds; a mistake's digit comes
   * out instead.
   */
  readonly digit: number;
  /** The squares that show why. */
  readonly shown: readonly number[];
  readonly title: string;
  readonly text: string;
}

/** Finds the steps that fill one more square of a board. */
export type ChainFinder = (digits: readonly number[]) => Chain | null;

/**
 * Returns the hint for a board, or null when there is none: a digit the
 * solution doesn't hold first, then notes that leave out their square's
 * digit, then the square logic fills next.
 *
 * A chain with a step that disagrees with the solution counts as none, so a
 * bug in a technique can't show the player a wrong digit.
 */
export function hintFor(
  grid: Grid,
  findChain: ChainFinder = nextPlacement,
): Hint | null {
  const wrong = mistakes(grid).indexOf(true);
  if (wrong !== -1) {
    return { ...about("mistake", wrong, 0), ...describeMistake(grid, wrong) };
  }
  const { solution } = grid.puzzle;
  const missing = grid.notes.findIndex(
    (notes, index) => notes !== 0 && !has(notes, at(solution, index)),
  );
  if (missing !== -1) {
    return {
      ...about("note", missing, at(solution, missing)),
      ...describeMissingNote(missing),
    };
  }
  const chain = findChain(grid.digits);
  if (!chain) return null;
  const steps = [...chain.eliminations, chain.placement];
  if (!steps.every((step) => agrees(step, solution))) return null;
  const { index, digit } = chain.placement;
  return {
    ...about("step", index, digit),
    shown: shownBy(chain),
    ...describeChain(chain),
  };
}

/**
 * Returns the grid after a hint is filled in: the digit a step names goes
 * in, the note goes back, or the wrong digit comes out.
 */
export function fillHint(grid: Grid, hint: Hint, options: MoveOptions): Grid {
  switch (hint.kind) {
    case "mistake":
      return erase(grid, hint.index);
    case "note":
      return toggleNote(grid, hint.index, hint.digit);
    case "step":
      return place(grid, hint.index, hint.digit, options);
  }
}

/** Returns the first blank square, where a fresh deal puts the selection. */
export function firstBlank(grid: Grid): number {
  return Math.max(0, grid.digits.indexOf(0));
}

/** Returns what a hint is about, showing no squares beside it. */
function about(
  kind: Hint["kind"],
  index: number,
  digit: number,
): Pick<Hint, "kind" | "index" | "digit" | "shown"> {
  return { kind, index, digit, shown: [] };
}

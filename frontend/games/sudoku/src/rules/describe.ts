import { listed } from "@fz/core/format";
import { type Unit, at, colOf, rowOf } from "./cells";
import { digitsIn, firstDigit, size } from "./digits";
import { type Grid, isFull, isGiven, repeatsAt, unitsDone } from "./grid";
import {
  type Chain,
  type Elimination,
  type Placement,
  type Technique,
  hardest,
} from "./logic";

/** Each technique's name, as a hint titles it. */
export const TECHNIQUE_NAMES: Readonly<Record<Technique, string>> = {
  "hidden-single": "Hidden single",
  "naked-single": "Naked single",
  pointing: "Pointing",
  claiming: "Claiming",
  "naked-pair": "Naked pair",
  "hidden-pair": "Hidden pair",
  "naked-triple": "Naked triple",
  "hidden-triple": "Hidden triple",
  "x-wing": "X-Wing",
  swordfish: "Swordfish",
  "xy-wing": "XY-Wing",
};

/** Says what a hint shows: what it is, and why. */
export interface HintWords {
  readonly title: string;
  /** What to do, in a sentence of its own, for when there is no room for why. */
  readonly conclusion: string;
  /** Every step, the conclusion's last. */
  readonly text: string;
}

/** Returns a unit's name, counted from 1, such as "row 4" or "box 5". */
export function unitName(unit: Unit): string {
  return `${unit.kind} ${unit.n + 1}`;
}

/** Returns where a square is, counted from 1, such as "row 3, column 4". */
export function squareName(index: number): string {
  return `row ${rowOf(index) + 1}, column ${colOf(index) + 1}`;
}

/**
 * Returns what a screen reader calls a square: its digit and whether it is
 * given, or its notes, and whether its digit repeats in a unit or, with the
 * assist on, disagrees with the solution.
 */
export function describeSquare(
  grid: Grid,
  index: number,
  markMistakes: boolean,
): string {
  const digit = at(grid.digits, index);
  if (digit === 0) {
    const notes = digitsIn(at(grid.notes, index));
    return notes.length > 0 ? `Blank, notes ${notes.join(" ")}` : "Blank";
  }
  const parts = [String(digit)];
  const given = isGiven(grid, index);
  if (given) parts.push("given");
  const units = repeatsAt(grid, index);
  if (units.length > 0) {
    parts.push(`repeats in ${listed(units.map(unitName))}`);
  } else if (markMistakes && !given && digit !== grid.puzzle.solution[index]) {
    parts.push("wrong");
  }
  return parts.join(", ");
}

/**
 * Returns what a move did, for a screen reader to say, from the grid before
 * it and after: empty if it did nothing.
 */
export function describeMove(before: Grid, after: Grid): string {
  const [main] = after.history.at(-1) ?? [];
  if (!main || after.history.length <= before.history.length) return "";
  if (after.outcome === "solved") return "Solved.";
  const { index, before: was, after: now } = main;
  if (now.digit !== 0) {
    const parts = [`${now.digit}.`];
    const units = repeatsAt(after, index);
    if (units.length > 0) {
      parts.push(`${now.digit} repeats in ${listed(units.map(unitName))}.`);
    }
    for (const unit of unitsDone(before, after)) {
      parts.push(`${capitalized(unitName(unit))} done.`);
    }
    if (isFull(after)) {
      parts.push("Every square is filled, but something is wrong.");
    }
    return parts.join(" ");
  }
  if (was.digit !== 0) return "Erased.";
  const added = now.notes & ~was.notes;
  const removed = was.notes & ~now.notes;
  if (added !== 0) return `Note ${firstDigit(added)}.`;
  return size(removed) === 1
    ? `Note ${firstDigit(removed)} removed.`
    : "Erased.";
}

/**
 * Returns what undoing a move did, for a screen reader to say, from the grid
 * before the undo and after: empty if it did nothing.
 */
export function describeUndo(before: Grid, after: Grid): string {
  const [main] = before.history.at(-1) ?? [];
  if (!main || after.history.length >= before.history.length) return "";
  // `main.before` is what the undo brings back, `main.after` what it takes.
  const { index, before: back, after: taken } = main;
  const square = squareName(index);
  if (back.digit !== 0) return `Undone: ${back.digit} back in ${square}.`;
  if (taken.digit !== 0) {
    return `Undone: ${taken.digit} taken out of ${square}.`;
  }
  const added = taken.notes & ~back.notes;
  if (added !== 0) {
    return `Undone: ${notesWords(added)} taken out of ${square}.`;
  }
  return `Undone: ${notesWords(back.notes & ~taken.notes)} back in ${square}.`;
}

/**
 * Returns why a move on a square changed nothing, for a screen reader to
 * say: the square is given, holds a digit a note can't go beside, or has
 * nothing to erase. It is empty once the puzzle is solved, when the result
 * says what there is to say.
 */
export function describeRefusal(grid: Grid, index: number): string {
  if (grid.outcome === "solved") return "";
  const square = capitalized(squareName(index));
  if (isGiven(grid, index)) return `${square} is given.`;
  const digit = at(grid.digits, index);
  if (digit !== 0) {
    return `${square} already has a digit. Erase it to add notes.`;
  }
  return "Nothing to erase.";
}

/** Returns the words of a hint that names the next steps of logic. */
export function describeChain({ eliminations, placement }: Chain): HintWords {
  const technique = hardest(eliminations) ?? placement.technique;
  const sentences = [
    ...eliminations.map(eliminationWords),
    placementWords(placement, eliminations.length > 0),
  ];
  return {
    title: TECHNIQUE_NAMES[technique],
    conclusion: `The ${placement.digit} goes in ${squareName(placement.index)}.`,
    text: sentences.join(" "),
  };
}

/** Returns the words of a hint that points out a digit that doesn't belong. */
export function describeMistake(grid: Grid, index: number): HintWords {
  const digit = at(grid.digits, index);
  const text = `The ${digit} at ${squareName(index)} doesn't belong there.`;
  return { title: "A mistake", conclusion: text, text };
}

/** Returns the words of a hint that points out notes missing their digit. */
export function describeMissingNote(index: number): HintWords {
  const text = `The notes at ${squareName(index)} are missing the digit that goes there.`;
  return { title: "A missing note", conclusion: text, text };
}

/** Returns the sentence for a step that fills a square. */
function placementWords(step: Placement, afterOthers: boolean): string {
  const { digit, index, unit } = step;
  const square = squareName(index);
  if (unit) {
    const place = placeIn(unit, index);
    return afterOthers
      ? `Now the only place for the ${digit} in ${unitName(unit)} is ${place}.`
      : `In ${unitName(unit)}, the ${digit} can only go in ${place}.`;
  }
  return afterOthers
    ? `Now only ${digit} can go in ${square}.`
    : `Only ${digit} can go in ${square}.`;
}

/**
 * Returns where a square is within a unit: its column in a row, its row in a
 * column, and both in a box, such as "column 5" for row 2, column 5 in row 2.
 */
function placeIn(unit: Unit, index: number): string {
  switch (unit.kind) {
    case "row":
      return `column ${colOf(index) + 1}`;
    case "column":
      return `row ${rowOf(index) + 1}`;
    case "box":
      return squareName(index);
  }
}

/** Returns the sentence for a step that rules digits out. */
function eliminationWords(step: Elimination): string {
  const { digits, cells, units } = step;
  const names = units.map(unitName);
  const [first = "", second = ""] = names;
  const digitList = listed(digits.map(String));
  switch (step.technique) {
    case "pointing":
    case "claiming":
      return `In ${first}, the ${digitList} can only go in ${second}, so it can't go anywhere else in ${second}.`;
    case "naked-pair":
    case "naked-triple":
      return `${capitalized(first)} has ${cells.length} squares where only ${digitList} can go. So ${digitList} can't go anywhere else in ${first}.`;
    case "hidden-pair":
    case "hidden-triple":
      return `In ${first}, the ${digitList} can only go in the same ${cells.length} squares, so no other digit can go in those squares.`;
    case "x-wing":
    case "swordfish": {
      const half = units.length / 2;
      const cover = units.slice(half);
      return `In ${linesName(units.slice(0, half))}, the ${digitList} can only go in ${linesName(cover)}, so it can't go anywhere else in those ${cover[0]?.kind ?? ""}s.`;
    }
    case "xy-wing": {
      const [x, y, z] = digits;
      const [pivot = 0, a = 0, b = 0] = cells;
      return `The square at ${squareName(pivot)} can only be ${x} or ${y}. Either way, the square at ${squareName(a)} or the one at ${squareName(b)} must be ${z}. So ${z} can't go in any square that shares a row, column or box with both of them.`;
    }
  }
}

/** Returns notes named together, such as "note 3" or "notes 1, 3 and 8". */
function notesWords(notes: number): string {
  const digits = digitsIn(notes).map(String);
  return `${digits.length === 1 ? "note" : "notes"} ${listed(digits)}`;
}

/** Returns lines of one kind named together, such as "rows 2 and 8". */
function linesName(lines: readonly Unit[]): string {
  const numbers = lines.map((line) => String(line.n + 1));
  return `${lines[0]?.kind ?? ""}s ${listed(numbers)}`;
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

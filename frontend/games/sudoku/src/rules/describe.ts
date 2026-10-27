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
    parts.push(`repeats in ${listOf(units.map(unitName))}`);
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
      parts.push(`${now.digit} repeats in ${listOf(units.map(unitName))}.`);
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

/** Returns the words of a hint that names the next steps of logic. */
export function describeChain({ eliminations, placement }: Chain): HintWords {
  const technique = hardest(eliminations) ?? placement.technique;
  const sentences = [
    ...eliminations.map(eliminationWords),
    placementWords(placement, eliminations.length > 0),
  ];
  return { title: TECHNIQUE_NAMES[technique], text: sentences.join(" ") };
}

/** Returns the words of a hint that points out a digit that doesn't belong. */
export function describeMistake(grid: Grid, index: number): HintWords {
  const digit = at(grid.digits, index);
  return {
    title: "A mistake",
    text: `The ${digit} at ${squareName(index)} doesn't belong there.`,
  };
}

/** Returns the words of a hint that points out notes missing their digit. */
export function describeMissingNote(index: number): HintWords {
  return {
    title: "A missing note",
    text: `The notes at ${squareName(index)} leave out the digit that belongs there.`,
  };
}

/** Returns the sentence for a step that fills a square. */
function placementWords(step: Placement, afterOthers: boolean): string {
  const { digit, index, unit } = step;
  const square = squareName(index);
  if (unit) {
    return afterOthers
      ? `That leaves the ${digit} one place in ${unitName(unit)}: ${square}.`
      : `In ${unitName(unit)}, the ${digit} can only go in ${square}.`;
  }
  return afterOthers
    ? `That leaves ${digit} as the only digit for ${square}.`
    : `Only ${digit} can go in ${square}.`;
}

/** Returns the sentence for a step that rules digits out. */
function eliminationWords(step: Elimination): string {
  const { digits, cells, units } = step;
  const names = units.map(unitName);
  const [first = "", second = ""] = names;
  const digitList = listOf(digits.map(String));
  switch (step.technique) {
    case "pointing":
    case "claiming":
      return `In ${first}, the ${digitList} can only go in ${second}, so it can't go anywhere else in ${second}.`;
    case "naked-pair":
    case "naked-triple":
      return `In ${first}, ${countWord(cells.length)} squares can only hold ${digitList}, so no other square there can.`;
    case "hidden-pair":
    case "hidden-triple":
      return `In ${first}, the ${digitList} can only go in the same ${countWord(cells.length)} squares, so those squares can hold nothing else.`;
    case "x-wing":
    case "swordfish": {
      const half = units.length / 2;
      const cover = units.slice(half);
      return `In ${linesName(units.slice(0, half))}, the ${digitList} can only go in ${linesName(cover)}, so it can't go anywhere else in those ${cover[0]?.kind ?? ""}s.`;
    }
    case "xy-wing": {
      const [x, y, z] = digits;
      const [pivot = 0, a = 0, b = 0] = cells;
      return `The square at ${squareName(pivot)} holds ${x} or ${y}. Either way, the square at ${squareName(a)} or the one at ${squareName(b)} holds ${z}, so no square that sees both can.`;
    }
  }
}

/** Returns lines of one kind named together, such as "rows 2 and 8". */
function linesName(lines: readonly Unit[]): string {
  const numbers = lines.map((line) => String(line.n + 1));
  return `${lines[0]?.kind ?? ""}s ${listOf(numbers)}`;
}

/** Returns items as a list in words, such as "1, 3 and 8". */
function listOf(items: readonly string[]): string {
  const last = items.at(-1) ?? "";
  return items.length > 1
    ? `${items.slice(0, -1).join(", ")} and ${last}`
    : last;
}

function countWord(n: number): string {
  return n === 2 ? "two" : "three";
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

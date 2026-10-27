import {
  CELLS,
  UNITS,
  type Unit,
  type UnitKind,
  at,
  colOf,
  peersOf,
  rowOf,
  sees,
} from "./cells";
import {
  ALL_DIGITS,
  DIGITS,
  bit,
  digitsIn,
  firstDigit,
  has,
  setOf,
  size,
} from "./digits";

// Solves a board the way a person does, one technique at a time, easiest
// first, and records each step. Its steps grade a puzzle, and name the next
// one for a hint.

/** The techniques it knows, easiest first, the order it tries them in. */
export const TECHNIQUES = [
  "hidden-single",
  "naked-single",
  "pointing",
  "claiming",
  "naked-pair",
  "hidden-pair",
  "naked-triple",
  "hidden-triple",
  "x-wing",
  "swordfish",
  "xy-wing",
] as const;

/** Names a technique. */
export type Technique = (typeof TECHNIQUES)[number];

/** Names a technique that fills a square. */
export type Single = "hidden-single" | "naked-single";

/** Describes a step that fills a square. */
export interface Placement {
  readonly kind: "place";
  readonly technique: Single;
  readonly index: number;
  readonly digit: number;
  /** For a hidden single, the unit where the digit has one place left. */
  readonly unit: Unit | null;
}

/** Says which digits a step rules out of one square. */
export interface Removal {
  readonly index: number;
  /** A set of digits. */
  readonly digits: number;
}

/** Describes a step that rules digits out of squares, filling none. */
export interface Elimination {
  readonly kind: "eliminate";
  readonly technique: Exclude<Technique, Single>;
  /**
   * The digits the pattern is made of, smallest first; for an XY-Wing, the
   * pivot's two, then the one it rules out.
   */
  readonly digits: readonly number[];
  /** The squares the pattern is made of. */
  readonly cells: readonly number[];
  /**
   * The units the pattern lies in, in the order its words name them: for
   * pointing, the box then the line; for a fish, its lines then the lines
   * it clears.
   */
  readonly units: readonly Unit[];
  readonly removed: readonly Removal[];
}

/** Describes one step of logic. */
export type Step = Placement | Elimination;

/** Lists the steps that fill one more square: what it needs ruled out first. */
export interface Chain {
  readonly eliminations: readonly Elimination[];
  readonly placement: Placement;
}

/** Says how far logic alone got with a board. */
export interface LogicResult {
  readonly steps: readonly Step[];
  /** Whether every square is filled. */
  readonly solved: boolean;
}

/** Says what a search may reach for. */
type Allowed = (technique: Technique) => boolean;

/** Holds a board being solved: its digits and each blank square's candidates. */
interface State {
  readonly digits: number[];
  readonly candidates: number[];
}

/**
 * Solves a board by logic, trying the easiest technique first at every step,
 * and using only the techniques `allowed` lets it. A board it can solve has
 * one solution, since every step follows from the digits before it.
 */
export function solveByLogic(
  digits: readonly number[],
  allowed: Allowed = () => true,
): LogicResult {
  const state = stateOf(digits);
  const steps: Step[] = [];
  for (;;) {
    const step = firstStep(state, allowed);
    if (!step) break;
    apply(state, step);
    steps.push(step);
  }
  return { steps, solved: state.digits.every((digit) => digit !== 0) };
}

/** Lists the squares that show why a chain holds, by the part they play. */
export interface Shown {
  /** The squares each elimination's pattern is made of, which a hint names. */
  readonly pattern: readonly number[];
  /** The rest of the unit where a hidden single has one place left. */
  readonly unit: readonly number[];
}

/**
 * Returns the squares that show why a chain holds: each elimination's
 * pattern, and the unit where a hidden single has one place left.
 */
export function shownBy({ eliminations, placement }: Chain): Shown {
  const pattern = new Set(eliminations.flatMap((step) => step.cells));
  const unit = (placement.unit?.cells ?? []).filter(
    (index) => !pattern.has(index),
  );
  return { pattern: [...pattern].sort((a, b) => a - b), unit };
}

/** Returns the hardest technique among some steps, or null for none. */
export function hardest(steps: readonly Step[]): Technique | null {
  let at = -1;
  for (const step of steps) {
    at = Math.max(at, TECHNIQUES.indexOf(step.technique));
  }
  return TECHNIQUES[at] ?? null;
}

/**
 * Returns the steps that fill one more square of a board, or null when logic
 * finds none, as on a board with a wrong digit.
 *
 * It looks for the least work: a single now, else one elimination that
 * leaves a single, the easiest technique first; else the easiest
 * elimination, and then the same again. Then it drops each elimination the
 * rest can do without, so a hint names only what the square needs.
 */
export function nextPlacement(digits: readonly number[]): Chain | null {
  const state = stateOf(digits);
  const eliminations: Elimination[] = [];
  for (;;) {
    const single = firstSingle(state);
    if (single) return pruned(digits, { eliminations, placement: single });
    for (const step of everyElimination(state)) {
      const after = cloneState(state);
      apply(after, step);
      const placement = firstSingle(after);
      if (placement) {
        return pruned(digits, {
          eliminations: [...eliminations, step],
          placement,
        });
      }
    }
    const first = firstStep(state, () => true);
    if (first?.kind !== "eliminate") return null;
    apply(state, first);
    eliminations.push(first);
  }
}

/**
 * Returns a chain without each elimination the steps after it can do
 * without: each step left still finds its pattern on the board.
 */
function pruned(digits: readonly number[], chain: Chain): Chain {
  let kept = [...chain.eliminations];
  for (let at = kept.length - 1; at >= 0; at--) {
    const without = [...kept.slice(0, at), ...kept.slice(at + 1)];
    if (holds(digits, [...without, chain.placement])) kept = without;
  }
  return { eliminations: kept, placement: chain.placement };
}

/** Returns whether each step of a chain finds its pattern after those before. */
function holds(digits: readonly number[], steps: readonly Step[]): boolean {
  const state = stateOf(digits);
  for (const step of steps) {
    const found = [...findAll(state, step.technique)].find((each) =>
      samePattern(each, step),
    );
    if (!found) return false;
    apply(state, found);
  }
  return true;
}

/** Returns whether two steps are the same pattern, whatever they rule out. */
function samePattern(a: Step, b: Step): boolean {
  if (a.kind === "place") {
    return (
      b.kind === "place" &&
      a.technique === b.technique &&
      a.index === b.index &&
      a.digit === b.digit
    );
  }
  return (
    b.kind === "eliminate" &&
    a.technique === b.technique &&
    a.digits.join() === b.digits.join() &&
    a.cells.join() === b.cells.join()
  );
}

/** Returns a board's state: its digits, and what each blank square could hold. */
function stateOf(digits: readonly number[]): State {
  const state: State = {
    digits: Array.from({ length: CELLS }, (_, i) => at(digits, i)),
    candidates: new Array<number>(CELLS).fill(0),
  };
  for (let i = 0; i < CELLS; i++) {
    if (state.digits[i] !== 0) continue;
    let set = ALL_DIGITS;
    for (const peer of peersOf(i)) {
      const digit = at(state.digits, peer);
      if (digit !== 0) set &= ~bit(digit);
    }
    state.candidates[i] = set;
  }
  return state;
}

function cloneState(state: State): State {
  return { digits: [...state.digits], candidates: [...state.candidates] };
}

/** Makes a step on a state. */
function apply(state: State, step: Step): void {
  if (step.kind === "place") {
    state.digits[step.index] = step.digit;
    state.candidates[step.index] = 0;
    for (const peer of peersOf(step.index)) {
      state.candidates[peer] = candidatesAt(state, peer) & ~bit(step.digit);
    }
    return;
  }
  for (const { index, digits } of step.removed) {
    state.candidates[index] = candidatesAt(state, index) & ~digits;
  }
}

/** Returns the first step the easiest allowed technique finds. */
function firstStep(state: State, allowed: Allowed): Step | null {
  for (const technique of TECHNIQUES) {
    if (!allowed(technique)) continue;
    for (const step of findAll(state, technique)) return step;
  }
  return null;
}

/** Returns the first single on the board, a hidden one first. */
function firstSingle(state: State): Placement | null {
  for (const step of hiddenSingles(state)) return step;
  for (const step of nakedSingles(state)) return step;
  return null;
}

/** Returns every elimination on the board, the easiest technique's first. */
function* everyElimination(state: State): Generator<Elimination> {
  for (const technique of TECHNIQUES) {
    for (const step of findAll(state, technique)) {
      if (step.kind === "eliminate") yield step;
    }
  }
}

/** Returns every step a technique finds on the board. */
function findAll(state: State, technique: Technique): Iterable<Step> {
  switch (technique) {
    case "hidden-single":
      return hiddenSingles(state);
    case "naked-single":
      return nakedSingles(state);
    case "pointing":
      return pointing(state);
    case "claiming":
      return claiming(state);
    case "naked-pair":
      return nakedSubsets(state, 2);
    case "hidden-pair":
      return hiddenSubsets(state, 2);
    case "naked-triple":
      return nakedSubsets(state, 3);
    case "hidden-triple":
      return hiddenSubsets(state, 3);
    case "x-wing":
      return fish(state, 2);
    case "swordfish":
      return fish(state, 3);
    case "xy-wing":
      return xyWings(state);
  }
}

/** The units in the order a person scans them for a hidden single. */
const SCAN_ORDER: readonly Unit[] = [
  ...UNITS.filter((unit) => unit.kind === "box"),
  ...UNITS.filter((unit) => unit.kind !== "box"),
];

/** Finds each digit with one place left in a unit. */
function* hiddenSingles(state: State): Generator<Placement> {
  for (const unit of SCAN_ORDER) {
    for (const digit of DIGITS) {
      const places = placesFor(state, unit.cells, digit);
      if (places.length === 1) {
        const index = at(places, 0);
        yield { kind: "place", technique: "hidden-single", index, digit, unit };
      }
    }
  }
}

/** Finds each square with one digit left. */
function* nakedSingles(state: State): Generator<Placement> {
  for (let index = 0; index < CELLS; index++) {
    const set = candidatesAt(state, index);
    if (size(set) === 1) {
      yield {
        kind: "place",
        technique: "naked-single",
        index,
        digit: firstDigit(set),
        unit: null,
      };
    }
  }
}

/**
 * Finds each digit whose places in a box all lie in one row or column, which
 * rules it out of the rest of that line.
 */
function* pointing(state: State): Generator<Elimination> {
  for (const box of UNITS.filter((unit) => unit.kind === "box")) {
    for (const digit of DIGITS) {
      const places = placesFor(state, box.cells, digit);
      if (places.length < 2) continue;
      for (const line of linesThrough(places)) {
        const removed = removals(
          state,
          line.cells.filter((i) => !box.cells.includes(i)),
          bit(digit),
        );
        if (removed.length > 0) {
          yield step("pointing", [digit], places, [box, line], removed);
        }
      }
    }
  }
}

/**
 * Finds each digit whose places in a row or column all lie in one box, which
 * rules it out of the rest of that box.
 */
function* claiming(state: State): Generator<Elimination> {
  for (const line of UNITS.filter((unit) => unit.kind !== "box")) {
    for (const digit of DIGITS) {
      const places = placesFor(state, line.cells, digit);
      if (places.length < 2) continue;
      const box = unitHolding("box", places);
      if (!box) continue;
      const removed = removals(
        state,
        box.cells.filter((i) => !line.cells.includes(i)),
        bit(digit),
      );
      if (removed.length > 0) {
        yield step("claiming", [digit], places, [line, box], removed);
      }
    }
  }
}

/**
 * Finds `n` squares of a unit that hold only `n` digits between them, which
 * rules those digits out of the unit's other squares.
 */
function* nakedSubsets(state: State, n: 2 | 3): Generator<Elimination> {
  for (const unit of UNITS) {
    const open = unit.cells.filter((i) => {
      const count = size(candidatesAt(state, i));
      return count >= 2 && count <= n;
    });
    for (const cells of combinations(open, n)) {
      const set = cells.reduce((all, i) => all | candidatesAt(state, i), 0);
      if (size(set) !== n) continue;
      const removed = removals(
        state,
        unit.cells.filter((i) => !cells.includes(i)),
        set,
      );
      if (removed.length > 0) {
        yield step(
          n === 2 ? "naked-pair" : "naked-triple",
          digitsIn(set),
          cells,
          [unit],
          removed,
        );
      }
    }
  }
}

/**
 * Finds `n` digits that can go only in the same `n` squares of a unit, which
 * rules every other digit out of those squares.
 */
function* hiddenSubsets(state: State, n: 2 | 3): Generator<Elimination> {
  for (const unit of UNITS) {
    const open = DIGITS.filter((digit) => {
      const count = placesFor(state, unit.cells, digit).length;
      return count >= 2 && count <= n;
    });
    for (const digits of combinations(open, n)) {
      const cells = unit.cells.filter((i) =>
        digits.some((digit) => has(candidatesAt(state, i), digit)),
      );
      if (cells.length !== n) continue;
      const removed = removals(state, cells, ALL_DIGITS & ~setOf(digits));
      if (removed.length > 0) {
        yield step(
          n === 2 ? "hidden-pair" : "hidden-triple",
          digits,
          cells,
          [unit],
          removed,
        );
      }
    }
  }
}

/**
 * Finds `n` rows where a digit's places all lie in the same `n` columns, or
 * `n` columns where they lie in the same `n` rows, which rules the digit out
 * of the rest of those lines: an X-Wing for two, a Swordfish for three.
 */
function* fish(state: State, n: 2 | 3): Generator<Elimination> {
  const technique = n === 2 ? "x-wing" : "swordfish";
  for (const digit of DIGITS) {
    for (const [base, cover] of [
      ["row", "column"],
      ["column", "row"],
    ] as const) {
      const lines = UNITS.filter((unit) => unit.kind === base).filter(
        (line) => {
          const count = placesFor(state, line.cells, digit).length;
          return count >= 2 && count <= n;
        },
      );
      for (const chosen of combinations(lines, n)) {
        const places = chosen.flatMap((line) =>
          placesFor(state, line.cells, digit),
        );
        const crossing = [
          ...new Set(
            places.map((i) => (cover === "column" ? colOf(i) : rowOf(i))),
          ),
        ].sort((a, b) => a - b);
        if (crossing.length !== n) continue;
        const covers = UNITS.filter(
          (unit) => unit.kind === cover && crossing.includes(unit.n),
        );
        const removed = removals(
          state,
          covers
            .flatMap((line) => line.cells)
            .filter((i) => !places.includes(i)),
          bit(digit),
        );
        if (removed.length > 0) {
          yield step(
            technique,
            [digit],
            places,
            [...chosen, ...covers],
            removed,
          );
        }
      }
    }
  }
}

/**
 * Finds a square with two digits, x and y, that sees one square holding only
 * x and z and another holding only y and z: whichever it holds, one of those
 * two holds z, which rules z out of every square that sees both.
 */
function* xyWings(state: State): Generator<Elimination> {
  for (let pivot = 0; pivot < CELLS; pivot++) {
    const pair = candidatesAt(state, pivot);
    if (size(pair) !== 2) continue;
    const wings = peersOf(pivot).filter((i) => {
      const set = candidatesAt(state, i);
      return size(set) === 2 && size(set & pair) === 1;
    });
    for (const [a, b] of pairsOf(wings)) {
      const setA = candidatesAt(state, a);
      const setB = candidatesAt(state, b);
      const z = setA & setB & ~pair;
      if (size(z) !== 1 || (setA & pair) === (setB & pair)) continue;
      const removed = removals(
        state,
        peersOf(a).filter((i) => i !== b && sees(i, b)),
        z,
      );
      if (removed.length > 0) {
        yield step(
          "xy-wing",
          [...digitsIn(pair), firstDigit(z)],
          [pivot, a, b],
          [],
          removed,
        );
      }
    }
  }
}

function step(
  technique: Elimination["technique"],
  digits: readonly number[],
  cells: readonly number[],
  units: readonly Unit[],
  removed: readonly Removal[],
): Elimination {
  return { kind: "eliminate", technique, digits, cells, units, removed };
}

/** Returns what ruling a set of digits out of some squares would remove. */
function removals(
  state: State,
  cells: readonly number[],
  digits: number,
): Removal[] {
  const removed: Removal[] = [];
  for (const index of cells) {
    const hit = candidatesAt(state, index) & digits;
    if (hit !== 0) removed.push({ index, digits: hit });
  }
  return removed;
}

/** Returns the squares among some where a digit could still go. */
function placesFor(
  state: State,
  cells: readonly number[],
  digit: number,
): number[] {
  return cells.filter((i) => has(candidatesAt(state, i), digit));
}

/** Returns the row and the column that every square given lies in, if any. */
function linesThrough(cells: readonly number[]): Unit[] {
  return UNITS.filter(
    (unit) => unit.kind !== "box" && cells.every((i) => unit.cells.includes(i)),
  );
}

/** Returns the unit of a kind that holds every square given, if one does. */
function unitHolding(
  kind: UnitKind,
  cells: readonly number[],
): Unit | undefined {
  return UNITS.find(
    (unit) => unit.kind === kind && cells.every((i) => unit.cells.includes(i)),
  );
}

function candidatesAt(state: State, index: number): number {
  return at(state.candidates, index);
}

/** Returns every way to choose `n` items from a list, in the list's order. */
function* combinations<T>(items: readonly T[], n: number): Generator<T[]> {
  if (n === 0) {
    yield [];
    return;
  }
  for (const [i, head] of items.entries()) {
    if (items.length - i < n) return;
    for (const rest of combinations(items.slice(i + 1), n - 1)) {
      yield [head, ...rest];
    }
  }
}

/** Returns every pair of squares from a list, in the list's order. */
function* pairsOf(cells: readonly number[]): Generator<[number, number]> {
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      yield [at(cells, i), at(cells, j)];
    }
  }
}

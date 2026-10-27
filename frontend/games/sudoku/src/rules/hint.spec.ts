import {
  EASY,
  EASY_SOLUTION,
  STALLED,
  gridFrom,
  solvedBut,
  squareAt,
} from "../testing/grid_picture";
import { at } from "./cells";
import { bit, digitsIn } from "./digits";
import type { MoveOptions } from "./grid";
import { type Hint, fillHint, firstBlank, hintFor } from "./hint";
import type { Chain, Elimination, Placement } from "./logic";

/** Eight rows with no digit in them, to draw a row of the player's above. */
const EMPTY = new Array<string>(8).fill(".........");

/** The player's 6 at row 1, column 1, which the solution holds. */
const RIGHT_6 = ["6........", ...EMPTY];

/** The player's 9 at row 1, column 1, where the solution has a 6. */
const WRONG_9 = ["9........", ...EMPTY];

const ASSISTS: MoveOptions = { clearNotes: true };

/** The digit `EASY`'s solution puts in a square. */
function solutionAt(index: number): number {
  return Number(EASY_SOLUTION.join("")[index]);
}

/** Returns a naked single at row 1, column 1, which the solution fills with 6. */
function singleAtFirst(digit: number): Placement {
  return {
    kind: "place",
    technique: "naked-single",
    index: 0,
    digit,
    unit: null,
  };
}

/** Returns a pointing step that rules digits out of row 1, column 1. */
function ruleOutAtFirst(digits: number): Elimination {
  return {
    kind: "eliminate",
    technique: "pointing",
    digits: digitsIn(digits),
    cells: [1, 2],
    units: [],
    removed: [{ index: 0, digits }],
  };
}

/** Returns a hint of a kind at a square, with words a spec doesn't read. */
function hintAt(kind: Hint["kind"], square: string, digit: number): Hint {
  return {
    kind,
    index: squareAt(square),
    digit,
    shown: [],
    title: "",
    text: "",
  };
}

describe("hintFor", () => {
  it("points out a wrong digit before anything else", () => {
    const grid = gridFrom(EASY, { digits: WRONG_9, notes: { r1c2: "1" } });

    const hint = hintFor(grid);

    expect(hint).toEqual({
      kind: "mistake",
      index: 0,
      digit: 0,
      shown: [],
      title: "A mistake",
      text: "The 9 at row 1, column 1 doesn't belong there.",
    });
  });

  it("points out notes that leave out their square's digit, before logic", () => {
    const grid = gridFrom(EASY, { notes: { r1c2: "1", r1c3: "17" } });

    const hint = hintFor(grid);

    expect(hint).toEqual({
      kind: "note",
      index: squareAt("r1c2"),
      digit: 9,
      shown: [],
      title: "A missing note",
      text: "The notes at row 1, column 2 leave out the digit that belongs there.",
    });
  });

  it("passes over notes that hold their square's digit", () => {
    const grid = gridFrom(EASY, { notes: { r1c2: "19" } });

    expect(hintFor(grid)?.kind).toBe("step");
  });

  it("names the square logic fills next, and the squares that show why", () => {
    const grid = gridFrom(EASY);

    const hint = hintFor(grid);

    expect(hint?.kind).toBe("step");
    expect(hint?.digit).toBe(solutionAt(hint?.index ?? -1));
    expect(hint?.shown.length).toBeGreaterThan(0);
    expect(hint?.title).toBe("Hidden single");
  });

  it("finds none where logic stalls", () => {
    const grid = gridFrom(STALLED.givens, STALLED);

    expect(hintFor(grid)).toBeNull();
  });

  it.each<[string, Chain]>([
    [
      "places a digit the solution doesn't",
      { eliminations: [], placement: singleAtFirst(9) },
    ],
    [
      "rules out the solution's digit",
      { eliminations: [ruleOutAtFirst(bit(6))], placement: singleAtFirst(6) },
    ],
  ])("finds none rather than a chain that %s", (_, chain) => {
    const grid = gridFrom(EASY);

    expect(hintFor(grid, () => chain)).toBeNull();
  });

  it("takes a chain that agrees with the solution", () => {
    const grid = gridFrom(EASY);
    const chain = {
      eliminations: [ruleOutAtFirst(bit(1))],
      placement: singleAtFirst(6),
    };

    expect(hintFor(grid, () => chain)).toMatchObject({ index: 0, digit: 6 });
  });
});

describe("fillHint", () => {
  it("fills in the digit a step names", () => {
    const grid = gridFrom(EASY);

    const after = fillHint(grid, hintAt("step", "r1c1", 6), ASSISTS);

    expect(at(after.digits, 0)).toBe(6);
  });

  it("adds the note a hint finds missing", () => {
    const grid = gridFrom(EASY, { notes: { r1c2: "1" } });

    const after = fillHint(grid, hintAt("note", "r1c2", 9), ASSISTS);

    expect(digitsIn(at(after.notes, squareAt("r1c2")))).toEqual([1, 9]);
  });

  it("takes out a wrong digit", () => {
    const grid = gridFrom(EASY, { digits: WRONG_9 });

    const after = fillHint(grid, hintAt("mistake", "r1c1", 0), ASSISTS);

    expect(at(after.digits, 0)).toBe(0);
  });
});

describe("firstBlank", () => {
  it("finds the first blank square", () => {
    const grid = gridFrom(EASY, { digits: RIGHT_6 });

    expect(firstBlank(grid)).toBe(squareAt("r1c2"));
  });

  it("falls back to the first square on a full board", () => {
    const grid = gridFrom(EASY, { digits: solvedBut() });

    expect(firstBlank(grid)).toBe(0);
  });
});

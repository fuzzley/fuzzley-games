import type { Grid } from "../../rules/grid";
import { EASY, gridFrom, squareAt } from "../../testing/grid_picture";
import {
  type BoardState,
  type CellView,
  type Shade,
  boardView,
  shadeOf,
} from "./board_view";

/** Eight rows with no digit in them, to draw a row of the player's above. */
const EMPTY = new Array<string>(8).fill(".........");

/** `EASY` with row 1, column 4's given 5 selected, and no hint. */
const FIVE_SELECTED: BoardState = {
  grid: gridFrom(EASY),
  selected: squareAt("r1c4"),
  hint: null,
  markMistakes: false,
};

/**
 * Returns a hint at a square whose words name some squares, in the unit
 * given, if any.
 */
function hintAt(
  square: string,
  pattern: readonly string[] = [],
  unit: readonly string[] = [],
): BoardState {
  return {
    ...FIVE_SELECTED,
    hint: {
      index: squareAt(square),
      pattern: pattern.map(squareAt),
      unit: unit.map(squareAt),
    },
  };
}

/** Returns the board's view of one square. */
function cellAt(state: BoardState, square: string): CellView | undefined {
  return boardView(state).flat()[squareAt(square)];
}

/** Returns a state with a grid of the player's digits, r1c1 selected. */
function playing(grid: Grid, markMistakes = false): BoardState {
  return { grid, selected: 0, hint: null, markMistakes };
}

describe("shadeOf", () => {
  it.each<[string, BoardState, string, Shade | null]>([
    ["the hint's square over the selection", hintAt("r1c4"), "r1c4", "hinted"],
    ["the hint's square over the same digit", hintAt("r6c5"), "r6c5", "hinted"],
    ["the selection over its own digit", FIVE_SELECTED, "r1c4", "selected"],
    [
      "the same digit over a hint's pattern",
      hintAt("r9c9", ["r6c5"]),
      "r6c5",
      "same",
    ],
    [
      "a hint's pattern over its unit",
      hintAt("r9c9", ["r9c1"], ["r9c1", "r9c2"]),
      "r9c1",
      "pattern",
    ],
    [
      "a hint's unit over a related square",
      hintAt("r9c9", [], ["r1c9"]),
      "r1c9",
      "unit",
    ],
    [
      "a hint's pattern on its own",
      hintAt("r9c9", ["r9c1"]),
      "r9c1",
      "pattern",
    ],
    ["a hint's unit on its own", hintAt("r9c9", [], ["r9c2"]), "r9c2", "unit"],
    ["a square in the selection's units", FIVE_SELECTED, "r1c9", "related"],
    ["a square outside them", FIVE_SELECTED, "r9c1", null],
  ])("shades %s", (_, state, square, shade) => {
    expect(shadeOf(state, squareAt(square))).toBe(shade);
  });

  it("shades no square for the digit of a blank one selected", () => {
    const state = { ...FIVE_SELECTED, selected: squareAt("r9c1") };

    expect(shadeOf(state, squareAt("r1c4"))).toBeNull();
  });
});

describe("boardView", () => {
  it("draws nine rows of nine squares, in reading order", () => {
    const rows = boardView(FIVE_SELECTED);

    expect(rows.map((row) => row.map((cell) => cell.index))).toEqual(
      Array.from({ length: 9 }, (_, r) =>
        Array.from({ length: 9 }, (_, c) => r * 9 + c),
      ),
    );
  });

  it("gives the selected square the board's one tab stop", () => {
    const stops = boardView(FIVE_SELECTED)
      .flat()
      .filter((cell) => cell.tabIndex === 0);

    expect(stops.map((cell) => cell.index)).toEqual([squareAt("r1c4")]);
  });

  it("never shades a square whose digit repeats, even the hint's", () => {
    const grid = gridFrom(EASY, { digits: ["5........", ...EMPTY] });
    const state = {
      ...playing(grid),
      hint: { index: 0, pattern: [], unit: [] },
    };

    expect(cellAt(state, "r1c1")).toMatchObject({ marked: true, shade: null });
  });

  it("never shades a wrong digit marked with the assist on", () => {
    const grid = gridFrom(EASY, { digits: ["9........", ...EMPTY] });

    expect(cellAt(playing(grid, true), "r1c1")).toMatchObject({
      marked: true,
      shade: null,
    });
  });

  it("leaves a wrong digit unmarked, and shaded, with the assist off", () => {
    const grid = gridFrom(EASY, { digits: ["9........", ...EMPTY] });

    expect(cellAt(playing(grid), "r1c1")).toMatchObject({
      marked: false,
      shade: "selected",
    });
  });

  it("lays a square's notes out in their places, the selected digit standing out", () => {
    const grid = gridFrom(EASY, {
      digits: ["6........", ...EMPTY],
      notes: { r1c2: "69" },
    });

    expect(cellAt(playing(grid), "r1c2")?.notes).toEqual([
      { text: "", match: false },
      { text: "", match: false },
      { text: "", match: false },
      { text: "", match: false },
      { text: "", match: false },
      { text: "6", match: true },
      { text: "", match: false },
      { text: "", match: false },
      { text: "9", match: false },
    ]);
  });

  it("shows no notes on a square without them", () => {
    expect(cellAt(FIVE_SELECTED, "r1c1")?.notes).toBeNull();
  });

  it("names each square for a screen reader", () => {
    expect(cellAt(FIVE_SELECTED, "r1c4")?.label).toBe("5, given");
  });
});

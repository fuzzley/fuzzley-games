import {
  EASY,
  EASY_SOLUTION,
  gridFrom,
  squareAt,
} from "../testing/grid_picture";
import { countHint, place, toggleNote } from "./grid";
import { type SavedGrid, restoreGrid, saveGrid } from "./saved_grid";

const CLEARING = { clearNotes: true };

/** A game under way: two moves made, a note left and a hint used. */
const PLAYED = countHint(
  place(
    toggleNote(gridFrom(EASY, { level: "medium" }), squareAt("r1c2"), 9),
    squareAt("r1c1"),
    6,
    CLEARING,
  ),
);

const SAVED = saveGrid(PLAYED);

/** Returns the saved game with some of it changed, as an edit would. */
function edited(change: Partial<Record<keyof SavedGrid, unknown>>): unknown {
  return { ...SAVED, ...change };
}

describe("saveGrid", () => {
  it("writes the board as text, the notes and the moves as numbers", () => {
    expect(SAVED).toMatchObject({
      version: 1,
      level: "medium",
      givens: EASY.join(""),
      hints: 1,
    });
    expect(SAVED.digits.slice(0, 9)).toBe("6..5..2..");
    expect(SAVED.history).toHaveLength(2);
  });
});

describe("restoreGrid", () => {
  it("restores the grid it saved", () => {
    expect(restoreGrid(JSON.parse(JSON.stringify(SAVED)))).toEqual(PLAYED);
  });

  it("works the solution out again from the givens", () => {
    expect(restoreGrid(SAVED)?.puzzle.solution.join("")).toBe(
      EASY_SOLUTION.join(""),
    );
  });

  it("restores a solved grid as solved", () => {
    const solved = gridFrom(EASY, {
      digits: EASY_SOLUTION.map((row, r) =>
        Array.from(row, (digit, c) =>
          EASY[r]?.[c] === "." ? digit : ".",
        ).join(""),
      ),
    });

    expect(restoreGrid(saveGrid(solved))?.outcome).toBe("solved");
  });

  it.each([
    ["nothing at all", null],
    ["another version", edited({ version: 2 })],
    ["a level it doesn't know", edited({ level: "custom" })],
    ["hints that can't be counted", edited({ hints: -1 })],
    ["a fraction of a hint", edited({ hints: 0.5 })],
    ["givens cut short", edited({ givens: EASY.join("").slice(1) })],
    ["givens with many solutions", edited({ givens: ".".repeat(81) })],
    ["digits that aren't text", edited({ digits: 6 })],
    [
      "a digit over a given",
      edited({ digits: `6..4${SAVED.digits.slice(4)}` }),
    ],
    ["notes cut short", edited({ notes: SAVED.notes.slice(1) })],
    ["notes past 9", edited({ notes: [512, ...SAVED.notes.slice(1)] })],
    ["notes under a digit", edited({ notes: [1, ...SAVED.notes.slice(1)] })],
    ["a history it can't read", edited({ history: [[1, 2]] })],
    ["a move on a given", edited({ history: [[3, 0, 0, 7, 0]] })],
  ])("drops %s", (_, saved) => {
    expect(restoreGrid(saved)).toBeNull();
  });
});

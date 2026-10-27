import {
  EASY,
  EASY_SOLUTION,
  gridFrom,
  rowsOf,
  squareAt,
} from "../testing/grid_picture";
import { UNITS } from "./cells";
import { digitsIn } from "./digits";
import {
  type Grid,
  countHint,
  createGrid,
  erase,
  isDone,
  isFull,
  isGiven,
  mistakes,
  place,
  remaining,
  repeats,
  repeatsAt,
  restart,
  toggleNote,
  undo,
  unitsDone,
} from "./grid";

/** The assists as a player starts with them. */
const CLEARING = { clearNotes: true };
const KEEPING = { clearNotes: false };

/** Row 1, column 1, blank in `EASY`, whose solution there is 6. */
const R1C1 = squareAt("r1c1");

/** Row 1, column 4, which holds a given 5. */
const R1C4 = squareAt("r1c4");

/** `EASY`'s solution drawn as the player's digits, but for the squares named. */
function solvedBut(...blank: readonly string[]): string[] {
  const left = new Set(blank.map(squareAt));
  return EASY_SOLUTION.map((row, r) =>
    Array.from(row, (digit, c) =>
      EASY[r]?.[c] !== "." || left.has(r * 9 + c) ? "." : digit,
    ).join(""),
  );
}

/** Returns a square's notes as a list of digits. */
function notesAt(grid: Grid, square: string): number[] {
  return digitsIn(grid.notes[squareAt(square)] ?? 0);
}

describe("createGrid", () => {
  it("starts from the givens, with nothing else on the board", () => {
    const grid = gridFrom(EASY);

    expect(rowsOf(grid.digits)).toEqual(EASY);
    expect(grid.notes.every((notes) => notes === 0)).toBe(true);
  });

  it("starts in play, with nothing to undo and no hints", () => {
    const grid = createGrid(gridFrom(EASY).puzzle);

    expect([grid.outcome, grid.history.length, grid.hints]).toEqual([
      "playing",
      0,
      0,
    ]);
  });
});

describe("place", () => {
  it("puts a digit in a blank square", () => {
    const grid = place(gridFrom(EASY), R1C1, 6, CLEARING);

    expect(grid.digits[R1C1]).toBe(6);
  });

  it("leaves a given alone", () => {
    const before = gridFrom(EASY);

    expect(place(before, R1C4, 6, CLEARING)).toBe(before);
  });

  it("takes away the digit a square already holds", () => {
    const before = gridFrom(EASY, { digits: solvedBut("r1c2") });

    expect(place(before, R1C1, 6, CLEARING).digits[R1C1]).toBe(0);
  });

  it("replaces another digit", () => {
    const before = gridFrom(EASY, { digits: solvedBut("r1c2") });

    expect(place(before, R1C1, 3, CLEARING).digits[R1C1]).toBe(3);
  });

  it("clears the square's own notes", () => {
    const before = gridFrom(EASY, { notes: { r1c1: "16" } });

    expect(notesAt(place(before, R1C1, 6, KEEPING), "r1c1")).toEqual([]);
  });

  it("takes the digit out of its peers' notes, with the assist on", () => {
    const before = gridFrom(EASY, {
      notes: { r1c2: "69", r8c1: "56", r9c9: "6" },
    });

    const after = place(before, R1C1, 6, CLEARING);

    expect([notesAt(after, "r1c2"), notesAt(after, "r8c1")]).toEqual([
      [9],
      [5],
    ]);
    expect(notesAt(after, "r9c9")).toEqual([6]);
  });

  it("leaves its peers' notes, with the assist off", () => {
    const before = gridFrom(EASY, { notes: { r1c2: "69" } });

    expect(notesAt(place(before, R1C1, 6, KEEPING), "r1c2")).toEqual([6, 9]);
  });

  it("solves the puzzle with the last right digit", () => {
    const before = gridFrom(EASY, { digits: solvedBut("r1c1") });

    expect(place(before, R1C1, 6, CLEARING).outcome).toBe("solved");
  });

  it("doesn't solve a full board with a mistake on it", () => {
    const before = gridFrom(EASY, { digits: solvedBut("r1c1") });

    const after = place(before, R1C1, 3, CLEARING);

    expect([isFull(after), after.outcome]).toEqual([true, "playing"]);
  });

  it("changes nothing once the puzzle is solved", () => {
    const solved = gridFrom(EASY, { digits: solvedBut() });

    expect(place(solved, R1C1, 3, CLEARING)).toBe(solved);
  });

  it("leaves a square off the board alone", () => {
    const before = gridFrom(EASY);

    expect(place(before, 81, 6, CLEARING)).toBe(before);
  });
});

describe("erase", () => {
  it("takes a square's digit away", () => {
    const before = gridFrom(EASY, { digits: solvedBut("r1c2") });

    expect(erase(before, R1C1).digits[R1C1]).toBe(0);
  });

  it("clears a blank square's notes", () => {
    const before = gridFrom(EASY, { notes: { r1c1: "16" } });

    expect(notesAt(erase(before, R1C1), "r1c1")).toEqual([]);
  });

  it("does nothing to an empty square", () => {
    const before = gridFrom(EASY);

    expect(erase(before, R1C1)).toBe(before);
  });

  it("leaves a given alone", () => {
    const before = gridFrom(EASY);

    expect(erase(before, R1C4)).toBe(before);
  });
});

describe("toggleNote", () => {
  it("adds a note to a blank square", () => {
    const grid = toggleNote(gridFrom(EASY), R1C1, 6);

    expect(notesAt(grid, "r1c1")).toEqual([6]);
  });

  it("takes a note away", () => {
    const before = gridFrom(EASY, { notes: { r1c1: "16" } });

    expect(notesAt(toggleNote(before, R1C1, 6), "r1c1")).toEqual([1]);
  });

  it("leaves a square with a digit alone", () => {
    const before = gridFrom(EASY, { digits: solvedBut("r1c2") });

    expect(toggleNote(before, R1C1, 6)).toBe(before);
  });
});

describe("undo", () => {
  it("takes back the last move", () => {
    const before = gridFrom(EASY);
    const after = place(toggleNote(before, R1C1, 1), R1C1, 6, CLEARING);

    expect(notesAt(undo(after), "r1c1")).toEqual([1]);
    expect(undo(after).digits[R1C1]).toBe(0);
  });

  it("takes back every square one move changed", () => {
    const before = gridFrom(EASY, { notes: { r1c2: "69", r8c1: "56" } });

    const undone = undo(place(before, R1C1, 6, CLEARING));

    expect(undone.notes).toEqual(before.notes);
    expect(undone.digits).toEqual(before.digits);
  });

  it("does nothing with nothing to take back", () => {
    const before = gridFrom(EASY);

    expect(undo(before)).toBe(before);
  });

  it("does nothing once the puzzle is solved", () => {
    const solved = place(
      gridFrom(EASY, { digits: solvedBut("r1c1") }),
      R1C1,
      6,
      CLEARING,
    );

    expect(undo(solved)).toBe(solved);
  });
});

describe("restart", () => {
  it("clears the player's digits, notes and moves", () => {
    const played = place(
      gridFrom(EASY, { notes: { r1c2: "69" } }),
      R1C1,
      6,
      CLEARING,
    );

    const grid = restart(played);

    expect(rowsOf(grid.digits)).toEqual(EASY);
    expect([grid.notes.some(Boolean), grid.history.length]).toEqual([false, 0]);
  });

  it("keeps the hints counted", () => {
    expect(restart(gridFrom(EASY, { hints: 2 })).hints).toBe(2);
  });
});

describe("countHint", () => {
  it("counts one more hint", () => {
    expect(countHint(countHint(gridFrom(EASY))).hints).toBe(2);
  });
});

describe("isGiven", () => {
  it("tells a given from a square the player fills", () => {
    const grid = gridFrom(EASY);

    expect([isGiven(grid, R1C4), isGiven(grid, R1C1)]).toEqual([true, false]);
  });
});

describe("repeatsAt", () => {
  it("names each unit where a square's digit repeats", () => {
    const grid = place(gridFrom(EASY), R1C1, 5, CLEARING);

    expect(repeatsAt(grid, R1C1).map((unit) => unit.kind)).toEqual(["row"]);
  });

  it("names none for a blank square", () => {
    expect(repeatsAt(gridFrom(EASY), R1C1)).toEqual([]);
  });
});

describe("repeats", () => {
  it("marks every square holding the repeated digit, a given too", () => {
    const grid = place(gridFrom(EASY), R1C1, 5, CLEARING);

    expect(
      repeats(grid).flatMap((repeated, index) => (repeated ? [index] : [])),
    ).toEqual([R1C1, R1C4]);
  });
});

describe("mistakes", () => {
  it("marks each digit the solution doesn't hold", () => {
    const grid = place(gridFrom(EASY), R1C1, 3, CLEARING);

    expect(
      mistakes(grid).flatMap((wrong, index) => (wrong ? [index] : [])),
    ).toEqual([R1C1]);
  });
});

describe("remaining", () => {
  it("counts the digits still to place", () => {
    // `EASY` gives five 5s.
    expect(remaining(gridFrom(EASY), 5)).toBe(4);
  });

  it("counts none left when there are too many", () => {
    const grid = gridFrom(EASY, { digits: solvedBut("r1c1") });

    expect(remaining(place(grid, R1C1, 5, CLEARING), 5)).toBe(0);
  });
});

describe("isDone and unitsDone", () => {
  it("call a unit done when it holds every digit", () => {
    const grid = gridFrom(EASY, { digits: solvedBut("r1c1") });

    expect(isDone(grid, UNITS[1]!)).toBe(true);
    expect(isDone(grid, UNITS[0]!)).toBe(false);
  });

  it("name the units a move finished", () => {
    const before = gridFrom(EASY, { digits: solvedBut("r1c1", "r9c9") });

    const names = unitsDone(before, place(before, R1C1, 6, CLEARING)).map(
      (unit) => `${unit.kind} ${unit.n}`,
    );

    expect(names).toEqual(["row 0", "column 0", "box 0"]);
  });
});

import { EASY, gridFrom, solvedBut, squareAt } from "../testing/grid_picture";
import { UNITS } from "./cells";
import {
  describeChain,
  describeMistake,
  describeMove,
  describeRefusal,
  describeSquare,
  describeUndo,
  squareName,
  unitName,
} from "./describe";
import { type Grid, erase, place, toggleNote, undo } from "./grid";
import {
  type Single,
  type Technique,
  nextPlacement,
  solveByLogic,
} from "./logic";
import { parseDigits } from "./puzzle";

const CLEARING = { clearNotes: true };
const R1C1 = squareAt("r1c1");
const R1C4 = squareAt("r1c4");

/** The player's 6 at row 1, column 1, which the solution holds. */
const RIGHT_6 = ["6........", ...new Array<string>(8).fill(".........")];

/** Returns a puzzle's board once logic has filled every single it can. */
function afterSingles(text: string): number[] {
  const digits = parseDigits(text) ?? [];
  const isSingle = (technique: Technique): technique is Single =>
    technique === "hidden-single" || technique === "naked-single";
  for (const step of solveByLogic(digits, isSingle).steps) {
    if (step.kind === "place") digits[step.index] = step.digit;
  }
  return digits;
}

describe("unitName and squareName", () => {
  it("count rows, columns and boxes from 1", () => {
    expect(
      [UNITS[0], UNITS[13], UNITS[26]].map((unit) => unitName(unit!)),
    ).toEqual(["row 1", "column 5", "box 9"]);
  });

  it("name a square by its row and column", () => {
    expect(squareName(squareAt("r3c4"))).toBe("row 3, column 4");
  });
});

describe("describeSquare", () => {
  it("names a given", () => {
    expect(describeSquare(gridFrom(EASY), R1C4, false)).toBe("5, given");
  });

  it("names a blank square", () => {
    expect(describeSquare(gridFrom(EASY), R1C1, false)).toBe("Blank");
  });

  it("names a blank square's notes", () => {
    const grid = gridFrom(EASY, { notes: { r1c1: "16" } });

    expect(describeSquare(grid, R1C1, false)).toBe("Blank, notes 1 6");
  });

  it("names the player's digit", () => {
    const grid = place(gridFrom(EASY), R1C1, 6, CLEARING);

    expect(describeSquare(grid, R1C1, false)).toBe("6");
  });

  it("says where a digit repeats", () => {
    const grid = place(gridFrom(EASY), R1C1, 5, CLEARING);

    expect(describeSquare(grid, R1C1, false)).toBe("5, repeats in row 1");
  });

  it("says where a given repeats", () => {
    const grid = place(gridFrom(EASY), R1C1, 5, CLEARING);

    expect(describeSquare(grid, R1C4, false)).toBe(
      "5, given, repeats in row 1",
    );
  });

  it("names every unit it repeats in", () => {
    const grid = place(gridFrom(EASY), squareAt("r1c2"), 2, CLEARING);

    expect(describeSquare(grid, squareAt("r1c2"), false)).toBe(
      "2, repeats in row 1 and box 1",
    );
  });

  it("calls a digit the solution doesn't hold wrong, with the assist on", () => {
    const grid = place(gridFrom(EASY), R1C1, 9, CLEARING);

    expect(describeSquare(grid, R1C1, true)).toBe("9, wrong");
  });

  it("leaves a wrong digit unremarked with the assist off", () => {
    const grid = place(gridFrom(EASY), R1C1, 9, CLEARING);

    expect(describeSquare(grid, R1C1, false)).toBe("9");
  });
});

describe("describeMove", () => {
  it("says the digit placed", () => {
    const before = gridFrom(EASY);

    expect(describeMove(before, place(before, R1C1, 6, CLEARING))).toBe("6.");
  });

  it("says where it repeats", () => {
    const before = gridFrom(EASY);

    expect(describeMove(before, place(before, R1C1, 5, CLEARING))).toBe(
      "5. 5 repeats in row 1.",
    );
  });

  it("says which units it finished", () => {
    const before = gridFrom(EASY, { digits: solvedBut("r1c1", "r9c9") });

    expect(describeMove(before, place(before, R1C1, 6, CLEARING))).toBe(
      "6. Row 1 done. Column 1 done. Box 1 done.",
    );
  });

  it("says when a full board is wrong", () => {
    const before = gridFrom(EASY, { digits: solvedBut("r1c1") });

    expect(describeMove(before, place(before, R1C1, 9, CLEARING))).toBe(
      "9. 9 repeats in row 1, column 1 and box 1. Every square is filled, but something is wrong.",
    );
  });

  it("says the puzzle is solved", () => {
    const before = gridFrom(EASY, { digits: solvedBut("r1c1") });

    expect(describeMove(before, place(before, R1C1, 6, CLEARING))).toBe(
      "Solved.",
    );
  });

  it("says a digit was erased", () => {
    const before = place(gridFrom(EASY), R1C1, 6, CLEARING);

    expect(describeMove(before, erase(before, R1C1))).toBe("Erased.");
  });

  it("says a note was added", () => {
    const before = gridFrom(EASY);

    expect(describeMove(before, toggleNote(before, R1C1, 6))).toBe("Note 6.");
  });

  it("says a note was taken away", () => {
    const before = gridFrom(EASY, { notes: { r1c1: "16" } });

    expect(describeMove(before, toggleNote(before, R1C1, 6))).toBe(
      "Note 6 removed.",
    );
  });

  it("says a square's notes were erased", () => {
    const before = gridFrom(EASY, { notes: { r1c1: "16" } });

    expect(describeMove(before, erase(before, R1C1))).toBe("Erased.");
  });

  it("says nothing of a move that changed nothing", () => {
    const grid = gridFrom(EASY);

    expect(describeMove(grid, grid)).toBe("");
  });

  it("says nothing of a move taken back", () => {
    const before = place(gridFrom(EASY), R1C1, 6, CLEARING);

    expect(describeMove(before, undo(before))).toBe("");
  });
});

describe("describeUndo", () => {
  /** Returns what undoing the last move of a grid says. */
  function undoing(grid: Grid): string {
    return describeUndo(grid, undo(grid));
  }

  it("says the digit it takes out", () => {
    const grid = place(gridFrom(EASY), R1C1, 6, CLEARING);

    expect(undoing(grid)).toBe("Undone: 6 taken out of row 1, column 1.");
  });

  it("says the digit it brings back after an erase", () => {
    const grid = erase(gridFrom(EASY, { digits: RIGHT_6 }), R1C1);

    expect(undoing(grid)).toBe("Undone: 6 back in row 1, column 1.");
  });

  it("says the digit it brings back over another", () => {
    const grid = place(gridFrom(EASY, { digits: RIGHT_6 }), R1C1, 9, CLEARING);

    expect(undoing(grid)).toBe("Undone: 6 back in row 1, column 1.");
  });

  it("says the note it takes out", () => {
    const grid = toggleNote(gridFrom(EASY), R1C1, 3);

    expect(undoing(grid)).toBe("Undone: note 3 taken out of row 1, column 1.");
  });

  it("says the note it brings back", () => {
    const grid = toggleNote(gridFrom(EASY, { notes: { r1c1: "36" } }), R1C1, 3);

    expect(undoing(grid)).toBe("Undone: note 3 back in row 1, column 1.");
  });

  it("says the notes an erase took", () => {
    const grid = erase(gridFrom(EASY, { notes: { r1c1: "136" } }), R1C1);

    expect(undoing(grid)).toBe(
      "Undone: notes 1, 3 and 6 back in row 1, column 1.",
    );
  });

  it("says nothing when there was nothing to undo", () => {
    expect(undoing(gridFrom(EASY))).toBe("");
  });
});

describe("describeRefusal", () => {
  it("says a given can't change", () => {
    expect(describeRefusal(gridFrom(EASY), R1C4)).toBe(
      "Row 1, column 4 is given.",
    );
  });

  it("says a square with a digit takes no notes", () => {
    const grid = gridFrom(EASY, { digits: RIGHT_6 });

    expect(describeRefusal(grid, R1C1)).toBe(
      "Row 1, column 1 holds a 6, so it takes no notes.",
    );
  });

  it("says when there is nothing to erase", () => {
    expect(describeRefusal(gridFrom(EASY), R1C1)).toBe("Nothing to erase.");
  });

  it("says nothing once the puzzle is solved", () => {
    const grid = gridFrom(EASY, { digits: solvedBut() });

    expect(describeRefusal(grid, R1C1)).toBe("");
  });
});

describe("describeChain", () => {
  it.each([
    [
      "a hidden single",
      parseDigits(EASY.join("")) ?? [],
      "Hidden single",
      "In box 1, the 5 can only go in row 3, column 1.",
    ],
    [
      "pointing, then a naked single",
      afterSingles(
        "14.......5....2.3...3.7...639..4.6..624.3.175..1.5..437...8.4...5.1....7.......61",
      ),
      "Pointing",
      "In box 3, the 9 can only go in row 1, so it can't go anywhere else in row 1. That leaves 6 as the only digit for row 1, column 5.",
    ],
    [
      "claiming",
      afterSingles(
        "3..8...5.948.....6....46.8.4..6....8..54.23..6....5..4.3.21....2.....871.1...8..3",
      ),
      "Claiming",
      "In column 9, the 2 can only go in box 3, so it can't go anywhere else in box 3. That leaves the 2 one place in row 2: row 2, column 5.",
    ],
    [
      "a naked pair",
      afterSingles(
        ".....6.32135..2.9.......8.......41...4.2.9.7...15.......3.......9.7..24372.3.....",
      ),
      "Naked pair",
      "In column 3, two squares can only hold 6 and 8, so no other square there can. That leaves 4 as the only digit for row 9, column 3.",
    ],
    [
      "a hidden triple",
      parseDigits(
        "....76.2.6....2.....93.1.46.6..35987.832.7654.756.8.1..1.8.4......7.9..5.9..63.7.",
      ) ?? [],
      "Hidden triple",
      "In box 9, the 1, 4 and 8 can only go in the same three squares, so those squares can hold nothing else. In box 9, the 2 can only go in row 7, so it can't go anywhere else in row 7. That leaves the 2 one place in box 8: row 8, column 5.",
    ],
    [
      "an X-Wing",
      afterSingles(
        "....7..2.6....2......3.1.4..6...598...32.76...756...1..1.8.4......7....5.9..6....",
      ),
      "X-Wing",
      "In rows 5 and 6, the 9 can only go in columns 1 and 5, so it can't go anywhere else in those columns. That leaves the 9 one place in row 3: row 3, column 3.",
    ],
    [
      "a Swordfish",
      afterSingles(
        "32.....17.8.7.54.2.....3.......4..29...8.7...45..9.......4.....5.12.9.8.29.....75",
      ),
      "Swordfish",
      "In columns 3, 6 and 9, the 6 can only go in rows 3, 4 and 7, so it can't go anywhere else in those rows. That leaves the 6 one place in column 1: row 2, column 1.",
    ],
    [
      "an XY-Wing",
      afterSingles(
        "..4.5..963...24.51..5...2..8.....5..65.....47..3.....9..7...4..42.51...313..7.6..",
      ),
      "XY-Wing",
      "In box 5, the 8 can only go in column 5, so it can't go anywhere else in column 5. The square at row 3, column 5 holds 3 or 6. Either way, the square at row 3, column 8 or the one at row 6, column 5 holds 8, so no square that sees both can. That leaves the 8 one place in box 6: row 5, column 7.",
    ],
  ])("explains %s", (_, digits, title, text) => {
    const chain = nextPlacement(digits);

    expect(describeChain(chain!)).toEqual({ title, text });
  });
});

describe("describeMistake", () => {
  it("names the digit that doesn't belong, and where", () => {
    const grid = place(gridFrom(EASY), R1C1, 9, CLEARING);

    expect(describeMistake(grid, R1C1)).toEqual({
      title: "A mistake",
      text: "The 9 at row 1, column 1 doesn't belong there.",
    });
  });
});

import { fieldFrom } from "../testing/field_picture";
import { count, describeMove, describeSquare, showing } from "./describe";
import { reveal, toggleFlag } from "./field";

/** A game in play, with a mine stepped on and a flag of each kind. */
const PLAYING = ["x12*F", "f13*.", "__2*."];

/** The same game, lost. */
const LOST = fieldFrom(PLAYING, { livesLeft: 0 });

describe("showing", () => {
  it.each([
    [0, "tripped"],
    [1, "number"],
    [3, "hidden"],
    [4, "flagged"],
    [5, "flagged"],
    [10, "blank"],
  ])("shows square %i of a game in play as %s", (index, shown) => {
    expect(showing(fieldFrom(PLAYING), index)).toBe(shown);
  });

  it("shows the mines once the game is lost", () => {
    expect(showing(LOST, 3)).toBe("mine");
  });

  it("shows a wrong flag once the game is lost", () => {
    expect(showing(LOST, 5)).toBe("wrong-flag");
  });

  it("shows a right flag as a flag once the game is lost", () => {
    expect(showing(LOST, 4)).toBe("flagged");
  });

  it("shows a safe square still hidden once the game is lost as hidden", () => {
    expect(showing(LOST, 9)).toBe("hidden");
  });
});

describe("describeSquare", () => {
  it.each([
    [0, "Mine, stepped on"],
    [2, "2"],
    [3, "Hidden"],
    [4, "Flagged"],
    [10, "Blank"],
  ])("calls square %i of a game in play %s", (index, name) => {
    expect(describeSquare(fieldFrom(PLAYING), index)).toBe(name);
  });

  it("calls a mine shown after a loss a mine", () => {
    expect(describeSquare(LOST, 3)).toBe("Mine");
  });

  it("calls a wrong flag shown after a loss one with no mine", () => {
    expect(describeSquare(LOST, 5)).toBe("Flagged, no mine");
  });
});

describe("describeMove", () => {
  const WALLED = fieldFrom(["..*..", "..*..", "..*.."]);

  it("says nothing for a move that changed nothing", () => {
    expect(describeMove(WALLED, WALLED)).toBe("");
  });

  it("names the number a single square revealed", () => {
    expect(describeMove(WALLED, reveal(WALLED, 1))).toBe("Revealed: 2.");
  });

  it("counts the squares a flood revealed", () => {
    expect(describeMove(WALLED, reveal(WALLED, 0))).toBe("Revealed 6 squares.");
  });

  it("says a mine cost a life, and how many are left", () => {
    expect(describeMove(WALLED, reveal(WALLED, 2))).toBe("Mine. 2 lives left.");
  });

  it("says one life is left in the singular", () => {
    const field = fieldFrom(["..*..", "..*..", "..*.."], { livesLeft: 2 });

    expect(describeMove(field, reveal(field, 2))).toBe("Mine. 1 life left.");
  });

  it("says a mine and what else opened when a number clears around it", () => {
    const field = fieldFrom(["*1.*.", "f1.*.", "...*."]);

    expect(describeMove(field, reveal(field, 6))).toBe(
      "Mine. 2 lives left. Revealed 5 squares.",
    );
  });

  it("says a flag went up, and how many mines are left", () => {
    expect(describeMove(WALLED, toggleFlag(WALLED, 2))).toBe(
      "Flagged. 2 mines left.",
    );
  });

  it("says a flag came down", () => {
    const field = fieldFrom(["..F..", "..*..", "..*.."]);

    expect(describeMove(field, toggleFlag(field, 2))).toBe(
      "Unflagged. 3 mines left.",
    );
  });

  it("says when the field is cleared", () => {
    const field = fieldFrom(["*1.", "11.", "..."]);

    expect(describeMove(field, reveal(field, 8))).toBe("Field cleared.");
  });

  it("says when the lives run out", () => {
    const field = fieldFrom(["..*..", "..*..", "..*.."], { livesLeft: 1 });

    expect(describeMove(field, reveal(field, 2))).toBe("Mine. Out of lives.");
  });
});

describe("count", () => {
  it("names one in the singular", () => {
    expect(count(1, "mine", "mines")).toBe("1 mine");
  });

  it("names none in the plural", () => {
    expect(count(0, "mine", "mines")).toBe("0 mines");
  });
});

import { type BoardPicture, boardFrom } from "../../testing/board_picture";
import { bunchesAs, findBunches, standsInBunch } from "./find";

/** Returns the squares of each bunch standing on a board drawn as a picture, after a fall. */
function squaresOf(picture: BoardPicture | readonly string[]): number[][] {
  return findBunches(boardFrom(picture), null).map(({ squares }) => [
    ...squares,
  ]);
}

describe("findBunches", () => {
  it("finds 3 of a kind in a line across, and their kind", () => {
    const bunches = findBunches(boardFrom(["...", "rrr"]), null);

    expect(bunches).toEqual([{ squares: [3, 4, 5], kind: "red", makes: null }]);
  });

  it("finds 3 of a kind in a line down", () => {
    expect(squaresOf([".g", ".g", ".g"])).toEqual([[1, 3, 5]]);
  });

  it("finds a longer line whole", () => {
    expect(squaresOf(["bbbb", "...."])).toEqual([[0, 1, 2, 3]]);
  });

  it("finds 4 of a kind in a square", () => {
    expect(squaresOf([".vv", ".vv"])).toEqual([[1, 2, 4, 5]]);
  });

  it("finds no bunch in 2 of a kind, or in 3 that turn a corner", () => {
    expect(squaresOf(["bb.", "b.."])).toEqual([]);
  });

  it("takes lines that cross as one bunch, its squares in order", () => {
    expect(squaresOf([".b.", "bbb", ".b."])).toEqual([[1, 3, 4, 5, 7]]);
  });

  it("takes a line and a square of 4 that share squares as one bunch", () => {
    expect(squaresOf(["aaa", "aa."])).toEqual([[0, 1, 2, 3, 4]]);
  });

  it("takes apart bunches of one kind that touch only at a corner", () => {
    expect(squaresOf(["bbb...", "...bbb"])).toEqual([
      [0, 1, 2],
      [9, 10, 11],
    ]);
  });

  it("takes apart bunches of two kinds side by side", () => {
    expect(squaresOf(["bbb", "rrr"])).toEqual([
      [0, 1, 2],
      [3, 4, 5],
    ]);
  });

  // The sketch's order, which what the bunches make and the record's
  // order keep: a line down comes after every line across, wherever it is.
  it("orders bunches by their first line across, then down, then square of 4", () => {
    const picture = ["b....pp", "b.rrrpp", "b......"];

    expect(squaresOf(picture)).toEqual([
      [9, 10, 11],
      [0, 7, 14],
      [5, 6, 12, 13],
    ]);
  });

  it("bunches a fuzzball by its kind, special, caged or burred", () => {
    const picture = { pieces: ["bBb.", "...."], marks: ["-.*.", "...."] };

    expect(squaresOf(picture)).toEqual([[0, 1, 2]]);
  });

  it.each([["bfb"], ["b1b"], ["bzb"], ["b_b"], ["b b"]])(
    "bunches nothing through %j",
    (row) => {
      expect(squaresOf([row])).toEqual([]);
    },
  );

  it("leaves the board it is handed as it was", () => {
    const board = boardFrom(["bbb", "..."]);
    const before = structuredClone(board);

    findBunches(board, null);

    expect(board).toEqual(before);
  });
});

describe("standsInBunch", () => {
  it.each([
    ["in a line across", ["...", "bbb"], 4],
    ["in a line down", ["b..", "b..", "b.."], 3],
    ["in a square of 4", ["bb.", "bb."], 4],
    ["at a line's end", ["bbbb"], 3],
  ])("finds a fuzzball %s standing in a bunch", (_, picture, square) => {
    expect(standsInBunch(boardFrom(picture), square)).toBe(true);
  });

  it.each([
    ["beside a bunch", ["bbb", "b.."], 4],
    ["in 2 of a kind", ["bb.", "b.."], 0],
    ["where the frizzball is", ["f.."], 0],
    ["where nothing is", [" .."], 0],
  ])("finds none standing %s", (_, picture, square) => {
    expect(standsInBunch(boardFrom(picture), square)).toBe(false);
  });
});

describe("bunchesAs", () => {
  it("takes a fuzzball's kind", () => {
    expect(bunchesAs(boardFrom(["V"]).pieces[0] ?? null)).toBe("violet");
  });

  it.each([["f"], ["1"], ["z"], [" "]])("takes no kind for %j", (letter) => {
    expect(bunchesAs(boardFrom([letter]).pieces[0] ?? null)).toBeNull();
  });
});

import { LEGEND } from "./legend";
import { layOut, readPictures } from "./picture";

describe("layOut", () => {
  it("puts on each square, row by row, what its letter does", () => {
    const { width, height, placed } = layOut(["b?1", "_z."], null);

    expect({ width, height, placed }).toEqual({
      width: 3,
      height: 2,
      placed: [
        LEGEND.b,
        LEGEND["?"],
        LEGEND["1"],
        LEGEND._,
        LEGEND.z,
        LEGEND["."],
      ],
    });
  });

  it("lays no dust for a level with none", () => {
    expect(layOut(["..", ".."], null).dust).toEqual([0, 0, 0, 0]);
  });

  it("lays each square's dust as its digit says", () => {
    expect(layOut(["..", ".."], ["01", "20"]).dust).toEqual([0, 1, 2, 0]);
  });

  it("makes no square a bed on a board with no sleepyhead", () => {
    expect(layOut(["..", ".."], null).beds).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  it("makes the lowest open square of each column a bed on a board with a sleepyhead", () => {
    const { beds } = layOut(["z._", "._.", "_._"], null);

    expect(beds).toEqual([
      false,
      false,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
    ]);
  });

  it("makes no bed in a column of gaps", () => {
    expect(layOut(["z_", "._"], null).beds).toEqual([
      false,
      false,
      true,
      false,
    ]);
  });

  it("throws for pictures that lay no board out, saying what is wrong", () => {
    expect(() => layOut([".", ".."], null)).toThrow(
      "The pictures don't lay a board out: row 2 of its board is 2 squares long, and its first 1.",
    );
  });
});

describe("readPictures", () => {
  it("lays out pictures that lay a board out", () => {
    expect(readPictures(["b.", "_1"], ["10", "02"])).toMatchObject({
      width: 2,
      height: 2,
      dust: [1, 0, 0, 2],
    });
  });

  it.each<[string, readonly string[], readonly string[] | null, string]>([
    ["a board with no rows", [], null, "its board has no squares"],
    ["a board of empty rows", ["", ""], null, "its board has no squares"],
    [
      "a row of another length",
      ["...", "..", "..."],
      null,
      "row 2 of its board is 2 squares long, and its first 3",
    ],
    [
      "a letter of no legend",
      ["...", ".x."],
      null,
      'its board has a "x", which no level draws in, at column 2, row 2',
    ],
    [
      "dust of other rows",
      ["..", ".."],
      ["00"],
      "its dust has 1 rows, and its board 2",
    ],
    [
      "a row of dust of another length",
      ["..", ".."],
      ["00", "0"],
      "row 2 of its dust is 1 squares long, and its first 2",
    ],
    [
      "dust deeper than a square takes",
      ["..", ".."],
      ["00", "03"],
      'its dust has a "3", which no level draws in, at column 2, row 2',
    ],
    [
      "dust on a gap",
      ["._", ".."],
      ["01", "00"],
      "its dust lies on a gap at column 2, row 1",
    ],
  ])("finds %s", (_, board, dust, problem) => {
    expect(readPictures(board, dust)).toBe(problem);
  });
});

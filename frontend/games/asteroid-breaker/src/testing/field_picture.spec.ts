import {
  CELL,
  PICTURE_TORUS,
  fieldFrom,
  shipOf,
  wholeRocks,
} from "./field_picture";

describe("fieldFrom", () => {
  it("lays each rock and the ship in its cell's middle", () => {
    const field = fieldFrom(["^.", ".M"]);

    expect([
      shipOf(field),
      wholeRocks(field).map(({ size, x, y }) => ({ size, x, y })),
    ]).toEqual([
      expect.objectContaining({ x: CELL / 2, y: CELL / 2 }),
      [{ size: "medium", x: 1.5 * CELL, y: 1.5 * CELL }],
    ]);
  });

  it.each([
    [
      "too many rows",
      Array.from({ length: PICTURE_TORUS.height / CELL + 1 }, () => "."),
      "Too many rows",
    ],
    [
      "a row too long",
      [".".repeat(PICTURE_TORUS.width / CELL + 1)],
      "too long",
    ],
    ["two ships", ["^.^"], "one ship at most"],
    ["a character it doesn't know", ["X"], 'No rock is drawn "X"'],
  ])("refuses a picture of %s", (_, rows, message) => {
    expect(() => fieldFrom(rows)).toThrow(message);
  });

  it("refuses more rocks than its cap", () => {
    expect(() => fieldFrom(["LL"], { cap: 1 })).toThrow("No slot was free");
  });

  it("refuses a rock of a kind that doesn't come in its size", () => {
    expect(() => fieldFrom(["S"], { kind: "crystal" })).toThrow(RangeError);
  });
});

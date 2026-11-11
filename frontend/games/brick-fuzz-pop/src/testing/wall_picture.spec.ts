import type { Brick } from "../rules/wall/wall";
import { twinsIn, wallFrom } from "./wall_picture";

/** Returns a whole brick of a kind, as a picture lays one out. */
function whole(kind: Brick["kind"], hits: number, tint = 0): Brick {
  return { kind, hits, full: hits, plates: 0, tint, twin: null };
}

/** Returns a run of empty cells. */
function empty(cells: number): null[] {
  return Array.from({ length: cells }, () => null);
}

describe("wallFrom", () => {
  it("lays a picture out from its lowest row up, each row left to right", () => {
    const wall = wallFrom(
      [
        "3#|......", //
        "o-......6",
      ],
      { lowestRow: 5 },
    );

    expect(wall).toEqual({
      bricks: [
        whole("brick", 1),
        whole("rowZapper", 1),
        ...empty(6),
        whole("tough", 6),
        whole("tough", 3, 1),
        whole("steel", 0),
        whole("columnZapper", 1),
        ...empty(6),
      ],
      rows: 2,
      lowestRow: 5,
    });
  });

  it("stands the wall's lowest row over the floor's by default", () => {
    expect(wallFrom(["o........"]).lowestRow).toBe(1);
  });

  it("tints the plain and tough bricks by their rows in turn, from the lowest", () => {
    const wall = wallFrom([
      "o........",
      "2........",
      "o........",
      "o........",
      "o........",
      "o........",
      "o........",
      "o........",
      "o........",
    ]);

    const tints = wall.bricks.flatMap((brick) =>
      brick === null ? [] : [brick.tint],
    );

    expect(tints).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 0]);
  });

  it("tints each cage by its number among the picture's, from the lowest row up, left to right", () => {
    const wall = wallFrom(["C..o....C", "..C.C...."]);

    expect(
      wall.bricks.flatMap((brick) =>
        brick === null ? [] : [[brick.kind, brick.tint]],
      ),
    ).toEqual([
      ["cage", 0],
      ["cage", 1],
      ["cage", 2],
      ["brick", 1],
      ["cage", 3],
    ]);
  });

  it("lays out an empty picture as a wall of no rows", () => {
    expect(wallFrom([])).toEqual({ bricks: [], rows: 0, lowestRow: 1 });
  });

  it.each(["........", ".........."])(
    "refuses a row that isn't nine wide, such as %s",
    (row) => {
      expect(() => wallFrom([".........", row])).toThrow(
        `A wall's picture is 9 characters wide a row, not "${row}".`,
      );
    },
  );

  it("refuses a portal with no pair, before its kind", () => {
    expect(() => wallFrom(["..@......"])).toThrow(
      `A wall's picture holds 1 of the portal "@", where a pair has 2.`,
    );
  });

  it("lays a pair of portals out as each other's twins", () => {
    const wall = wallFrom(["@........", "........@"]);

    expect([wall.bricks[8], wall.bricks[9]]).toEqual([
      { kind: "portal", hits: 0, full: 0, plates: 0, tint: 0, twin: 9 },
      { kind: "portal", hits: 0, full: 0, plates: 0, tint: 0, twin: 8 },
    ]);
  });

  it("refuses a character the legend lacks, no cataloged kind's brick", () => {
    expect(() => wallFrom(["....?...."])).toThrow(
      `A wall's picture holds "?", no cataloged kind's brick.`,
    );
  });
});

describe("twinsIn", () => {
  it("pairs each portal with the other of its mark, the first pair's and the second's", () => {
    const characters = "@..&o...@&";

    expect(twinsIn(characters)).toEqual([
      8,
      null,
      null,
      9,
      null,
      null,
      null,
      null,
      0,
      3,
    ]);
  });

  // Neither a second pair with no first nor twins more than four rows
  // apart is a level's, but a spec may draw them.
  it("pairs a mark on its own, as no level may", () => {
    expect(twinsIn("&...&")).toEqual([4, null, null, null, 0]);
  });

  it("twins no cell of a wall with no portal", () => {
    expect(twinsIn("o.#-")).toEqual([null, null, null, null]);
  });

  it.each([
    ["once", "..@.", 1],
    ["three times", "@@.@", 3],
  ])("refuses a portal's mark used %s", (_, characters, count) => {
    expect(() => twinsIn(characters)).toThrow(
      `A wall's picture holds ${String(count)} of the portal "@", where a pair has 2.`,
    );
  });
});

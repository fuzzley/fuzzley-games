import type { Brick } from "../rules/wall/wall";
import { wallFrom } from "./wall_picture";

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

  // Wool is in the legend, but not yet in the catalog.
  it.each(["W", "?"])("refuses %s, no cataloged kind's brick", (character) => {
    expect(() => wallFrom([`....${character}....`])).toThrow(
      `A wall's picture holds "${character}", no cataloged kind's brick.`,
    );
  });
});

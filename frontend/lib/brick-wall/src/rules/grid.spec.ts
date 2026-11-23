import { type Box, FACE_NORMAL, MISSED, SIDE, sweepFace } from "@fz/core/sweep";
import { COLUMNS, RADIUS } from "./field";
import {
  CEILINGWARD,
  CEILINGWARD_LEFT,
  CEILINGWARD_RIGHT,
  FLOORWARD,
  FLOORWARD_LEFT,
  FLOORWARD_RIGHT,
  LEFT,
  RIGHT,
  brickAt,
  brickBox,
  cellAt,
  cellOf,
  columnOf,
  fieldRowOf,
  wallRowOf,
} from "./grid";

/** A brick of a kind made up for the specs, which the grid holds as it is. */
interface Pebble {
  readonly kind: string;
}

/** Describes bricks laid out by wall cell, their lowest row standing in a field row. */
interface Laid {
  readonly bricks: readonly (Pebble | null)[];
  readonly lowestRow: number;
}

/** The depth of the field the specs play on, but where one says otherwise. */
const DEPTH = 11;

/**
 * Returns bricks laid out from rows of nine characters, the top row first,
 * each character a brick of that kind but `.` for none, the lowest standing
 * in a field row.
 */
function laidOut(rows: readonly string[], lowestRow: number): Laid {
  const bricks = [...rows]
    .reverse()
    .flatMap((row) =>
      Array.from(row, (character) =>
        character === "." ? null : { kind: character },
      ),
    );
  return { bricks, lowestRow };
}

/** Returns a box with no size, for `brickBox()` to write into. */
function emptyBox(): Box {
  return { left: 0, top: 0, right: 0, bottom: 0 };
}

describe("a brick's faces and corners in the field", () => {
  // @fz/core/sweep names them for a y that grows down, and the field's grows
  // up from its floor.
  it.each([
    ["floorward", FLOORWARD, SIDE.top, { x: 0, y: -1 }],
    ["ceilingward", CEILINGWARD, SIDE.bottom, { x: 0, y: 1 }],
    ["left", LEFT, SIDE.left, { x: -1, y: 0 }],
    ["right", RIGHT, SIDE.right, { x: 1, y: 0 }],
  ] as const)(
    "make the %s face SIDE's, its normal pointing out that way",
    (_, face, side, normal) => {
      expect([face, FACE_NORMAL[face]]).toEqual([side, normal]);
    },
  );

  it.each([
    ["floorward and left", FLOORWARD_LEFT, SIDE.topLeft],
    ["floorward and right", FLOORWARD_RIGHT, SIDE.topRight],
    ["ceilingward and left", CEILINGWARD_LEFT, SIDE.bottomLeft],
    ["ceilingward and right", CEILINGWARD_RIGHT, SIDE.bottomRight],
  ] as const)("make the %s corner SIDE's", (_, corner, side) => {
    expect(corner).toBe(side);
  });

  it("meet a fuzzball rising from the floor at the floorward face", () => {
    const rising = { x: 4.5, y: RADIUS, dx: 0, dy: 2, r: RADIUS };
    const box = brickBox(4, 1, emptyBox());

    expect([
      sweepFace(rising, box, FLOORWARD),
      sweepFace(rising, box, CEILINGWARD),
    ]).toEqual([0.25, MISSED]);
  });
});

describe("the wall's cells", () => {
  it("are numbered by wall row from the lowest, then by column", () => {
    const cell = cellOf(4, 2);

    expect([cell, columnOf(cell), wallRowOf(cell)]).toEqual([22, 4, 2]);
  });

  it("stand in the field rows over the wall's lowest", () => {
    expect(fieldRowOf({ lowestRow: 5 }, cellOf(3, 1))).toBe(6);
  });

  it("are found from a field cell", () => {
    expect(cellAt({ lowestRow: 5 }, 3, 6)).toBe(cellOf(3, 1));
  });
});

describe("brickAt", () => {
  // At a depth of 11 the field's rows are 0 to 10, and the top row waits
  // over the ceiling.
  const wall = laidOut(
    [
      "..s......", //
      ".f.......",
      "p........",
    ],
    9,
  );

  it.each([
    [0, 9, "p"],
    [1, 10, "f"],
  ])("finds the brick in column %i, row %i", (column, row, kind) => {
    expect(brickAt(wall, DEPTH, column, row)?.kind).toBe(kind);
  });

  it("finds none in a row waiting over the ceiling", () => {
    expect(brickAt(wall, DEPTH, 2, 11)).toBeNull();
  });

  it("finds a waiting row's brick once the field is deep enough to hold it", () => {
    expect(brickAt(wall, DEPTH + 1, 2, 11)?.kind).toBe("s");
  });

  // A column past a side wall would name the last cell of the row below or
  // the first of the row above, as a wall cell is a wall row × 9 + a column.
  it.each([
    [-1, 10],
    [COLUMNS, 9],
  ])("finds none beyond a side wall, in column %i, row %i", (column, row) => {
    const edges = laidOut(["p.......p", "p.......p"], 9);

    expect(brickAt(edges, DEPTH, column, row)).toBeNull();
  });

  it.each([
    ["under the wall's lowest row", 8],
    ["over the wall's highest row", 12],
  ])("finds none %s", (_, row) => {
    expect(brickAt(wall, DEPTH + 2, 0, row)).toBeNull();
  });

  // A wall comes down that far only once its level is lost.
  it("finds none under the floor", () => {
    const sunk = laidOut(["p........", "f........"], -1);

    expect([brickAt(sunk, DEPTH, 0, -1), brickAt(sunk, DEPTH, 0, 0)]).toEqual([
      null,
      { kind: "p" },
    ]);
  });
});

describe("brickBox", () => {
  it("writes a field cell's box, its top the edge nearest the floor", () => {
    const box = emptyBox();

    brickBox(3, 7, box);

    expect(box).toEqual({ left: 3, top: 7, right: 4, bottom: 8 });
  });

  it("returns the box it wrote, making none", () => {
    const box = emptyBox();

    expect(brickBox(3, 7, box)).toBe(box);
  });
});

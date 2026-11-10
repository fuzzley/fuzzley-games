import {
  ALL_SIDES,
  type Box,
  FACE_NORMAL,
  MISSED,
  SIDE,
  exposureOf,
  sweepFace,
} from "@fz/core/sweep";
import { STAND_INS } from "../testing/stand_ins";
import { wallFrom } from "../testing/wall_picture";
import { type BrickKind, brickKind } from "./catalog/bricks";
import {
  CEILINGWARD,
  CEILINGWARD_LEFT,
  CEILINGWARD_RIGHT,
  FLOORWARD,
  FLOORWARD_LEFT,
  FLOORWARD_RIGHT,
  LEFT,
  RIGHT,
  SHAPES,
  boxesIn,
  brickAt,
  brickBox,
  cellAt,
  cellOf,
  columnOf,
  fieldRowOf,
  shapeOf,
  shapesOf,
  wallRowOf,
} from "./grid";
import { RADIUS } from "./tuning";
import type { Wall } from "./wall/wall";

/** The depth of the field the specs play on, but where one says otherwise. */
const DEPTH = 11;

/** Returns which faces and corners of the brick in a field cell a fuzzball can touch. */
function exposure(
  wall: Wall,
  column: number,
  row: number,
  depth = DEPTH,
): number {
  return exposureOf(boxesIn(wall, depth, SHAPES), column, row);
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

  // Of two bricks stacked, the lower shows its face to the floor, and the
  // higher its face to the ceiling.
  it("show a stack's lower brick to the floor, not to the ceiling", () => {
    const wall = wallFrom([
      "....o....", //
      "....o....",
    ]);

    expect(exposure(wall, 4, 1)).toBe(
      FLOORWARD | LEFT | RIGHT | FLOORWARD_LEFT | FLOORWARD_RIGHT,
    );
  });

  it("show a stack's higher brick to the ceiling, not to the floor", () => {
    const wall = wallFrom([
      "....o....", //
      "....o....",
    ]);

    expect(exposure(wall, 4, 2)).toBe(
      CEILINGWARD | LEFT | RIGHT | CEILINGWARD_LEFT | CEILINGWARD_RIGHT,
    );
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
    const wall = wallFrom(["o........", "o........"], { lowestRow: 5 });

    expect(fieldRowOf(wall, cellOf(3, 1))).toBe(6);
  });

  it("are found from a field cell", () => {
    const wall = wallFrom(["o........", "o........"], { lowestRow: 5 });

    expect(cellAt(wall, 3, 6)).toBe(cellOf(3, 1));
  });
});

describe("brickAt", () => {
  // At a depth of 11 the field's rows are 0 to 10, and the steel waits over
  // the ceiling.
  const wall = wallFrom(
    [
      "..#......", //
      ".2.......",
      "o........",
    ],
    { lowestRow: 9 },
  );

  it.each([
    [0, 9, "brick"],
    [1, 10, "tough"],
  ])("finds the brick in column %i, row %i", (column, row, kind) => {
    expect(brickAt(wall, DEPTH, column, row)?.kind).toBe(kind);
  });

  it("finds none in a row waiting over the ceiling", () => {
    expect(brickAt(wall, DEPTH, 2, 11)).toBeNull();
  });

  it("finds a waiting row's brick once the field is deep enough to hold it", () => {
    expect(brickAt(wall, DEPTH + 1, 2, 11)?.kind).toBe("steel");
  });

  // A column past a side wall would name the last cell of the row below or
  // the first of the row above, as a wall cell is a wall row × 9 + a column.
  it.each([
    [-1, 10],
    [9, 9],
  ])("finds none beyond a side wall, in column %i, row %i", (column, row) => {
    const edges = wallFrom(["o.......o", "o.......o"], { lowestRow: 9 });

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
    const sunk = wallFrom(["o........", "o........"], { lowestRow: -1 });

    expect([brickAt(sunk, DEPTH, 0, -1), brickAt(sunk, DEPTH, 0, 0)]).toEqual([
      null,
      sunk.bricks[cellOf(0, 1)],
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

describe("shapeOf", () => {
  it.each(["brick", "tough", "steel", "rowZapper", "columnZapper"] as const)(
    "meets a fuzzball with %s's box",
    (id) => {
      expect(shapeOf(brickKind(id))).toBe("box");
    },
  );

  // Kinds made up for the spec, as the bumper and the portal will be.
  it("meets a fuzzball with a disc where a solid kind kicks", () => {
    const bumper: BrickKind = {
      ...brickKind("steel"),
      traits: [{ kind: "never" }, { kind: "kicks", radius: 0.38 }],
    };

    expect(shapeOf(bumper)).toBe("round");
  });

  it("lets a fuzzball into a kind that isn't solid", () => {
    const portal: BrickKind = {
      ...brickKind("steel"),
      solid: false,
      traits: [{ kind: "never" }, { kind: "teleports" }],
    };

    expect(shapeOf(portal)).toBe("open");
  });
});

describe("shapesOf", () => {
  it("gives each kind its shape, the stand-ins' among them", () => {
    expect(shapesOf(STAND_INS)).toEqual({
      brick: "box",
      tough: "box",
      steel: "box",
      rowZapper: "round",
      columnZapper: "open",
    });
  });

  it("gives the catalog's kinds their shapes", () => {
    expect(SHAPES).toMatchObject({
      brick: "box",
      tough: "box",
      steel: "box",
      rowZapper: "box",
      columnZapper: "box",
    });
  });
});

describe("boxesIn, read through exposureOf", () => {
  it("shows every face and corner of a brick alone", () => {
    const wall = wallFrom(["....o...."]);

    expect(exposure(wall, 4, 1)).toBe(ALL_SIDES);
  });

  it("makes one face of bricks side by side", () => {
    const wall = wallFrom(["...ooo..."]);

    expect(exposure(wall, 4, 1)).toBe(FLOORWARD | CEILINGWARD);
  });

  it("shows a corner only where no brick touches it", () => {
    const wall = wallFrom([
      "...o.....", //
      "....o....",
    ]);

    expect(exposure(wall, 4, 1)).toBe(ALL_SIDES & ~CEILINGWARD_LEFT);
  });

  it("stands steel as a box, as any brick", () => {
    const wall = wallFrom(["...o#o..."]);

    expect([exposure(wall, 3, 1), exposure(wall, 4, 1)]).toEqual([
      FLOORWARD | CEILINGWARD | LEFT | FLOORWARD_LEFT | CEILINGWARD_LEFT,
      FLOORWARD | CEILINGWARD,
    ]);
  });

  it("counts the cells beyond the left side wall as solid", () => {
    const wall = wallFrom(["o........"]);

    expect(exposure(wall, 0, 1)).toBe(
      FLOORWARD | CEILINGWARD | RIGHT | FLOORWARD_RIGHT | CEILINGWARD_RIGHT,
    );
  });

  it("counts the cells beyond the right side wall as solid", () => {
    const wall = wallFrom(["........o"]);

    expect(exposure(wall, 8, 1)).toBe(
      FLOORWARD | CEILINGWARD | LEFT | FLOORWARD_LEFT | CEILINGWARD_LEFT,
    );
  });

  describe("under a brick over the field's top row", () => {
    const wall = wallFrom(
      [
        "....o....", //
        "....o....",
      ],
      { lowestRow: 10 },
    );

    it("counts the row as empty while it waits over the ceiling", () => {
      expect(exposure(wall, 4, 10, 11)).toBe(ALL_SIDES);
    });

    it("counts the row as solid once a deeper field brings it in", () => {
      expect(exposure(wall, 4, 10, 12)).toBe(
        FLOORWARD | LEFT | RIGHT | FLOORWARD_LEFT | FLOORWARD_RIGHT,
      );
    });
  });

  // A made-up bumper ("-") and portal ("|") stand in for kinds the catalog
  // doesn't hold yet.
  it.each([
    ["a bumper's", "...o-o..."],
    ["a portal's", "...o|o..."],
  ])(
    "counts %s cell as open, its neighbours showing it their faces",
    (_, row) => {
      const solid = boxesIn(wallFrom([row]), DEPTH, shapesOf(STAND_INS));

      expect([exposureOf(solid, 3, 1), exposureOf(solid, 5, 1)]).toEqual([
        ALL_SIDES,
        ALL_SIDES,
      ]);
    },
  );

  it("reads the wall as it stands when asked", () => {
    const wall = wallFrom(["...oo...."]);
    const bricks = [...wall.bricks];
    const solid = boxesIn({ ...wall, bricks }, DEPTH, SHAPES);

    bricks[cellOf(3, 0)] = null;

    expect(exposureOf(solid, 4, 1)).toBe(ALL_SIDES);
  });
});

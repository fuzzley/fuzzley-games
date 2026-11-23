import {
  CEILINGWARD,
  CEILINGWARD_LEFT,
  CEILINGWARD_RIGHT,
  FLOORWARD,
  FLOORWARD_LEFT,
  FLOORWARD_RIGHT,
  LEFT,
  RIGHT,
  cellOf,
} from "@fz/brick-wall/rules/grid";
import { ALL_SIDES, exposureOf } from "@fz/core/sweep";
import { STAND_INS } from "../testing/stand_ins";
import { wallFrom } from "../testing/wall_picture";
import { type BrickKind, brickKind } from "./catalog/bricks";
import { SHAPES, boxesIn, shapeOf, shapesOf } from "./grid";
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
      bomb: "box",
      crossZapper: "box",
      xZapper: "box",
      wool: "box",
      cage: "box",
      bumper: "round",
      prism: "box",
      portal: "open",
      plated: "box",
      shell: "box",
      moss: "box",
    });
  });

  it("gives the catalog's kinds their shapes", () => {
    expect(SHAPES).toMatchObject({
      brick: "box",
      tough: "box",
      steel: "box",
      rowZapper: "box",
      columnZapper: "box",
      bomb: "box",
      crossZapper: "box",
      xZapper: "box",
      wool: "box",
      cage: "box",
      bumper: "round",
      prism: "box",
      portal: "open",
      plated: "box",
      shell: "box",
      moss: "box",
    });
  });
});

describe("boxesIn, read through exposureOf", () => {
  // Of two bricks stacked, the lower shows its face to the floor, and the
  // higher its face to the ceiling.
  it("shows a stack's lower brick to the floor, not to the ceiling", () => {
    const wall = wallFrom([
      "....o....", //
      "....o....",
    ]);

    expect(exposure(wall, 4, 1)).toBe(
      FLOORWARD | LEFT | RIGHT | FLOORWARD_LEFT | FLOORWARD_RIGHT,
    );
  });

  it("shows a stack's higher brick to the ceiling, not to the floor", () => {
    const wall = wallFrom([
      "....o....", //
      "....o....",
    ]);

    expect(exposure(wall, 4, 2)).toBe(
      CEILINGWARD | LEFT | RIGHT | CEILINGWARD_LEFT | CEILINGWARD_RIGHT,
    );
  });

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

  // The made-up bumper ("-") and portal ("|") of the stand-ins.
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

import { RADIUS } from "@fz/brick-wall/rules/field";
import { cellOf } from "@fz/brick-wall/rules/grid";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import { WALL_LEGEND } from "../levels/legend";
import {
  type BrickFace,
  type Face,
  MISSED,
  OVERLAP,
  boundsOf,
  brickFaces,
  faceOrder,
  facesOf,
  fieldShapes,
  meetsAt,
} from "./faces";

/** The depth of the field the specs play on. */
const DEPTH = 11;

/** Returns the faces a field cell's brick shows, its wall drawn as a picture whose lowest row stands in field row `lowestRow`. */
function facesAt(
  picture: readonly string[],
  lowestRow: number,
  column: number,
  row: number,
): BrickFace[] {
  const wall = wallFrom(picture, WALL_LEGEND, { lowestRow });
  return brickFaces(fieldShapes(wall, DEPTH), column, row);
}

/** Returns a name for each of a brick's faces: a flat's line and the way it faces, as "across -1", a slant's ways, as "slant 1 -1", or another face's kind. */
function sidesOf(faces: readonly Face[]): string[] {
  return faces.map((face) => {
    switch (face.kind) {
      case "flat":
        return `${face.along} ${String(face.facing)}`;
      case "slant":
        return `slant ${String(face.facingX)} ${String(face.facingY)}`;
      case "floor":
      case "bar":
      case "eye":
        return face.kind;
    }
  });
}

/** Returns the face of a kind facing as `sidesOf()` names it, throwing where there is none. */
function faceNamed(faces: readonly Face[], name: string): Face {
  const face = faces[sidesOf(faces).indexOf(name)];
  if (face === undefined) {
    throw new RangeError(`No face is "${name}".`);
  }
  return face;
}

/** Returns a brick's flats. */
function flatsOf(faces: readonly BrickFace[]): BrickFace[] {
  return faces.filter(({ kind }) => kind === "flat");
}

/** Returns what the brick in a wall cell owns. */
function brickOwner(cell: number): { kind: "brick"; cell: number } {
  return { kind: "brick", cell };
}

/** A flat across at y = 3, from x = 2 to 3, facing down, as a brick in row 3's floorward flat is, but a radius lower. */
const UNDER: Face = {
  kind: "flat",
  along: "across",
  line: 3,
  from: 2,
  to: 3,
  facing: -1,
  owner: brickOwner(0),
};

/** A flat up at x = 2, from y = 3 to 4, facing left. */
const LEFT_SIDE: Face = {
  kind: "flat",
  along: "up",
  line: 2,
  from: 3,
  to: 4,
  facing: -1,
  owner: brickOwner(0),
};

describe("brickFaces", () => {
  it("shows a flat a radius out from each side of a brick alone", () => {
    const owner = brickOwner(cellOf(4, 0));

    const faces = facesAt(["....o...."], 5, 4, 5);

    expect(flatsOf(faces)).toEqual([
      {
        kind: "flat",
        along: "across",
        line: 5 - RADIUS,
        from: 4,
        to: 5,
        facing: -1,
        owner,
      },
      {
        kind: "flat",
        along: "across",
        line: 6 + RADIUS,
        from: 4,
        to: 5,
        facing: 1,
        owner,
      },
      {
        kind: "flat",
        along: "up",
        line: 4 - RADIUS,
        from: 5,
        to: 6,
        facing: -1,
        owner,
      },
      {
        kind: "flat",
        along: "up",
        line: 5 + RADIUS,
        from: 5,
        to: 6,
        facing: 1,
        owner,
      },
    ]);
  });

  it("cuts each corner of a brick alone, a 45° face joining its two flats' ends", () => {
    const owner = brickOwner(cellOf(4, 0));
    const cut = { kind: "slant", long: false, owner } as const;

    const faces = facesAt(["....o...."], 5, 4, 5);

    expect(faces.filter(({ kind }) => kind === "slant")).toEqual([
      // x + y = 8.75 through (4, 4.75) and (3.75, 5), and so on round.
      { ...cut, facingX: -1, facingY: -1, c: 8.75, from: 3.75, to: 4 },
      { ...cut, facingX: 1, facingY: -1, c: 0.25, from: 5, to: 5.25 },
      { ...cut, facingX: -1, facingY: 1, c: -2.25, from: 3.75, to: 4 },
      { ...cut, facingX: 1, facingY: 1, c: 11.25, from: 5, to: 5.25 },
    ]);
  });

  it("names a brick by its wall cell", () => {
    const faces = facesAt(["....o....", "........."], 4, 4, 5);

    expect(faces.map(({ owner }) => owner)).toEqual(
      Array.from({ length: 8 }, () => brickOwner(cellOf(4, 1))),
    );
  });

  it("shows no face between bricks side by side, so their flats make one face", () => {
    const left = facesAt(["...oo...."], 5, 3, 5);
    const right = facesAt(["...oo...."], 5, 4, 5);

    expect(sidesOf(left)).toEqual([
      "across -1",
      "across 1",
      "up -1",
      "slant -1 -1",
      "slant -1 1",
    ]);
    expect(sidesOf(right)).toEqual([
      "across -1",
      "across 1",
      "up 1",
      "slant 1 -1",
      "slant 1 1",
    ]);
  });

  it("cuts no corner another brick touches", () => {
    const low = facesAt(["....o....", "...o....."], 5, 3, 5);
    const high = facesAt(["....o....", "...o....."], 5, 4, 6);

    expect(sidesOf(low)).not.toContain("slant 1 1");
    expect(sidesOf(high)).not.toContain("slant -1 -1");
    expect(sidesOf(low)).toContain("slant 1 -1");
  });

  it("cuts no corner against a side wall or the ceiling", () => {
    const left = facesAt(["o........"], 5, 0, 5);
    const top = facesAt(["....o...."], DEPTH - 1, 4, DEPTH - 1);

    expect(sidesOf(left)).toEqual([
      "across -1",
      "across 1",
      "up 1",
      "slant 1 -1",
      "slant 1 1",
    ]);
    expect(sidesOf(top)).toEqual([
      "across -1",
      "up -1",
      "up 1",
      "slant -1 -1",
      "slant 1 -1",
    ]);
  });

  it("shows no face between bricks one over the other", () => {
    const faces = facesAt(["....o....", "....o...."], 5, 4, 5);

    expect(faces).not.toContainEqual(
      expect.objectContaining({ along: "across", facing: 1 }),
    );
  });

  it("shows no face toward a side wall", () => {
    const faces = facesAt(["o.......o"], 5, 0, 5);

    expect(faces).not.toContainEqual(
      expect.objectContaining({ along: "up", facing: -1 }),
    );
  });

  it("shows no face toward the ceiling from the field's top row", () => {
    const faces = facesAt(["....o...."], DEPTH - 1, 4, DEPTH - 1);

    expect(faces).not.toContainEqual(
      expect.objectContaining({ along: "across", facing: 1 }),
    );
  });

  it("shows a face toward the floor from the field's lowest row a brick stands in", () => {
    const faces = facesAt(["....o...."], 1, 4, 1);

    expect(faces).toContainEqual(
      expect.objectContaining({ along: "across", line: 1 - RADIUS }),
    );
  });

  it("shows none for a cell with no brick, or one waiting over the ceiling", () => {
    expect(facesAt(["....o...."], 5, 3, 5)).toEqual([]);
    expect(facesAt(["....o...."], DEPTH, 4, DEPTH)).toEqual([]);
  });
});

describe("boundsOf", () => {
  it("bounds a field with the side walls and the ceiling a radius in, and the floor", () => {
    expect(boundsOf(DEPTH)).toEqual([
      {
        kind: "flat",
        along: "up",
        line: RADIUS,
        from: 0,
        to: DEPTH,
        facing: 1,
        owner: { kind: "wall", side: "left" },
      },
      {
        kind: "flat",
        along: "up",
        line: 9 - RADIUS,
        from: 0,
        to: DEPTH,
        facing: -1,
        owner: { kind: "wall", side: "right" },
      },
      {
        kind: "flat",
        along: "across",
        line: DEPTH - RADIUS,
        from: 0,
        to: 9,
        facing: -1,
        owner: { kind: "ceiling" },
      },
      { kind: "floor" },
    ]);
  });
});

describe("facesOf", () => {
  it("lists the field's bounds, then each brick's faces, as faceOrder() does", () => {
    const wall = wallFrom(["o.......o", "....o...."], WALL_LEGEND, {
      lowestRow: 5,
    });

    const faces = facesOf(wall, DEPTH);

    expect(faces.slice(0, 4)).toEqual(boundsOf(DEPTH));
    expect(faces.map(faceOrder)).toEqual(
      [...faces.map(faceOrder)].sort((a, b) => a - b),
    );
    expect(faces).toHaveLength(4 + 5 + 5 + 8);
  });

  it("leaves out the bricks waiting over the ceiling", () => {
    const wall = wallFrom(["oooo.oooo", "........."], WALL_LEGEND, {
      lowestRow: DEPTH - 1,
    });

    expect(facesOf(wall, DEPTH)).toEqual(boundsOf(DEPTH));
  });
});

describe("meetsAt", () => {
  it("meets a flat flown into at its line, as far along the heading", () => {
    expect(meetsAt(UNDER, 1.25, 1, 0.6, 0.8)).toBeCloseTo(2.5, 12);
    expect(meetsAt(LEFT_SIDE, 0, 2.25, 0.8, 0.6)).toBeCloseTo(2.5, 12);
  });

  it("never meets a flat flown away from or along", () => {
    expect(meetsAt(UNDER, 2.5, 1, 0.6, -0.8)).toBe(MISSED);
    expect(meetsAt(UNDER, 2.5, 1, 1, 0)).toBe(MISSED);
    expect(meetsAt(LEFT_SIDE, 0, 3.5, -0.8, 0.6)).toBe(MISSED);
  });

  it("meets a flat at its ends, and a hair past them, but no farther", () => {
    expect(meetsAt(UNDER, 2, 2, 0, 1)).toBe(1);
    expect(meetsAt(UNDER, 3 + OVERLAP, 2, 0, 1)).toBe(1);
    expect(meetsAt(UNDER, 3 + 2 * OVERLAP, 2, 0, 1)).toBe(MISSED);
    expect(meetsAt(UNDER, 2 - 2 * OVERLAP, 2, 0, 1)).toBe(MISSED);
  });

  it("meets a flat it touches, or lies a hair behind, at once, and none it lies farther behind", () => {
    expect(meetsAt(UNDER, 2.5, 3, 0, 1)).toBe(0);
    expect(meetsAt(UNDER, 2.5, 3 + OVERLAP / 2, 0, 1)).toBe(0);
    expect(meetsAt(UNDER, 2.5, 3 + 2 * OVERLAP, 0, 1)).toBe(MISSED);
  });

  it("meets a slant flown into at its line, between its ends", () => {
    // x + y = 8.75 from x = 3.75 to 4, facing left and down.
    const cut = faceNamed(facesAt(["....o...."], 5, 4, 5), "slant -1 -1");

    expect(meetsAt(cut, 3.875, 3.875, 0, 1)).toBeCloseTo(1, 12);
    expect(meetsAt(cut, 2.875, 4.875, 1, 0)).toBeCloseTo(1, 12);
    expect(meetsAt(cut, 3.5, 3.5, 0, 1)).toBe(MISSED);
    expect(meetsAt(cut, 3.875, 3.875, 0.6, -0.8)).toBe(MISSED);
    expect(meetsAt(cut, 3.875, 5, 0, 1)).toBe(MISSED);
  });

  it("meets a side wall, the ceiling and the floor from beyond them, at once", () => {
    const [left, right, ceiling, floor] = boundsOf(DEPTH) as [
      Face,
      Face,
      Face,
      Face,
    ];

    expect(meetsAt(left, -1, 5, -1, 0)).toBe(0);
    expect(meetsAt(right, 10, 5, 1, 0)).toBe(0);
    expect(meetsAt(ceiling, 4, 12, 0, 1)).toBe(0);
    expect(meetsAt(floor, 4, -1, 0, -1)).toBe(0);
  });

  it("meets a side wall, the ceiling and the floor anywhere along them", () => {
    const [left, , ceiling, floor] = boundsOf(DEPTH) as [
      Face,
      Face,
      Face,
      Face,
    ];

    expect(meetsAt(left, 1.25, 50, -1, 0)).toBe(1);
    expect(meetsAt(ceiling, -40, 9.75, 0, 1)).toBe(1);
    expect(meetsAt(floor, 40, 2.25, 0, -1)).toBe(2);
  });

  it("meets the floor only flying down", () => {
    const floor: Face = { kind: "floor" };

    expect(meetsAt(floor, 4, 1, 0.6, -0.8)).toBeCloseTo(0.9375, 12);
    expect(meetsAt(floor, 4, 1, 0.6, 0.8)).toBe(MISSED);
  });
});

describe("faceOrder", () => {
  it("lists the left wall, the right wall, the ceiling and the floor, then each brick floor up and left to right", () => {
    const [left, right, ceiling, floor] = boundsOf(DEPTH) as [
      Face,
      Face,
      Face,
      Face,
    ];
    const low: Face = { ...UNDER, owner: brickOwner(1) };
    const high: Face = { ...UNDER, owner: brickOwner(9) };

    const order = [left, right, ceiling, floor, low, high].map(faceOrder);

    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(order).size).toBe(order.length);
  });

  it("lists a brick's flats down, up, left and right, then its cuts", () => {
    const faces = facesAt(["....o...."], 5, 4, 5);

    const order = faces.map(faceOrder);

    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(order).size).toBe(8);
  });
});

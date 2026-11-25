import { keysOf, recordOf } from "@fz/core/records";
import { colorNumber } from "@fz/phaser/color";
import { FIELD_ROLES, type PaletteRoles } from "../view/colors/palette";
import {
  ART_ROLES,
  billionths,
  distanceToSegment,
  octagon,
  pastOutline,
  pointInBillionths,
} from "./art_frames";
import { PALETTES } from "./roles";

describe("ART_ROLES", () => {
  it("gives every role a color no other takes, so a spec sees which one the art reads", () => {
    const colors = Object.values(ART_ROLES).map(colorNumber);

    expect(new Set(colors).size).toBe(colors.length);
  });

  it("holds Classic felt's roles as its stylesheet sets them, but a page of Soft pastel's", () => {
    const stylesheet: PaletteRoles = {
      ...PALETTES.rolesIn("classic", FIELD_ROLES),
      page: PALETTES.role("pastel", FIELD_ROLES.page),
    };

    expect(
      recordOf(keysOf(ART_ROLES), (role) => colorNumber(ART_ROLES[role])),
    ).toEqual(
      recordOf(keysOf(stylesheet), (role) => colorNumber(stylesheet[role])),
    );
  });
});

describe("billionths", () => {
  it.each([
    [1.9999999999999991, 2],
    [1.2345678904, 1.23456789],
  ])("rounds %f to a billionth, %f", (n, rounded) => {
    expect(billionths(n)).toBe(rounded);
  });

  it("gives 0 for -0, which a deep equality tells apart", () => {
    expect(billionths(-0)).toBe(0);
  });
});

describe("pointInBillionths", () => {
  it("rounds each of a point's numbers to a billionth", () => {
    expect(
      pointInBillionths({ x: 7.999999999999999, y: -0.0000000000000002 }),
    ).toEqual({ x: 8, y: 0 });
  });
});

describe("distanceToSegment", () => {
  const from = { x: 0, y: 0 };
  const to = { x: 10, y: 0 };

  it.each([
    ["beside it", { x: 4, y: 3 }, 3],
    ["past its start", { x: -3, y: 4 }, 5],
    ["past its end", { x: 13, y: -4 }, 5],
  ])("measures to a point %s", (_, point, distance) => {
    expect(distanceToSegment(point, from, to)).toBe(distance);
  });

  it("measures to a line of no length as to its one point", () => {
    expect(distanceToSegment({ x: 3, y: 4 }, from, from)).toBe(5);
  });
});

describe("pastOutline", () => {
  // A square from (0, 0) to (10, 10), clockwise on a canvas, whose y runs
  // down, from its top left corner.
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  it.each([
    ["above it", { x: 5, y: -2 }, 2],
    ["right of it", { x: 13, y: 5 }, 3],
    ["below it", { x: 5, y: 14 }, 4],
    ["left of it", { x: -1, y: 5 }, 1],
  ])("measures a point %s from the edge it lies past", (_, point, past) => {
    expect(pastOutline(point, square)).toBe(past);
  });

  it("measures a point inside it below nothing, by as far as its nearest edge", () => {
    expect(pastOutline({ x: 2, y: 4 }, square)).toBe(-2);
  });

  it("measures a point on its edge as nothing", () => {
    expect(pastOutline({ x: 10, y: 7 }, square)).toBe(0);
  });

  it("measures past an outline with a point that repeats the one before as past the same outline without it", () => {
    const repeated = [{ x: 0, y: 0 }, ...square];

    expect(pastOutline({ x: 13, y: 5 }, repeated)).toBe(3);
  });

  it("measures past a slanting edge square to it", () => {
    const triangle = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];

    expect(billionths(pastOutline({ x: 6, y: 4 }, triangle))).toBe(
      billionths(Math.SQRT2),
    );
  });
});

describe("octagon", () => {
  it("cuts each corner of a rectangle across a cut's length along each side, clockwise from the top of its left side", () => {
    expect(octagon({ x: 0, y: 0 }, { x: 10, y: 6 }, 2)).toEqual([
      { x: 0, y: 2 },
      { x: 2, y: 0 },
      { x: 8, y: 0 },
      { x: 10, y: 2 },
      { x: 10, y: 4 },
      { x: 8, y: 6 },
      { x: 2, y: 6 },
      { x: 0, y: 4 },
    ]);
  });

  it("gives each point to a billionth", () => {
    expect(octagon({ x: 0, y: 0 }, { x: 1, y: 1 }, 0.1 + 0.2)[0]).toEqual({
      x: 0,
      y: 0.3,
    });
  });
});

import { keysOf, recordOf } from "@fz/core/records";
import { colorNumber } from "@fz/phaser/color";
import { FIELD_ROLES, type PaletteRoles } from "../view/colors/palette";
import {
  ART_ROLES,
  billionths,
  distanceToSegment,
  pointInBillionths,
} from "./art_frames";
import { PALETTES } from "./roles";

describe("ART_ROLES", () => {
  it("gives every role a color no other takes, so a spec sees which one the art reads", () => {
    const colors = Object.values(ART_ROLES).map(colorNumber);

    expect(new Set(colors).size).toBe(colors.length);
  });

  it("holds Classic felt's roles as its stylesheet sets them, but a page of Soft pastel's and the text on the warning color of Casino night's", () => {
    const stylesheet: PaletteRoles = {
      ...PALETTES.rolesIn("classic", FIELD_ROLES),
      page: PALETTES.role("pastel", FIELD_ROLES.page),
      onWarning: PALETTES.role("casino", FIELD_ROLES.onWarning),
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

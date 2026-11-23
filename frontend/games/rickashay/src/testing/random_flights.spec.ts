import { RADIUS } from "@fz/brick-wall/rules/field";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import { castField } from "../rules/flight/cast";
import type { Face } from "../rules/flight/faces";
import { WALL_LEGEND } from "../rules/levels/legend";
import type { RandomField } from "./cast_reference";
import {
  type Flight,
  type Point,
  clearance,
  flownByCast,
  solidsOf,
  turnOff,
} from "./random_flights";

/** The depth of the field the specs play on. */
const DEPTH = 11;

/** Returns a field 11 deep holding a wall drawn as a picture, its lowest row standing in a field row. */
function fieldOf(lowestRow: number, picture: readonly string[]): RandomField {
  return { wall: wallFrom(picture, WALL_LEGEND, { lowestRow }), depth: DEPTH };
}

/** The brick in wall cell 0's owner. */
const OWNER = { kind: "brick", cell: 0 } as const;

/** A flat across, facing down, and one up, facing left. */
const ACROSS: Face = {
  kind: "flat",
  along: "across",
  line: 3,
  from: 2,
  to: 3,
  facing: -1,
  owner: OWNER,
};
const UP: Face = { ...ACROSS, along: "up" };

/** Returns a 45° face facing left and down, long or a cut. */
function slant(long: boolean): Face {
  return {
    kind: "slant",
    facingX: -1,
    facingY: -1,
    c: 8,
    from: 3,
    to: 4,
    long,
    owner: OWNER,
  };
}

/** A box's solid shape at column 4 of row 5. */
const BOX: readonly Point[] = [
  [4, 5],
  [5, 5],
  [5, 6],
  [4, 6],
];

describe("turnOff", () => {
  it("mirrors a heading off a flat across, the floor or a bar, and off a flat up", () => {
    expect(turnOff([ACROSS], [0.6, 0.8])).toEqual([0.6, -0.8]);
    expect(turnOff([{ kind: "floor" }], [0.6, -0.8])).toEqual([0.6, 0.8]);
    expect(
      turnOff(
        [{ kind: "bar", line: 3, from: 2, to: 3, owner: OWNER }],
        [0.6, -0.8],
      ),
    ).toEqual([0.6, 0.8]);
    expect(turnOff([UP], [0.6, 0.8])).toEqual([-0.6, 0.8]);
  });

  it("swaps a heading's speeds off a long face it still flies into once the flats have turned it", () => {
    expect(turnOff([slant(true)], [0.6, 0.8])).toEqual([-0.8, -0.6]);
    expect(turnOff([ACROSS, slant(true)], [0.6, 0.8])).toEqual([0.6, -0.8]);
  });

  it("swaps a heading's speeds off a cut only where nothing else turned it", () => {
    expect(turnOff([slant(false)], [0.6, 0.8])).toEqual([-0.8, -0.6]);
    expect(turnOff([ACROSS, slant(false)], [0.6, 0.8])).toEqual([0.6, -0.8]);
  });
});

describe("solidsOf", () => {
  it("gives a box's, a ramp's and a gem's solid shape, each counter-clockwise, and none for a hatch or a portal", () => {
    const field = castField(
      wallFrom(["oLJF7G=@@"], WALL_LEGEND, { lowestRow: 5 }),
      DEPTH,
    );

    expect(solidsOf(field)).toEqual([
      BOX.map(([x, y]) => [x - 4, y]),
      [
        [1, 5],
        [2, 5],
        [1, 6],
      ],
      [
        [2, 5],
        [3, 5],
        [3, 6],
      ],
      [
        [3, 5],
        [4, 6],
        [3, 6],
      ],
      [
        [5, 5],
        [5, 6],
        [4, 6],
      ],
      [
        [5.5, 5],
        [6, 5.5],
        [5.5, 6],
        [5, 5.5],
      ],
    ]);
  });
});

describe("clearance", () => {
  it("measures how near a move comes to a solid shape, squared", () => {
    expect(clearance([3, 4.5], [6, 4.5], BOX)).toBe(0.25);
    expect(clearance([3, 4], [3.75, 4.75], BOX)).toBe(0.125);
  });

  it("is 0 for a move that crosses a solid shape, ends in one or flies inside one", () => {
    expect(clearance([3, 5.5], [6, 5.5], BOX)).toBe(0);
    expect(clearance([3, 5.5], [4.5, 5.5], BOX)).toBe(0);
    expect(clearance([4.5, 5.5], [4.6, 5.5], BOX)).toBe(0);
  });
});

describe("flownByCast", () => {
  /** Returns where each move of a flight went from and to, up the field. */
  function heights(flight: Flight): number[][] {
    return flight.legs.map(({ from, to }) => [from[1], to[1]]);
  }

  it("turns off the walls and the ceiling as C3 does, from the floor", () => {
    const flight = flownByCast(
      fieldOf(DEPTH, ["o........"]),
      4.5,
      [Math.SQRT1_2, Math.SQRT1_2],
      3,
    );

    expect(
      flight.legs.map(({ to: [x, y] }) => [
        Math.round(x * 4) / 4,
        Math.round(y * 4) / 4,
      ]),
    ).toEqual([
      [9 - RADIUS, 4.5],
      [2.5, DEPTH - RADIUS],
      [RADIUS, 8.5],
    ]);
    expect(flight.legs.map(({ heading }) => heading)).toEqual([
      [Math.SQRT1_2, Math.SQRT1_2],
      [-Math.SQRT1_2, Math.SQRT1_2],
      [-Math.SQRT1_2, -Math.SQRT1_2],
    ]);
  });

  it("breaks a brick struck as often as it has hits, and flies through its cell after", () => {
    const flight = flownByCast(fieldOf(5, ["....o...."]), 4.5, [0, 1], 3);

    expect(heights(flight)).toEqual([
      [RADIUS, 5 - RADIUS],
      [5 - RADIUS, RADIUS],
      [RADIUS, DEPTH - RADIUS],
    ]);
  });

  it("is held by the hatches' bars coming down, and falls through them after the last hold", () => {
    const flight = flownByCast(fieldOf(3, ["========="]), 4.5, [0, 1], 8);

    expect(heights(flight).map(([, to]) => to)).toEqual([
      DEPTH - RADIUS,
      4 + RADIUS,
      DEPTH - RADIUS,
      4 + RADIUS,
      DEPTH - RADIUS,
      4 + RADIUS,
      DEPTH - RADIUS,
      RADIUS,
    ]);
  });

  it("goes into a portal's eye and out of its twin's, passing the eyes until it next turns", () => {
    const flight = flownByCast(
      fieldOf(2, ["..@......", ".........", "..@......"]),
      2.5,
      [0, 1],
      4,
    );

    expect(heights(flight)).toEqual([
      [RADIUS, 2.25],
      [4.25, DEPTH - RADIUS],
      [DEPTH - RADIUS, 4.75],
      [2.75, RADIUS],
    ]);
  });

  it("records what each move's cast met, and what a scan of every face met", () => {
    const flight = flownByCast(fieldOf(5, ["....o...."]), 4.5, [0, 1], 3);

    expect(flight.casts).toHaveLength(3);
    expect(flight.casts).toEqual(flight.scans);
  });
});

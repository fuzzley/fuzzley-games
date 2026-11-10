import { createRandom } from "@fz/core/random";
import {
  type Cast,
  castByScan,
  castOf,
  randomField,
  randomShot,
} from "../../testing/cast_reference";
import { BUMPER, STAND_INS } from "../../testing/stand_ins";
import { wallFrom } from "../../testing/wall_picture";
import { AIMS } from "../aims";
import { BRICK_KINDS, type BrickKinds } from "../catalog/bricks";
import {
  CEILINGWARD,
  FLOORWARD,
  FLOORWARD_LEFT,
  FLOORWARD_RIGHT,
  LEFT,
  RIGHT,
  SHAPES,
  cellOf,
} from "../grid";
import { RADIUS } from "../tuning";
import {
  type CastField,
  type Met,
  cast,
  castField,
  createContacts,
} from "./cast";

/** The depth of the field the specs play on. */
const DEPTH = 11;

/** A heading straight up. */
const UP = [0, 1] as const;

/** Returns a field 11 deep holding a wall drawn as a picture, its lowest row standing in a field row, its kinds the stand-ins'. */
function fieldOf(lowestRow: number, picture: readonly string[]): CastField {
  return castField(wallFrom(picture, { lowestRow }), DEPTH, STAND_INS);
}

/** Returns what a fuzzball meets first, cast from a place along a heading, as plain values. */
function castFrom(
  field: CastField,
  [x, y]: readonly [number, number],
  [dx, dy]: readonly [number, number],
  limit = 30,
): Cast {
  return castOf(cast(field, x, y, dx, dy, limit, createContacts()));
}

/** Returns a contact met as a spec expects it, its normal near enough. */
function metAt(
  what: Met["what"],
  cell: number,
  side: number,
  [nx, ny]: readonly [number, number],
  distance: number,
): Met {
  return {
    what,
    cell,
    side,
    nx: expect.closeTo(nx, 12) as number,
    ny: expect.closeTo(ny, 12) as number,
    distance: expect.closeTo(distance, 12) as number,
  };
}

/** Returns the stand-ins with a bumper kicking from a disc of a radius. */
function kicking(radius: number): BrickKinds {
  return {
    ...STAND_INS,
    rowZapper: { ...BUMPER, traits: [{ kind: "kicks", radius }] },
  };
}

/** Returns the heading of an aim, turned down or back as asked. */
function aimed(aim: number, across = 1, up = 1): [number, number] {
  const [dx, dy] = AIMS[aim]!;
  return [dx * across, dy * up];
}

describe("castField", () => {
  it("gives a round kind the reach of a fuzzball's radius and its disc", () => {
    const field = fieldOf(5, ["o-|......"]);

    expect(field.reaches).toEqual({
      brick: 0,
      tough: 0,
      steel: 0,
      rowZapper: RADIUS + 0.38,
      columnZapper: 0,
    });
  });

  it("takes the catalog's kinds unless handed others", () => {
    const field = castField(wallFrom(["o........"]), DEPTH);

    expect(field.shapes).toEqual(SHAPES);
  });

  it("puts the ceiling over the field's top row", () => {
    expect(fieldOf(1, ["o........"]).ceiling.top).toBe(DEPTH);
  });

  // Kinds made up for the specs, kicking from discs as wide as a cell, and
  // a hair wider, which a cast sweeping the cells a fuzzball overlaps would
  // miss.
  it("takes a kind that kicks from a disc as wide as its cell", () => {
    const kinds = kicking(0.5);

    const field = castField(wallFrom(["-........"]), DEPTH, kinds);

    expect(field.reaches.rowZapper).toBe(RADIUS + 0.5);
  });

  it("throws for a kind that kicks from a disc wider than its cell", () => {
    const kinds = kicking(0.5000001);

    expect(() => castField(wallFrom(["-........"]), DEPTH, kinds)).toThrow(
      RangeError,
    );
  });
});

describe("cast", () => {
  it("meets the face of a brick it flies at", () => {
    const field = fieldOf(5, ["....o...."]);

    const met = castFrom(field, [4.5, RADIUS], UP);

    expect(met).toEqual({
      distance: 4.5,
      x: 4.5,
      y: 4.75,
      met: [metAt("face", cellOf(4, 0), FLOORWARD, [0, -1], 4.5)],
    });
  });

  it("meets both faces at a seam between two bricks, and no corner", () => {
    const field = fieldOf(5, ["...oo...."]);

    const { met } = castFrom(field, [4, RADIUS], UP);

    expect(met).toEqual([
      metAt("face", cellOf(3, 0), FLOORWARD, [0, -1], 4.5),
      metAt("face", cellOf(4, 0), FLOORWARD, [0, -1], 4.5),
    ]);
  });

  it("meets a corner, turning about the line from it to the middle", () => {
    const field = fieldOf(5, ["....o...."]);
    const rise = Math.sqrt(RADIUS * RADIUS - 0.1 * 0.1);

    const { met } = castFrom(field, [3.9, RADIUS], UP);

    expect(met).toEqual([
      metAt(
        "corner",
        cellOf(4, 0),
        FLOORWARD_LEFT,
        [-0.1 / RADIUS, -rise / RADIUS],
        5 - rise - RADIUS,
      ),
    ]);
  });

  it("lists a face before a corner met with it, at the face's end", () => {
    const field = fieldOf(5, ["....o...."]);

    const { met } = castFrom(field, [4, RADIUS], UP);

    expect(met.map(({ what, side }) => [what, side])).toEqual([
      ["face", FLOORWARD],
      ["corner", FLOORWARD_LEFT],
    ]);
  });

  it("meets both faces of an inside corner at one moment", () => {
    const field = fieldOf(5, [
      "...o.....", //
      "...oo....",
    ]);
    const start = 4.25 + 2 * AIMS[148]![0];

    const { met } = castFrom(
      field,
      [start, 6.25 + 2 * AIMS[148]![1]],
      aimed(148, -1, -1),
    );

    expect(met.map(({ what, cell, side }) => [what, cell, side])).toEqual([
      ["face", cellOf(4, 0), CEILINGWARD],
      ["face", cellOf(3, 1), RIGHT],
    ]);
  });

  it("passes a brick waiting over the ceiling by, meeting the ceiling", () => {
    const field = fieldOf(DEPTH, ["....o...."]);

    const met = castFrom(field, [4.5, RADIUS], UP);

    expect(met).toEqual({
      distance: 10.5,
      x: 4.5,
      y: 10.75,
      met: [metAt("ceiling", -1, FLOORWARD, [0, -1], 10.5)],
    });
  });

  it.each([
    ["left", -1, RIGHT, [1, 0]],
    ["right", 1, LEFT, [-1, 0]],
  ] as const)("meets the %s side wall", (_, across, side, normal) => {
    const field = fieldOf(5, ["........."]);

    const { met } = castFrom(field, [4.5, 2.5], [across, 0]);

    expect(met).toEqual([metAt("side", -1, side, normal, 4.25)]);
  });

  it("meets the floor", () => {
    const field = fieldOf(5, ["........."]);

    const { met } = castFrom(field, [4.5, 2.5], [0, -1]);

    expect(met).toEqual([metAt("floor", -1, CEILINGWARD, [0, 1], 2.25)]);
  });

  it("meets a side wall and the ceiling at one moment in the field's corner", () => {
    const field = fieldOf(5, ["........."]);

    const { met } = castFrom(
      field,
      [RADIUS + 3 * AIMS[148]![0], DEPTH - RADIUS - 3 * AIMS[148]![1]],
      aimed(148, -1),
    );

    expect(met.map(({ what }) => what)).toEqual(["side", "ceiling"]);
  });

  // C5: a fuzzball already over a corner turns about the line to its middle
  // a unit long, not the line's length over the radius.
  it("meets a corner it overlaps at once, its way out a unit long", () => {
    const field = fieldOf(5, ["....o...."]);

    const met = castFrom(field, [3.9, 4.9], [0.6, 0.8]);

    expect(met).toEqual({
      distance: 0,
      x: 3.9,
      y: 4.9,
      met: [
        metAt(
          "corner",
          cellOf(4, 0),
          FLOORWARD_LEFT,
          [-Math.SQRT1_2, -Math.SQRT1_2],
          0,
        ),
      ],
    });
  });

  // The stand-ins: "-" is a bumper, "|" a portal.
  it("meets a bumper within its reach of the fuzzball's middle", () => {
    const field = fieldOf(5, ["....-...."]);

    const { met } = castFrom(field, [4.5, RADIUS], UP);

    expect(met).toEqual([
      metAt("bumper", cellOf(4, 0), 0, [0, -1], 5.5 - (RADIUS + 0.38) - RADIUS),
    ]);
  });

  it("flies into a portal's cell, meeting nothing there", () => {
    const field = fieldOf(5, ["....|...."]);

    const { met } = castFrom(field, [4.5, RADIUS], UP);

    expect(met.map(({ what }) => what)).toEqual(["ceiling"]);
  });

  it("meets nothing past its limit, stopping there", () => {
    const field = fieldOf(5, ["....o...."]);

    const met = castFrom(field, [4.5, RADIUS], UP, 2.5);

    expect(met).toEqual({ distance: 2.5, x: 4.5, y: 2.75, met: [] });
  });

  it("meets what it reaches just as its limit ends", () => {
    const field = fieldOf(5, ["....o...."]);

    const { distance, met } = castFrom(field, [4.5, RADIUS], UP, 4.5);

    expect([distance, met.length]).toEqual([4.5, 1]);
  });

  // Each move sweeps the cells its disc overlaps and those it only touches,
  // so a face met just as the last move ends is met, on every side.
  it.each([
    ["left", [-1, 0], RIGHT],
    ["right", [1, 0], LEFT],
    ["down", [0, -1], CEILINGWARD],
  ] as const)(
    "meets a face just as its limit ends, flying %s",
    (_, heading, side) => {
      const field = fieldOf(3, [
        "..o...o..", //
        ".........",
        "....o....",
      ]);

      const { met } = castFrom(field, [4.5, 5.5], heading, 1.25);

      expect(met.map((contact) => [contact.side, contact.distance])).toEqual([
        [side, 1.25],
      ]);
    },
  );

  // A bumper is no box, so the brick beside it shows it a corner.
  it("meets the corner of a brick a bumper leaves bare, before the bumper", () => {
    const field = fieldOf(5, ["...o-...."]);

    const { met } = castFrom(field, [4.1, RADIUS], UP);

    expect(met.map(({ what, side }) => [what, side])).toEqual([
      ["corner", FLOORWARD_RIGHT],
    ]);
  });

  // The fuzzball comes up and to the left between a bumper and the brick
  // over its right, touching both at once.
  it("lists a face before a bumper met with it, though the bumper's cell is lower", () => {
    const field = fieldOf(5, [
      "....o....", //
      "...-.....",
    ]);
    const reach = RADIUS + 0.38;
    const touch = [3.5 + Math.sqrt(reach * reach - 0.25 * 0.25), 5.75] as const;
    const [dx, dy] = aimed(448);

    const { met } = castFrom(
      field,
      [touch[0] - 3 * dx, touch[1] - 3 * dy],
      [dx, dy],
    );

    expect(met.map(({ what, cell }) => [what, cell])).toEqual([
      ["face", cellOf(4, 1)],
      ["bumper", cellOf(3, 0)],
    ]);
  });

  // The face is met as one move ends, and again as the next starts.
  it("meets a face once where one move ends at it", () => {
    const field = fieldOf(2, ["....o...."]);

    const { distance, met } = castFrom(field, [4.5, 0.75], UP);

    expect([distance, met.length]).toEqual([1, 1]);
  });

  // Aimed at an inside corner from a unit off, a hair farther across than
  // up, it meets the face below as its first move ends and the face beside
  // it as the next starts, within AT_ONCE of each other.
  it("gathers what it meets at once across the end of a move", () => {
    const field = fieldOf(2, [
      "...o.....", //
      "...oo....",
    ]);
    const [dx, dy] = aimed(100);
    const hair = 3e-10;

    const { met } = castFrom(
      field,
      [4.25 + dx * (1 + hair), 3.25 + dy * (1 - hair)],
      [-dx, -dy],
    );

    expect(met).toEqual([
      metAt("face", cellOf(4, 0), CEILINGWARD, [0, 1], 1 - hair),
      metAt("face", cellOf(3, 1), RIGHT, [1, 0], 1 + hair),
    ]);
  });

  it("reads the wall as it stands at each cast", () => {
    const wall = wallFrom(["....o...."], { lowestRow: 5 });
    const bricks = [...wall.bricks];
    const field = castField({ ...wall, bricks }, DEPTH, BRICK_KINDS);
    bricks[cellOf(4, 0)] = null;

    const { met } = castFrom(field, [4.5, RADIUS], UP);

    expect(met.map(({ what }) => what)).toEqual(["ceiling"]);
  });

  it("writes into the record it is handed, and returns it", () => {
    const field = fieldOf(5, ["....o...."]);
    const contacts = createContacts();

    expect(cast(field, 4.5, RADIUS, 0, 1, 30, contacts)).toBe(contacts);
  });
});

describe("cast, against a scan of every brick", () => {
  // Seeded random walls of every shape of brick, and four shots at each, on
  // the floor and in the field, a third of them on quarter units, touching
  // faces, seams and corners.
  it("meets what the scan meets, at the same moments, on 2,000 walls", () => {
    const random = createRandom(20261110);
    const shots = Array.from({ length: 2000 }, () =>
      randomField(random),
    ).flatMap((field) =>
      Array.from({ length: 4 }, () => randomShot(field, random)),
    );
    const contacts = createContacts();

    const casts = shots.map(({ field, x, y, dx, dy, limit }) => {
      const { wall, depth, kinds } = field;
      return castOf(
        cast(castField(wall, depth, kinds), x, y, dx, dy, limit, contacts),
      );
    });

    expect(casts).toEqual(
      shots.map(({ field, x, y, dx, dy, limit }) =>
        castByScan(field, x, y, dx, dy, limit),
      ),
    );
  });
});

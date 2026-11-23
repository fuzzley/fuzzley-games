import { AIMS } from "@fz/brick-wall/rules/aims";
import {
  COLUMNS,
  DEPTHS,
  FIRST_X,
  LEAST_DEPTH,
  MOST_DEPTH,
  RADIUS,
  SIDE_MARGIN,
} from "@fz/brick-wall/rules/field";
import { cellOf } from "@fz/brick-wall/rules/grid";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import { createRandom } from "@fz/core/random";
import { cast, castField, createContacts } from "../rules/flight/cast";
import { type Face, facesOf, fieldShapes } from "../rules/flight/faces";
import { WALL_LEGEND } from "../rules/levels/legend";
import { LEVELS, parseLevel } from "../rules/levels/levels";
import {
  castByScan,
  castOf,
  headingOf,
  levelOpenings,
  randomField,
  randomShot,
  randomStart,
  unflown,
} from "./cast_reference";

/** The depth of the field the specs play on. */
const DEPTH = 11;

/** Returns every face of a field 11 deep holding a wall drawn as a picture, its lowest row standing in field row 5. */
function facesFrom(picture: readonly string[]): Face[] {
  const wall = wallFrom(picture, WALL_LEGEND, { lowestRow: 5 });
  return facesOf(fieldShapes(wall, DEPTH));
}

/** Returns a source that hands out the numbers given, in turn. */
function sequence(...numbers: readonly number[]): () => number {
  let next = 0;
  return () => numbers[next++ % numbers.length] ?? 0;
}

/** A flat across at y = 3, from x = 2 to 3, facing down, owned by the brick in wall cell 0. */
const UNDER: Face = {
  kind: "flat",
  along: "across",
  line: 3,
  from: 2,
  to: 3,
  facing: -1,
  owner: { kind: "brick", cell: 0 },
};

describe("castOf", () => {
  it("reads how far a cast flew, where its middle was, and each face it met with how far", () => {
    const wall = wallFrom(["...oo...."], WALL_LEGEND, { lowestRow: 5 });
    const contacts = cast(
      castField(wall, DEPTH),
      4,
      RADIUS,
      0,
      1,
      true,
      createContacts(),
    );

    expect(castOf(contacts)).toEqual({
      distance: 5 - 2 * RADIUS,
      x: 4,
      y: 5 - RADIUS,
      met: [
        { face: contacts.met[0]?.face, distance: 5 - 2 * RADIUS },
        { face: contacts.met[1]?.face, distance: 5 - 2 * RADIUS },
      ],
    });
  });
});

describe("castByScan", () => {
  it("meets the soonest of a field's faces, and every other met as soon, as faceOrder() lists them", () => {
    const faces = facesFrom(["...oo...."]);

    const met = castByScan(faces, 4, RADIUS, 0, 1, true);

    expect(met).toMatchObject({
      distance: 5 - 2 * RADIUS,
      x: 4,
      y: 5 - RADIUS,
    });
    expect(
      met.met.map(({ face }) => face.kind !== "floor" && face.owner),
    ).toEqual([
      { kind: "brick", cell: cellOf(3, 0) },
      { kind: "brick", cell: cellOf(4, 0) },
    ]);
  });

  it("keeps a face met within AT_ONCE of the soonest, and none later", () => {
    const within = {
      ...UNDER,
      line: 3 + 5e-10,
      owner: { kind: "brick", cell: 1 },
    } as const;
    const later = {
      ...UNDER,
      line: 3 + 2e-9,
      owner: { kind: "brick", cell: 2 },
    } as const;

    const met = castByScan([UNDER, within, later], 2.5, 2, 0, 1, true);

    expect(met.met.map(({ face }) => face)).toEqual([UNDER, within]);
  });

  it("passes the portals' eyes as air where told to", () => {
    const faces = facesFrom(["..@...@.."]);

    const met = castByScan(faces, 2.5, RADIUS, 0, 1, false);

    expect(
      met.met.map(({ face }) => face.kind !== "floor" && face.owner),
    ).toEqual([{ kind: "ceiling" }]);
  });
});

describe("randomField", () => {
  it("draws the same field from the same source", () => {
    expect(randomField(createRandom(7))).toEqual(randomField(createRandom(7)));
  });

  it("draws a field 11 to 22 deep, of up to 8 rows", () => {
    const random = createRandom(11);

    const fields = Array.from({ length: 200 }, () => randomField(random));

    expect(
      fields.filter(
        ({ wall, depth }) =>
          depth < LEAST_DEPTH ||
          depth > MOST_DEPTH ||
          wall.rows < 1 ||
          wall.rows > 8,
      ),
    ).toEqual([]);
  });

  it("pairs every portal with a twin whose twin it is", () => {
    const random = createRandom(13);

    const portals = Array.from({ length: 200 }, () => randomField(random))
      .flatMap(({ wall }) =>
        wall.bricks.map((brick, cell) => ({ wall, brick, cell })),
      )
      .filter(({ brick }) => brick?.kind === "portal");

    expect(portals.length).toBeGreaterThan(0);
    expect(
      portals.filter(({ wall, brick, cell }) => {
        const twin = brick?.twin;
        return typeof twin !== "number" || wall.bricks[twin]?.twin !== cell;
      }),
    ).toEqual([]);
  });
});

describe("randomStart", () => {
  it("draws the same start from the same source", () => {
    const field = randomField(createRandom(17));

    expect(randomStart(field, createRandom(19))).toEqual(
      randomStart(field, createRandom(19)),
    );
  });

  it("starts a round at its field's wall and depth, its fuzzball on the floor no nearer a side wall than SIDE_MARGIN", () => {
    const random = createRandom(23);
    const fields = Array.from({ length: 200 }, () => randomField(random));

    const drawn = fields.map((field) => ({
      field,
      start: randomStart(field, random),
    }));

    expect(
      drawn.filter(
        ({ field, start: { wall, depth, x } }) =>
          wall !== field.wall ||
          depth !== field.depth ||
          x < SIDE_MARGIN ||
          x > COLUMNS - SIDE_MARGIN,
      ),
    ).toEqual([]);
  });

  it("draws places on both halves of the floor", () => {
    const random = createRandom(31);
    const field = randomField(random);

    const starts = Array.from({ length: 20 }, () => randomStart(field, random));

    expect(new Set(starts.map(({ x }) => x < COLUMNS / 2))).toEqual(
      new Set([false, true]),
    );
  });

  it("draws plain shots and hot ones", () => {
    const random = createRandom(29);
    const field = randomField(random);

    const starts = Array.from({ length: 20 }, () => randomStart(field, random));

    expect(new Set(starts.map(({ hot }) => hot))).toEqual(
      new Set([false, true]),
    );
  });
});

describe("levelOpenings", () => {
  it("lays every level out at every depth, its fuzzball at the floor's middle and its shot plain", () => {
    const openings = levelOpenings();

    expect(
      openings.map(({ wall, depth, x, hot }) => [wall.rows, depth, x, hot]),
    ).toEqual(
      LEVELS.flatMap(({ data }) =>
        DEPTHS.map((depth) => [parseLevel(data).rows, depth, FIRST_X, false]),
      ),
    );
  });
});

describe("unflown", () => {
  it("copies a start whole, its wall and its bricks new ones", () => {
    const [start] = levelOpenings();

    const copy = unflown(start!);

    expect([
      copy,
      copy.wall === start?.wall,
      copy.wall.bricks === start?.wall.bricks,
    ]).toEqual([start, false, false]);
  });
});

describe("randomShot", () => {
  it("draws a place a middle may be in its field, and a heading a unit long", () => {
    const random = createRandom(17);
    const field = randomField(random);

    const shots = Array.from({ length: 500 }, () => randomShot(field, random));

    expect(
      shots.filter(
        ({ x, y, dx, dy }) =>
          x < RADIUS ||
          x > COLUMNS - RADIUS ||
          y < RADIUS ||
          y > field.depth - RADIUS ||
          Math.abs(dx * dx + dy * dy - 1) > 1e-12,
      ),
    ).toEqual([]);
  });
});

describe("headingOf", () => {
  it("turns an aim's heading across its 45°, back or down as the numbers drawn say", () => {
    const [x, y] = AIMS[100]!;

    expect(headingOf(100, sequence(0.1, 0.1, 0.1))).toEqual([x, y]);
    expect(headingOf(100, sequence(0.9, 0.1, 0.1))).toEqual([y, x]);
    expect(headingOf(100, sequence(0.1, 0.9, 0.1))).toEqual([-x, y]);
    expect(headingOf(100, sequence(0.1, 0.1, 0.9))).toEqual([x, -y]);
  });
});

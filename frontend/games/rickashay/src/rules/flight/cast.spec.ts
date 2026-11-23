import { AIMS } from "@fz/brick-wall/rules/aims";
import { AT_ONCE, RADIUS } from "@fz/brick-wall/rules/field";
import { cellOf } from "@fz/brick-wall/rules/grid";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import {
  FLIGHT_FIXTURES,
  type FixtureName,
} from "../../testing/flight_fixtures";
import { WALL_LEGEND } from "../levels/legend";
import {
  type CastField,
  type Contacts,
  cast,
  castField,
  clearBrick,
  createContacts,
} from "./cast";
import type { Face, FaceOwner } from "./faces";
import type { TurnOff } from "./events";

/** The depth of the field the specs play on. */
const DEPTH = 11;

/** Returns an aim's heading, throwing for an aim there is none of. */
function headingOf(aim: number): readonly [number, number] {
  const heading = AIMS[aim];
  if (heading === undefined) {
    throw new RangeError(`There is no aim ${String(aim)}.`);
  }
  return heading;
}

/** The headings at 45° and at the lowest aim, 8°. */
const AT_45 = headingOf(148);
const LOWEST = headingOf(0);

/** Returns a field 11 deep holding a wall drawn as a picture, its lowest row standing in a field row. */
function fieldOf(lowestRow: number, picture: readonly string[]): CastField {
  return castField(wallFrom(picture, WALL_LEGEND, { lowestRow }), DEPTH);
}

/** Describes what a cast met, as a spec reads it: how far, and what owns each face met there, in order. */
interface Met {
  readonly distance: number;
  readonly owners: readonly string[];
}

/** Returns a name for what owns a face: `brick 13`, `left wall`, `right wall`, `ceiling` or `floor`. */
function ownerOf(face: Face): string {
  if (face.kind === "floor") {
    return "floor";
  }
  const owner: FaceOwner = face.owner;
  switch (owner.kind) {
    case "brick":
      return `brick ${String(owner.cell)}`;
    case "wall":
      return `${owner.side} wall`;
    case "ceiling":
      return "ceiling";
  }
}

/** Returns what a cast wrote, as a spec reads it. */
function metOf(contacts: Contacts): Met {
  return {
    distance: contacts.distance,
    owners: contacts.met
      .slice(0, contacts.count)
      .map(({ face }) => ownerOf(face)),
  };
}

/** Returns what a fuzzball meets first, cast from a place along a heading. */
function castFrom(
  field: CastField,
  [x, y]: readonly [number, number],
  [dx, dy]: readonly [number, number],
): Contacts {
  return cast(field, x, y, dx, dy, createContacts());
}

/** Returns what a cast is expected to meet: how far, near enough, and the owners of its faces. */
function expected(distance: number, owners: readonly string[]): Met {
  return { distance: expect.closeTo(distance, 12) as number, owners };
}

/** Returns a brick's name as {@link ownerOf} gives it, by its column and wall row. */
function brick(column: number, wallRow: number): string {
  return `brick ${String(cellOf(column, wallRow))}`;
}

describe("cast", () => {
  it("meets the face of a brick it flies at, a radius short of the brick", () => {
    const field = fieldOf(5, ["....o...."]);

    const met = castFrom(field, [4.5, RADIUS], [0, 1]);

    expect(metOf(met)).toEqual(expected(5 - 2 * RADIUS, [brick(4, 0)]));
    expect([met.x, met.y]).toEqual([4.5, 5 - RADIUS]);
  });

  it("meets both faces at a seam between two bricks, at one moment", () => {
    const field = fieldOf(5, ["...oo...."]);

    const met = castFrom(field, [4, RADIUS], [0, 1]);

    expect(metOf(met)).toEqual(
      expected(5 - 2 * RADIUS, [brick(3, 0), brick(4, 0)]),
    );
  });

  it("meets both faces of an inside corner at one moment", () => {
    // The brick over the corner and the one beside it, whose flats meet a
    // radius out from each at (3.75, 4.75).
    const field = fieldOf(4, ["...o.....", "....o...."]);
    const [dx, dy] = AT_45;

    const met = castFrom(field, [3.75 - 2 * dx, 4.75 - 2 * dy], [dx, dy]);

    expect(metOf(met)).toEqual(expected(2, [brick(4, 0), brick(3, 1)]));
  });

  it("meets nothing as it passes a brick by", () => {
    const field = fieldOf(5, ["....o...."]);

    const met = castFrom(field, [4 - RADIUS - 0.01, RADIUS], [0, 1]);

    expect(metOf(met)).toEqual(expected(DEPTH - 2 * RADIUS, ["ceiling"]));
  });

  it("passes a brick waiting over the ceiling by, meeting the ceiling", () => {
    const field = fieldOf(DEPTH - 1, ["....o....", "........."]);

    const met = castFrom(field, [4.5, RADIUS], [0, 1]);

    expect(metOf(met)).toEqual(expected(DEPTH - 2 * RADIUS, ["ceiling"]));
  });

  it("meets the floor, flying down", () => {
    const field = fieldOf(5, ["....o...."]);

    const met = castFrom(field, [2, 4], [0, -1]);

    expect(metOf(met)).toEqual(expected(4 - RADIUS, ["floor"]));
  });

  it("meets a side wall and the ceiling at one moment in the field's corner", () => {
    const field = fieldOf(5, ["....o...."]);
    const [dx, dy] = AT_45;

    const met = castFrom(
      field,
      [9 - RADIUS - 3 * dx, DEPTH - RADIUS - 3 * dy],
      [dx, dy],
    );

    expect(metOf(met)).toEqual(expected(3, ["right wall", "ceiling"]));
  });

  it("meets what lies within AT_ONCE of the soonest, and nothing later", () => {
    // Two bricks' flats meet at (3.75, 5.75): a fuzzball flying to it from
    // a little to its left meets the lower brick's side that much later.
    const field = fieldOf(5, ["...o.....", "....o...."]);
    const heading = [0.6, 0.8] as const;

    const within = castFrom(field, [0.75 - 0.3 * AT_ONCE, 1.75], heading);
    const beyond = castFrom(field, [0.75 - 1.2 * AT_ONCE, 1.75], heading);

    expect(metOf(within)).toEqual(expected(5, [brick(4, 0), brick(3, 1)]));
    expect(metOf(beyond)).toEqual(expected(5, [brick(3, 1)]));
  });

  it("walks past empty cells to a face across the field", () => {
    const field = fieldOf(9, ["o........"]);
    const [dx, dy] = LOWEST;

    const met = castFrom(field, [9 - RADIUS, 9.5 - (7.5 * dy) / dx], [-dx, dy]);

    expect(metOf(met)).toEqual(expected(7.5 / dx, [brick(0, 0)]));
  });

  it("meets a face it tries in two cells once", () => {
    // The brick's floorward flat, from x = 4 to 5, reaches into the cell
    // left of the one it lies in, which the fuzzball leaves first.
    const field = fieldOf(5, ["....o...."]);

    const met = castFrom(field, [3.9, 4], [0.6, 0.8]);

    expect(metOf(met)).toEqual(expected(0.9375, [brick(4, 0)]));
  });

  it("meets a brick's cut corner, short of the corner", () => {
    const field = fieldOf(5, ["....o...."]);
    const [dx, dy] = AT_45;

    const met = castFrom(field, [4 - 3 * dx, 5 - 3 * dy], [dx, dy]);

    expect(metOf(met)).toEqual(
      expected(3 - RADIUS / Math.SQRT2, [brick(4, 0)]),
    );
    expect(met.met[0]?.face).toMatchObject({ kind: "slant", c: 8.75 });
  });

  it("meets both a flat and the cut its end joins, where they join", () => {
    const field = fieldOf(5, ["....o...."]);

    const met = castFrom(field, [4, RADIUS], [0, 1]);

    expect(met.met.slice(0, met.count).map(({ face }) => face.kind)).toEqual([
      "flat",
      "slant",
    ]);
  });

  it("writes into the record it is handed, and returns it", () => {
    const field = fieldOf(5, ["....o...."]);
    const contacts = createContacts();

    expect(cast(field, 4.5, RADIUS, 0, 1, contacts)).toBe(contacts);
  });

  it("writes a record it is handed again afresh", () => {
    const field = fieldOf(5, ["....o...."]);
    const contacts = createContacts();
    cast(field, 4.5, RADIUS, 0, 1, contacts);

    cast(field, 1.5, RADIUS, 0, 1, contacts);

    expect(metOf(contacts)).toEqual(
      metOf(castFrom(field, [1.5, RADIUS], [0, 1])),
    );
    expect([contacts.x, contacts.y]).toEqual([1.5, DEPTH - RADIUS]);
  });

  it("meets a side wall at once from beyond it", () => {
    const field = fieldOf(5, ["....o...."]);

    const met = castFrom(field, [0, 5], [-1, 0]);

    expect(metOf(met)).toEqual({ distance: 0, owners: ["left wall"] });
  });

  it("lists what it meets at once floor up and left to right, whichever cell it tried each in", () => {
    // The higher brick's floorward flat reaches into the cell the fuzzball
    // leaves from, and the lower brick's side only into the next, where
    // the two cross.
    const field = fieldOf(5, ["....o....", ".....o..."]);

    const met = castFrom(field, [3.75, 5], [0.8, 0.6]);

    expect(metOf(met)).toEqual(expected(1.25, [brick(5, 0), brick(4, 1)]));
  });
});

describe("clearBrick", () => {
  it("lets a cast pass through the cell of a brick that broke", () => {
    const field = fieldOf(5, ["....o...."]);

    clearBrick(field, cellOf(4, 0));

    expect(metOf(castFrom(field, [4.5, RADIUS], [0, 1]))).toEqual(
      expected(DEPTH - 2 * RADIUS, ["ceiling"]),
    );
  });

  it("shows the faces of the bricks about it that it hid", () => {
    const field = fieldOf(5, ["....o....", "....o...."]);

    clearBrick(field, cellOf(4, 0));

    expect(metOf(castFrom(field, [4.5, RADIUS], [0, 1]))).toEqual(
      expected(6 - 2 * RADIUS, [brick(4, 1)]),
    );
  });

  it("cuts a corner of a brick beside it that it touched", () => {
    // The lower brick's ceilingward right corner, which the higher one
    // touched, is free once it breaks.
    const field = fieldOf(5, ["....o....", "...o....."]);
    const [dx, dy] = AT_45;

    clearBrick(field, cellOf(4, 1));

    const met = castFrom(field, [4 + 3 * dx, 6 + 3 * dy], [-dx, -dy]);
    expect(met.met.slice(0, met.count).map(({ face }) => face)).toEqual([
      expect.objectContaining({
        kind: "slant",
        c: 10.25,
        owner: { kind: "brick", cell: cellOf(3, 0) },
      }),
    ]);
  });

  it("tries each face of the bricks about it as one face, in every cell it reaches into", () => {
    // The right brick's floorward flat, built again, reaches into the cell
    // right of its own, which the fuzzball crosses first.
    const field = fieldOf(5, ["...oo...."]);

    clearBrick(field, cellOf(3, 0));

    expect(metOf(castFrom(field, [5.1, 3.95], [-0.6, 0.8]))).toEqual(
      expected(1, [brick(4, 0)]),
    );
  });

  it("leaves the faces of the bricks farther off as they were", () => {
    const field = fieldOf(5, ["o...o...o"]);

    clearBrick(field, cellOf(4, 0));

    expect(metOf(castFrom(field, [0.5, RADIUS], [0, 1]))).toEqual(
      expected(5 - 2 * RADIUS, [brick(0, 0)]),
    );
    expect(metOf(castFrom(field, [8.5, RADIUS], [0, 1]))).toEqual(
      expected(5 - 2 * RADIUS, [brick(8, 0)]),
    );
  });
});

describe("cast, at a clump of bricks", () => {
  // A clump with an inside corner, an outside one and two bricks that touch
  // only at a corner, cast at from all round toward the middle of each of
  // its bricks: a gap in its faces would let a cast reach a brick.
  const picture = ["...oo....", "...o.....", "....o...."];
  const field = fieldOf(4, picture);
  const middles = [
    [3.5, 6.5],
    [4.5, 6.5],
    [3.5, 5.5],
    [4.5, 4.5],
  ] as const;
  const starts = Array.from({ length: 72 }, (_, index) => {
    const angle = (index * Math.PI) / 36;
    return [4 + 3.2 * Math.cos(angle), 5.5 + 3.2 * Math.sin(angle)] as const;
  });

  /** Returns whether a cast from a place toward a brick's middle reaches it, or meets no face of the clump well short of it. */
  function slipsThrough(
    [x, y]: readonly [number, number],
    [mx, my]: readonly [number, number],
  ): boolean {
    const length = Math.hypot(mx - x, my - y);
    const met = castFrom(field, [x, y], [(mx - x) / length, (my - y) / length]);
    const short = met.distance < length - 0.5;
    return (
      !short || metOf(met).owners.some((owner) => !owner.startsWith("brick"))
    );
  }

  it.each(middles)(
    "meets one of the clump's faces from all round before the middle of the brick at (%s, %s)",
    (mx, my) => {
      const through = starts.filter((start) => slipsThrough(start, [mx, my]));

      expect(through).toEqual([]);
    },
  );
});

/** Describes a turn of a fixture's flight, as the cast from where it last turned met it and as its turn names it. */
interface Leg {
  readonly met: Met;
  readonly turned: Met;
}

/** Returns the names of the field's bounds a turn off something at a place meets. */
function boundsOff(off: TurnOff, x: number): string[] {
  switch (off) {
    case "wall":
      return [x < 4.5 ? "left wall" : "right wall"];
    case "ceiling":
    case "floor":
      return [off];
    case "brick":
    case "bar":
      return [];
  }
}

/**
 * Returns each leg of a fixture's flight that ends at a turn or its
 * landing: what a cast along it meets, from where the leg leaves, its bricks
 * broken as the flight broke them, and what the flight met there.
 */
function legsOf(name: FixtureName): Leg[] {
  const { start, shot, round } = FLIGHT_FIXTURES[name];
  const { waypoints } = round.flight.track;
  const field = castField(start.wall, start.depth);
  let [dx, dy] = headingOf(shot.aim);
  const legs: Leg[] = [];
  waypoints.slice(1).forEach((to, index) => {
    const from = waypoints[index]!;
    const events = round.flight.events.filter(({ at }) => at === to.at);
    const length = to.at - from.at;
    const met = metOf(cast(field, from.x, from.y, dx, dy, createContacts()));
    for (const event of events) {
      switch (event.kind) {
        case "turn": {
          const owners = [
            ...boundsOff(event.off, to.x),
            ...event.cells.map((cell) => `brick ${String(cell)}`),
          ];
          legs.push({ met, turned: expected(length, owners) });
          [dx, dy] = [event.dx, event.dy];
          break;
        }
        case "land":
          legs.push({ met, turned: expected(length, ["floor"]) });
          break;
        case "bored":
        case "guard":
          [dx, dy] = [0, -1];
          break;
        case "strike":
          if (event.broke) {
            clearBrick(field, event.cell);
          }
          break;
        case "shielded":
        case "bounce-earned":
        case "bounce-spent":
        case "hold":
        case "hatches-open":
        case "bolt":
        case "teleport":
          break;
      }
    }
  });
  return legs;
}

describe("cast, along the flights made by hand", () => {
  // Each flight was flown to the faces the design names, as the sketch
  // flies them: a cast from each turn meets the next where the flight did.
  it.each([
    "plain",
    "cleared",
    "lost",
    "jumped",
    "shielded",
    "rally",
    "spring",
    "hot",
    "bolt",
    "bored",
    "guard",
    "corner",
  ] as const)("meets each face %s turns off, where it turns", (name) => {
    const legs = legsOf(name);

    expect(legs).toHaveLength(FLIGHT_FIXTURES[name].round.flight.turns + 1);
    expect(legs.map(({ met }) => met)).toEqual(
      legs.map(({ turned }) => turned),
    );
  });
});

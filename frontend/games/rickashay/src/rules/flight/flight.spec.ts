import {
  AIMS,
  AIMS_PER_DEGREE,
  FIRST_AIM_DEGREES,
} from "@fz/brick-wall/rules/aims";
import { COLUMNS, RADIUS, SIDE_MARGIN } from "@fz/brick-wall/rules/field";
import { cellOf } from "@fz/brick-wall/rules/grid";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import type { Wall } from "../catalog/kinds";
import { WALL_LEGEND } from "../levels/legend";
import { FLIGHT_RULES, type FlightRules, STAND_OFF } from "../tuning";
import type { FlightEvent } from "./events";
import { type Flown, fly } from "./flight";

/** The depth of the field the specs fly in. */
const DEPTH = 11;

/** The side walls' flats and the ceiling's, a radius in from each. */
const LEFT_WALL = RADIUS;
const RIGHT_WALL = COLUMNS - RADIUS;
const CEILING = DEPTH - RADIUS;

/** Returns the aim at an angle, in degrees counter-clockwise from the floor on the right. */
function aimAt(degrees: number): number {
  return (degrees - FIRST_AIM_DEGREES) * AIMS_PER_DEGREE;
}

/** Returns an aim's heading. */
function headingOf(aim: number): readonly [number, number] {
  const heading = AIMS[aim];
  if (heading === undefined) {
    throw new RangeError(`There is no aim ${String(aim)}.`);
  }
  return heading;
}

/** Describes a shot a spec flies at a wall drawn as a picture. */
interface PictureShot {
  readonly picture?: readonly string[];
  /** The field row the picture's lowest row stands in: 5 unless given. */
  readonly lowestRow?: number;
  /** Where the fuzzball waits: the floor's middle unless given. */
  readonly x?: number;
  /** The aim's angle, in degrees counter-clockwise from the floor on the right: 45° unless given. */
  readonly degrees?: number;
  readonly hot?: boolean;
  readonly rules?: FlightRules;
}

/** Returns a wall drawn as a picture, its lowest row standing in a field row. */
function wallOf(picture: readonly string[], lowestRow: number): Wall {
  return wallFrom(picture, WALL_LEGEND, { lowestRow });
}

/** Returns the flight of a shot at a wall drawn as a picture, in a field 11 deep, by the design's rules. */
function flyAt({
  picture = [],
  lowestRow = 5,
  x = 4.5,
  degrees = 45,
  hot = false,
  rules = FLIGHT_RULES,
}: PictureShot): Flown {
  const wall = wallOf(picture, lowestRow);
  return fly({ wall, depth: DEPTH, x, hot }, { aim: aimAt(degrees) }, rules);
}

/** Returns a flight's events of a kind. */
function eventsOf<K extends FlightEvent["kind"]>(
  { flight }: Flown,
  kind: K,
): Extract<FlightEvent, { readonly kind: K }>[] {
  return flight.events.filter(
    (event): event is Extract<FlightEvent, { readonly kind: K }> =>
      event.kind === kind,
  );
}

/** Returns a number matched as near as the flight's arithmetic finds it. */
function near(value: number): number {
  return expect.closeTo(value, 9) as number;
}

/** Returns where a flight's turns were, as `[x, y]`. */
function placesOf(flown: Flown): [number, number][] {
  return eventsOf(flown, "turn").map(({ x, y }) => [x, y]);
}

/** Returns a flight's turns' headings, as `[dx, dy]`. */
function headingsOf(flown: Flown): (readonly [number, number])[] {
  return eventsOf(flown, "turn").map(({ dx, dy }) => [dx, dy]);
}

/** Returns where a shot at an angle must wait on the floor to fly straight to a place. */
function xToReach(degrees: number, [x, y]: readonly [number, number]): number {
  const [dx, dy] = headingOf(aimAt(degrees));
  return x - (dx * (y - RADIUS)) / dy;
}

describe("fly", () => {
  // Up off the right wall, the ceiling and the left wall, and down to the
  // floor: each flat a mirror.
  it("flies an empty field off its side walls and its ceiling, each a mirror, to the floor", () => {
    const [dx, dy] = headingOf(aimAt(45));

    const flown = flyAt({});

    expect([
      placesOf(flown),
      headingsOf(flown),
      eventsOf(flown, "turn").map(({ off }) => off),
    ]).toEqual([
      [
        [near(RIGHT_WALL), near(4.5)],
        [near(2.5), near(CEILING)],
        [near(LEFT_WALL), near(8.5)],
      ],
      [
        [-dx, dy],
        [-dx, -dy],
        [dx, -dy],
      ],
      ["wall", "ceiling", "wall"],
    ]);
  });

  it("names what each turn was off", () => {
    const flown = flyAt({ picture: ["........o"] });

    expect(
      eventsOf(flown, "turn").map(({ off, cells }) => [off, cells]),
    ).toEqual([
      ["wall", []],
      ["brick", [cellOf(8, 0)]],
    ]);
  });

  it("turns off a brick's face a radius short of the brick", () => {
    const flown = flyAt({ picture: ["........o"] });

    expect(placesOf(flown)[1]).toEqual([near(8.5), near(5 - RADIUS)]);
  });

  // The brick over the corner and the one beside it, whose flats meet a
  // radius out from each at (6.75, 4.75).
  it("sends a fuzzball meeting both faces of an inside corner at once back the way it came, in one turn", () => {
    const [dx, dy] = headingOf(aimAt(45));
    const x = xToReach(45, [6.75, 4.75]);

    const flown = flyAt({
      picture: ["......o..", ".......o."],
      lowestRow: 4,
      x,
    });

    expect(eventsOf(flown, "turn")).toEqual([
      expect.objectContaining({
        x: near(6.75),
        y: near(4.75),
        dx: -dx,
        dy: -dy,
        cells: [cellOf(7, 0), cellOf(6, 1)],
      }),
    ]);
  });

  it("swaps its two speeds off a corner's cut, with the signs that send it away", () => {
    const [dx, dy] = headingOf(aimAt(60));

    const flown = flyAt({ picture: ["....2...."], x: 1.3, degrees: 60 });

    expect(headingsOf(flown)[0]).toEqual([-dy, -dx]);
  });

  // The brick's floorward flat and the cut across its floorward left corner
  // meet at (4, 4.75).
  it("turns a fuzzball meeting a corner's cut beside a flat off the flat alone, naming the brick once", () => {
    const [dx, dy] = headingOf(aimAt(60));

    const flown = flyAt({
      picture: ["....o...."],
      x: xToReach(60, [4, 5 - RADIUS]),
      degrees: 60,
    });

    expect(eventsOf(flown, "turn")[0]).toEqual(
      expect.objectContaining({
        x: near(4),
        y: near(5 - RADIUS),
        dx,
        dy: -dy,
        off: "brick",
        cells: [cellOf(4, 0)],
      }),
    );
  });

  // The ramp's long face, facing down and left, and the right wall's flat
  // meet at (8.75, 5.25 − STAND_OFF).
  it.each([
    [60, "still flies into", (dx: number, dy: number) => [-dy, dx]],
    [30, "no longer flies into", (dx: number, dy: number) => [-dx, dy]],
  ] as const)(
    "turns a fuzzball at %s° that %s a long face once the flats have mirrored it",
    (degrees, _, turned) => {
      const [dx, dy] = headingOf(aimAt(degrees));
      const corner = [RIGHT_WALL, 5 + RADIUS - STAND_OFF] as const;

      const flown = flyAt({
        picture: ["........7"],
        x: xToReach(degrees, corner),
        degrees,
      });

      expect(eventsOf(flown, "turn")[0]).toEqual(
        expect.objectContaining({
          x: near(corner[0]),
          y: near(corner[1]),
          dx: turned(dx, dy)[0],
          dy: turned(dx, dy)[1],
          off: "brick",
          cells: [cellOf(8, 0)],
        }),
      );
    },
  );

  // Straight up across the hatch's bar at (2.5, 6.25), off the ceiling,
  // and straight down onto the bar.
  it("passes a hatch flying up, and turns off its bar coming down, as off a flat across", () => {
    const [dx, dy] = headingOf(aimAt(90));

    const flown = flyAt({ picture: ["..=......"], x: 2.5, degrees: 90 });

    expect(eventsOf(flown, "turn").slice(0, 2)).toEqual([
      expect.objectContaining({ y: near(CEILING), dy: -dy, off: "ceiling" }),
      expect.objectContaining({
        x: near(2.5),
        y: near(6 + RADIUS),
        dx,
        dy,
        off: "bar",
        cells: [cellOf(2, 0)],
      }),
    ]);
  });

  it("lays its track from where it waits through each place it turns to where it lands", () => {
    const flown = flyAt({ picture: ["........o"] });
    const turns = eventsOf(flown, "turn");
    const [landing] = eventsOf(flown, "land");

    expect(flown.flight.track).toEqual({
      ball: 0,
      role: "player",
      waypoints: [
        { at: 0, x: 4.5, y: RADIUS },
        ...turns.map(({ at, x, y }) => ({ at, x, y })),
        { at: landing?.at, x: near(4), y: RADIUS },
      ],
    });
  });

  it("lands where it reaches the floor, its flight's length and turns counted", () => {
    const flown = flyAt({});
    const [landing] = eventsOf(flown, "land");

    expect([landing, flown.flight.length, flown.flight.turns]).toEqual([
      { at: near(21 * Math.SQRT2), kind: "land", x: near(8.5) },
      landing?.at,
      3,
    ]);
  });

  // Up and to the left under a row of bricks by the floor, it turns down
  // there and reaches the floor at x = 0.4.
  it("waits no nearer a side wall than its margin, where its track ends nearer", () => {
    const flown = flyAt({
      picture: ["ooo......"],
      lowestRow: 1,
      x: 1.4,
      degrees: 135,
    });

    expect([
      eventsOf(flown, "land"),
      flown.flight.track.waypoints.at(-1)?.x,
    ]).toEqual([[expect.objectContaining({ x: SIDE_MARGIN })], near(0.4)]);
  });

  it("is brought home by its guard at the longest flight its rules allow, dropping straight to the floor", () => {
    const rules = { ...FLIGHT_RULES, longest: 5 };
    const [dx, dy] = headingOf(aimAt(45));
    const [x, y] = [4.5 + 5 * dx, RADIUS + 5 * dy];

    const flown = flyAt({ rules });

    expect(flown.flight.events).toEqual([
      { at: 5, kind: "guard", x, y, by: "length" },
      { at: 5 + y - RADIUS, kind: "land", x },
    ]);
  });

  it("leaves the wall it is handed as it was", () => {
    const wall = wallOf(["ooo2....."], 5);
    const before = structuredClone(wall);

    const { wall: left } = fly(
      { wall, depth: DEPTH, x: 4.5, hot: false },
      { aim: aimAt(100) },
      FLIGHT_RULES,
    );

    expect([wall, left]).toStrictEqual([before, before]);
  });

  it("throws for an aim that isn't one of the 657", () => {
    const start = { wall: wallOf([], 5), depth: DEPTH, x: 4.5, hot: false };

    expect(() => fly(start, { aim: 657 }, FLIGHT_RULES)).toThrow(RangeError);
  });
});

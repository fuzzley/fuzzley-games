import { createRandom } from "@fz/core/random";
import {
  FLIGHT_FIXTURES,
  type FlightFixture,
  orderProblemsOf,
  trackProblemsOf,
} from "../../testing/flight_fixtures";
import { eventsOf } from "../../testing/flights";
import {
  clearanceProblemsOf,
  randomFlight,
} from "../../testing/random_flights";
import {
  BUMPER,
  CAGE,
  PRISM,
  STAND_INS,
  STAND_IN_RULES,
  WOOL,
} from "../../testing/stand_ins";
import { wallFrom } from "../../testing/wall_picture";
import { AIMS } from "../aims";
import { TRAIT_RULES } from "../bricks/trait_rules";
import { BRICK_KINDS, type BrickKinds } from "../catalog/bricks";
import {
  AIMS_PER_DEGREE,
  BORED,
  FIRST_AIM_DEGREES,
  MOST_CHARGE,
  MOST_FLIGHT,
  RADIUS,
  STILL_TURNS,
  TRIPLE_MATES,
  ZAP_DELAY,
} from "../tuning";
import { FLOORWARD, LEFT } from "../grid";
import type { Wall } from "../wall/wall";
import { type FlightRules, type FlightStart, type Flown, fly } from "./flight";
import type { Hooks, Struck, TraitRules } from "./hooks";

/** The depth of the field the specs fly in. */
const DEPTH = 11;

/** The aim straight up. */
const UP = aimAt(90);

/** Returns the aim at an angle, in degrees counter-clockwise from the floor on the right. */
function aimAt(degrees: number): number {
  return (degrees - FIRST_AIM_DEGREES) * AIMS_PER_DEGREE;
}

/** Describes a shot a spec flies: a wall and how the fuzzballs leave, with the rules it is flown by. */
interface Shot extends Partial<Omit<FlightStart, "wall" | "aim">> {
  readonly wall: Wall;
  readonly aim: number;
  readonly bored?: number;
  readonly kinds?: BrickKinds;
  readonly traits?: TraitRules;
}

/** Returns the flight of a shot, a plain one from the floor's middle on a field 11 deep, flown by the stand-ins' rules. */
function flyShot({
  wall,
  aim,
  depth = DEPTH,
  x = 4.5,
  charge = 0,
  hot = false,
  mates = 0,
  friends = 0,
  bored = BORED,
  kinds = STAND_INS,
  traits = STAND_IN_RULES,
}: Shot): Flown {
  const rules: FlightRules = { bored, kinds, traits };
  return fly({ wall, depth, x, aim, charge, hot, mates, friends }, rules);
}

/** Returns a wall drawn as a picture, its lowest row standing in a field row. */
function wallOf(lowestRow: number, picture: readonly string[]): Wall {
  return wallFrom(picture, { lowestRow });
}

/** Returns a value with each of its numbers matched near enough, for the rounding the arithmetic that found them. */
function near(value: unknown): unknown {
  if (typeof value === "number") {
    return expect.closeTo(value, 9);
  }
  if (Array.isArray(value)) {
    return value.map(near);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, near(entry)]),
    );
  }
  return value;
}

/** Returns how a fixture's round leaves, as its start and shot say. */
function startOf({ start, shot }: FlightFixture): FlightStart {
  return {
    wall: start.wall,
    depth: start.depth,
    x: start.x,
    aim: shot.aim,
    charge: shot.charge,
    hot: start.boon === "hot",
    mates: start.boon === "triple" ? TRIPLE_MATES : 0,
    friends: start.crew.friends.length,
  };
}

describe("fly, against the rounds made by hand", () => {
  it.each(Object.entries(FLIGHT_FIXTURES))(
    "flies %s's round as it was worked out",
    (_, fixture) => {
      const rules = {
        bored: BORED,
        kinds: BRICK_KINDS,
        traits: TRAIT_RULES,
      };

      const { flight } = fly(startOf(fixture), rules);

      expect(flight).toEqual(near(fixture.round.flight));
    },
  );
});

describe("fly", () => {
  // Straight up a tenth to the right of the brick's right edge, it meets
  // the corner there, which turns it about the line to its middle.
  it("turns off a corner as a mirror about the line from it to its middle", () => {
    const wall = wallOf(6, ["....o...."]);
    const below = Math.sqrt(RADIUS * RADIUS - 0.1 * 0.1);
    const [nx, ny] = [0.1 / RADIUS, -below / RADIUS];

    const flown = flyShot({ wall, aim: UP, x: 5.1 });

    expect(eventsOf(flown, "turn")[0]).toEqual(
      expect.objectContaining({
        off: "corner",
        dx: expect.closeTo(-2 * ny * nx, 12) as number,
        dy: expect.closeTo(1 - 2 * ny * ny, 12) as number,
      }),
    );
  });

  it("leaves the wall it is handed as it was, and returns the wall it leaves", () => {
    const fixture = FLIGHT_FIXTURES.punch;
    const before = structuredClone(fixture.start.wall);
    const rules = { bored: BORED, kinds: BRICK_KINDS, traits: STAND_IN_RULES };

    const { wall } = fly(startOf(fixture), rules);

    expect(fixture.start.wall).toStrictEqual(before);
    expect([wall.bricks[8], wall.bricks[16]?.hits]).toEqual([null, 2]);
  });

  it("throws for an aim that isn't one of the 657", () => {
    expect(() => flyShot({ wall: wallOf(5, ["o........"]), aim: 657 })).toThrow(
      RangeError,
    );
  });

  // Straight up at the brick's right edge, it meets the floorward face's end
  // and the corner there at once.
  it("strikes a brick once though it meets its face and its corner at once", () => {
    const wall = wallOf(6, ["....3...."]);

    const flown = flyShot({ wall, aim: UP, x: 5 });

    expect(
      eventsOf(flown, "strike").map(({ took, left }) => [took, left]),
    ).toEqual([[1, 2]]);
  });

  // Straight up at the seam, it meets both bricks' faces at once: its charge
  // breaks the left one, and a plain hit wears the right one, which turns it.
  it("spends its charge on a seam's bricks from the left, and turns off what it didn't break", () => {
    const wall = wallOf(6, ["...22...."]);

    const flown = flyShot({ wall, aim: UP, x: 4, charge: 2 });

    expect(flown.flight.events.slice(1, 5)).toEqual([
      expect.objectContaining({ kind: "turn", off: "face", dy: -1 }),
      expect.objectContaining({
        kind: "strike",
        cell: 3,
        took: 2,
        left: 0,
        charge: 0,
      }),
      expect.objectContaining({ kind: "break", cell: 3 }),
      expect.objectContaining({
        kind: "strike",
        cell: 4,
        took: 1,
        left: 1,
        charge: 0,
      }),
    ]);
  });

  // At 60°, its middle 1e-5 short of the brick's right edge as it meets the
  // face, it meets the corner there 2.3e-10 later.
  it("turns off a face as a mirror, though it meets the face's corner just after", () => {
    const wall = wallOf(6, ["....o...."]);
    const aim = aimAt(60);
    const [dx, dy] = AIMS[aim]!;
    const x = 5 - 1e-5 - dx * ((6 - RADIUS - RADIUS) / dy);

    const flown = flyShot({ wall, aim, x });

    expect([eventsOf(flown, "turn")[0], eventsOf(flown, "strike")]).toEqual([
      expect.objectContaining({
        off: "face",
        dx: expect.closeTo(dx, 12) as number,
        dy: expect.closeTo(-dy, 12) as number,
      }),
      [expect.objectContaining({ cell: 4 })],
    ]);
  });

  // A plain hit would break the brick of six that five charges leave one.
  it("takes no second hit off a brick it turns off as it flies away", () => {
    const wall = wallOf(6, ["....6...."]);

    const flown = flyShot({ wall, aim: UP, charge: 5 });

    expect(
      eventsOf(flown, "strike").map(({ took, left }) => [took, left]),
    ).toEqual([[5, 1]]);
  });

  it("yawns as it reaches the bored distance from its last hit", () => {
    const fixture = FLIGHT_FIXTURES.punch;
    const rules = { bored: 7.5, kinds: BRICK_KINDS, traits: STAND_IN_RULES };

    const flown = fly(startOf(fixture), rules);

    const lastHit = eventsOf(flown, "strike").at(-1)!.at;
    expect(eventsOf(flown, "yawn").map(({ at }) => at)).toEqual([
      lastHit + 7.5,
    ]);
  });

  // Aimed at an inside corner, it meets the face above 3e-10 before the face
  // beside, and the bored distance falls between them: what it meets at the
  // limit is gathered with what it meets just past it.
  it("meets everything it meets at once with what it meets at the bored distance", () => {
    const wall = wallOf(5, [
      "...oo....", //
      "...o.....",
    ]);
    const aim = aimAt(120);
    const [dx, dy] = AIMS[aim]!;
    const up = (6 - RADIUS - RADIUS) / dy;
    const x = 4 + RADIUS - dx * (up + 3e-10);

    const flown = flyShot({ wall, aim, x, bored: up + 2e-10 });

    expect([eventsOf(flown, "turn"), eventsOf(flown, "yawn")]).toEqual([
      [
        expect.objectContaining({
          off: "face",
          dx: expect.closeTo(-dx, 12) as number,
          dy: expect.closeTo(-dy, 12) as number,
        }),
      ],
      [],
    ]);
  });

  // A rule made up for the spec kicks a fuzzball straight across, so it
  // flies between the side walls for ever, never bored.
  it("brings a fuzzball home at the 600-unit cap, and counts it", () => {
    const wall = wallOf(3, ["....-...."]);
    const traits: TraitRules = {
      ...STAND_IN_RULES,
      kicks: {
        met: (hooks, ball) => {
          hooks.kick(ball, 1, 0);
        },
      },
    };

    const flown = flyShot({ wall, aim: UP, traits, bored: 2 * MOST_FLIGHT });

    expect([
      eventsOf(flown, "yawn").map(({ at }) => at),
      flown.flight.capped,
    ]).toEqual([[MOST_FLIGHT], 1]);
  });

  // The sketch's flight that never ended, ported to a rule made up for the
  // spec: one that kicks a fuzzball back into the bumper it met, for ever.
  it("brings a fuzzball home after eight still turns, and counts it", () => {
    const wall = wallOf(3, ["....-...."]);
    const traits: TraitRules = {
      ...STAND_IN_RULES,
      kicks: {
        met: (hooks, ball, nx, ny) => {
          hooks.kick(ball, -nx, -ny);
        },
      },
    };

    const flown = flyShot({ wall, aim: UP, traits });

    const yawn = eventsOf(flown, "yawn")[0]!;
    expect([
      eventsOf(flown, "turn").filter(({ at }) => at === yawn.at).length,
      flown.flight.capped,
      flown.flight.tracks[0]?.waypoints.length,
    ]).toEqual([STILL_TURNS + 1, 1, 3]);
  });

  it("makes only the player's fuzzball hot, its mates leaving with its charge and its friends plain", () => {
    const wall = wallOf(5, ["....o...."]);

    const flown = flyShot({
      wall,
      aim: UP,
      charge: 2,
      hot: true,
      mates: 2,
      friends: 1,
    });

    expect(
      eventsOf(flown, "launch").map(({ hot, charge }) => [hot, charge]),
    ).toEqual([
      [true, MOST_CHARGE],
      [false, 2],
      [false, 2],
      [false, 0],
    ]);
  });

  // Aimed up and left at the field's top left corner, it meets the side
  // wall and the ceiling at once.
  it("turns off a side wall and the ceiling met at once, as off the side wall", () => {
    const aim = aimAt(120);
    const [dx, dy] = AIMS[aim]!;
    const x = RADIUS - dx * ((DEPTH - RADIUS - RADIUS) / dy);

    const flown = flyShot({ wall: wallOf(5, ["........."]), aim, x });

    expect(eventsOf(flown, "turn")[0]).toEqual(
      expect.objectContaining({
        off: "side",
        dx: expect.closeTo(-dx, 9) as number,
        dy: expect.closeTo(-dy, 9) as number,
      }),
    );
  });

  // Straight up at the brick's right edge, as above, with a charge.
  it("passes through a brick its charge breaks though it meets its face and its corner at once", () => {
    const wall = wallOf(6, ["....o...."]);

    const flown = flyShot({ wall, aim: UP, x: 5, charge: 1 });

    expect([
      eventsOf(flown, "strike").length,
      eventsOf(flown, "turn")[0]?.off,
    ]).toEqual([1, "ceiling"]);
  });

  // The brick's face is 4.5 up: it strikes it, then lands on the floor 4.5
  // later, just as it would grow bored again.
  it("meets what it reaches just as it would grow bored", () => {
    const wall = wallOf(5, ["....o...."]);

    const flown = flyShot({ wall, aim: UP, bored: 4.5 });

    expect([
      eventsOf(flown, "strike").map(({ at }) => at),
      eventsOf(flown, "yawn"),
      eventsOf(flown, "land").map(({ at }) => at),
    ]).toEqual([[4.5], [], [9]]);
  });

  it("comes home rather than cross into a portal it reaches just past the bored distance", () => {
    const wall = twinned(
      wallOf(4, ["......|..", ".........", ".........", "..|......"]),
    );

    const flown = flyShot({ wall, aim: UP, x: 2.5, bored: 3.75 - 1e-10 });

    expect([eventsOf(flown, "portal"), eventsOf(flown, "yawn").length]).toEqual(
      [[], 1],
    );
  });

  // Its charge breaks the row zapper at 0.5, and it grows bored a unit
  // later, as the column zapper the zap broke at 1 sets off the zap that
  // breaks the brick over it.
  it("drops a fuzzball home untouched by what breaks as it drops", () => {
    const wall = wallOf(1, [".o.......", ".|..-...."]);

    const flown = flyShot({
      wall,
      aim: UP,
      charge: 1,
      kinds: BRICK_KINDS,
      bored: 1,
    });

    expect([
      eventsOf(flown, "yawn").map(({ at }) => at),
      eventsOf(flown, "break").map(({ at }) => at),
      eventsOf(flown, "land").map(({ at }) => at),
    ]).toEqual([[1.5], [0.5, 1, 1.5], [3]]);
  });
});

describe("fly's hooks", () => {
  // A made-up zapper of each pattern, reaching a cell each way, stands in
  // for the row zapper in a block of bricks, which the fuzzball comes into
  // from below.
  it.each([
    ["row", [21, 23]],
    ["column", [31]],
    ["cross", [21, 23, 31]],
    ["x", [12, 14, 30, 32]],
    ["blast", [12, 14, 21, 23, 30, 31, 32]],
  ] as const)(
    "lands a %s zap on the bricks its pattern reaches",
    (pattern, reaches) => {
      const wall = wallOf(5, [
        "...ooo...",
        "...o-o...",
        "...o.o...",
        ".........",
      ]);
      const zapper = {
        ...BRICK_KINDS.rowZapper,
        traits: [{ kind: "zaps", pattern, hits: 2, reach: 1 }] as const,
      };
      const kinds = { ...BRICK_KINDS, rowZapper: zapper };

      const flown = flyShot({ wall, aim: UP, kinds });

      expect(eventsOf(flown, "zap").map((zap) => zap.reaches)).toEqual([
        reaches,
      ]);
    },
  );

  it("kicks a fuzzball straight away from a bumper's middle, earthing its charge", () => {
    const wall = wallOf(5, ["....-...."]);
    const reach = RADIUS + 0.38;
    const below = Math.sqrt(reach * reach - 0.3 * 0.3);

    const flown = flyShot({ wall, aim: UP, x: 4.8, charge: 3 });

    expect([eventsOf(flown, "turn")[0], eventsOf(flown, "strike")[0]]).toEqual([
      expect.objectContaining({
        off: "bumper",
        dx: expect.closeTo(0.3 / reach, 12) as number,
        dy: expect.closeTo(-below / reach, 12) as number,
      }),
      expect.objectContaining({ took: 0, charge: 0, earthed: true }),
    ]);
  });

  it("turns a fuzzball off a disc that doesn't kick it as off a corner", () => {
    const wall = wallOf(5, ["....-...."]);
    const traits: TraitRules = { ...STAND_IN_RULES, kicks: {} };
    const reach = RADIUS + 0.38;
    const below = Math.sqrt(reach * reach - 0.3 * 0.3);

    const flown = flyShot({ wall, aim: UP, x: 4.8, traits });

    expect(eventsOf(flown, "turn")[0]).toEqual(
      expect.objectContaining({
        off: "bumper",
        dx: expect.closeTo((2 * 0.3 * below) / (reach * reach), 12) as number,
        dy: expect.closeTo(
          1 - (2 * below * below) / (reach * reach),
          12,
        ) as number,
      }),
    );
  });

  // A bumper with a disc of 0.3 stands in for the tough brick, beside the
  // stand-ins' of 0.38. At 70°, the fuzzball's middle comes within both
  // discs' reach at once, at the place a unit's reach from both.
  it("kicks a fuzzball along the sum of the kicks it meets at once", () => {
    const wall = wallOf(5, ["...-2...."]);
    const small = {
      ...BUMPER,
      traits: [
        { kind: "never" },
        { kind: "earths" },
        { kind: "kicks", radius: 0.3 },
      ] as const,
    };
    const kinds = { ...STAND_INS, tough: small };
    const aim = aimAt(70);
    const [dx, dy] = AIMS[aim]!;
    const [left, right] = [RADIUS + 0.38, RADIUS + 0.3];
    const x = 4 + (left * left - right * right) / 2;
    const y = 5.5 - Math.sqrt(left * left - (x - 3.5) * (x - 3.5));
    const kickX = (x - 3.5) / left + (x - 4.5) / right;
    const kickY = (y - 5.5) / left + (y - 5.5) / right;
    const kick = Math.sqrt(kickX * kickX + kickY * kickY);

    const flown = flyShot({
      wall,
      aim,
      x: x - dx * ((y - RADIUS) / dy),
      kinds,
    });

    expect(eventsOf(flown, "turn")[0]).toEqual(
      expect.objectContaining({
        off: "bumper",
        dx: expect.closeTo(kickX / kick, 9) as number,
        dy: expect.closeTo(kickY / kick, 9) as number,
      }),
    );
  });

  // Straight up from 4.761013700985009, found by halving, it meets the
  // corner of the brick and the disc of the bumper beside it at once: their
  // lines to its middle sum to more than a unit, and it turns about the sum,
  // as off the corner, which comes first.
  it("turns a fuzzball off a corner and a disc met at once about the sum of their lines", () => {
    const wall = wallOf(5, ["....-o..."]);
    const traits: TraitRules = { ...STAND_IN_RULES, kicks: {} };

    const flown = flyShot({ wall, aim: UP, x: 4.761013700985009, traits });

    expect(eventsOf(flown, "turn")[0]).toEqual(
      expect.objectContaining({
        off: "corner",
        dx: expect.closeTo(-0.7484231111111203, 9) as number,
        dy: expect.closeTo(-0.6632215668649141, 9) as number,
      }),
    );
  });

  // A rule made up for the spec would kick a fuzzball off steel.
  it("runs a brick's rules for a fuzzball meeting it only where it meets its disc", () => {
    const wall = wallOf(6, ["....#...."]);
    const traits: TraitRules = {
      ...STAND_IN_RULES,
      never: {
        ...STAND_IN_RULES.never,
        met: (hooks, ball) => {
          hooks.kick(ball, 1, 0);
        },
      },
    };

    const flown = flyShot({ wall, aim: UP, x: 5.1, traits });

    expect(eventsOf(flown, "turn")[0]?.off).toBe("corner");
  });

  // A rule made up for the spec notes what each strike on steel hands it.
  it("hands a brick's rules what strikes it, the face, its plates and the charge", () => {
    const seen: Omit<Struck, "hurts" | "earths">[] = [];
    const traits = notingStrikes(seen);
    const drawn = wallOf(6, ["....#...."]);
    const plates = LEFT | FLOORWARD;
    const bricks = drawn.bricks.map((brick) =>
      brick === null ? null : { ...brick, plates },
    );

    flyShot({ wall: { ...drawn, bricks }, aim: UP, hot: true, traits });

    expect(seen[0]).toEqual({
      by: "fuzzball",
      side: FLOORWARD,
      plates,
      charge: MOST_CHARGE,
      hot: true,
    });
  });

  it.each([
    ["row", "zap"],
    ["blast", "blast"],
  ] as const)(
    "hands a brick's rules a %s zap's strike as a %s's",
    (pattern, by) => {
      const seen: Omit<Struck, "hurts" | "earths">[] = [];
      const zapper = {
        ...BRICK_KINDS.rowZapper,
        traits: [{ kind: "zaps", pattern, hits: 1, reach: 1 }] as const,
      };
      const kinds = { ...BRICK_KINDS, rowZapper: zapper };

      flyShot({
        wall: wallOf(5, ["....-#..."]),
        aim: UP,
        kinds,
        traits: notingStrikes(seen),
      });

      expect(seen).toEqual([{ by, side: 0, plates: 0, charge: 0, hot: false }]);
    },
  );

  // The prism stands in for the plain brick.
  it("splits a fuzzball 30° either way of the heading it turns to, the turn counter-clockwise first", () => {
    const wall = wallOf(6, ["....o...."]);
    const kinds = { ...BRICK_KINDS, brick: PRISM };

    const flown = flyShot({ wall, aim: UP, kinds });

    const half = Math.sqrt(3) / 2;
    expect([
      eventsOf(flown, "split"),
      eventsOf(flown, "launch").slice(1),
    ]).toEqual([
      [expect.objectContaining({ ball: 0, cell: 4, into: [1, 2] })],
      [
        expect.objectContaining({
          ball: 1,
          role: "split",
          dx: expect.closeTo(0.5, 12) as number,
          dy: expect.closeTo(-half, 12) as number,
        }),
        expect.objectContaining({
          ball: 2,
          role: "split",
          dx: expect.closeTo(-0.5, 12) as number,
          dy: expect.closeTo(-half, 12) as number,
        }),
      ],
    ]);
  });

  it("sends a split's fuzzballs off plain, whatever the charge of the one it split", () => {
    const wall = wallOf(6, ["....o...."]);
    const kinds = { ...BRICK_KINDS, brick: PRISM };

    const flown = flyShot({ wall, aim: UP, kinds, charge: 3 });

    expect(eventsOf(flown, "launch").map(({ charge }) => charge)).toEqual([
      3, 0, 0,
    ]);
  });

  it.each([
    [14, [[15]]],
    [15, []],
  ])(
    "splits, with %s friends behind, as many as 16 in the air leave room for",
    (friends, splits) => {
      const wall = wallOf(6, ["....o...."]);
      const kinds = { ...BRICK_KINDS, brick: PRISM };

      const flown = flyShot({ wall, aim: UP, kinds, friends });

      expect([
        eventsOf(flown, "split").map((split) => split.into),
        eventsOf(flown, "launch").length,
      ]).toEqual([splits, 16]);
    },
  );

  // Two portals, twinned: straight up into the first, out of the second's
  // middle, to the ceiling, and back down through the second, out of the
  // first's.
  it("sends a fuzzball crossing into a portal out of its twin's middle, which it ignores until it turns", () => {
    const wall = twinned(
      wallOf(4, ["......|..", ".........", ".........", "..|......"]),
    );

    const flown = flyShot({ wall, aim: UP, x: 2.5 });

    expect([
      eventsOf(flown, "portal").map(({ at, from, to }) => [at, from, to]),
      flown.flight.tracks[0]?.waypoints,
    ]).toEqual([
      [
        [3.75, 2, 33],
        [9.75, 33, 2],
      ],
      near([
        { at: 0, x: 2.5, y: RADIUS },
        { at: 3.75, x: 2.5, y: 4 },
        { at: 3.75, x: 6.5, y: 7.5 },
        { at: 7, x: 6.5, y: 10.75 },
        { at: 9.75, x: 6.5, y: 8 },
        { at: 9.75, x: 2.5, y: 4.5 },
        { at: 14, x: 2.5, y: RADIUS },
      ]),
    ]);
  });

  // The sketch's portal whose twin had sunk, ported: it led nowhere.
  it("passes a fuzzball through a portal whose twin has sunk", () => {
    const wall = twinned(
      wallOf(4, ["......|..", ".........", ".........", "..|......"]),
    );
    const bricks = wall.bricks.map((brick, cell) =>
      cell === 33 ? null : brick,
    );

    const flown = flyShot({ wall: { ...wall, bricks }, aim: UP, x: 2.5 });

    expect([eventsOf(flown, "portal"), eventsOf(flown, "land").length]).toEqual(
      [[], 1],
    );
  });

  it("passes a fuzzball through a portal whose twin lies under the floor", () => {
    const wall = twinned(
      wallOf(-1, ["......|..", ".........", ".........", "..|......"]),
    );

    const flown = flyShot({ wall, aim: UP, x: 6.5 });

    expect([eventsOf(flown, "portal"), eventsOf(flown, "land").length]).toEqual(
      [[], 1],
    );
  });

  it("passes a fuzzball through a portal whose twin waits over the ceiling", () => {
    const wall = twinned(
      wallOf(4, [
        "......|..",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        "..|......",
      ]),
    );

    const flown = flyShot({ wall, aim: UP, x: 2.5 });

    expect([eventsOf(flown, "portal"), eventsOf(flown, "land").length]).toEqual(
      [[], 1],
    );
  });

  // A portal with no twin, under a twinned pair: straight up through it,
  // into the pair's lower portal, out of the upper's middle, to the
  // ceiling, and back down through the upper, out of the lower's.
  it("sends a fuzzball through a portal with no twin into a portal past it", () => {
    const drawn = wallOf(4, [
      "......|..",
      ".........",
      "..|......",
      ".........",
      "..|......",
    ]);
    const bricks = drawn.bricks.map((brick, cell) =>
      brick === null || cell === 2 ? brick : { ...brick, twin: 62 - cell },
    );

    const flown = flyShot({ wall: { ...drawn, bricks }, aim: UP, x: 2.5 });

    expect(
      eventsOf(flown, "portal").map(({ at, from, to }) => [at, from, to]),
    ).toEqual([
      [5.75, 20, 42],
      [9.75, 42, 20],
    ]);
  });

  // At 8°, low over the floor, under the middle portal and into the right
  // one's side, and out of the left one's middle on a line that crosses
  // into the middle one, then the right one, which it ignores until it
  // turns, off the right wall: no loop through the pair.
  it("sends a fuzzball out of a portal on through every portal in its way until it turns", () => {
    const drawn = wallOf(1, [
      "....|....",
      ".........",
      ".........",
      ".........",
      "..|.|.|..",
    ]);
    const twins = new Map([
      [2, 6],
      [6, 2],
      [4, 40],
      [40, 4],
    ]);
    const bricks = drawn.bricks.map((brick, cell) =>
      brick === null ? null : { ...brick, twin: twins.get(cell) ?? null },
    );

    const flown = flyShot({
      wall: { ...drawn, bricks },
      aim: aimAt(8),
      x: 0.6,
    });

    expect(
      flown.flight.events
        .slice(1, 3)
        .map((event) =>
          event.kind === "portal" ? [event.from, event.to] : event.kind,
        ),
    ).toEqual([[6, 2], "turn"]);
  });

  // A rule made up for the spec recharges a fuzzball crossing into a
  // portal's cell: up through it, and down through it again from the
  // ceiling.
  it("crosses into the cell it passed through again once it turns", () => {
    const traits: TraitRules = {
      ...STAND_IN_RULES,
      teleports: {
        entered: (hooks, ball, cell) => {
          hooks.recharge(ball, cell);
        },
      },
    };

    const flown = flyShot({ wall: wallOf(5, ["....|...."]), aim: UP, traits });

    expect(eventsOf(flown, "recharge").map(({ at }) => at)).toEqual([
      4.75, 15.25,
    ]);
  });

  // Rules made up for the spec ask each hook at a moment it isn't made at:
  // here, as the fuzzball crosses into the portal's cell, once it has
  // turned off the right wall.
  it.each([
    [
      "a split",
      (hooks: Hooks, ball: number, cell: number) => {
        hooks.split(ball, cell, 1, 0);
      },
    ],
    [
      "a kick",
      (hooks: Hooks, ball: number) => {
        hooks.kick(ball, 1, 0);
      },
    ],
    [
      "a free",
      (hooks: Hooks, _ball: number, cell: number) => {
        hooks.free(cell, 0);
      },
    ],
  ])("throws for %s asked as a fuzzball crosses into a cell", (_, asked) => {
    const traits: TraitRules = {
      ...STAND_IN_RULES,
      teleports: { entered: asked },
    };

    const wall = wallOf(9, [".......|."]);

    expect(() => flyShot({ wall, aim: aimAt(60), traits })).toThrow(Error);
  });

  // Its charge breaks the zapper under the portal, whose zap lands before
  // it crosses into the portal's cell.
  it("throws for a free asked as a fuzzball crosses into a cell, after a zap has landed", () => {
    const traits: TraitRules = {
      ...STAND_IN_RULES,
      teleports: {
        entered: (hooks, _ball, cell) => {
          hooks.free(cell, 0);
        },
      },
    };
    const kinds = { ...STAND_INS, rowZapper: BRICK_KINDS.rowZapper };
    const wall = wallOf(1, ["....|....", ".........", "....-...."]);

    expect(() => flyShot({ wall, aim: UP, charge: 1, kinds, traits })).toThrow(
      Error,
    );
  });

  it.each([
    [
      "as a brick breaks",
      {
        frees: {
          broken: (hooks: Hooks, cell: number, ball: number) => {
            hooks.teleport(ball, cell, cell);
          },
        },
      },
    ],
    [
      "of another fuzzball than the one crossing into a cell",
      {
        teleports: {
          entered: (hooks: Hooks, ball: number, cell: number) => {
            hooks.teleport(ball + 1, cell, cell);
          },
        },
      },
    ],
  ])("throws for a teleport asked %s", (_, rules) => {
    const traits: TraitRules = { ...STAND_IN_RULES, ...rules };
    const wall = wallOf(5, ["....2....", "....|...."]);
    const kinds = { ...STAND_INS, tough: CAGE };

    expect(() => flyShot({ wall, aim: UP, charge: 2, kinds, traits })).toThrow(
      Error,
    );
  });

  it("frees a cage's friend as a zap breaks it", () => {
    const wall = wallOf(5, ["....-.2.."]);
    const kinds = { ...BRICK_KINDS, tough: CAGE };

    const flown = flyShot({ wall, aim: UP, kinds });

    expect(eventsOf(flown, "free").map(({ at, cell }) => [at, cell])).toEqual([
      [5, 6],
    ]);
  });

  // The wool stands in for the plain brick, the cage for the tough one.
  it("recharges the fuzzball that breaks wool", () => {
    const wall = wallOf(6, ["....o...."]);
    const kinds = { ...BRICK_KINDS, brick: WOOL };

    const flown = flyShot({ wall, aim: UP, kinds });

    expect([eventsOf(flown, "recharge"), eventsOf(flown, "land")]).toEqual([
      [expect.objectContaining({ ball: 0, cell: 4 })],
      [expect.objectContaining({ ball: 0 })],
    ]);
  });

  it("frees a cage's friend right after the cage breaks", () => {
    const wall = wallOf(6, ["....2...."]);
    const kinds = { ...BRICK_KINDS, tough: CAGE };

    const flown = flyShot({ wall, aim: UP, kinds, charge: 2 });

    const kindsAt = flown.flight.events.map(({ kind }) => kind);
    expect(
      kindsAt.slice(kindsAt.indexOf("break"), kindsAt.indexOf("break") + 2),
    ).toEqual(["break", "free"]);
  });

  it("lands a zap half a unit after the break that set it off, and one it sets off half a unit later", () => {
    const wall = wallOf(6, ["..|.-...."]);

    const flown = flyShot({ wall, aim: UP, kinds: BRICK_KINDS });

    const broke = eventsOf(flown, "break")[0]!.at;
    expect(
      eventsOf(flown, "zap").map(({ at, pattern }) => [at, pattern]),
    ).toEqual([
      [broke + ZAP_DELAY, "row"],
      [broke + ZAP_DELAY + ZAP_DELAY, "column"],
    ]);
  });

  // The prism stands in for the plain brick, wool for the tough one: a zap
  // has no fuzzball to split or charge.
  it("splits and recharges no fuzzball for a brick a zap breaks", () => {
    const wall = wallOf(6, ["o2..-...."]);
    const kinds = { ...BRICK_KINDS, brick: PRISM, tough: WOOL };

    const flown = flyShot({ wall, aim: UP, kinds });

    expect([
      eventsOf(flown, "break").map(({ cell, by }) => [cell, by]),
      eventsOf(flown, "split"),
      eventsOf(flown, "recharge"),
    ]).toEqual([
      [
        [4, "fuzzball"],
        [0, "zap"],
        [1, "zap"],
      ],
      [],
      [],
    ]);
  });

  it("charges a recharged fuzzball to the most", () => {
    const wall = wallOf(6, ["....3....", "....o...."]);
    const kinds = { ...BRICK_KINDS, brick: WOOL };

    const flown = flyShot({ wall, aim: UP, kinds, charge: 1 });

    expect(
      eventsOf(flown, "strike").map(({ cell, charge }) => [cell, charge]),
    ).toEqual([
      [4, 0],
      [13, MOST_CHARGE - 3],
    ]);
  });

  // Straight up, its charge breaks the row zapper at 4.5, and it flies on
  // to the brick over it, a unit on. The zap breaks the made-up x zapper
  // beside it at 5, whose zap reaches that brick at 5.5, as it strikes it.
  it("lands a zap after the fuzzballs at its moment, after a strike on a brick it reaches", () => {
    const wall = wallOf(5, [".2.......", "|-......."]);
    const xZapper = {
      ...BRICK_KINDS.columnZapper,
      traits: [{ kind: "zaps", pattern: "x", hits: 1, reach: 1 }] as const,
    };
    const kinds = { ...BRICK_KINDS, columnZapper: xZapper };

    const flown = flyShot({ wall, aim: UP, x: 1.5, charge: 1, kinds });

    expect(
      flown.flight.events
        .filter(({ at }) => at === 5.5)
        .map((event) => (event.kind === "break" ? event.by : event.kind)),
    ).toEqual(["turn", "strike", "zap", "zap"]);
  });

  // It breaks the row zapper at 0.5 and lands at 1, as the zap breaks the
  // column zapper, whose zap breaks the brick over it at 1.5.
  it("lasts until the last zap lands, after the last landing", () => {
    const wall = wallOf(1, [".o.......", ".|..-...."]);

    const flown = flyShot({ wall, aim: UP, kinds: BRICK_KINDS });

    expect([
      eventsOf(flown, "land").map(({ at }) => at),
      eventsOf(flown, "zap").map(({ at }) => at),
      flown.flight.length,
      orderProblemsOf(flown.flight.events),
      trackProblemsOf(flown.flight),
    ]).toEqual([[1], [1, 1.5], 1.5, [], []]);
  });

  // The row zap breaks both column zappers at 5, and their zaps land at
  // 5.5, the left one's first.
  it("lands the zaps of one moment by cell", () => {
    const wall = wallOf(5, [".o.....o.", ".|..-..|."]);

    const flown = flyShot({ wall, aim: UP, charge: 1, kinds: BRICK_KINDS });

    expect(
      eventsOf(flown, "break")
        .filter(({ at }) => at === 5.5)
        .map(({ cell, streak }) => [cell, streak]),
    ).toEqual([
      [10, 4],
      [16, 5],
    ]);
  });
});

/** Returns the stand-ins' rules with steel's noting each strike on it, as its brick's rules see it. */
function notingStrikes(seen: Omit<Struck, "hurts" | "earths">[]): TraitRules {
  return {
    ...STAND_IN_RULES,
    never: {
      struck: (struck) => {
        const { by, side, plates, charge, hot } = struck;
        seen.push({ by, side, plates, charge, hot });
        struck.hurts = false;
      },
    },
  };
}

/** Returns a wall whose two portals, the column zappers' stand-ins, are each other's twins. */
function twinned(wall: Wall): Wall {
  const portals = wall.bricks.flatMap((brick, cell) =>
    brick?.kind === "columnZapper" ? [cell] : [],
  );
  return {
    ...wall,
    bricks: wall.bricks.map((brick, cell) =>
      brick !== null && portals.includes(cell)
        ? { ...brick, twin: portals.find((other) => other !== cell) ?? null }
        : brick,
    ),
  };
}

describe("fly, on random walls", () => {
  // Seeded random walls of every kind the hooks serve, and a shot at each
  // from anywhere on the floor, along any aim, with any charge and boon:
  // 2,000 in four batches, so each keeps well inside a spec's time.
  it.each([20261111, 20261112, 20261113, 20261114])(
    "ends every flight, in order and clear of the bricks, the caps never reached (seed %i)",
    (seed) => {
      const random = createRandom(seed);
      const flights = Array.from({ length: 500 }, () => randomFlight(random));

      const problems = flights.flatMap(({ start, rules }) => {
        const { flight, wall } = fly(start, rules);
        return [
          ...orderProblemsOf(flight.events),
          ...trackProblemsOf(flight),
          ...clearanceProblemsOf(flight, wall, start.depth, rules.kinds),
          ...(flight.capped > 0 ? [`${flight.capped} capped`] : []),
        ];
      });

      expect(problems).toEqual([]);
    },
  );
});

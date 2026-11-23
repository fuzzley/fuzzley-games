import {
  AIMS,
  AIMS_PER_DEGREE,
  FIRST_AIM_DEGREES,
} from "@fz/brick-wall/rules/aims";
import { COLUMNS, RADIUS, SIDE_MARGIN } from "@fz/brick-wall/rules/field";
import { cellOf } from "@fz/brick-wall/rules/grid";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import type { TraitKind, Wall } from "../catalog/kinds";
import { WALL_LEGEND } from "../levels/legend";
import { TRAIT_RULES } from "../bricks/trait_rules";
import { FLIGHT_RULES, type FlightRules, STAND_OFF } from "../tuning";
import type { FlightEvent } from "./events";
import { type Flown, fly } from "./flight";
import type { Hooks, TraitRule, TraitRules } from "./hooks";

/** The depth of the field the specs fly in. */
const DEPTH = 11;

/** The side walls' flats and the ceiling's, a radius in from each. */
const LEFT_WALL = RADIUS;
const RIGHT_WALL = COLUMNS - RADIUS;
const CEILING = DEPTH - RADIUS;

/**
 * A pair of portals, standing from row 2: one in column 6 of row 2, whose
 * eye a shot at 45° from the floor's middle flies through, and its twin in
 * column 8 of row 8, out of that shot's way.
 */
const PORTALS = [
  "........@",
  ...Array<string>(5).fill("........."),
  "......@..",
];

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
  /** The bricks' trait rules: the game's unless given. */
  readonly traits?: TraitRules;
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
  traits = TRAIT_RULES,
}: PictureShot): Flown {
  const wall = wallOf(picture, lowestRow);
  return fly(
    { wall, depth: DEPTH, x, hot },
    { aim: aimAt(degrees) },
    rules,
    traits,
  );
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
    const start = {
      wall: wallOf(["ooo2....."], 5),
      depth: DEPTH,
      x: 4.5,
      hot: false,
    };
    const before = structuredClone(start.wall);

    fly(start, { aim: aimAt(100) }, FLIGHT_RULES, TRAIT_RULES);

    expect(start.wall).toStrictEqual(before);
  });

  // Up and to the left, it strikes the tough brick of two in column 3.
  it("returns the wall it leaves, each brick it struck with the hits it has left", () => {
    const flown = flyAt({ picture: ["ooo2....."], degrees: 100 });

    expect(flown.wall.bricks.map((brick) => brick?.hits)).toEqual([
      1,
      1,
      1,
      1,
      ...Array<undefined>(5),
    ]);
  });

  it("throws for an aim that isn't one of the 657", () => {
    const start = { wall: wallOf([], 5), depth: DEPTH, x: 4.5, hot: false };

    expect(() => fly(start, { aim: 657 }, FLIGHT_RULES, TRAIT_RULES)).toThrow(
      RangeError,
    );
  });
});

describe("fly's strikes", () => {
  it("strikes a brick it turns off, taking a hit, which breaks it", () => {
    const flown = flyAt({ picture: ["........o"] });

    expect([eventsOf(flown, "strike"), flown.wall.bricks]).toEqual([
      [
        {
          at: near(4.5 * Math.SQRT2),
          kind: "strike",
          cell: 8,
          took: 1,
          broke: true,
          rally: 1,
        },
      ],
      Array<null>(9).fill(null),
    ]);
  });

  it("takes a pip off a tough brick, which holds", () => {
    const flown = flyAt({ picture: ["........3"] });

    expect([eventsOf(flown, "strike"), flown.wall.bricks[8]?.hits]).toEqual([
      [expect.objectContaining({ cell: 8, took: 1, broke: false })],
      2,
    ]);
  });

  it("takes a hot shot's two hits a strike", () => {
    const flown = flyAt({ picture: ["........3"], hot: true });

    expect(eventsOf(flown, "strike")).toEqual([
      expect.objectContaining({ cell: 8, took: 2, broke: false, rally: 1 }),
    ]);
  });

  it("strikes each brick it met at a moment once, floor up, counting each in its rally", () => {
    const x = xToReach(45, [6.75, 4.75]);

    const flown = flyAt({
      picture: ["......o..", ".......o."],
      lowestRow: 4,
      x,
    });

    expect(
      eventsOf(flown, "strike").map(({ cell, rally }) => [cell, rally]),
    ).toEqual([
      [cellOf(7, 0), 1],
      [cellOf(6, 1), 2],
    ]);
  });

  it.each([
    ["steel", ["........#"], 4.5, 45],
    [
      "a ramp",
      ["........7"],
      xToReach(60, [RIGHT_WALL, 5 + RADIUS - STAND_OFF]),
      60,
    ],
    ["a hatch's bar", ["..=......"], 4.5, 45],
  ] as const)("turns off %s, which takes nothing", (_, picture, x, degrees) => {
    const flown = flyAt({ picture, x, degrees });

    expect([
      eventsOf(flown, "strike"),
      flown.flight.rally,
      flown.flight.lastStrike,
    ]).toEqual([[], 0, null]);
  });

  // The column of tough bricks by the right wall is struck six times as
  // the fuzzball climbs beside it, the top course four times from over it,
  // and the column once more from under it.
  it("marks the moments of its strikes at the rally's marks, and its last", () => {
    const flown = flyAt({
      picture: [
        "....3333.",
        ".......3.",
        ".......3.",
        ".......3.",
        ".......3.",
        ".......3.",
      ],
      lowestRow: 4,
      x: 4.75,
    });
    const moments = eventsOf(flown, "strike").map(({ at }) => at);

    expect([flown.flight.marks, flown.flight.lastStrike]).toEqual([
      [moments[9]],
      moments.at(-1),
    ]);
  });
});

describe("fly's trait rules", () => {
  /** Returns the game's trait rules with one trait's made up for the spec to note each moment it runs at, and the cell. */
  function noting(trait: TraitKind, seen: string[]): TraitRules {
    const note = (moment: string, cell: number): void => {
      seen.push(`${moment} ${String(cell)}`);
    };
    const rule: TraitRule = {
      struck: ({ cell }) => {
        note("struck", cell);
      },
      broken: (_, cell) => {
        note("broken", cell);
      },
      met: (_, cell) => {
        note("met", cell);
      },
      entered: (_, cell) => {
        note("entered", cell);
      },
    };
    return { ...TRAIT_RULES, [trait]: rule };
  }

  /** The game's trait rules with a plated brick's made up for the spec: a strike on its plates alone takes nothing. */
  const PLATED: TraitRules = {
    ...TRAIT_RULES,
    plated: {
      struck: (struck) => {
        const { sides, brick } = struck;
        if (sides !== 0 && (brick.plates & sides) === sides) {
          struck.shield = "plate";
        }
      },
    },
  };

  // Two spring bricks at an inside corner, the one beside it a row under
  // the one over it.
  it("runs a brick's rules as a turn strikes it, as it breaks and as it meets it, brick by brick, floor up", () => {
    const seen: string[] = [];
    const x = xToReach(45, [6.75, 4.75]);

    flyAt({
      picture: ["......S..", ".......S."],
      lowestRow: 4,
      x,
      traits: noting("springs", seen),
    });

    expect(seen).toEqual([
      "struck 7",
      "broken 7",
      "met 7",
      "struck 15",
      "broken 15",
      "met 15",
    ]);
  });

  it("runs no rules for a break of a brick that holds", () => {
    const seen: string[] = [];

    flyAt({ picture: ["........M"], traits: noting("regrows", seen) });

    expect(seen).toEqual(["struck 8", "met 8"]);
  });

  it("runs only the rules for meeting a brick that never breaks", () => {
    const seen: string[] = [];

    flyAt({ picture: ["........#"], traits: noting("never", seen) });

    expect(seen).toEqual(["met 8"]);
  });

  it("shields a brick its rules shield, which takes nothing and isn't a strike", () => {
    const flown = flyAt({ picture: ["........v"], traits: PLATED });

    expect([
      flown.flight.events.filter(
        ({ kind }) => kind === "shielded" || kind === "strike",
      ),
      flown.flight.rally,
      flown.wall.bricks[8]?.hits,
    ]).toEqual([
      [{ at: near(4.5 * Math.SQRT2), kind: "shielded", cell: 8, by: "plate" }],
      0,
      2,
    ]);
  });

  // At (4, 4.75), the brick's plated floorward flat turns the fuzzball,
  // and the cut across its corner beside it doesn't.
  it("hands the rules only the sides of the faces that turned it", () => {
    const flown = flyAt({
      picture: ["....v...."],
      x: xToReach(60, [4, 5 - RADIUS]),
      degrees: 60,
      traits: PLATED,
    });

    expect(eventsOf(flown, "shielded")).toEqual([
      expect.objectContaining({ cell: 4, by: "plate" }),
    ]);
  });

  // The cut across the floorward left corner of a brick plated underneath
  // meets a side its plate leaves bare; one plated on its sides too is
  // plated on both the cut's sides.
  it.each([
    ["v", "strike"],
    ["U", "shielded"],
  ] as const)(
    "hands the rules both sides of a cut corner, so a cut at %s is a %s",
    (brick, kind) => {
      const flown = flyAt({
        picture: [`....${brick}....`],
        x: 1.3,
        degrees: 60,
        traits: PLATED,
      });

      expect(
        flown.flight.events.filter(
          (event) => event.kind === "strike" || event.kind === "shielded",
        ),
      ).toEqual([expect.objectContaining({ kind, cell: 4 })]);
    },
  );

  // Up from the floor's middle at 45° through the eye of the portal in
  // column 6 of row 2, off the right wall, the ceiling and the left wall,
  // and down through its eye's corner, its twin in row 8 out of the way.
  it("runs a portal's rules as the middle crosses into its eye, passing every eye as air from there until it next turns", () => {
    const seen: string[] = [];

    flyAt({
      picture: PORTALS,
      lowestRow: 2,
      traits: noting("teleports", seen),
    });

    expect(seen).toEqual(["entered 6", "entered 6"]);
  });
});

describe("fly's floor bounces", () => {
  /** The wall of the rally's flights: a column of tough bricks of three by the right wall, under a top course of four. */
  const RALLY = [
    "....3333.",
    ".......3.",
    ".......3.",
    ".......3.",
    ".......3.",
    ".......3.",
  ];

  /** The game's trait rules with a spring brick's made up for the spec: it earns a floor bounce as it breaks. */
  const SPRINGS: TraitRules = {
    ...TRAIT_RULES,
    springs: {
      broken: (hooks) => {
        hooks.earn();
      },
    },
  };

  /** Returns a flight's events that earn, keep and spend floor bounces. */
  function bouncesOf(flown: Flown): FlightEvent[] {
    return flown.flight.events.filter(
      ({ kind }) => kind === "bounce-earned" || kind === "bounce-spent",
    );
  }

  it("leaves a hot shot holding its own floor bounce, and a plain shot none", () => {
    expect([flyAt({ hot: true }).flight.held, flyAt({}).flight.held]).toEqual([
      FLIGHT_RULES.hotBounces,
      0,
    ]);
  });

  // Down off the left wall, it reaches the floor at x = 8.5, and lands
  // there the next time.
  it("spends a floor bounce it holds on the floor, turning off it as off a flat", () => {
    const [dx, dy] = headingOf(aimAt(45));

    const flown = flyAt({ hot: true });
    const turns = eventsOf(flown, "turn");

    expect([turns[3], bouncesOf(flown), eventsOf(flown, "land")]).toEqual([
      expect.objectContaining({
        x: near(8.5),
        y: RADIUS,
        dx,
        dy,
        off: "floor",
      }),
      [{ at: turns[3]?.at, kind: "bounce-spent", held: 0 }],
      [expect.objectContaining({ x: near(5) })],
    ]);
  });

  // The rally's tenth strike, on the top course, earns it a floor bounce,
  // which it spends on the floor before it strikes the column from under it.
  it("earns a floor bounce as its rally reaches the ladder's first rung, and spends it", () => {
    const flown = flyAt({ picture: RALLY, lowestRow: 4, x: 4.75 });
    const strikes = eventsOf(flown, "strike");

    expect([strikes.length, bouncesOf(flown)]).toEqual([
      11,
      [
        {
          at: strikes[9]?.at,
          kind: "bounce-earned",
          by: "rally",
          held: 1,
          kept: true,
        },
        expect.objectContaining({ kind: "bounce-spent", held: 0 }),
      ],
    ]);
  });

  it("earns its floor bounces at the rungs of the ladder its rules give", () => {
    const rules = {
      ...FLIGHT_RULES,
      firstBounce: 1,
      bounceStep: 1,
      mostBounces: 10,
    };

    const flown = flyAt({ picture: RALLY, lowestRow: 4, x: 4.75, rules });

    const earnedAt = flown.flight.events.flatMap((event, index) => {
      const strike = flown.flight.events[index - 1];
      return event.kind === "bounce-earned" && strike?.kind === "strike"
        ? [strike.rally]
        : [];
    });

    expect(earnedAt.slice(0, 4)).toEqual([1, 3, 6, 10]);
  });

  it("loses a floor bounce earned while it holds the most, still announcing it", () => {
    const rules = { ...FLIGHT_RULES, firstBounce: 1, bounceStep: 1 };

    const flown = flyAt({ picture: RALLY, lowestRow: 4, x: 4.75, rules });

    expect(
      eventsOf(flown, "bounce-earned")
        .slice(0, 4)
        .map(({ held, kept }) => [held, kept]),
    ).toEqual([
      [1, true],
      [2, true],
      [3, true],
      [3, false],
    ]);
  });

  it("earns a floor bounce through its hook as a brick's rules ask, after the rally's at the same strike", () => {
    const rules = { ...FLIGHT_RULES, firstBounce: 1 };

    const flown = flyAt({ picture: ["........S"], rules, traits: SPRINGS });

    expect(bouncesOf(flown).slice(0, 2)).toEqual([
      expect.objectContaining({ by: "rally", held: 1 }),
      expect.objectContaining({ by: "spring", held: 2 }),
    ]);
  });

  it("throws for a floor bounce earned as the middle crosses into an eye", () => {
    const traits: TraitRules = {
      ...TRAIT_RULES,
      teleports: {
        entered: (hooks) => {
          hooks.earn();
        },
      },
    };

    expect(() => flyAt({ picture: PORTALS, lowestRow: 2, traits })).toThrow(
      "A floor bounce is earned only as a brick breaks or is met.",
    );
  });

  // A spring brick at an inside corner, under a plated brick met with it.
  it("throws for a floor bounce earned through hooks kept from one brick's break as another is struck", () => {
    let kept: Hooks | null = null;
    const traits: TraitRules = {
      ...TRAIT_RULES,
      springs: {
        broken: (hooks) => {
          kept = hooks;
        },
      },
      plated: {
        struck: () => {
          kept?.earn();
        },
      },
    };
    const x = xToReach(45, [6.75, 4.75]);

    expect(() =>
      flyAt({ picture: ["......v..", ".......S."], lowestRow: 4, x, traits }),
    ).toThrow("A floor bounce is earned only as a brick breaks or is met.");
  });

  it("throws for a floor bounce earned through hooks kept past their moment", () => {
    let kept: Hooks | null = null;
    const traits: TraitRules = {
      ...TRAIT_RULES,
      springs: {
        broken: (hooks) => {
          kept = hooks;
        },
      },
    };
    flyAt({ picture: ["........S"], traits });

    expect(() => kept?.earn()).toThrow(Error);
  });
});

describe("fly's hatches and locks", () => {
  /** The game's trait rules with a hatch's and a lock's made up for the spec: a hatch holds the fuzzball up as it meets it, and a lock is shut by its tint's bolts. */
  const HATCHES_AND_LOCKS: TraitRules = {
    ...TRAIT_RULES,
    holds: {
      met: (hooks) => {
        hooks.hold();
      },
    },
    bolted: { bolts: ({ tint }) => tint },
  };

  /** A floor of hatches, under four empty rows and a brick by the ceiling. */
  const HATCH_FLOOR = [
    "o........",
    ".........",
    ".........",
    ".........",
    "=========",
  ];

  /** Two locks of a bolt, under two rows a shot at 45° never reaches. */
  const LOCKS = ["ooooooooo", "ooooooooo", ".x......x"];

  /** Returns the flight of a shot by the hatches' and the locks' made-up rules. */
  function flyLocked(shot: PictureShot): Flown {
    return flyAt({ traits: HATCHES_AND_LOCKS, ...shot });
  }

  /** Returns a flight's holds and the hatches opening. */
  function holdsOf(flown: Flown): FlightEvent[] {
    return flown.flight.events.filter(
      ({ kind }) => kind === "hold" || kind === "hatches-open",
    );
  }

  /** Returns the moments of a flight's turns off a hatch's bar. */
  function barsOf(flown: Flown): number[] {
    return eventsOf(flown, "turn")
      .filter(({ off }) => off === "bar")
      .map(({ at }) => at);
  }

  // Up from x = 4.75 at 45° through the hatches in row 7, and down onto
  // their bar three times, under the ceiling, as the hatch fixture flies.
  it("is held up by the hatches' bar coming down, three times between them, every hatch opening at the third", () => {
    const flown = flyLocked({ picture: HATCH_FLOOR, lowestRow: 7, x: 4.75 });

    const [first, second, third] = barsOf(flown);
    expect(holdsOf(flown)).toEqual([
      { at: first, kind: "hold", cell: cellOf(0, 0), left: 2 },
      { at: second, kind: "hold", cell: cellOf(5, 0), left: 1 },
      { at: third, kind: "hold", cell: cellOf(6, 0), left: 0 },
      { at: third, kind: "hatches-open" },
    ]);
  });

  // The flight of the spec before, a lock of a bolt at the foot of the
  // left column, out of its way, by rules that draw a bolt at the ninth
  // turn, its third hold.
  it("draws a bolt after the hatches open at the same moment", () => {
    const rules = { ...FLIGHT_RULES, boltTurns: 9 };
    const picture = [
      ...HATCH_FLOOR,
      ...Array<string>(6).fill("........."),
      "x........",
    ];

    const flown = flyLocked({ picture, lowestRow: 0, x: 4.75, rules });

    const third = barsOf(flown)[2];
    expect(
      flown.flight.events
        .filter(({ at }) => at === third)
        .map(({ kind }) => kind),
    ).toEqual(["turn", "hold", "hatches-open", "bolt"]);
  });

  // Off the ceiling and the left wall, down through row 7 to land.
  it("falls through the hatches once they open", () => {
    const flown = flyLocked({ picture: HATCH_FLOOR, lowestRow: 7, x: 4.75 });

    expect(placesOf(flown).slice(-2)).toEqual([
      [near(4.25), near(CEILING)],
      [near(LEFT_WALL), near(6.75)],
    ]);
  });

  // Straight up through the joint of two hatches, and down onto both bars
  // at once, three times.
  it("holds once a turn however many bars it meets there, the first naming the hold", () => {
    const flown = flyLocked({ picture: ["....==..."], x: 5, degrees: 90 });

    expect([
      eventsOf(flown, "turn")[1]?.cells,
      eventsOf(flown, "hold").map(({ cell, left }) => [cell, left]),
    ]).toEqual([
      [cellOf(4, 0), cellOf(5, 0)],
      [
        [cellOf(4, 0), 2],
        [cellOf(4, 0), 1],
        [cellOf(4, 0), 0],
      ],
    ]);
  });

  // Up at 30° under a lone hatch, and off the cut at its bar's right end.
  it("is held up by a turn off a bar's end, flying up", () => {
    const flown = flyLocked({ picture: ["....=...."], x: 2.25, degrees: 30 });

    expect(holdsOf(flown)[0]).toEqual({
      at: barsOf(flown)[0],
      kind: "hold",
      cell: cellOf(4, 0),
      left: 2,
    });
  });

  // Between two columns of steel at the lowest aim, meeting one at each of
  // its turns, which hold it up by the made-up rules.
  it("holds nothing once the hatches have no holds left", () => {
    const traits: TraitRules = {
      ...TRAIT_RULES,
      never: {
        met: (hooks) => {
          hooks.hold();
        },
      },
    };

    const flown = flyAt({
      picture: Array<string>(9).fill("#.......#"),
      lowestRow: 0,
      degrees: 8,
      traits,
    });

    expect([
      eventsOf(flown, "turn").length > 3,
      holdsOf(flown).map(({ kind }) => kind),
    ]).toEqual([true, ["hold", "hold", "hold", "hatches-open"]]);
  });

  it("throws for a hold made as the middle crosses into an eye", () => {
    const traits: TraitRules = {
      ...TRAIT_RULES,
      teleports: {
        entered: (hooks) => {
          hooks.hold();
        },
      },
    };

    expect(() => flyAt({ picture: PORTALS, lowestRow: 2, traits })).toThrow(
      "A fuzzball is held up only as a brick breaks or is met.",
    );
  });

  // A hot shot from x = 4.75 off the right wall, the lock at column 8, the
  // floor and the left wall, then the lock at column 1, as the bolt
  // fixture flies.
  it("turns off a lock still shut, which takes nothing, and draws its bolt at the fourth turn, opening it to a strike", () => {
    const flown = flyLocked({ picture: LOCKS, x: 4.75, hot: true });

    const turns = eventsOf(flown, "turn");
    expect(
      flown.flight.events.filter(
        ({ kind }) =>
          kind === "shielded" || kind === "bolt" || kind === "strike",
      ),
    ).toEqual([
      { at: turns[1]?.at, kind: "shielded", cell: cellOf(8, 0), by: "lock" },
      { at: turns[3]?.at, kind: "bolt", drawn: 1 },
      {
        at: turns[4]?.at,
        kind: "strike",
        cell: cellOf(1, 0),
        took: 1,
        broke: true,
        rally: 1,
      },
    ]);
  });

  it("runs no rules for a strike on a lock still shut", () => {
    const seen: number[] = [];
    const traits: TraitRules = {
      ...HATCHES_AND_LOCKS,
      bolted: {
        ...HATCHES_AND_LOCKS.bolted,
        struck: ({ cell }) => {
          seen.push(cell);
        },
      },
    };

    flyAt({ picture: LOCKS, x: 4.75, hot: true, traits });

    expect(seen).toEqual([cellOf(1, 0)]);
  });

  // At the lowest aim, off the right wall, the left, the right, and the
  // lock at the foot of row 4 where the left wall would be.
  it("meets a lock at the turn that draws its bolt still shut, the bolt drawn after it", () => {
    const flown = flyLocked({
      picture: ["x........"],
      lowestRow: 4,
      degrees: 8,
    });

    expect(flown.flight.events.slice(3, 6)).toEqual([
      expect.objectContaining({ kind: "turn", off: "brick", cells: [0] }),
      expect.objectContaining({ kind: "shielded", cell: 0, by: "lock" }),
      expect.objectContaining({ kind: "bolt", drawn: 1 }),
    ]);
  });

  // At the lowest aim, between the side walls up to the wall, a lock of
  // two bolts in its top row, and back down: 15 turns.
  it("draws a bolt at every fourth turn only while a lock in the field is still shut", () => {
    const rules = { ...FLIGHT_RULES, bored: 120 };

    const flown = flyLocked({
      picture: ["yoooooooo", "ooooooooo"],
      lowestRow: 9,
      degrees: 8,
      rules,
    });

    const turns = eventsOf(flown, "turn");
    expect([turns.length, eventsOf(flown, "bolt")]).toEqual([
      15,
      [
        { at: turns[3]?.at, kind: "bolt", drawn: 1 },
        { at: turns[7]?.at, kind: "bolt", drawn: 2 },
      ],
    ]);
  });

  // At the lowest aim, seven turns between the side walls before it is
  // bored, a lock waiting in row 11.
  it("draws no bolt for a lock waiting over the ceiling", () => {
    const flown = flyLocked({
      picture: ["x........", "ooooooooo", "ooooooooo"],
      lowestRow: 9,
      degrees: 8,
    });

    expect(eventsOf(flown, "bolt")).toEqual([]);
  });
});

describe("fly's portals", () => {
  /** The game's trait rules with a portal's made up for the spec: it takes the fuzzball to its twin. */
  const TELEPORTS: TraitRules = {
    ...TRAIT_RULES,
    teleports: {
      entered: (hooks, _, { twin }) => {
        if (twin !== null) {
          hooks.teleport(twin);
        }
      },
    },
  };

  /**
   * A pair of portals, standing from row 2: one in column 6 of row 2,
   * whose eye a shot at 45° from the floor's middle flies through, and its
   * twin in column 2 of row 5; and a brick waiting over the ceiling.
   */
  const TWINS = [
    "o........",
    ...Array<string>(5).fill("........."),
    "..@......",
    ".........",
    ".........",
    "......@..",
  ];

  // Into the eye in row 2 at its foot, out of its twin's in row 5, and on
  // up off the ceiling and both walls, as the teleport fixture flies.
  it("takes the fuzzball through a portal's eye to the same place in its twin's, flying on the same way", () => {
    const flown = flyAt({ picture: TWINS, lowestRow: 2, traits: TELEPORTS });

    const [teleport] = eventsOf(flown, "teleport");
    expect([
      teleport,
      flown.flight.track.waypoints.slice(1, 4),
      eventsOf(flown, "turn").map(({ off }) => off),
    ]).toEqual([
      {
        at: near(2 * Math.SQRT2),
        kind: "teleport",
        from: cellOf(6, 0),
        to: cellOf(2, 3),
      },
      [
        { at: teleport?.at, x: near(6.5), y: near(2 + RADIUS) },
        { at: teleport?.at, x: near(2.5), y: near(5 + RADIUS) },
        expect.objectContaining({ x: near(8), y: near(CEILING) }),
      ],
      ["ceiling", "wall", "wall"],
    ]);
  });

  it("throws for a teleport made as a brick breaks", () => {
    const traits: TraitRules = {
      ...TRAIT_RULES,
      springs: {
        broken: (hooks) => {
          hooks.teleport(0);
        },
      },
    };

    expect(() => flyAt({ picture: ["........S"], traits })).toThrow(
      "A fuzzball is teleported only once a moment, as its middle crosses into a portal's eye, to its twin.",
    );
  });

  it("throws for a teleport to a cell other than the portal's twin", () => {
    const traits: TraitRules = {
      ...TRAIT_RULES,
      teleports: {
        entered: (hooks, cell) => {
          hooks.teleport(cell);
        },
      },
    };

    expect(() => flyAt({ picture: TWINS, lowestRow: 2, traits })).toThrow(
      "A fuzzball is teleported only once a moment, as its middle crosses into a portal's eye, to its twin.",
    );
  });

  it("throws for a second teleport at one moment", () => {
    const traits: TraitRules = {
      ...TELEPORTS,
      never: TELEPORTS.teleports,
    };

    expect(() => flyAt({ picture: TWINS, lowestRow: 2, traits })).toThrow(
      "A fuzzball is teleported only once a moment, as its middle crosses into a portal's eye, to its twin.",
    );
  });

  // Bored as it crosses into the eye in row 2, it yawns from its twin's.
  it("takes the fuzzball through a portal at the moment it is bored, before it yawns", () => {
    const [teleport] = eventsOf(
      flyAt({ picture: TWINS, lowestRow: 2, traits: TELEPORTS }),
      "teleport",
    );
    const rules = { ...FLIGHT_RULES, bored: teleport?.at ?? 0 };

    const flown = flyAt({
      picture: TWINS,
      lowestRow: 2,
      rules,
      traits: TELEPORTS,
    });

    expect(flown.flight.events.slice(0, 2)).toEqual([
      expect.objectContaining({ kind: "teleport" }),
      expect.objectContaining({
        kind: "bored",
        x: near(2.5),
        y: near(5 + RADIUS),
      }),
    ]);
  });
});

describe("fly's way home", () => {
  /** A wall of two rows by the ceiling, which a shot at the lowest aim never reaches. */
  const HIGH_WALL = ["ooooooooo", "ooooooooo"];

  // At the lowest aim it rattles up between the side walls, seven times,
  // and is bored before it reaches the wall.
  it("yawns where it has flown the bored distance from its release without a strike, and drops straight to the floor", () => {
    const [dx, dy] = headingOf(aimAt(8));
    const flown = flyAt({ picture: HIGH_WALL, lowestRow: 9, degrees: 8 });
    const turns = eventsOf(flown, "turn");
    const [bored] = eventsOf(flown, "bored");

    expect([turns.length, bored, eventsOf(flown, "land")]).toEqual([
      7,
      {
        at: FLIGHT_RULES.bored,
        kind: "bored",
        x: near(
          (turns.at(-1)?.x ?? 0) -
            dx * (FLIGHT_RULES.bored - (turns.at(-1)?.at ?? 0)),
        ),
        y: near(RADIUS + dy * FLIGHT_RULES.bored),
      },
      [
        {
          at: near(FLIGHT_RULES.bored + (bored?.y ?? 0) - RADIUS),
          kind: "land",
          x: bored?.x,
        },
      ],
    ]);
  });

  // Bored 10 units after its strike at about 6.4, the hot shot spends its
  // floor bounce at about 12.7 and is bored on its way up from there.
  it("counts the bored distance from its last strike", () => {
    const rules = { ...FLIGHT_RULES, bored: 10 };

    const flown = flyAt({ picture: ["........o"], hot: true, rules });

    expect(eventsOf(flown, "bored").map(({ at }) => at)).toEqual([
      (flown.flight.lastStrike ?? 0) + 10,
    ]);
  });

  // Its turn off the steel, at about 6.4, starts no count again.
  it("is bored all the same for turning off what takes nothing", () => {
    const rules = { ...FLIGHT_RULES, bored: 10 };

    const flown = flyAt({ picture: ["........#"], rules });

    expect(eventsOf(flown, "bored").map(({ at }) => at)).toEqual([10]);
  });

  // A hot shot holds its floor bounce, yet lands where it drops.
  it("drops home holding a floor bounce, which it never spends", () => {
    const rules = { ...FLIGHT_RULES, bored: 10 };

    const flown = flyAt({ picture: ["........#"], hot: true, rules });

    expect(flown.flight.events.slice(-2).map(({ kind }) => kind)).toEqual([
      "bored",
      "land",
    ]);
  });

  // Bored as it turns off the steel, it turns there first.
  it("plays a moment it meets as it is bored before it yawns", () => {
    const steel = ["........#"];
    const [turn] = eventsOf(flyAt({ picture: steel }), "turn").slice(1);
    const rules = { ...FLIGHT_RULES, bored: turn?.at ?? 0 };

    const flown = flyAt({ picture: steel, rules });

    expect(flown.flight.events.slice(-3)).toEqual([
      expect.objectContaining({ at: turn?.at, kind: "turn", off: "brick" }),
      expect.objectContaining({ at: turn?.at, kind: "bored" }),
      expect.objectContaining({ kind: "land" }),
    ]);
  });

  // A strike at the moment it would be bored starts the count again.
  it("is kept from boredom by a strike at the moment it would yawn", () => {
    const brick = ["........o"];
    const [strike] = eventsOf(flyAt({ picture: brick }), "strike");
    const rules = { ...FLIGHT_RULES, bored: strike?.at ?? 0 };

    const flown = flyAt({ picture: brick, rules });

    expect(
      eventsOf(flown, "bored").filter(({ at }) => at <= (strike?.at ?? 0)),
    ).toEqual([]);
  });

  it("is brought home by its guard where the longest flight comes before boredom", () => {
    const rules = { ...FLIGHT_RULES, longest: 50 };

    const flown = flyAt({
      picture: HIGH_WALL,
      lowestRow: 9,
      degrees: 8,
      rules,
    });

    expect(eventsOf(flown, "guard")).toEqual([
      expect.objectContaining({ at: 50, by: "length" }),
    ]);
  });

  // At 30°, into the joint of the steel brick's floorward flat and the cut
  // across its corner, at (4, 1.75): the flat turns it, and it still flies
  // into the cut, which turns it again with no flight between.
  it("is brought home by its guard after so many turns running with no flight between them", () => {
    const rules = { ...FLIGHT_RULES, stillTurns: 2 };

    const flown = flyAt({
      picture: ["....#...."],
      lowestRow: 2,
      x: xToReach(30, [4, 2 - RADIUS]),
      degrees: 30,
      rules,
    });
    const turns = eventsOf(flown, "turn");

    expect([turns.map(({ at }) => at), flown.flight.events.slice(-2)]).toEqual([
      [turns[0]?.at, near(turns[0]?.at ?? 0)],
      [
        {
          at: turns[1]?.at,
          kind: "guard",
          x: near(4),
          y: near(2 - RADIUS),
          by: "turns",
        },
        expect.objectContaining({ kind: "land", x: near(4) }),
      ],
    ]);
  });

  it("flies on from turns with no flight between them, short of its guard", () => {
    const flown = flyAt({
      picture: ["....#...."],
      lowestRow: 2,
      x: xToReach(30, [4, 2 - RADIUS]),
      degrees: 30,
    });

    expect([eventsOf(flown, "turn").length, eventsOf(flown, "guard")]).toEqual([
      2,
      [],
    ]);
  });
});

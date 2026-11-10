import { keysOf } from "@fz/core/records";
import { brickKind } from "../rules/catalog/bricks";
import type {
  BallTrack,
  BreakCause,
  Flight,
  FlightEvent,
  Waypoint,
  ZapPattern,
} from "../rules/flight/events";
import {
  BORED,
  COLUMNS,
  JUMP_POINTS,
  LAUNCH_GAP,
  SIDE_MARGIN,
  ZAP_DELAY,
  ZAP_HITS,
} from "../rules/tuning";
import type { Wall } from "../rules/wall/wall";
import {
  FLIGHT_FIXTURES,
  type FlightFixture,
  orderProblemsOf,
  trackProblemsOf,
} from "./flight_fixtures";

const NAMES = keysOf(FLIGHT_FIXTURES);

/** An event of a kind. */
type EventOf<K extends FlightEvent["kind"]> = Extract<
  FlightEvent,
  { readonly kind: K }
>;

/** Returns a fixture's events of a kind. */
function eventsOf<K extends FlightEvent["kind"]>(
  fixture: FlightFixture,
  kind: K,
): EventOf<K>[] {
  return fixture.round.flight.events.filter(
    (event): event is EventOf<K> => event.kind === kind,
  );
}

// Events whose order alone matters, each of fuzzball 0 unless it says.
function launch(at: number, ball = 0): EventOf<"launch"> {
  return {
    at,
    kind: "launch",
    ball,
    role: "player",
    x: 4.5,
    y: 0.25,
    dx: 0,
    dy: 1,
    charge: 0,
    hot: false,
  };
}

function turn(at: number, ball = 0): EventOf<"turn"> {
  return {
    at,
    kind: "turn",
    ball,
    x: 4.5,
    y: 4.75,
    dx: 0,
    dy: -1,
    off: "face",
  };
}

function strike(at: number, cell: number, ball = 0): FlightEvent {
  return {
    at,
    kind: "strike",
    ball,
    cell,
    took: 1,
    left: 0,
    charge: 0,
    earthed: false,
  };
}

function broke(
  at: number,
  cell: number,
  by: BreakCause = "fuzzball",
): FlightEvent {
  return { at, kind: "break", cell, brick: "brick", by, streak: 1, points: 10 };
}

function zap(
  at: number,
  cell: number,
  reaches: readonly number[],
  pattern: ZapPattern = "row",
): FlightEvent {
  return { at, kind: "zap", cell, pattern, reaches };
}

function free(at: number, cell: number): FlightEvent {
  return { at, kind: "free", cell, ink: 0 };
}

function land(at: number, ball = 0): EventOf<"land"> {
  return { at, kind: "land", ball, x: 4.5 };
}

/**
 * Returns the cells of the bricks a zap of the warm-up's patterns, a row's
 * or a column's, reaches on a wall: those standing in its pattern under the
 * ceiling, but its own and those that never break.
 */
function reachOf(
  wall: Wall,
  depth: number,
  standing: readonly (number | null)[],
  { cell, pattern }: EventOf<"zap">,
): number[] {
  const row = (at: number): number => Math.floor(at / COLUMNS);
  return standing.flatMap((hits, other) => {
    const brick = wall.bricks[other];
    const inPattern =
      pattern === "row"
        ? row(other) === row(cell)
        : other % COLUMNS === cell % COLUMNS;
    const reached =
      other !== cell &&
      hits !== null &&
      brick != null &&
      brickKind(brick.kind).hits !== "never" &&
      inPattern &&
      wall.lowestRow + row(other) < depth;
    return reached ? [other] : [];
  });
}

/**
 * Returns what a fixture's events do that the bricks of its start's wall
 * don't allow, replaying its strikes, zaps and breaks on them in order.
 */
function replayProblems({ start, round }: FlightFixture): string[] {
  const { wall, depth } = start;
  const standing = wall.bricks.map((brick) => brick?.hits ?? null);
  const problems: string[] = [];
  for (const event of round.flight.events) {
    if (event.kind === "strike") {
      const had = standing[event.cell];
      if (had == null || event.took + event.left !== had) {
        problems.push(`The strike at ${event.at} finds ${had} hits.`);
      }
      standing[event.cell] = event.left;
    } else if (event.kind === "zap") {
      const reaches = reachOf(wall, depth, standing, event);
      if (reaches.join() !== event.reaches.join()) {
        problems.push(`The zap at ${event.at} reaches ${reaches.join()}.`);
      }
      for (const cell of event.reaches) {
        standing[cell] = Math.max(0, (standing[cell] ?? 0) - ZAP_HITS);
      }
    } else if (event.kind === "break") {
      const kind = wall.bricks[event.cell]?.kind;
      if (kind !== event.brick || standing[event.cell] !== 0) {
        problems.push(`The break at ${event.at} finds ${kind}.`);
      }
      standing[event.cell] = null;
    }
  }
  return problems;
}

describe("FLIGHT_FIXTURES", () => {
  it.each(NAMES)("orders %s's events as a flight does", (name) => {
    const { events } = FLIGHT_FIXTURES[name].round.flight;

    expect(orderProblemsOf(events)).toEqual([]);
  });

  it.each(NAMES)("flies %s's fuzzballs as its events say", (name) => {
    expect(trackProblemsOf(FLIGHT_FIXTURES[name].round.flight)).toEqual([]);
  });

  it.each(NAMES)(
    "plays %s's strikes, zaps and breaks on the bricks its wall holds",
    (name) => {
      expect(replayProblems(FLIGHT_FIXTURES[name])).toEqual([]);
    },
  );

  it("finds a fixture's strike on a cell its wall leaves empty", () => {
    const { plain } = FLIGHT_FIXTURES;
    const events = plain.round.flight.events.map((event) =>
      event.kind === "strike" ? { ...event, cell: 4 } : event,
    );
    const flight = { ...plain.round.flight, events };

    expect(
      replayProblems({ ...plain, round: { ...plain.round, flight } }),
    ).toHaveLength(1);
  });

  it.each(NAMES)("leaves %s's fuzzball waiting off the side walls", (name) => {
    const { x } = FLIGHT_FIXTURES[name].round.next;

    expect([x >= SIDE_MARGIN, x <= COLUMNS - SIDE_MARGIN]).toEqual([
      true,
      true,
    ]);
  });

  it("wears a tough brick with a plain shot, and steps the wall", () => {
    const { outcome, next } = FLIGHT_FIXTURES.plain.round;

    expect([outcome, next.wall.bricks[8]?.hits]).toEqual([
      {
        broken: 0,
        points: 0,
        rowsDown: 1,
        jumped: false,
        freed: 0,
        result: "on",
      },
      1,
    ]);
  });

  it("punches through a brick unturned, then turns off a tough one", () => {
    const { events } = FLIGHT_FIXTURES.punch.round.flight;
    const [first] = eventsOf(FLIGHT_FIXTURES.punch, "strike");
    const atFirst = events.filter(({ at }) => at === first?.at);

    expect(atFirst.map(({ kind }) => kind)).toEqual(["strike", "break"]);
  });

  it("punches through three bricks to the ceiling, a charge for each", () => {
    const fixture = FLIGHT_FIXTURES.punchThrough;
    const charges = eventsOf(fixture, "strike").map(({ charge }) => charge);
    const offs = eventsOf(fixture, "turn").map(({ off }) => off);

    expect([charges, offs]).toEqual([
      [4, 3, 2],
      ["side", "ceiling", "side"],
    ]);
  });

  it("lands a zap half a unit after the break that set it off", () => {
    const [zapper] = eventsOf(FLIGHT_FIXTURES.zap, "break");
    const [landed] = eventsOf(FLIGHT_FIXTURES.zap, "zap");

    expect(Number(landed?.at) - Number(zapper?.at)).toBeCloseTo(ZAP_DELAY, 12);
  });

  it("jumps the wall once the zap leaves nothing under the jump line", () => {
    const { outcome, next } = FLIGHT_FIXTURES.zap.round;

    expect([outcome, next.boon]).toEqual([
      {
        broken: 4,
        points: 30 + 10 + 20 + 10 + JUMP_POINTS,
        rowsDown: 3,
        jumped: true,
        freed: 0,
        result: "on",
      },
      "hot",
    ]);
  });

  it("zaps a column as far as the ceiling", () => {
    const { bricks } = FLIGHT_FIXTURES.columnZap.round.next.wall;

    expect([bricks[53]?.hits, bricks[62]?.hits]).toEqual([1, 1]);
  });

  it("bounces a hot shot off the floor once, its charge whole", () => {
    const fixture = FLIGHT_FIXTURES.hotShot;
    const offs = eventsOf(fixture, "turn").map(({ off }) => off);
    const strikes = eventsOf(fixture, "strike").map(
      ({ charge, earthed }) => [charge, earthed] as const,
    );

    expect([offs, strikes]).toEqual([
      ["side", "face", "floor", "face"],
      [
        [5, false],
        [5, false],
        [5, false],
      ],
    ]);
  });

  it("sinks the steel the hot shot's step brings to the floor", () => {
    expect(FLIGHT_FIXTURES.hotShot.round.next.wall.bricks[1]).toBeNull();
  });

  it("sends a triple shot's mates out behind the player's fuzzball", () => {
    const launches = eventsOf(FLIGHT_FIXTURES.triple, "launch");

    expect(launches.map(({ at, role }) => [at, role])).toEqual([
      [0, "player"],
      [LAUNCH_GAP, "mate"],
      [2 * LAUNCH_GAP, "mate"],
    ]);
  });

  it("sends a friend out behind, plain, in its ink", () => {
    const fixture = FLIGHT_FIXTURES.friend;
    const [, behind] = eventsOf(fixture, "launch");

    expect([behind?.at, behind?.role, behind?.charge]).toEqual([
      LAUNCH_GAP,
      "friend",
      0,
    ]);
    expect(fixture.start.crew.friends).toEqual([2]);
  });

  it("yawns at the bored distance, and drops straight to the floor", () => {
    const [yawn] = eventsOf(FLIGHT_FIXTURES.bored, "yawn");
    const [landed] = eventsOf(FLIGHT_FIXTURES.bored, "land");

    expect(Math.abs(Number(yawn?.at) - BORED)).toBeLessThan(1e-9);
    expect(landed?.x).toBe(yawn?.x);
  });

  it("takes no hit off steel with a bored fuzzball's strike", () => {
    const [onSteel] = eventsOf(FLIGHT_FIXTURES.bored, "strike");

    expect([onSteel?.took, onSteel?.earthed]).toEqual([0, false]);
  });

  it.each([
    ["cleared", "cleared", 0],
    ["lost", "lost", 1],
  ] as const)("ends the level in %s as %s", (name, result, rowsDown) => {
    const { outcome, next } = FLIGHT_FIXTURES[name].round;

    expect([outcome.result, outcome.rowsDown, next.boon]).toEqual([
      result,
      rowsDown,
      null,
    ]);
  });
});

describe("orderProblemsOf()", () => {
  it("finds nothing wrong with a flight in order", () => {
    const events = [
      launch(0),
      turn(1),
      strike(1, 5),
      broke(1, 5),
      free(1, 5),
      strike(1, 8),
      broke(1, 8),
      launch(1, 1),
      zap(1.5, 8, [0, 3]),
      broke(1.5, 0, "zap"),
      broke(1.5, 3, "zap"),
      zap(1.5, 9, [4], "blast"),
      broke(1.5, 4, "blast"),
      land(2, 1),
      land(3),
    ];

    expect(orderProblemsOf(events)).toEqual([]);
  });

  it("finds an event before the moment of the one before it", () => {
    expect(orderProblemsOf([launch(1), land(0)])).toEqual([
      "Event 1, a land at 0, comes before the moment of the one before it.",
    ]);
  });

  it("finds an event at no moment", () => {
    expect(orderProblemsOf([launch(0), turn(Number.NaN), land(3)])).toContain(
      "Event 1, a turn at NaN, comes before the moment of the one before it.",
    );
  });

  it("finds a break with no cause at its moment", () => {
    expect(orderProblemsOf([launch(0), broke(1, 8), land(2)])).toEqual([
      "Event 1, a break at 1, follows no strike or zap at its moment.",
    ]);
  });

  it("finds a break whose strike came at another moment", () => {
    expect(
      orderProblemsOf([launch(0), strike(1, 8), broke(2, 8), land(3)]),
    ).toEqual([
      "Event 2, a break at 2, follows no strike or zap at its moment.",
    ]);
  });

  it("finds a break after another event of the fuzzball than its strike", () => {
    expect(
      orderProblemsOf([launch(0), strike(1, 8), turn(1), broke(1, 8), land(2)]),
    ).toContain(
      "Event 3, a break at 1, follows no strike or zap at its moment.",
    );
  });

  it("finds a break of a cell its strike didn't strike", () => {
    expect(
      orderProblemsOf([launch(0), strike(1, 8), broke(1, 9), land(2)]),
    ).toEqual([
      "Event 2, a break at 1, is of a cell its strike doesn't reach.",
    ]);
  });

  it("finds a break of a cell its zap doesn't reach", () => {
    expect(
      orderProblemsOf([
        launch(0),
        land(1),
        zap(1.5, 8, [0]),
        broke(1.5, 3, "zap"),
      ]),
    ).toEqual(["Event 3, a break at 1.5, is of a cell its zap doesn't reach."]);
  });

  it.each<[string, FlightEvent, BreakCause, string]>([
    ["a strike's", strike(1, 0), "zap", "is by zap, not fuzzball."],
    ["a zap's", zap(1, 9, [0]), "fuzzball", "is by fuzzball, not zap."],
    ["a blast's", zap(1, 9, [0], "blast"), "zap", "is by zap, not blast."],
  ])("finds %s break by another cause", (_, cause, by, problem) => {
    const events = [launch(0), cause, broke(1, 0, by), land(2)];

    expect(orderProblemsOf(events)).toEqual([
      `Event 2, a break at 1, ${problem}`,
    ]);
  });

  it.each([
    ["out of order", [3, 0]],
    ["twice", [3, 3]],
  ])("finds a zap's breaks by cell %s", (_, cells) => {
    const [first = 0, second = 0] = cells;
    const events = [
      launch(0),
      land(1),
      zap(1.5, 8, [0, 3]),
      broke(1.5, first, "zap"),
      broke(1.5, second, "zap"),
    ];

    expect(orderProblemsOf(events)).toEqual([
      "Event 4, a break at 1.5, is out of order by cell after its cause.",
    ]);
  });

  it("finds a free before its cage's break", () => {
    expect(
      orderProblemsOf([launch(0), strike(1, 5), free(1, 5), land(2)]),
    ).toEqual(["Event 2, a free at 1, follows no break of its cage."]);
  });

  it("finds a free after the break of another cell", () => {
    const events = [
      launch(0),
      land(1),
      zap(1.5, 8, [3, 5]),
      broke(1.5, 3, "zap"),
      free(1.5, 5),
    ];

    expect(orderProblemsOf(events)).toEqual([
      "Event 4, a free at 1.5, follows no break of its cage.",
    ]);
  });

  it("finds a free twice after its cage's break", () => {
    const events = [
      launch(0),
      strike(1, 5),
      broke(1, 5),
      free(1, 5),
      free(1, 5),
      land(2),
    ];

    expect(orderProblemsOf(events)).toEqual([
      "Event 4, a free at 1, is out of order by cell after its cause.",
      "Event 4, a free at 1, follows no break of its cage.",
    ]);
  });

  it.each([
    ["out of order", 4],
    ["twice", 8],
  ])("finds zaps at a moment by cell %s", (_, cell) => {
    const events = [launch(0), land(1), zap(1.5, 8, []), zap(1.5, cell, [])];

    expect(orderProblemsOf(events)).toEqual([
      "Event 3, a zap at 1.5, lands out of order by cell.",
    ]);
  });

  it("takes zaps at another moment as they come", () => {
    const events = [launch(0), land(1), zap(1.5, 8, []), zap(2, 4, [])];

    expect(orderProblemsOf(events)).toEqual([]);
  });

  it.each([
    ["out of order", [3, 0]],
    ["twice", [3, 3]],
  ])("finds the cells a zap reaches listed %s", (_, reaches) => {
    expect(orderProblemsOf([launch(0), land(1), zap(1.5, 8, reaches)])).toEqual(
      ["Event 2, a zap at 1.5, lists the cells it reaches out of order."],
    );
  });

  it("finds a fuzzball's event after a zap at its moment", () => {
    expect(orderProblemsOf([launch(0), zap(1, 8, []), land(1)])).toEqual([
      "Event 2, a land at 1, comes after a zap at its moment.",
    ]);
  });

  it("takes a fuzzball's event at a moment after a zap's", () => {
    expect(orderProblemsOf([launch(0), zap(1, 8, []), land(2)])).toEqual([]);
  });

  it("finds a fuzzball's event before the event of one before it", () => {
    const events = [launch(0), launch(0.7, 1), land(2, 1), land(2)];

    expect(orderProblemsOf(events)).toEqual([
      "Event 3, a land at 2, is out of order by fuzzball and kind.",
    ]);
  });

  it("takes fuzzballs in any order at different moments", () => {
    const events = [launch(0), launch(0.7, 1), land(2, 1), land(3)];

    expect(orderProblemsOf(events)).toEqual([]);
  });

  it("finds a fuzzball's events at a moment out of their kinds' order", () => {
    expect(
      orderProblemsOf([launch(0), strike(1, 8), turn(1), land(2)]),
    ).toEqual(["Event 2, a turn at 1, is out of order by fuzzball and kind."]);
  });

  it("takes a fuzzball's events at a moment in all their kinds' order", () => {
    const events: FlightEvent[] = [
      launch(0),
      turn(0),
      strike(0, 8),
      { at: 0, kind: "recharge", ball: 0, cell: 8 },
      { at: 0, kind: "portal", ball: 0, from: 9, to: 10 },
      { at: 0, kind: "split", ball: 0, cell: 11, into: [1, 2] },
      { at: 0, kind: "yawn", ball: 0, x: 4.5, y: 0.25 },
      land(0),
    ];

    expect(orderProblemsOf(events)).toEqual([]);
  });

  it("takes a strike's break after the break of a higher cell's strike", () => {
    const events = [
      launch(0),
      strike(1, 8),
      broke(1, 8),
      strike(1, 3),
      broke(1, 3),
      land(2),
    ];

    expect(orderProblemsOf(events)).toEqual([]);
  });

  it("takes a fuzzball's turns at a moment, then their strikes", () => {
    const events = [
      launch(0),
      turn(1),
      turn(1),
      strike(1, 8),
      strike(1, 9),
      land(2),
    ];

    expect(orderProblemsOf(events)).toEqual([]);
  });

  it("takes a fuzzball's strikes of two bricks at a moment", () => {
    expect(
      orderProblemsOf([launch(0), strike(1, 8), strike(1, 9), land(2)]),
    ).toEqual([]);
  });

  it("finds a fuzzball launched twice", () => {
    expect(orderProblemsOf([launch(0), launch(1), land(2)])).toEqual([
      "Event 1, a launch at 1, launches fuzzball 0 again.",
    ]);
  });

  it("finds an event of a fuzzball that hasn't left", () => {
    expect(orderProblemsOf([turn(0), launch(1), land(2)])).toEqual([
      "Event 0, a turn at 0, is of fuzzball 0, which hasn't left.",
    ]);
  });

  it("finds an event of a fuzzball that has landed", () => {
    expect(orderProblemsOf([launch(0), land(1), turn(2)])).toEqual([
      "Event 2, a turn at 2, is of fuzzball 0, which has landed.",
    ]);
  });

  it("finds a fuzzball that never lands", () => {
    expect(orderProblemsOf([launch(0), turn(1)])).toEqual([
      "Fuzzball 0 never lands.",
    ]);
  });
});

/** Returns a waypoint. */
function waypoint(at: number, x: number, y: number): Waypoint {
  return { at, x, y };
}

// A fuzzball that flies straight up to the ceiling and back down.
const STRAIGHT_UP: readonly Waypoint[] = [
  waypoint(0, 4.5, 0.25),
  waypoint(10.5, 4.5, 10.75),
  waypoint(21, 4.5, 0.25),
];

const OFF_THE_CEILING: EventOf<"turn"> = {
  at: 10.5,
  kind: "turn",
  ball: 0,
  x: 4.5,
  y: 10.75,
  dx: 0,
  dy: -1,
  off: "ceiling",
};

const UP_AND_DOWN: readonly FlightEvent[] = [
  launch(0),
  OFF_THE_CEILING,
  land(21),
];

/** Returns the flight of one fuzzball, straight up and down unless given other events or waypoints. */
function flightOf({
  events = UP_AND_DOWN,
  waypoints = STRAIGHT_UP,
  tracks = [{ ball: 0, role: "player", waypoints }],
  length = 21,
  capped = 0,
}: {
  events?: readonly FlightEvent[];
  waypoints?: readonly Waypoint[];
  tracks?: readonly BallTrack[];
  length?: number;
  capped?: number;
}): Flight {
  return { events, tracks, length, capped };
}

/** Returns the up-and-down flight's events with one replaced. */
function replacing(index: number, event: FlightEvent): FlightEvent[] {
  return UP_AND_DOWN.map((each, i) => (i === index ? event : each));
}

// A fuzzball that flies up into a portal and out of its twin, two across
// and two up, then on to the ceiling and back down.
const THROUGH_A_PORTAL: readonly FlightEvent[] = [
  launch(0),
  { at: 3, kind: "portal", ball: 0, from: 30, to: 40 },
  {
    at: 8.5,
    kind: "turn",
    ball: 0,
    x: 6.5,
    y: 10.75,
    dx: 0,
    dy: -1,
    off: "ceiling",
  },
  { at: 19, kind: "land", ball: 0, x: 6.5 },
];

const PORTAL_WAYPOINTS: readonly Waypoint[] = [
  waypoint(0, 4.5, 0.25),
  waypoint(3, 4.5, 3.25),
  waypoint(3, 6.5, 5.25),
  waypoint(8.5, 6.5, 10.75),
  waypoint(19, 6.5, 0.25),
];

describe("trackProblemsOf()", () => {
  it("finds nothing wrong with a fuzzball flown as its events say", () => {
    expect(trackProblemsOf(flightOf({}))).toEqual([]);
  });

  it("finds nothing wrong with a flight of no fuzzballs", () => {
    expect(
      trackProblemsOf(flightOf({ events: [], tracks: [], length: 0 })),
    ).toEqual([]);
  });

  it("takes two places at a moment through a portal", () => {
    const flight = flightOf({
      events: THROUGH_A_PORTAL,
      waypoints: PORTAL_WAYPOINTS,
      length: 19,
    });

    expect(trackProblemsOf(flight)).toEqual([]);
  });

  it("takes a turn as a fuzzball comes out of a portal, where it comes out", () => {
    const flight = flightOf({
      events: [
        launch(0),
        { ...OFF_THE_CEILING, at: 3, x: 6.5 },
        { at: 3, kind: "portal", ball: 0, from: 30, to: 40 },
        { ...land(13.5), x: 6.5 },
      ],
      waypoints: [
        waypoint(0, 4.5, 0.25),
        waypoint(3, 4.5, 3.25),
        waypoint(3, 6.5, 10.75),
        waypoint(13.5, 6.5, 0.25),
      ],
      length: 13.5,
    });

    expect(trackProblemsOf(flight)).toEqual([]);
  });

  it("finds two places at a moment with no portal", () => {
    const flight = flightOf({
      events: THROUGH_A_PORTAL.filter(({ kind }) => kind !== "portal"),
      waypoints: PORTAL_WAYPOINTS,
      length: 19,
    });

    expect(trackProblemsOf(flight)).toEqual([
      "Fuzzball 0's place at 3 is no event's.",
      "Fuzzball 0's leg to 3 isn't flown at a unit a unit.",
      "Fuzzball 0's place at 3 is no event's.",
    ]);
  });

  it("finds a leg flown at another speed", () => {
    const flight = flightOf({
      events: replacing(2, land(22)),
      waypoints: [...STRAIGHT_UP.slice(0, 2), waypoint(22, 4.5, 0.25)],
      length: 22,
    });

    expect(trackProblemsOf(flight)).toEqual([
      "Fuzzball 0's leg to 22 isn't flown at a unit a unit.",
    ]);
  });

  it("takes a fuzzball that turns again where it stands, heading along its last turn", () => {
    const corner: FlightEvent = {
      ...OFF_THE_CEILING,
      dx: 0.28,
      dy: -0.96,
      off: "corner",
    };
    const flight = flightOf({
      events: [
        launch(0),
        OFF_THE_CEILING,
        corner,
        { ...land(21.4375), x: 7.5625 },
      ],
      waypoints: [
        waypoint(0, 4.5, 0.25),
        waypoint(10.5, 4.5, 10.75),
        waypoint(21.4375, 7.5625, 0.25),
      ],
      length: 21.4375,
    });

    expect(trackProblemsOf(flight)).toEqual([]);
  });

  it("finds a turn heading another way before a strike at its moment", () => {
    const flight = flightOf({
      events: [
        launch(0),
        { ...OFF_THE_CEILING, dx: 0.6, dy: -0.8 },
        strike(10.5, 8),
        land(21),
      ],
    });

    expect(trackProblemsOf(flight)).toEqual([
      "Event 1, a turn at 10.5, heads another way than its track's next leg.",
    ]);
  });

  it("finds a turn heading another way as another fuzzball turns at its moment", () => {
    const flight = flightOf({
      events: [
        launch(0),
        { ...launch(0, 1), x: 6.5 },
        { ...OFF_THE_CEILING, dx: 0.6, dy: -0.8 },
        { ...OFF_THE_CEILING, ball: 1, x: 6.5 },
        land(21),
        { ...land(21, 1), x: 6.5 },
      ],
      tracks: [
        { ball: 0, role: "player", waypoints: STRAIGHT_UP },
        {
          ball: 1,
          role: "player",
          waypoints: STRAIGHT_UP.map((place) => ({ ...place, x: 6.5 })),
        },
      ],
    });

    expect(trackProblemsOf(flight)).toEqual([
      "Event 2, a turn at 10.5, heads another way than its track's next leg.",
    ]);
  });

  // The checker knows no field, so a long climb stands in for a long flight,
  // at whose moments a leg of a millionth of a unit rounds.
  it("takes a short leg late in a flight", () => {
    const top = 100.25;
    const turned = top - 1e-6;
    const d = (turned - 0.25) / 0.96;
    const places: (readonly [number, number])[] = [
      [4.5, 0.25],
      [4.5, top],
      [4.5, turned],
      [4.5 + 0.28 * d, 0.25],
    ];
    let flown = 0;
    const waypoints = places.map(([x, y], index) => {
      const [fromX, fromY] = places[index - 1] ?? [x, y];
      flown += Math.hypot(x - fromX, y - fromY);
      return waypoint(flown, x, y);
    });
    const [, high, low, end] = waypoints;
    const flight = flightOf({
      events: [
        launch(0),
        { ...OFF_THE_CEILING, at: Number(high?.at), y: top },
        {
          ...OFF_THE_CEILING,
          at: Number(low?.at),
          y: turned,
          dx: 0.28,
          dy: -0.96,
          off: "corner",
        },
        { ...land(Number(end?.at)), x: Number(end?.x) },
      ],
      waypoints,
      length: Number(end?.at),
    });

    expect(trackProblemsOf(flight)).toEqual([]);
  });

  it("finds a place on a track no event explains", () => {
    const waypoints = [
      waypoint(0, 4.5, 0.25),
      waypoint(5, 4.5, 5.25),
      waypoint(10.5, 4.5, 10.75),
      waypoint(21, 4.5, 0.25),
    ];

    expect(trackProblemsOf(flightOf({ waypoints }))).toEqual([
      "Fuzzball 0's place at 5 is no event's.",
    ]);
  });

  it("finds tracks out of order", () => {
    const flight = flightOf({
      tracks: [{ ball: 1, role: "player", waypoints: STRAIGHT_UP }],
    });

    // Fuzzball 1's track, with none of its events, explains none of its places.
    expect(trackProblemsOf(flight)).toEqual([
      "Track 0 is fuzzball 1's.",
      "Fuzzball 1's place at 10.5 is no event's.",
      "Fuzzball 1's place at 21 is no event's.",
    ]);
  });

  it("finds an event of a fuzzball with no track", () => {
    const flight = flightOf({ events: [...UP_AND_DOWN, turn(10.5, 1)] });

    expect(trackProblemsOf(flight)).toEqual([
      "Event 3, a turn at 10.5, is of fuzzball 1, which has no track.",
    ]);
  });

  it("finds a track for a fuzzball never launched", () => {
    const flight = flightOf({
      tracks: [
        { ball: 0, role: "player", waypoints: STRAIGHT_UP },
        { ball: 1, role: "mate", waypoints: [waypoint(0.7, 4.5, 0.25)] },
      ],
    });

    expect(trackProblemsOf(flight)).toEqual([
      "The flight tracks 2 fuzzballs and launches 1.",
    ]);
  });

  it("finds a launch of a fuzzball in another role than its track's", () => {
    const flight = flightOf({
      tracks: [{ ball: 0, role: "mate", waypoints: STRAIGHT_UP }],
    });

    expect(trackProblemsOf(flight)).toEqual([
      "Event 0, a launch at 0, isn't where a player's track starts.",
    ]);
  });

  it("finds a launch elsewhere than its track's start", () => {
    const flight = flightOf({ events: [...UP_AND_DOWN, launch(21)] });

    expect(trackProblemsOf(flight)).toEqual([
      "The flight tracks 1 fuzzballs and launches 2.",
      "Event 3, a launch at 21, isn't where a player's track starts.",
    ]);
  });

  it("finds a launch from another place than its track's", () => {
    const flight = flightOf({
      events: replacing(0, { ...launch(0), x: 4 }),
    });

    expect(trackProblemsOf(flight)).toEqual([
      "Event 0, a launch at 0, is at (4, 0.25), not its waypoint's place.",
    ]);
  });

  it.each<[string, Partial<EventOf<"launch">>]>([
    ["across", { dx: 0.1 }],
    ["up", { dy: 0.9 }],
    ["aslant", { dx: 0.6, dy: 0.8 }],
    ["back", { dy: -1 }],
  ])("finds a launch heading another way %s", (_, heading) => {
    const flight = flightOf({
      events: replacing(0, { ...launch(0), ...heading }),
    });

    expect(trackProblemsOf(flight)).toEqual([
      "Event 0, a launch at 0, heads another way than its track's next leg.",
    ]);
  });

  it.each<[string, Partial<EventOf<"turn">>, string]>([
    ["across", { x: 4 }, "is at (4, 10.75), not its waypoint's place."],
    ["up", { y: 10.5 }, "is at (4.5, 10.5), not its waypoint's place."],
    [
      "heading across",
      { dx: 0.1 },
      "heads another way than its track's next leg.",
    ],
    [
      "heading up",
      { dy: -0.9 },
      "heads another way than its track's next leg.",
    ],
  ])("finds a turn off its place %s", (_, change, problem) => {
    const flight = flightOf({
      events: replacing(1, { ...OFF_THE_CEILING, ...change }),
    });

    expect(trackProblemsOf(flight)).toEqual([
      `Event 1, a turn at 10.5, ${problem}`,
    ]);
  });

  it("finds a yawn at no waypoint", () => {
    const yawn: FlightEvent = { at: 5, kind: "yawn", ball: 0, x: 4.5, y: 5.25 };
    const flight = flightOf({ events: [...UP_AND_DOWN, yawn] });

    expect(trackProblemsOf(flight)).toEqual([
      "Event 3, a yawn at 5, is at no waypoint of its fuzzball's.",
    ]);
  });

  it("finds a landing before its track ends", () => {
    const flight = flightOf({
      waypoints: [...STRAIGHT_UP, waypoint(22, 4.5, 1.25)],
    });

    expect(trackProblemsOf(flight)).toEqual([
      "Fuzzball 0's place at 22 is no event's.",
      "Event 2, a land at 21, isn't where its track ends.",
    ]);
  });

  it("finds a landing off the floor", () => {
    const flight = flightOf({
      events: replacing(2, land(20)),
      waypoints: [...STRAIGHT_UP.slice(0, 2), waypoint(20, 4.5, 1.25)],
      length: 20,
    });

    expect(trackProblemsOf(flight)).toEqual([
      "Event 2, a land at 20, is at (4.5, 0.25), not its waypoint's place.",
    ]);
  });

  it("finds a landing elsewhere than its track's end", () => {
    const flight = flightOf({ events: replacing(2, { ...land(21), x: 4 }) });

    expect(trackProblemsOf(flight)).toEqual([
      "Event 2, a land at 21, is at (4, 0.25), not its waypoint's place.",
    ]);
  });

  it("finds a flight longer than its last landing", () => {
    expect(trackProblemsOf(flightOf({ length: 22 }))).toEqual([
      "The flight is 22 long, not as long as its last landing.",
    ]);
  });

  it.each([-1, 0.5])("finds %s fuzzballs brought home early", (capped) => {
    expect(trackProblemsOf(flightOf({ capped }))).toEqual([
      `The flight brings ${capped} fuzzballs home early.`,
    ]);
  });
});

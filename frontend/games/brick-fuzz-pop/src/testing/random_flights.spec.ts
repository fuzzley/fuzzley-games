import { AIMS_PER_DEGREE, FIRST_AIM_DEGREES } from "@fz/brick-wall/rules/aims";
import { RADIUS } from "@fz/brick-wall/rules/field";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import type { Waypoint } from "@fz/brick-wall/rules/track";
import type { Flight, FlightEvent } from "../rules/flight/events";
import { type FlightStart, type Flown, fly } from "../rules/flight/flight";
import { WALL_LEGEND } from "../rules/levels/legend";
import { RULES, flightRulesOf } from "../rules/round/round";
import type { Brick } from "../rules/wall/wall";
import { eventsOf } from "./flights";
import { clearanceProblemsOf, dropProblemsOf } from "./random_flights";
import { STAND_INS } from "./stand_ins";

/** Returns a flight of one fuzzball along a track, with events. */
function flightAlong(
  waypoints: readonly Waypoint[],
  events: readonly FlightEvent[] = [],
): Flight {
  return {
    events,
    tracks: [{ ball: 0, role: "player", waypoints }],
    length: waypoints.at(-1)?.at ?? 0,
    capped: 0,
  };
}

/** Returns the problems of a flight past a wall drawn as a picture, its lowest row in field row 5 of a field 11 deep. */
function problemsPast(picture: readonly string[], flight: Flight): string[] {
  const wall = wallFrom(picture, WALL_LEGEND, { lowestRow: 5 });
  return clearanceProblemsOf(flight, wall, 11, STAND_INS);
}

describe("clearanceProblemsOf", () => {
  it("finds no problem with a flight that keeps clear", () => {
    const flight = flightAlong([
      { at: 0, x: 4.5, y: RADIUS },
      { at: 4.5, x: 4.5, y: 5 - RADIUS },
    ]);

    expect(problemsPast(["....o...."], flight)).toEqual([]);
  });

  it("finds a leg that flies through a brick", () => {
    const flight = flightAlong([
      { at: 0, x: 4.5, y: RADIUS },
      { at: 10.5, x: 4.5, y: 10.75 },
    ]);

    expect(problemsPast(["....o...."], flight)).toEqual([
      `Fuzzball 0's leg to 10.5 comes ${String(RADIUS)} too near a brick.`,
    ]);
  });

  it("finds a leg that flies past a brick nearer than the radius", () => {
    const flight = flightAlong([
      { at: 0, x: 3.9, y: RADIUS },
      { at: 10.5, x: 3.9, y: 10.75 },
    ]);

    expect(problemsPast(["....o...."], flight)).toHaveLength(1);
  });

  it("finds a leg that flies within a bumper's reach", () => {
    const flight = flightAlong([
      { at: 0, x: 4.5, y: RADIUS },
      { at: 5, x: 4.5, y: 5 + RADIUS },
    ]);

    expect(problemsPast(["....-...."], flight)).toHaveLength(1);
  });

  it.each(["yawn", "drop"] as const)(
    "leaves out a fuzzball's way home after a %s, and a jump through a portal",
    (kind) => {
      const flight = flightAlong(
        [
          { at: 0, x: 4.5, y: 2 },
          { at: 0, x: 4.5, y: 9 },
          { at: 1, x: 4.5, y: 8 },
          { at: 8.75, x: 4.5, y: RADIUS },
        ],
        [{ at: 1, kind, ball: 0, x: 4.5, y: 8 }],
      );

      expect(problemsPast(["....o...."], flight)).toEqual([]);
    },
  );
});

// Straight up at a brick of six hits, the player's fuzzball and two
// friends behind it, leaving at 0.7 and 1.4, each taking a hit off it; and
// dropped at 1, before any does, the first two in the air and the last
// never leaving.
const TOUGH_START: FlightStart = {
  wall: wallFrom(["....6...."], WALL_LEGEND, { lowestRow: 3 }),
  depth: 11,
  x: 4.5,
  aim: (90 - FIRST_AIM_DEGREES) * AIMS_PER_DEGREE,
  charge: 0,
  hot: false,
  mates: 0,
  friends: 2,
};

const WHOLE = fly(TOUGH_START, flightRulesOf(RULES));

const DROPPED = fly(TOUGH_START, flightRulesOf(RULES), {
  stop: "drop",
  at: 1,
});

// Bored at 0.5, the player's fuzzball yawns there and lands at 1; dropped
// at 0.75, it goes on home, and the friend that left at 0.7 drops.
const BORED_RULES = flightRulesOf({ bored: 0.5 });

const BORED_WHOLE = fly(TOUGH_START, BORED_RULES);

const BORED_DROPPED = fly(TOUGH_START, BORED_RULES, {
  stop: "drop",
  at: 0.75,
});

// Straight up, the player's fuzzball breaks the row zapper at 2.5, whose
// zap lands at 3 and breaks the column zapper beside it, whose zap lands at
// 3.5; dropped at 2.75, both zaps land, at 3 the second, and at 2 neither
// is set off.
const ZAPPERS_START: FlightStart = {
  ...TOUGH_START,
  wall: wallFrom(["...|-...."], WALL_LEGEND, { lowestRow: 3 }),
  friends: 0,
};

const ZAPPERS_WHOLE = fly(ZAPPERS_START, flightRulesOf(RULES));

/** Returns the zappers' flight dropped at a moment. */
function zappersDroppedAt(at: number): Flown {
  return fly(ZAPPERS_START, flightRulesOf(RULES), { stop: "drop", at });
}

const ZAPPERS_DROPPED = zappersDroppedAt(2.75);

/** Returns a dropped flight, the one dropped at 1 unless given, with its events changed as given. */
function droppedWith(
  change: (events: readonly FlightEvent[]) => readonly FlightEvent[],
  flown: Flown = DROPPED,
): Flown {
  const events = change(flown.flight.events);
  return { ...flown, flight: { ...flown.flight, events } };
}

/** Returns a dropped flight with the brick in a cell of its wall replaced. */
function withBrick(flown: Flown, cell: number, brick: Brick | null): Flown {
  const bricks = flown.wall.bricks.map((was, index) =>
    index === cell ? brick : was,
  );
  return { ...flown, wall: { ...flown.wall, bricks } };
}

/** Returns what a fixture holds, throwing if it holds nothing there. */
function found<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new RangeError("The fixture holds nothing there.");
  }
  return value;
}

/** Returns the index of the dropped flight's first drop. */
function firstDrop(): number {
  return DROPPED.flight.events.findIndex(({ kind }) => kind === "drop");
}

/** Returns the index of the player's fuzzball's landing in the flight dropped at 1. */
function playerLanding(): number {
  return DROPPED.flight.events.findIndex(
    (event) => event.kind === "land" && event.ball === 0,
  );
}

describe("dropProblemsOf", () => {
  it.each([
    ["fuzzballs in the air and one never leaving", WHOLE, DROPPED, 1],
    ["a fuzzball on its way home", BORED_WHOLE, BORED_DROPPED, 0.75],
    ["zaps set off before it and after", ZAPPERS_WHOLE, ZAPPERS_DROPPED, 2.75],
    ["no zap set off by then", ZAPPERS_WHOLE, zappersDroppedAt(2), 2],
    ["a zap landing at its moment", ZAPPERS_WHOLE, zappersDroppedAt(3), 3],
  ])(
    "finds no problem with a flight dropped as fly() drops it, with %s",
    (_, whole, dropped, at) => {
      expect(dropProblemsOf(whole, dropped, at)).toEqual([]);
    },
  );

  it("finds no problem with the whole flight dropped at its end", () => {
    expect(dropProblemsOf(WHOLE, WHOLE, WHOLE.flight.length)).toEqual([]);
  });

  it("finds an event up to the drop's moment that isn't the whole flight's", () => {
    const dropped = droppedWith((events) =>
      events.map((event, index) =>
        index === 1 ? { ...event, at: 0.75 } : event,
      ),
    );

    expect(dropProblemsOf(WHOLE, dropped, 1)).toEqual([
      "The whole flight's event 1, a launch at 0.7, isn't the dropped flight's.",
    ]);
  });

  it("finds a fuzzball in the air at the drop's moment that doesn't drop, nor lands straight down", () => {
    const dropped = droppedWith((events) =>
      events.filter((event) => event.kind !== "drop" || event.ball !== 1),
    );

    expect(dropProblemsOf(WHOLE, dropped, 1)).toEqual([
      "The dropped flight's event 3, a land at 1.3, isn't where and when its fuzzball comes down.",
      "Fuzzballs [0] drop, where [0,1] were in the air at 1.",
    ]);
  });

  it.each([
    ["across", { x: 0.1, y: 0 }],
    ["above", { x: 0, y: 0.1 }],
  ])(
    "finds a drop elsewhere than its fuzzball was at the drop's moment, %s, and its landing not below it",
    (_, by) => {
      const dropped = droppedWith((events) =>
        events.map((event) =>
          event.kind === "drop" && event.ball === 0
            ? { ...event, x: event.x + by.x, y: event.y + by.y }
            : event,
        ),
      );

      expect(dropProblemsOf(WHOLE, dropped, 1)).toEqual([
        `The dropped flight's event ${firstDrop()}, a drop at 1, isn't where its fuzzball was at 1.`,
        `The dropped flight's event ${playerLanding()}, a land at 2, isn't where and when its fuzzball comes down.`,
      ]);
    },
  );

  it("finds a drop at another moment than the drop's, and its landing not straight down from it", () => {
    const dropped = droppedWith((events) =>
      events.map((event) =>
        event.kind === "drop" && event.ball === 0
          ? { ...event, at: 1.5 }
          : event,
      ),
    );

    expect(dropProblemsOf(WHOLE, dropped, 1)).toEqual([
      `The dropped flight's event ${firstDrop()}, a drop at 1.5, isn't where its fuzzball was at 1.`,
      `The dropped flight's event ${playerLanding()}, a land at 2, isn't where and when its fuzzball comes down.`,
    ]);
  });

  it("finds a drop of a fuzzball the whole flight never had", () => {
    const dropped = droppedWith((events) =>
      events.map((event) =>
        event.kind === "drop" && event.ball === 1
          ? { ...event, ball: 9 }
          : event,
      ),
    );

    expect(dropProblemsOf(WHOLE, dropped, 1)).toEqual([
      `The dropped flight's event ${firstDrop() + 1}, a drop at 1, isn't where its fuzzball was at 1.`,
      "The dropped flight's event 4, a land at 1.3, isn't where and when its fuzzball comes down.",
      "Fuzzballs [0,9] drop, where [0,1] were in the air at 1.",
    ]);
  });

  it.each([
    ["across", { at: 0, x: 0.1 }, 2],
    ["later", { at: 0.5, x: 0 }, 2.5],
  ])(
    "finds a dropped fuzzball landing elsewhere than straight below its drop, %s",
    (_, by, landsAt) => {
      const dropped = droppedWith((events) =>
        events.map((event) =>
          event.kind === "land" && event.ball === 0
            ? { ...event, at: event.at + by.at, x: event.x + by.x }
            : event,
        ),
      );

      expect(dropProblemsOf(WHOLE, dropped, 1)).toEqual([
        `The dropped flight's event ${playerLanding()}, a land at ${landsAt}, isn't where and when its fuzzball comes down.`,
      ]);
    },
  );

  it.each([
    ["that never left", WHOLE, DROPPED, 1, 2],
    [
      "that yawned and landed by then",
      BORED_WHOLE,
      BORED_WHOLE,
      BORED_WHOLE.flight.length,
      0,
    ],
  ])(
    "finds a landing after the drops of a fuzzball neither dropping nor on its way home: one %s",
    (_, whole, flown, at, ball) => {
      const landing = found(
        eventsOf(whole, "land").find((event) => event.ball === ball),
      );
      const dropped = droppedWith((events) => [...events, landing], flown);

      expect(dropProblemsOf(whole, dropped, at)).toEqual([
        `The dropped flight's event ${flown.flight.events.length}, a land at ${landing.at}, isn't where and when its fuzzball comes down.`,
      ]);
    },
  );

  it("finds a fuzzball on its way home at the drop's moment landing elsewhere than the whole flight lands it", () => {
    const dropped = droppedWith(
      (events) =>
        events.map((event) =>
          event.kind === "land" && event.ball === 0
            ? { ...event, x: event.x + 0.1 }
            : event,
        ),
      BORED_DROPPED,
    );

    expect(dropProblemsOf(BORED_WHOLE, dropped, 0.75)).toEqual([
      "The dropped flight's event 5, a land at 1, isn't where and when its fuzzball comes down.",
    ]);
  });

  it("finds a zap set off by the drop's moment that the dropped flight doesn't land", () => {
    const dropped = droppedWith(
      (events) =>
        events.filter((event) => event.kind !== "zap" || event.cell !== 4),
      ZAPPERS_DROPPED,
    );

    expect(dropProblemsOf(ZAPPERS_WHOLE, dropped, 2.75)).toEqual([
      "The whole flight's zap from cell 4 at 3, set off by 2.75, isn't the dropped flight's.",
    ]);
  });

  it.each([
    ["at another moment", { at: 3.25 }, 3.25],
    ["from another cell", { cell: 5 }, 3],
    ["of another pattern", { pattern: "column" }, 3],
  ] as const)(
    "finds a zap set off by the drop's moment landing %s than the whole flight's",
    (_, change, landsAt) => {
      const dropped = droppedWith(
        (events) =>
          events.map((event) =>
            event.kind === "zap" && event.cell === 4
              ? { ...event, ...change }
              : event,
          ),
        ZAPPERS_DROPPED,
      );
      const zap = ZAPPERS_DROPPED.flight.events.findIndex(
        (event) => event.kind === "zap" && event.cell === 4,
      );

      expect(dropProblemsOf(ZAPPERS_WHOLE, dropped, 2.75)).toEqual([
        `The dropped flight's event ${zap}, a zap at ${landsAt}, is neither a zap the whole flight set off by 2.75 nor one a brick broken after it set off.`,
        "The whole flight's zap from cell 4 at 3, set off by 2.75, isn't the dropped flight's.",
      ]);
    },
  );

  it("finds a zap neither the whole flight set off by the drop's moment nor a brick broken after it", () => {
    const zap = found(
      eventsOf(ZAPPERS_DROPPED, "zap").find(({ cell }) => cell === 4),
    );
    const dropped = droppedWith((events) => [...events, zap], ZAPPERS_DROPPED);

    expect(dropProblemsOf(ZAPPERS_WHOLE, dropped, 2.75)).toEqual([
      `The dropped flight's event ${ZAPPERS_DROPPED.flight.events.length}, a zap at 3, is neither a zap the whole flight set off by 2.75 nor one a brick broken after it set off.`,
    ]);
  });

  it.each([
    ["by a fuzzball", "fuzzball", 4],
    ["by a zap at the drop's moment", "zap", 2.75],
  ] as const)("finds a break after the drops %s", (_, by, at) => {
    const broken = found(
      eventsOf(ZAPPERS_WHOLE, "break").find(({ cell }) => cell === 4),
    );
    const dropped = droppedWith(
      (events) => [...events, { ...broken, by, at }],
      ZAPPERS_DROPPED,
    );

    expect(dropProblemsOf(ZAPPERS_WHOLE, dropped, 2.75)).toEqual([
      `The dropped flight's event ${ZAPPERS_DROPPED.flight.events.length}, a break at ${at}, isn't a zap's or a blast's after 2.75.`,
    ]);
  });

  it("finds a free after the drops at the drop's moment", () => {
    const dropped = droppedWith(
      (events) => [...events, { at: 2.75, kind: "free", cell: 3, ink: 0 }],
      ZAPPERS_DROPPED,
    );

    expect(dropProblemsOf(ZAPPERS_WHOLE, dropped, 2.75)).toEqual([
      `The dropped flight's event ${ZAPPERS_DROPPED.flight.events.length}, a free at 2.75, isn't after 2.75.`,
    ]);
  });

  it("finds a fuzzball that leaves after the drop", () => {
    const launch = found(
      eventsOf(WHOLE, "launch").find(({ ball }) => ball === 2),
    );
    const dropped = droppedWith((events) => [...events, launch]);

    expect(dropProblemsOf(WHOLE, dropped, 1)).toEqual([
      `The dropped flight's event ${DROPPED.flight.events.length}, a launch at 1.4, comes after the drop.`,
    ]);
  });

  it("finds a dropped flight that counts more fuzzballs capped than the whole flight", () => {
    const dropped: Flown = {
      ...DROPPED,
      flight: { ...DROPPED.flight, capped: 1 },
    };

    expect(dropProblemsOf(WHOLE, dropped, 1)).toEqual([
      "It counts 1 capped, more than the whole flight's 0.",
    ]);
  });

  it.each([
    [
      "kept that the dropped flight breaks",
      ZAPPERS_WHOLE,
      withBrick(ZAPPERS_DROPPED, 3, found(ZAPPERS_START.wall.bricks[3])),
      2.75,
      "Cell 3 keeps a brick the dropped flight breaks.",
    ],
    [
      "lost that the dropped flight doesn't break",
      WHOLE,
      withBrick(DROPPED, 4, null),
      1,
      "Cell 4 has lost a brick the dropped flight doesn't break.",
    ],
    [
      "the wall never had",
      WHOLE,
      withBrick(DROPPED, 5, found(DROPPED.wall.bricks[4])),
      1,
      "Cell 5 has a brick the wall never had.",
    ],
    [
      "with fewer hits left than the whole flight leaves it",
      WHOLE,
      withBrick(DROPPED, 4, { ...found(DROPPED.wall.bricks[4]), hits: 2 }),
      1,
      "Cell 4 keeps 2 hits, fewer than the whole flight's 3.",
    ],
  ])("finds a brick %s", (_, whole, dropped, at, problem) => {
    expect(dropProblemsOf(whole, dropped, at)).toEqual([problem]);
  });
});

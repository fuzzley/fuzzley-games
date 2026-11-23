import { COLUMNS, RADIUS } from "@fz/brick-wall/rules/field";
import { keysOf } from "@fz/core/records";
import type {
  Flight,
  FlightEvent,
  FlightEventKind,
} from "../rules/flight/events";
import { FLIGHT_RULES, RALLY_MARKS } from "../rules/tuning";
import { FLIGHT_FIXTURES, type FixtureName } from "./flight_fixtures";

const NAMES = keysOf(FLIGHT_FIXTURES);

/** The fixture that shows each kind of event. */
const SHOWN_BY: Readonly<Record<FlightEventKind, FixtureName>> = {
  turn: "plain",
  strike: "plain",
  shielded: "shielded",
  "bounce-earned": "rally",
  "bounce-spent": "spring",
  hold: "hatch",
  "hatches-open": "hatch",
  bolt: "bolt",
  teleport: "teleport",
  bored: "bored",
  guard: "guard",
  land: "plain",
};

/** Each kind's place among the events of one moment, as `Flight.events` orders them. */
const PLACE_IN_MOMENT: Readonly<Record<FlightEventKind, number>> = {
  turn: 0,
  strike: 1,
  shielded: 1,
  hold: 1,
  "bounce-earned": 1,
  "bounce-spent": 2,
  "hatches-open": 3,
  bolt: 4,
  teleport: 5,
  bored: 6,
  guard: 6,
  land: 7,
};

/** Returns a fixture's flight. */
function flightOf(name: FixtureName): Flight {
  return FLIGHT_FIXTURES[name].round.flight;
}

/** Returns a flight's events of a kind. */
function eventsOf<K extends FlightEventKind>(
  flight: Flight,
  kind: K,
): Extract<FlightEvent, { readonly kind: K }>[] {
  return flight.events.filter(
    (event): event is Extract<FlightEvent, { readonly kind: K }> =>
      event.kind === kind,
  );
}

/** Returns each pair of a flight's events that follow each other. */
function pairsOf<T>(list: readonly T[]): (readonly [T, T])[] {
  return list.slice(1).map((after, i) => [list[i] as T, after] as const);
}

/** Returns the floor bounces a flight holds after each event that changes them, counted from its release. */
function heldAsCounted(flight: Flight): number[] {
  let held = flight.held;
  return flight.events.flatMap((event) => {
    if (event.kind === "bounce-earned") {
      held += event.kept ? 1 : 0;
      return [held];
    }
    if (event.kind === "bounce-spent") {
      held--;
      return [held];
    }
    return [];
  });
}

describe("FLIGHT_FIXTURES", () => {
  it.each(keysOf(SHOWN_BY))("shows a %s event", (kind) => {
    const flight = flightOf(SHOWN_BY[kind]);

    expect(flight.events.map((event) => event.kind)).toContain(kind);
  });

  it.each([
    ["plain", "on", 1, 0, 0, false, 1, 10],
    ["cleared", "cleared", 1, 1, 0, false, 0, 10],
    ["lost", "lost", 1, 0, 0, false, 1, 10],
    ["jumped", "on", 1, 1, 0, true, 3, 110],
    ["shielded", "on", 0, 0, 0, false, 1, 0],
    ["rally", "on", 11, 0, 1, false, 1, 300],
    ["spring", "on", 2, 2, 1, false, 1, 120],
    ["hot", "on", 2, 2, 0, false, 1, 20],
    ["capped", "on", 2, 2, 0, false, 1, 20],
    ["bolt", "on", 1, 1, 0, false, 1, 10],
    ["lockMet", "on", 0, 0, 0, false, 1, 0],
    ["hatch", "on", 0, 0, 0, true, 3, 100],
    ["teleport", "on", 0, 0, 0, true, 3, 100],
    ["bored", "on", 0, 0, 0, true, 3, 100],
    ["guard", "on", 0, 0, 0, true, 3, 100],
    ["turnsGuard", "on", 0, 0, 0, true, 3, 100],
    ["corner", "on", 1, 0, 0, false, 1, 10],
    ["ramp", "on", 0, 0, 0, true, 3, 100],
    ["gem", "on", 1, 1, 0, true, 3, 110],
  ] as const)(
    "plays %s to a round %s, a rally of %s, %s broken, %s earned, jumped %s, %s rows down, for %s points",
    (name, result, rally, broken, earned, jumped, rowsDown, points) => {
      const { outcome } = FLIGHT_FIXTURES[name].round;

      expect(outcome).toMatchObject({
        result,
        rally,
        broken,
        earned,
        jumped,
        rowsDown,
        points,
      });
    },
  );

  it("yawns at the bored distance, and meets its guard at the longest flight its rules allow", () => {
    const [yawn] = eventsOf(flightOf("bored"), "bored");
    const [guard] = eventsOf(flightOf("guard"), "guard");

    expect([yawn?.at, guard?.at, guard?.by]).toEqual([
      FLIGHT_RULES.bored,
      FLIGHT_FIXTURES.guard.rules.longest,
      "length",
    ]);
  });

  it("flies by the rules, but where a guard is to meet a short flight or a fuzzball to hold fewer floor bounces", () => {
    const rules = NAMES.filter(
      (name) => FLIGHT_FIXTURES[name].rules !== FLIGHT_RULES,
    );

    expect(rules).toEqual(["capped", "guard", "turnsGuard"]);
  });

  it("starts a hot shot holding its own floor bounce, and a plain shot none", () => {
    expect([flightOf("hot").held, flightOf("plain").held]).toEqual([
      FLIGHT_RULES.hotBounces,
      0,
    ]);
  });

  it("counts the hatches' holds down to none, and opens them at the last", () => {
    const flight = flightOf("hatch");

    expect([
      eventsOf(flight, "hold").map((hold) => hold.left),
      eventsOf(flight, "hatches-open").map((open) => open.at),
    ]).toEqual([[2, 1, 0], [eventsOf(flight, "hold").at(-1)?.at]]);
  });

  it("draws a lock's bolt at the turn the rules name, off a wall, between the lock it met shut and the one it opened", () => {
    const flight = flightOf("bolt");
    const turns = eventsOf(flight, "turn");

    expect(eventsOf(flight, "bolt")).toEqual([
      { at: turns[FLIGHT_RULES.boltTurns - 1]?.at, kind: "bolt", drawn: 1 },
    ]);
  });
});

describe.each(NAMES)("the %s fixture", (name) => {
  const { start, round } = FLIGHT_FIXTURES[name];
  const { flight, outcome, next } = round;
  const waypoints = flight.track.waypoints;

  it("writes its events in order of their moments", () => {
    const moments = flight.events.map((event) => event.at);

    expect(moments).toEqual([...moments].sort((a, b) => a - b));
  });

  it("writes the events of a moment in their order", () => {
    const outOfOrder = pairsOf(flight.events).filter(
      ([before, after]) =>
        before.at === after.at &&
        PLACE_IN_MOMENT[before.kind] > PLACE_IN_MOMENT[after.kind],
    );

    expect(outOfOrder).toEqual([]);
  });

  it("names the cells each turn met floor up, then left to right", () => {
    const unordered = eventsOf(flight, "turn").filter((turn) =>
      pairsOf(turn.cells).some(([before, after]) => before >= after),
    );

    expect(unordered).toEqual([]);
  });

  it("writes the events of a moment's bricks and bars in the order its turn met them", () => {
    const named = flight.events.filter((event) => "cell" in event);
    const unordered = pairsOf(named).filter(
      ([before, after]) => before.at === after.at && before.cell >= after.cell,
    );

    expect(unordered).toEqual([]);
  });

  it("earns a floor bounce right after the strike that earned it, the rally's before a spring brick's", () => {
    const misplaced = pairsOf(flight.events).filter(
      ([before, after]) =>
        after.kind === "bounce-earned" &&
        !(
          before.at === after.at &&
          (before.kind === "strike" ||
            (before.kind === "bounce-earned" &&
              before.by === "rally" &&
              after.by === "spring"))
        ),
    );

    expect(misplaced).toEqual([]);
  });

  it("lands last, its flight's length on, at the end of its track", () => {
    const landing = flight.events.at(-1);
    const end = waypoints.at(-1);

    expect([landing?.kind, landing?.at, end?.at, end?.y]).toEqual([
      "land",
      flight.length,
      flight.length,
      RADIUS,
    ]);
  });

  it("flies a unit for each unit of its length", () => {
    const speeds = pairsOf(waypoints)
      .filter(([from, to]) => to.at > from.at)
      .map(([from, to]) =>
        (Math.hypot(to.x - from.x, to.y - from.y) / (to.at - from.at)).toFixed(
          9,
        ),
      );

    expect(speeds).toEqual(speeds.map(() => (1).toFixed(9)));
  });

  it("keeps its middle a radius inside the field", () => {
    const within = (value: number, least: number, most: number) =>
      value > least - 1e-9 && value < most + 1e-9;
    const outside = waypoints.filter(
      ({ x, y }) =>
        !within(x, RADIUS, COLUMNS - RADIUS) ||
        !within(y, RADIUS, start.depth - RADIUS),
    );

    expect(outside).toEqual([]);
  });

  it("turns at a place on its track", () => {
    const places = waypoints.map(({ at, x, y }) => [at, x, y]);

    expect(places).toEqual(
      expect.arrayContaining(
        eventsOf(flight, "turn").map(({ at, x, y }) => [at, x, y]),
      ),
    );
  });

  it("names every brick and bar its moment's events name in that moment's turn", () => {
    const turns = new Map(
      eventsOf(flight, "turn").map((turn) => [turn.at, turn.cells]),
    );
    const named = flight.events.flatMap((event) =>
      "cell" in event ? [[event.at, event.cell] as const] : [],
    );

    expect(
      named.filter(([at, cell]) => !turns.get(at)?.includes(cell)),
    ).toEqual([]);
  });

  it("counts its rally and its turns", () => {
    expect([flight.rally, flight.turns]).toEqual([
      eventsOf(flight, "strike").length,
      eventsOf(flight, "turn").length,
    ]);
  });

  it("counts each strike's rally, from 1", () => {
    expect(eventsOf(flight, "strike").map((strike) => strike.rally)).toEqual(
      Array.from({ length: flight.rally }, (_, i) => i + 1),
    );
  });

  it("marks its strikes at the rally's marks, and its last", () => {
    const strikes = eventsOf(flight, "strike");

    expect([flight.marks, flight.lastStrike]).toEqual([
      strikes
        .filter((strike) =>
          (RALLY_MARKS as readonly number[]).includes(strike.rally),
        )
        .map((strike) => strike.at),
      strikes.at(-1)?.at ?? null,
    ]);
  });

  it("says the floor bounces it holds after each it earns and spends", () => {
    const said = flight.events.flatMap((event) =>
      event.kind === "bounce-earned" || event.kind === "bounce-spent"
        ? [event.held]
        : [],
    );

    expect(said).toEqual(heldAsCounted(flight));
  });

  it("comes to the rally, the breaks and the floor bounces its flight made", () => {
    expect([outcome.rally, outcome.broken, outcome.earned]).toEqual([
      flight.rally,
      eventsOf(flight, "strike").filter((strike) => strike.broke).length,
      eventsOf(flight, "bounce-earned").filter((earned) => earned.kept).length,
    ]);
  });

  it("starts the next round where it lands, on the same field, hot after a jump", () => {
    const landing = eventsOf(flight, "land").at(-1);

    expect([next.x, next.depth, next.hot]).toEqual([
      landing?.x,
      start.depth,
      outcome.jumped,
    ]);
  });

  it("starts the next round with its wall the rows it came down lower", () => {
    expect(next.wall.lowestRow).toBe(start.wall.lowestRow - outcome.rowsDown);
  });
});

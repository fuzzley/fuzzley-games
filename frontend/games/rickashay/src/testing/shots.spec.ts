import { AIMS } from "@fz/brick-wall/rules/aims";
import { TRAIT_RULES } from "../rules/bricks/trait_rules";
import type { FlightEvent } from "../rules/flight/events";
import { fly } from "../rules/flight/flight";
import { FLIGHT_RULES } from "../rules/tuning";
import { STAND_INS } from "./stand_ins";
import { aimAt, eventsOf, flyAt, near, startAt, timeless } from "./shots";

/** A strike that breaks a brick. */
const STRIKE: FlightEvent = {
  kind: "strike",
  at: 2.5,
  cell: 4,
  took: 1,
  broke: true,
  rally: 1,
};

/** A turn off the left wall, and that strike. */
const EVENTS: readonly FlightEvent[] = [
  {
    kind: "turn",
    at: 1.5,
    x: 0.5,
    y: 2,
    dx: 1,
    dy: 0,
    off: "wall",
    cells: [],
  },
  STRIKE,
];

describe("aimAt()", () => {
  it.each([
    [90, 0, 1],
    [45, Math.SQRT1_2, Math.SQRT1_2],
  ])("aims at %s° up and across as its angle says", (degrees, dx, dy) => {
    expect(AIMS[aimAt(degrees)]).toEqual([near(dx), near(dy)]);
  });
});

describe("startAt()", () => {
  it("stands a wall's lowest row in field row 5, the fuzzball cool at the floor's middle, on a field 11 deep", () => {
    const start = startAt(["o........"]);

    expect([
      start.wall.bricks[0]?.kind,
      start.wall.lowestRow,
      start.depth,
      start.x,
      start.hot,
    ]).toEqual(["brick", 5, 11, 4.5, false]);
  });

  it("stands it where it is asked, the fuzzball waiting where it is asked, hot", () => {
    const start = startAt(["o........"], { lowestRow: 2, x: 2, hot: true });

    expect([start.wall.lowestRow, start.x, start.hot]).toEqual([2, 2, true]);
  });
});

describe("flyAt()", () => {
  /** A lock by the right wall, which a shot at 45° from the floor's middle meets off that wall: the game's traits let it strike, the stand-ins' shield it. */
  const LOCK = ["........x"];

  it("flies at 45° from the floor's middle, cool, by the game's rules and its bricks' traits", () => {
    expect(flyAt({ picture: LOCK })).toEqual(
      fly(startAt(LOCK), { aim: aimAt(45) }, FLIGHT_RULES, TRAIT_RULES),
    );
  });

  it("flies by the bricks' traits it is given", () => {
    const flown = flyAt({ picture: LOCK, traits: STAND_INS });

    expect(eventsOf(flown.flight, "shielded")).toHaveLength(1);
  });

  it("flies by the rules it is given, a hot shot taking as many hits as they say", () => {
    const rules = { ...FLIGHT_RULES, hotHits: FLIGHT_RULES.hotHits + 1 };

    const flown = flyAt({ picture: ["........6"], hot: true, rules });

    expect(eventsOf(flown.flight, "strike").map(({ took }) => took)).toEqual([
      rules.hotHits,
    ]);
  });

  it("flies from where it is asked, at the angle asked, as far as it stops", () => {
    const stop = { turn: 1, past: 0.5 };

    expect(
      flyAt({ picture: ["o........"], lowestRow: 3, x: 6, degrees: 120, stop }),
    ).toEqual(
      fly(
        startAt(["o........"], { lowestRow: 3, x: 6 }),
        { aim: aimAt(120) },
        FLIGHT_RULES,
        TRAIT_RULES,
        stop,
      ),
    );
  });
});

describe("eventsOf()", () => {
  it("keeps a flight's events of a kind", () => {
    expect(eventsOf({ events: EVENTS }, "strike")).toEqual([STRIKE]);
  });
});

describe("timeless()", () => {
  it("drops an event's moment", () => {
    expect(timeless(STRIKE)).toEqual({
      kind: "strike",
      cell: 4,
      took: 1,
      broke: true,
      rally: 1,
    });
  });
});

describe("near()", () => {
  it("matches a number as near as the flight's arithmetic rounds it", () => {
    expect(0.1 + 0.2).toEqual(near(0.3));
  });

  it("matches no number further off", () => {
    expect(0.3 + 1e-6).not.toEqual(near(0.3));
  });
});

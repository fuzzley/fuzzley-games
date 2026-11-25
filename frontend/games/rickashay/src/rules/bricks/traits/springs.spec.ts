import { AIMS_PER_DEGREE, FIRST_AIM_DEGREES } from "@fz/brick-wall/rules/aims";
import { cellOf } from "@fz/brick-wall/rules/grid";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import { FLIGHT_FIXTURES } from "../../../testing/flight_fixtures";
import type { FlightEvent, RoundStart } from "../../flight/events";
import { type Flown, fly } from "../../flight/flight";
import { WALL_LEGEND } from "../../levels/legend";
import { playRound } from "../../round/round";
import { FLIGHT_RULES, type FlightRules } from "../../tuning";
import { TRAIT_RULES } from "../trait_rules";
import { SPRINGS_RULE } from "./springs";

/** A spring brick by the right wall, which a shot at 45° from the floor's middle meets off that wall. */
const BY_THE_WALL = ["........S"];

/** Returns where a round starts at a wall drawn as a picture, its lowest row in field row 5 of a field 11 deep, the fuzzball waiting at the floor's middle. */
function startAt(picture: readonly string[], hot = false): RoundStart {
  const wall = wallFrom(picture, WALL_LEGEND, { lowestRow: 5 });
  return { wall, depth: 11, x: 4.5, hot };
}

/** The shot at 45°. */
const AT_45 = { aim: (45 - FIRST_AIM_DEGREES) * AIMS_PER_DEGREE };

/** Returns the flight of a shot at 45° at a wall drawn as a picture, by the game's trait rules. */
function flyAt(
  picture: readonly string[],
  {
    hot = false,
    rules = FLIGHT_RULES,
  }: { hot?: boolean; rules?: FlightRules } = {},
): Flown {
  return fly(startAt(picture, hot), AT_45, rules, TRAIT_RULES);
}

/** Returns a flight's strikes, and the floor bounces it earns and spends. */
function bounceEventsOf(events: readonly FlightEvent[]): FlightEvent[] {
  return events.filter(
    ({ kind }) =>
      kind === "strike" || kind === "bounce-earned" || kind === "bounce-spent",
  );
}

/** Returns a flight's strikes and floor bounces. */
function bouncesOf({ flight }: Flown): FlightEvent[] {
  return bounceEventsOf(flight.events);
}

/** Returns an event without its moment, which the flight's arithmetic and a fixture's may round apart. */
function timeless({ at: _, ...event }: FlightEvent): object {
  return event;
}

describe("SPRINGS_RULE", () => {
  it("is the game's rule for a spring brick", () => {
    expect(TRAIT_RULES.springs).toBe(SPRINGS_RULE);
  });

  it("earns a floor bounce as a spring brick breaks, which the fuzzball spends on the floor", () => {
    const flown = flyAt(BY_THE_WALL);

    const [strike] = bouncesOf(flown);
    expect(bouncesOf(flown)).toEqual([
      expect.objectContaining({ kind: "strike", cell: cellOf(8, 0) }),
      {
        at: strike?.at,
        kind: "bounce-earned",
        by: "spring",
        held: 1,
        kept: true,
      },
      expect.objectContaining({ kind: "bounce-spent", held: 0 }),
    ]);
  });

  // A hot shot leaves holding its own floor bounce, the most these rules
  // let it hold.
  it("loses the floor bounce it earns while the fuzzball holds the most, still announcing it", () => {
    const rules = { ...FLIGHT_RULES, mostBounces: FLIGHT_RULES.hotBounces };

    const flown = flyAt(BY_THE_WALL, { hot: true, rules });

    expect(
      flown.flight.events.filter(({ kind }) => kind === "bounce-earned"),
    ).toEqual([
      expect.objectContaining({ by: "spring", held: 1, kept: false }),
    ]);
  });

  it("counts the floor bounce it earns among the round's, for its points", () => {
    const { outcome } = playRound(
      startAt(BY_THE_WALL),
      AT_45,
      FLIGHT_RULES,
      TRAIT_RULES,
    );

    expect(outcome.earned).toBe(1);
  });

  // No spring brick a level holds takes more than 1 strike, so only one
  // made to take 2 tells the rule's moment from a strike's.
  it("earns nothing from a strike that leaves a spring brick standing", () => {
    const start = startAt(BY_THE_WALL);
    const wall = {
      ...start.wall,
      bricks: start.wall.bricks.map(
        (brick) => brick && { ...brick, hits: 2, full: 2 },
      ),
    };

    const { flight } = fly(
      { ...start, wall },
      AT_45,
      FLIGHT_RULES,
      TRAIT_RULES,
    );

    expect(bounceEventsOf(flight.events)).toEqual([
      expect.objectContaining({
        kind: "strike",
        cell: cellOf(8, 0),
        broke: false,
      }),
    ]);
  });

  it.each(["spring", "capped"] as const)(
    "earns the %s fixture's floor bounces as the stand-ins earned them",
    (name) => {
      const { start, shot, rules, round } = FLIGHT_FIXTURES[name];

      const { flight } = fly(start, shot, rules, TRAIT_RULES);

      expect([
        flight.events.map(({ kind }) => kind),
        bounceEventsOf(flight.events).map(timeless),
      ]).toEqual([
        round.flight.events.map(({ kind }) => kind),
        bounceEventsOf(round.flight.events).map(timeless),
      ]);
    },
  );
});

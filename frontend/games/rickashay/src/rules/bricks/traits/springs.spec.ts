import { cellOf } from "@fz/brick-wall/rules/grid";
import { FLIGHT_FIXTURES } from "../../../testing/flight_fixtures";
import { aimAt, flyAt, startAt, timeless } from "../../../testing/shots";
import type { FlightEvent } from "../../flight/events";
import { type Flown, fly } from "../../flight/flight";
import { playRound } from "../../round/round";
import { FLIGHT_RULES } from "../../tuning";
import { TRAIT_RULES } from "../trait_rules";
import { SPRINGS_RULE } from "./springs";

/** A spring brick by the right wall, which a shot at 45° from the floor's middle meets off that wall. */
const BY_THE_WALL = ["........S"];

/** The shot at 45°. */
const AT_45 = { aim: aimAt(45) };

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

describe("SPRINGS_RULE", () => {
  it("is the game's rule for a spring brick", () => {
    expect(TRAIT_RULES.springs).toBe(SPRINGS_RULE);
  });

  it("earns a floor bounce as a spring brick breaks, which the fuzzball spends on the floor", () => {
    const flown = flyAt({ picture: BY_THE_WALL });

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

    const flown = flyAt({ picture: BY_THE_WALL, hot: true, rules });

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

import { cellOf } from "@fz/brick-wall/rules/grid";
import { FLIGHT_FIXTURES } from "../../../testing/flight_fixtures";
import { eventsOf, flyAt } from "../../../testing/shots";
import type { Brick } from "../../catalog/kinds";
import { fly } from "../../flight/flight";
import type { Hooks } from "../../flight/hooks";
import { TRAIT_RULES } from "../trait_rules";
import { TELEPORTS_RULE } from "./teleports";

/** Returns a portal, its twin in the wall cell given, or none. */
function portalOf(twin: number | null): Brick {
  return { kind: "portal", hits: 0, full: 0, plates: 0, tint: 0, twin };
}

/** Returns what the rule does as a fuzzball's middle crosses into a portal's eye, each hook it calls by name and what it was handed. */
function enteredBy(portal: Brick): readonly string[] {
  const calls: string[] = [];
  const hooks: Hooks = {
    earn: () => {
      calls.push("earn");
    },
    hold: () => {
      calls.push("hold");
    },
    teleport: (to) => {
      calls.push(`teleport to ${String(to)}`);
    },
  };
  TELEPORTS_RULE.entered?.(hooks, 6, portal);
  return calls;
}

describe("TELEPORTS_RULE", () => {
  it("takes the fuzzball to the portal's twin", () => {
    expect(enteredBy(portalOf(40))).toEqual(["teleport to 40"]);
  });

  it("takes the fuzzball nowhere from a portal with no twin", () => {
    expect(enteredBy(portalOf(null))).toEqual([]);
  });
});

describe("TELEPORTS_RULE, flown", () => {
  // Up from the floor's middle at 45° into the eye of the portal in column
  // 6 of row 2, out of its twin's in row 5, and off the ceiling and both
  // walls to the floor, as the fixture was made.
  it("flies the teleport fixture as it was made by hand, by the game's trait rules, passing the portal no turn", () => {
    const { start, shot, rules, round } = FLIGHT_FIXTURES.teleport;

    const { flight } = fly(start, shot, rules, TRAIT_RULES);

    expect([
      flight.events.map(({ kind }) => kind),
      eventsOf(flight, "teleport").map(({ from, to }) => [from, to]),
      flight.turns,
    ]).toEqual([
      round.flight.events.map(({ kind }) => kind),
      eventsOf(round.flight, "teleport").map(({ from, to }) => [from, to]),
      eventsOf(round.flight, "turn").length,
    ]);
  });

  // The same portal, its twin in row 12 over a ceiling 11 deep: the
  // fuzzball flies on through its cell, off the right wall, the ceiling
  // and the left wall.
  it("passes a portal whose twin waits over the ceiling as air", () => {
    const { flight, wall } = flyAt({
      picture: [
        "..@......",
        ...Array<string>(9).fill("........."),
        "......@..",
      ],
      lowestRow: 2,
    });

    expect([
      eventsOf(flight, "teleport"),
      eventsOf(flight, "turn").map(({ off }) => off),
      wall.bricks[cellOf(6, 0)]?.twin,
    ]).toEqual([[], ["wall", "ceiling", "wall"], cellOf(2, 10)]);
  });
});

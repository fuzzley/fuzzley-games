import { CEILINGWARD, FLOORWARD, LEFT, RIGHT } from "@fz/brick-wall/rules/grid";
import { FLIGHT_FIXTURES } from "../../../testing/flight_fixtures";
import { fly } from "../../flight/flight";
import type { Struck } from "../../flight/hooks";
import { LEGEND } from "../../levels/legend";
import { TRAIT_RULES } from "../trait_rules";
import { PLATED_RULE } from "./plated";

/** The plates of a `v` or a `V`, underneath. */
const UNDER = LEGEND.v.plates;

/** The plates of a `U`, underneath and on both sides. */
const ROUND = LEGEND.U.plates;

/** Returns what a strike on a whole plated brick of the plates given comes to, met on the sides given, once the rule has run. */
function struckOn(plates: number, sides: number): Struck {
  const struck: Struck = {
    cell: 4,
    brick: { kind: "plated", hits: 2, full: 2, plates, tint: 0, twin: null },
    sides,
    shield: null,
  };
  PLATED_RULE.struck?.(struck);
  return struck;
}

describe("PLATED_RULE", () => {
  it.each([
    ["the face plated underneath", UNDER, FLOORWARD],
    ["the left face plated on both sides", ROUND, LEFT],
    ["the right face plated on both sides", ROUND, RIGHT],
    ["the face plated underneath and on both sides", ROUND, FLOORWARD],
    ["a cut between two plated faces", ROUND, FLOORWARD | RIGHT],
  ])("shields a plated brick turned off %s", (_, plates, sides) => {
    expect(struckOn(plates, sides).shield).toBe("plate");
  });

  it.each([
    ["its bare top", UNDER, CEILINGWARD],
    ["a bare side", UNDER, LEFT],
    ["a cut between its plate and a bare side", UNDER, FLOORWARD | LEFT],
    ["a cut between a plated side and its bare top", ROUND, CEILINGWARD | LEFT],
  ])("strikes a plated brick turned off %s", (_, plates, sides) => {
    expect(struckOn(plates, sides).shield).toBeNull();
  });

  it("strikes a plated brick met on no side of it", () => {
    expect(struckOn(ROUND, 0).shield).toBeNull();
  });

  it("leaves the brick it is handed as it was", () => {
    const struck = struckOn(UNDER, FLOORWARD);

    expect(struck.brick).toEqual({
      kind: "plated",
      hits: 2,
      full: 2,
      plates: UNDER,
      tint: 0,
      twin: null,
    });
  });
});

describe("PLATED_RULE, flown", () => {
  // Off the right wall into the plate under the plated brick by it, which
  // turns the fuzzball down and takes nothing, as the fixture was made.
  it("flies the shielded fixture as it was made by hand, by the game's trait rules", () => {
    const { start, shot, rules, round } = FLIGHT_FIXTURES.shielded;
    const handed = structuredClone(start.wall.bricks);

    const { flight, wall } = fly(start, shot, rules, TRAIT_RULES);

    expect([
      flight.events.map(({ kind }) => kind),
      flight.events.filter(({ kind }) => kind === "shielded"),
      flight.rally,
      wall.bricks,
    ]).toEqual([
      round.flight.events.map(({ kind }) => kind),
      round.flight.events.filter(({ kind }) => kind === "shielded"),
      0,
      handed,
    ]);
  });
});

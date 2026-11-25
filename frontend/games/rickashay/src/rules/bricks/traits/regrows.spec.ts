import { cellOf } from "@fz/brick-wall/rules/grid";
import { aimAt, eventsOf, startAt } from "../../../testing/shots";
import { playRound } from "../../round/round";
import { FLIGHT_RULES } from "../../tuning";
import { TRAIT_RULES } from "../trait_rules";
import { REGROWS_RULE } from "./regrows";

/** The moss brick's wall cell, by the right wall, which a shot at 45° from the floor's middle meets off that wall. */
const MOSS = cellOf(8, 0);

/** The shot at 45°. */
const AT_45 = { aim: aimAt(45) };

describe("REGROWS_RULE", () => {
  it("is the game's rule for a moss brick", () => {
    expect(TRAIT_RULES.regrows).toBe(REGROWS_RULE);
  });

  it("acts at no moment of a flight", () => {
    expect(REGROWS_RULE).toEqual({});
  });
});

describe("REGROWS_RULE, played", () => {
  // Off the right wall into the moss brick by it, once, and home.
  it.each([
    ["M", 2],
    ["N", 3],
  ])(
    "takes a strike's hit off a moss brick written %s in the flight, and grows it back to its %i hits after the round",
    (character, full) => {
      const start = startAt([`........${character}`]);

      const { flight, next } = playRound(start, AT_45, FLIGHT_RULES);

      expect([
        eventsOf(flight, "strike").map(({ cell, took, broke }) => [
          cell,
          took,
          broke,
        ]),
        next.wall.bricks[MOSS]?.hits,
      ]).toEqual([[[MOSS, 1, false]], full]);
    },
  );

  // The same flight, hot, whose strike takes both of a moss brick's hits.
  it("leaves nothing to grow back of a moss brick broken in the flight", () => {
    const start = startAt(["........M"], { hot: true });

    const { flight, next } = playRound(start, AT_45, FLIGHT_RULES);

    expect([
      eventsOf(flight, "strike").map(({ broke }) => broke),
      next.wall.bricks[MOSS],
    ]).toEqual([[true], null]);
  });
});

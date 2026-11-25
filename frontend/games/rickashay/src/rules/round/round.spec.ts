import { keysOf } from "@fz/core/records";
import { FLIGHT_FIXTURES } from "../../testing/flight_fixtures";
import { aimAt, near, startAt } from "../../testing/shots";
import { TRAIT_RULES } from "../bricks/trait_rules";
import type { Round } from "../flight/events";
import { fly } from "../flight/flight";
import type { TraitRules } from "../flight/hooks";
import {
  BOUNCE_POINTS,
  FLIGHT_RULES,
  JUMP_POINTS,
  STRIKE_POINTS,
} from "../tuning";
import { playRound } from "./round";

/** Returns how many bolts a round's flight drew. */
function boltsIn({ flight }: Round): number {
  return flight.events.filter(({ kind }) => kind === "bolt").length;
}

describe("playRound()", () => {
  it.each(keysOf(FLIGHT_FIXTURES))(
    "plays the flight fly() flies for the %s fixture",
    (name) => {
      const { start, shot, rules } = FLIGHT_FIXTURES[name];

      const round = playRound(start, shot, rules);

      expect(round.flight).toStrictEqual(
        fly(start, shot, rules, TRAIT_RULES).flight,
      );
    },
  );

  it.each(keysOf(FLIGHT_FIXTURES))(
    "comes to what the %s fixture's round came to, and starts the next where it does",
    (name) => {
      const { start, shot, rules, round } = FLIGHT_FIXTURES[name];

      const played = playRound(start, shot, rules);

      expect([played.outcome, played.next]).toEqual([
        round.outcome,
        { ...round.next, x: near(round.next.x) },
      ]);
    },
  );

  // It strikes one brick, and the wall jumps.
  it("scores its strikes and a jump", () => {
    const { start, shot, rules } = FLIGHT_FIXTURES.jumped;

    const { outcome } = playRound(start, shot, rules);

    expect(outcome.points).toBe(STRIKE_POINTS + JUMP_POINTS);
  });

  // A spring brick's strike earns a floor bounce, which it spends.
  it("scores a floor bounce it earned and kept beside its strikes", () => {
    const { start, shot, rules } = FLIGHT_FIXTURES.spring;

    const { outcome } = playRound(start, shot, rules);

    expect(outcome.points).toBe(2 * STRIKE_POINTS + BOUNCE_POINTS);
  });

  it("starts the next round where the fuzzball landed", () => {
    const start = startAt(["ooo2....."]);

    const round = playRound(start, { aim: aimAt(100) }, FLIGHT_RULES);

    expect(round.flight.events.at(-1)).toEqual({
      at: round.flight.length,
      kind: "land",
      x: round.next.x,
    });
  });

  it("makes the next shot a hot shot after a jump", () => {
    const { start, shot, rules } = FLIGHT_FIXTURES.jumped;

    const round = playRound(start, shot, rules);

    expect([round.outcome.jumped, round.next.hot]).toEqual([true, true]);
  });

  it("makes the shot after a hot shot that didn't jump a plain one", () => {
    const { start, shot, rules } = FLIGHT_FIXTURES.hot;

    const round = playRound(start, shot, rules);

    expect([start.hot, round.outcome.jumped, round.next.hot]).toEqual([
      true,
      false,
      false,
    ]);
  });

  // It strikes the moss brick once, leaving it a hit of its two, and the
  // wall comes down a row.
  it("grows the moss its flight struck back a hit in the next round's wall", () => {
    const start = startAt(["........M"]);

    const round = playRound(start, { aim: aimAt(45) }, FLIGHT_RULES);

    expect([
      round.flight.events.filter(({ kind }) => kind === "strike").length,
      round.next.wall.bricks[8]?.hits,
      round.next.wall.lowestRow,
    ]).toEqual([1, 2, 4]);
  });

  // The fixture meets a lock, which the game's trait rules shut by its
  // bolts, and rules without the lock's leave open.
  it("flies by the game's trait rules unless it is handed others", () => {
    const { start, shot, rules } = FLIGHT_FIXTURES.bolt;
    const unbolted: TraitRules = { ...TRAIT_RULES, bolted: {} };

    const round = playRound(start, shot, rules);
    const game = playRound(start, shot, rules, TRAIT_RULES);
    const without = playRound(start, shot, rules, unbolted);

    expect([round, boltsIn(round), boltsIn(without)]).toStrictEqual([
      game,
      1,
      0,
    ]);
  });

  it("throws for an aim that isn't one of the 657", () => {
    expect(() => playRound(startAt([]), { aim: 657 }, FLIGHT_RULES)).toThrow(
      RangeError,
    );
  });
});

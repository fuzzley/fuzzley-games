import { cellOf } from "@fz/brick-wall/rules/grid";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import { FLIGHT_FIXTURES } from "../../../testing/flight_fixtures";
import { eventsOf, flyAt, timeless } from "../../../testing/shots";
import type { Brick } from "../../catalog/kinds";
import type { FlightEvent } from "../../flight/events";
import { fly } from "../../flight/flight";
import { WALL_LEGEND } from "../../levels/legend";
import { FLIGHT_RULES } from "../../tuning";
import { TRAIT_RULES } from "../trait_rules";
import { BOLTED_RULE } from "./bolted";

/** Returns the lock a character of a level's picture writes, alone in its wall's first cell. */
function lockOf(character: string): Brick {
  const [lock] = wallFrom([`${character}........`], WALL_LEGEND).bricks;
  if (!lock) throw new Error(`${character} writes no brick.`);
  return lock;
}

/** Returns a flight's events that a lock's bolts decide: its shielding, its bolts drawn and its strikes. */
function lockEventsOf(events: readonly FlightEvent[]): FlightEvent[] {
  return events.filter(
    ({ kind }) => kind === "shielded" || kind === "bolt" || kind === "strike",
  );
}

describe("BOLTED_RULE", () => {
  it("is the game's rule for a lock", () => {
    expect(TRAIT_RULES.bolted).toBe(BOLTED_RULE);
  });

  it.each([
    ["x", 1],
    ["y", 2],
    ["z", 3],
  ])("shuts a lock written %s by %i bolts, its tint", (character, bolts) => {
    const lock = lockOf(character);

    expect([BOLTED_RULE.bolts?.(lock), lock.tint]).toEqual([bolts, bolts]);
  });

  it("has a rule for no moment of a flight, its bolts all it gives fly()", () => {
    expect(Object.keys(BOLTED_RULE)).toEqual(["bolts"]);
  });
});

describe("BOLTED_RULE, flown", () => {
  // A hot shot off the right wall, the lock there still shut, the floor
  // and the left wall, its fourth turn drawing the bolt, then the other
  // lock, open; and at the lowest aim, off the side walls and fourth off a
  // lock still shut as that turn draws its bolt, as the fixtures were made.
  it.each(["bolt", "lockMet"] as const)(
    "flies the %s fixture as it was made by hand, by the game's trait rules",
    (name) => {
      const { start, shot, rules, round } = FLIGHT_FIXTURES[name];

      const { flight } = fly(start, shot, rules, TRAIT_RULES);

      expect([
        flight.events.map(({ kind }) => kind),
        lockEventsOf(flight.events).map(timeless),
      ]).toEqual([
        round.flight.events.map(({ kind }) => kind),
        lockEventsOf(round.flight.events).map(timeless),
      ]);
    },
  );

  // At the lowest aim between the side walls, up to the ceiling and down
  // again, meeting a lock of 3 bolts at the foot of the left column in
  // row 9 at its 8th turn, its 11th and its 15th.
  it("shields a lock of 3 bolts until the flight's 12th turn has drawn the last, and breaks it at a strike then", () => {
    const flown = flyAt({
      picture: ["z........"],
      lowestRow: 9,
      degrees: 8,
      rules: { ...FLIGHT_RULES, bored: 200 },
    });

    const turns = eventsOf(flown.flight, "turn");
    expect(lockEventsOf(flown.flight.events)).toEqual([
      { at: turns[3]?.at, kind: "bolt", drawn: 1 },
      { at: turns[7]?.at, kind: "shielded", cell: cellOf(0, 0), by: "lock" },
      { at: turns[7]?.at, kind: "bolt", drawn: 2 },
      { at: turns[10]?.at, kind: "shielded", cell: cellOf(0, 0), by: "lock" },
      { at: turns[11]?.at, kind: "bolt", drawn: 3 },
      {
        at: turns[14]?.at,
        kind: "strike",
        cell: cellOf(0, 0),
        took: 1,
        broke: true,
        rally: 1,
      },
    ]);
  });
});

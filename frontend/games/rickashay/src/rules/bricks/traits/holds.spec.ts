import { AIMS_PER_DEGREE, FIRST_AIM_DEGREES } from "@fz/brick-wall/rules/aims";
import { RADIUS } from "@fz/brick-wall/rules/field";
import { cellOf } from "@fz/brick-wall/rules/grid";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import { FLIGHT_FIXTURES } from "../../../testing/flight_fixtures";
import type { FlightEvent } from "../../flight/events";
import { type Flown, fly } from "../../flight/flight";
import { WALL_LEGEND } from "../../levels/legend";
import { FLIGHT_RULES } from "../../tuning";
import { TRAIT_RULES } from "../trait_rules";
import { HOLDS_RULE } from "./holds";

/** A lone hatch in the middle of its row. */
const LONE = ["....=...."];

/** Describes a shot at a wall drawn as a picture: where the fuzzball waits, and its aim's angle in degrees counter-clockwise from the floor on the right. */
interface PictureShot {
  readonly x: number;
  readonly degrees: number;
}

/** Returns the flight of a shot at a wall drawn as a picture, its lowest row in field row 5 of a field 11 deep, by the game's trait rules. */
function flyAt(picture: readonly string[], { x, degrees }: PictureShot): Flown {
  const wall = wallFrom(picture, WALL_LEGEND, { lowestRow: 5 });
  return fly(
    { wall, depth: 11, x, hot: false },
    { aim: (degrees - FIRST_AIM_DEGREES) * AIMS_PER_DEGREE },
    FLIGHT_RULES,
    TRAIT_RULES,
  );
}

/** Returns a flight's turns, and its holds and the hatches opening, as the kinds of event they are, each turn by what it was off. */
function holdsOf({ flight }: Flown): string[] {
  return flight.events.flatMap((event) => {
    switch (event.kind) {
      case "turn":
        return [`turn off ${event.off}`];
      case "hold":
        return [`hold, ${String(event.left)} left`];
      case "hatches-open":
        return [event.kind];
      default:
        return [];
    }
  });
}

/** Returns a flight's events of a kind. */
function eventsOf<K extends FlightEvent["kind"]>(
  { flight }: Flown,
  kind: K,
): Extract<FlightEvent, { readonly kind: K }>[] {
  return flight.events.filter(
    (event): event is Extract<FlightEvent, { readonly kind: K }> =>
      event.kind === kind,
  );
}

/** Returns a flight's holds and the hatches opening. */
function holdEventsOf(events: readonly FlightEvent[]): FlightEvent[] {
  return events.filter(
    ({ kind }) => kind === "hold" || kind === "hatches-open",
  );
}

/** Returns an event without its moment, which the flight's arithmetic and a fixture's may round apart. */
function timeless({ at: _, ...event }: FlightEvent): object {
  return event;
}

describe("HOLDS_RULE", () => {
  it("is the game's rule for a hatch", () => {
    expect(TRAIT_RULES.holds).toBe(HOLDS_RULE);
  });

  // Straight up through the hatch, and down onto its bar off the ceiling.
  it("lets the fuzzball rise through a hatch, and holds it up coming down onto the bar, three times, every hatch opening at the third", () => {
    const flown = flyAt(LONE, { x: 4.5, degrees: 90 });

    expect(holdsOf(flown)).toEqual([
      "turn off ceiling",
      "turn off bar",
      "hold, 2 left",
      "turn off ceiling",
      "turn off bar",
      "hold, 1 left",
      "turn off ceiling",
      "turn off bar",
      "hold, 0 left",
      "hatches-open",
      "turn off ceiling",
    ]);
  });

  it("holds it up on the bar's flat, a radius over the hatch's cell, naming the hatch", () => {
    const flown = flyAt(LONE, { x: 4.5, degrees: 90 });

    const [, bar] = eventsOf(flown, "turn");
    expect([bar?.y, eventsOf(flown, "hold")[0]]).toEqual([
      6 + RADIUS,
      { at: bar?.at, kind: "hold", cell: cellOf(4, 0), left: 2 },
    ]);
  });

  it("lets it fall through once the hatches open, to land", () => {
    const flown = flyAt(LONE, { x: 4.5, degrees: 90 });

    expect(eventsOf(flown, "land")).toEqual([
      expect.objectContaining({ x: expect.closeTo(4.5, 9) as number }),
    ]);
  });

  it("strikes nothing, and leaves the hatch standing", () => {
    const flown = flyAt(LONE, { x: 4.5, degrees: 90 });

    expect([
      eventsOf(flown, "strike"),
      flown.flight.rally,
      flown.wall.bricks[cellOf(4, 0)]?.kind,
    ]).toEqual([[], 0, "hatch"]);
  });

  // Up at 30° off the right wall, and on up into the cut at the right end
  // of the hatch's bar.
  it("holds it up at a turn off a bar's cut end, flying up", () => {
    const flown = flyAt(LONE, { x: 2.25, degrees: 30 });

    const [offTheWall] = eventsOf(flown, "turn");
    expect([
      holdsOf(flown).slice(0, 3),
      Math.sign(offTheWall?.dy ?? 0),
    ]).toEqual([["turn off wall", "turn off bar", "hold, 2 left"], 1]);
  });

  // Straight up through the joint of two hatches, and down onto both bars.
  it("holds once a turn however many hatches the turn meets", () => {
    const flown = flyAt(["....==..."], { x: 5, degrees: 90 });

    expect(
      eventsOf(flown, "hold").map(({ cell, left }) => [cell, left]),
    ).toEqual([
      [cellOf(4, 0), 2],
      [cellOf(4, 0), 1],
      [cellOf(4, 0), 0],
    ]);
  });

  it("holds the hatch fixture's flight up as the stand-ins held it", () => {
    const { start, shot, rules, round } = FLIGHT_FIXTURES.hatch;

    const { flight } = fly(start, shot, rules, TRAIT_RULES);

    expect([
      flight.events.map(({ kind }) => kind),
      holdEventsOf(flight.events).map(timeless),
    ]).toEqual([
      round.flight.events.map(({ kind }) => kind),
      holdEventsOf(round.flight.events).map(timeless),
    ]);
  });
});

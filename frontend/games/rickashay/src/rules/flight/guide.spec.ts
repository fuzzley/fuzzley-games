import { AIMS_PER_DEGREE, FIRST_AIM_DEGREES } from "@fz/brick-wall/rules/aims";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import { type Waypoint, positionAt } from "@fz/brick-wall/rules/track";
import { keysOf } from "@fz/core/records";
import { FLIGHT_FIXTURES } from "../../testing/flight_fixtures";
import { STAND_INS } from "../../testing/stand_ins";
import { WALL_LEGEND } from "../levels/legend";
import { playRound } from "../round/round";
import { FLIGHT_RULES } from "../tuning";
import type { Flight, RoundStart } from "./events";
import { type Guide, guideOf } from "./guide";

/** Returns the aim at an angle, in degrees counter-clockwise from the floor on the right. */
function aimAt(degrees: number): number {
  return (degrees - FIRST_AIM_DEGREES) * AIMS_PER_DEGREE;
}

/** Returns a number matched as near as the flight's arithmetic finds it. */
function near(value: number): number {
  return expect.closeTo(value, 9) as number;
}

/** Returns where a round starts on a field 11 deep, its fuzzball waiting at the floor's middle, at a wall drawn as a picture whose lowest row stands in field row 5. */
function startAt(picture: readonly string[]): RoundStart {
  const wall = wallFrom(picture, WALL_LEGEND, { lowestRow: 5 });
  return { wall, depth: 11, x: 4.5, hot: false };
}

/** Returns where a guide of so many turns ends on a round's flight: so far past that turn, or at the landing where it lands first. */
function endOf(flight: Flight, turns: number, past: number): number {
  const turn = flight.events.filter(({ kind }) => kind === "turn")[turns - 1];
  return Math.min((turn?.at ?? Number.POSITIVE_INFINITY) + past, flight.length);
}

/** Returns what a guide shows of its flight: each turn, by what it turned off, and each other event, by its kind. */
function shownBy({ events }: Guide): string[] {
  return events.map((event) =>
    event.kind === "turn" ? `turn off ${event.off}` : event.kind,
  );
}

/** Returns a place on a track matched as near as the flight's arithmetic finds it. */
function nearPlace(place: Waypoint | null): unknown {
  return place === null
    ? null
    : { at: near(place.at), x: near(place.x), y: near(place.y) };
}

/** Every fixture, with each number of turns the player's setting asks for. */
const GUIDES = keysOf(FLIGHT_FIXTURES).flatMap((name) =>
  [1, 3, 5].map((turns) => [name, turns] as const),
);

/** A steel brick in column 4, whose lower face a shot straight up from the floor's middle turns off at 4.5, at y 4.75. */
const STEEL = ["....#...."];

describe("guideOf()", () => {
  it.each(GUIDES)(
    "shows the %s fixture's round's own events to %i turns and the guide's length past",
    (name, turns) => {
      const { start, shot, rules } = FLIGHT_FIXTURES[name];
      const { flight } = playRound(start, shot, rules, STAND_INS);
      const end = endOf(flight, turns, rules.guidePast);

      const guide = guideOf(start, shot, rules, turns, STAND_INS);

      expect([guide.events, guide.length]).toEqual([
        flight.events.filter(({ at }) => at <= end),
        near(end),
      ]);
    },
  );

  it.each(GUIDES)(
    "lays the %s fixture's guide of %i turns along its round's track",
    (name, turns) => {
      const { start, shot, rules } = FLIGHT_FIXTURES[name];
      const { flight } = playRound(start, shot, rules, STAND_INS);

      const guide = guideOf(start, shot, rules, turns, STAND_INS);

      expect(guide.track.waypoints).toEqual([
        ...flight.track.waypoints.filter(({ at }) => at < guide.length),
        nearPlace(positionAt(flight.track, guide.length)),
      ]);
    },
  );

  // At the lowest aim it turns off the side walls 8.6 units apart.
  it.each([
    [FLIGHT_RULES.guideTurns, FLIGHT_RULES],
    [2, { ...FLIGHT_RULES, guideTurns: 2 }],
  ])(
    "follows the shot to the rules' guide turns, %i, where it is asked for none",
    (turns, rules) => {
      const { start, shot } = FLIGHT_FIXTURES.bored;

      const guide = guideOf(start, shot, rules);

      expect(guide.events.filter(({ kind }) => kind === "turn")).toHaveLength(
        turns,
      );
    },
  );

  // It turns off the right wall and the brick, then spends its floor
  // bounce off the floor, its third turn.
  it("shows a floor bounce in hand spent off the floor", () => {
    const { start, shot, rules } = FLIGHT_FIXTURES.hot;

    const guide = guideOf(start, shot, rules);

    expect(shownBy(guide)).toEqual([
      "turn off wall",
      "turn off brick",
      "strike",
      "turn off floor",
      "bounce-spent",
    ]);
  });

  it.each([
    [1.5, 3.25],
    [3, 1.75],
  ])(
    "runs on %s past its last turn, the way the fuzzball turned, to y %s",
    (guidePast, y) => {
      const rules = { ...FLIGHT_RULES, guidePast };

      const guide = guideOf(startAt(STEEL), { aim: aimAt(90) }, rules, 1);

      expect(guide.track.waypoints.at(-1)).toEqual({
        at: near(4.5 + guidePast),
        x: near(4.5),
        y: near(y),
      });
    },
  );

  // Straight up off the steel, it lands having turned once.
  it("runs to the landing where the fuzzball lands before the turn asked for", () => {
    const guide = guideOf(startAt(STEEL), { aim: aimAt(90) }, FLIGHT_RULES);

    expect([shownBy(guide), guide.length]).toEqual([
      ["turn off brick", "land"],
      near(9),
    ]);
  });

  it("throws for an aim that isn't one of the 657", () => {
    expect(() => guideOf(startAt([]), { aim: 657 }, FLIGHT_RULES)).toThrow(
      RangeError,
    );
  });
});

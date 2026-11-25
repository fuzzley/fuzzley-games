import {
  AIMS,
  AIMS_PER_DEGREE,
  FIRST_AIM_DEGREES,
} from "@fz/brick-wall/rules/aims";
import { RADIUS } from "@fz/brick-wall/rules/field";
import { cellOf } from "@fz/brick-wall/rules/grid";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import type { FlightEvent } from "../../flight/events";
import { type Flown, fly } from "../../flight/flight";
import { WALL_LEGEND } from "../../levels/legend";
import { FLIGHT_RULES, STAND_OFF } from "../../tuning";
import { TRAIT_RULES } from "../trait_rules";

/** The aim straight up. */
const UP = (90 - FIRST_AIM_DEGREES) * AIMS_PER_DEGREE;

/** How far across the aim straight up flies for each unit up: a rounding's worth, not nothing. */
const UP_DX = AIMS[UP]?.[0] ?? NaN;

/** How long the flat that cuts a ramp's point square is. */
const TIP = STAND_OFF - RADIUS;

/** A ramp in column 4 whose right angle sits in its cell's ceilingward right corner, its long face looking down and left. */
const DOWNWARD = "....7....";

/**
 * That ramp, and one in column 1 whose right angle sits in its cell's
 * floorward left corner, its long face looking up and right, which a
 * fuzzball flying left off the first meets.
 */
const BOTH_WAYS = ".L..7....";

/** The wall cells of the ramps in columns 1 and 4. */
const RAMP_1 = cellOf(1, 0);
const RAMP_4 = cellOf(4, 0);

/** Returns the flight of a shot straight up from an x at a row of ramps drawn as a picture, standing in field row 5 of a field 11 deep, by the game's own rules. */
function flyUpAt(row: string, x: number): Flown {
  const wall = wallFrom([row], WALL_LEGEND, { lowestRow: 5 });
  return fly(
    { wall, depth: 11, x, hot: false },
    { aim: UP },
    FLIGHT_RULES,
    TRAIT_RULES,
  );
}

/** Returns a flight's turns, each as where it was, the heading it left on and what it was off. */
function turnsOf({ flight }: Flown): unknown[] {
  return flight.events
    .filter(
      (event): event is Extract<FlightEvent, { readonly kind: "turn" }> =>
        event.kind === "turn",
    )
    .map(({ x, y, dx, dy, off, cells }) => [x, y, dx, dy, off, cells]);
}

/** Returns a number matched as near as the flight's arithmetic finds it. */
function near(value: number): number {
  return expect.closeTo(value, 9) as number;
}

// Each ramp's long face is met a radius out from its long side, at the
// height its line crosses the middle of column 4: 5.5 − STAND_OFF.
describe("a ramp, flown by the game's own rules", () => {
  it("sends a fuzzball that climbs into its long face off sideways", () => {
    const flown = flyUpAt(DOWNWARD, 4.5);

    expect(turnsOf(flown)[0]).toEqual([
      near(4.5),
      near(5.5 - STAND_OFF),
      -1,
      near(-UP_DX),
      "brick",
      [RAMP_4],
    ]);
  });

  // Off the left wall, and back into the same long face.
  it("sends a fuzzball that flies sideways into a long face looking down off falling", () => {
    const flown = flyUpAt(DOWNWARD, 4.5);

    expect(turnsOf(flown)[2]).toEqual([
      near(4.5),
      near(5.5 - STAND_OFF),
      near(UP_DX),
      -1,
      "brick",
      [RAMP_4],
    ]);
  });

  it("sends a fuzzball that flies sideways into a long face looking up off climbing", () => {
    const flown = flyUpAt(BOTH_WAYS, 4.5);

    expect(turnsOf(flown)[1]).toEqual([
      near(1.5 + 2 * STAND_OFF),
      near(5.5 - STAND_OFF),
      near(UP_DX),
      1,
      "brick",
      [RAMP_1],
    ]);
  });

  it("mirrors a fuzzball off its short side, as a brick's flat does", () => {
    const flown = flyUpAt("....L....", 4.5);

    expect(turnsOf(flown)[0]).toEqual([
      near(4.5),
      near(5 - RADIUS),
      near(UP_DX),
      -1,
      "brick",
      [RAMP_4],
    ]);
  });

  // The point at the "7"'s floorward right corner is cut square by a flat
  // across, a radius under the cell, from where the long face meets it to
  // the corner.
  it("mirrors a fuzzball off the flat that cuts its point square", () => {
    const flown = flyUpAt(DOWNWARD, 5 - TIP / 2);

    expect(turnsOf(flown)[0]).toEqual([
      near(5 - TIP / 2),
      near(5 - RADIUS),
      near(UP_DX),
      -1,
      "brick",
      [RAMP_4],
    ]);
  });

  it("takes no strike from a turn off its long face, its short side or the flat that cuts its point", () => {
    const flights = [
      flyUpAt(BOTH_WAYS, 4.5),
      flyUpAt("....L....", 4.5),
      flyUpAt(DOWNWARD, 5 - TIP / 2),
    ];

    expect(
      flights.map(({ flight }) => [flight.rally, flight.lastStrike]),
    ).toEqual([
      [0, null],
      [0, null],
      [0, null],
    ]);
  });
});

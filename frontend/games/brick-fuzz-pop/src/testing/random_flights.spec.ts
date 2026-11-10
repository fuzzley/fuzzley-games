import type { Flight, FlightEvent, Waypoint } from "../rules/flight/events";
import { RADIUS } from "../rules/tuning";
import { clearanceProblemsOf } from "./random_flights";
import { STAND_INS } from "./stand_ins";
import { wallFrom } from "./wall_picture";

/** Returns a flight of one fuzzball along a track, with events. */
function flightAlong(
  waypoints: readonly Waypoint[],
  events: readonly FlightEvent[] = [],
): Flight {
  return {
    events,
    tracks: [{ ball: 0, role: "player", waypoints }],
    length: waypoints.at(-1)?.at ?? 0,
    capped: 0,
  };
}

/** Returns the problems of a flight past a wall drawn as a picture, its lowest row in field row 5 of a field 11 deep. */
function problemsPast(picture: readonly string[], flight: Flight): string[] {
  const wall = wallFrom(picture, { lowestRow: 5 });
  return clearanceProblemsOf(flight, wall, 11, STAND_INS);
}

describe("clearanceProblemsOf", () => {
  it("finds no problem with a flight that keeps clear", () => {
    const flight = flightAlong([
      { at: 0, x: 4.5, y: RADIUS },
      { at: 4.5, x: 4.5, y: 5 - RADIUS },
    ]);

    expect(problemsPast(["....o...."], flight)).toEqual([]);
  });

  it("finds a leg that flies through a brick", () => {
    const flight = flightAlong([
      { at: 0, x: 4.5, y: RADIUS },
      { at: 10.5, x: 4.5, y: 10.75 },
    ]);

    expect(problemsPast(["....o...."], flight)).toEqual([
      `Fuzzball 0's leg to 10.5 comes ${String(RADIUS)} too near a brick.`,
    ]);
  });

  it("finds a leg that flies past a brick nearer than the radius", () => {
    const flight = flightAlong([
      { at: 0, x: 3.9, y: RADIUS },
      { at: 10.5, x: 3.9, y: 10.75 },
    ]);

    expect(problemsPast(["....o...."], flight)).toHaveLength(1);
  });

  it("finds a leg that flies within a bumper's reach", () => {
    const flight = flightAlong([
      { at: 0, x: 4.5, y: RADIUS },
      { at: 5, x: 4.5, y: 5 + RADIUS },
    ]);

    expect(problemsPast(["....-...."], flight)).toHaveLength(1);
  });

  it("leaves out a fuzzball's drop home, and a jump through a portal", () => {
    const flight = flightAlong(
      [
        { at: 0, x: 4.5, y: 2 },
        { at: 0, x: 4.5, y: 9 },
        { at: 1, x: 4.5, y: 8 },
        { at: 8.75, x: 4.5, y: RADIUS },
      ],
      [{ at: 1, kind: "yawn", ball: 0, x: 4.5, y: 8 }],
    );

    expect(problemsPast(["....o...."], flight)).toEqual([]);
  });
});

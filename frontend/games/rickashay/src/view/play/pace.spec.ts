import type { Pace } from "@fz/brick-wall/view/playback";
import { FLIGHT_FIXTURES } from "../../testing/flight_fixtures";
import {
  FLIGHT_PACE,
  type FlightMoments,
  type FlightSpeed,
  paceOf,
} from "./pace";

const { rally, bored } = FLIGHT_FIXTURES;

/** A flight that strikes at each of the rally's marks, at 10, 25 and 45 units, and last at 50. */
const EVERY_MARK: FlightMoments = { marks: [10, 25, 45], lastStrike: 50 };

/** Each setting, with a flight's speeds there: from its release, from each mark and dashing home. */
const SPEEDS: readonly (readonly [FlightSpeed, readonly number[]])[] = [
  ["normal", [14, 17, 20, 24, 72]],
  ["fast", [22, 26, 30, 36, 108]],
];

/** Returns the speeds a pace plays at, in units a second: before its first mark, then from each in turn. */
function speedsOf(pace: Pace): number[] {
  let speed = pace.unitsPerSecond;
  return [
    speed,
    ...pace.byDistance.map(({ times }) => {
      speed *= times;
      return speed;
    }),
  ];
}

/** Returns where a pace's marks by distance fall, in units flown. */
function marksOf(pace: Pace): number[] {
  return pace.byDistance.map(({ from }) => from);
}

describe("paceOf", () => {
  it.each(SPEEDS)(
    "plays a flight that strikes at every mark, at %s, at the design's four speeds, then three times the last",
    (speed, speeds) => {
      const pace = paceOf(EVERY_MARK, speed, FLIGHT_PACE);

      expect(speedsOf(pace)).toEqual(
        speeds.map((each): unknown => expect.closeTo(each, 9)),
      );
    },
  );

  it("quickens a flight from its strikes at the marks, then dashes from its last strike", () => {
    const pace = paceOf(EVERY_MARK, "normal", FLIGHT_PACE);

    expect(marksOf(pace)).toEqual([10, 25, 45, 50]);
  });

  it("quickens a flight only at the marks it reached", () => {
    const { flight } = rally.round;

    const pace = paceOf(flight, "normal", FLIGHT_PACE);

    expect([marksOf(pace), speedsOf(pace)]).toEqual([
      [flight.marks[0], flight.lastStrike],
      [14, expect.closeTo(17, 9), expect.closeTo(51, 9)],
    ]);
  });

  it("stacks the dash on a mark at the same strike", () => {
    const pace = paceOf({ marks: [10], lastStrike: 10 }, "normal", FLIGHT_PACE);

    expect(speedsOf(pace)).toEqual([
      14,
      expect.closeTo(17, 9),
      expect.closeTo(51, 9),
    ]);
  });

  it("plays a flight that strikes nothing at its first speed to the end", () => {
    const pace = paceOf(bored.round.flight, "fast", FLIGHT_PACE);

    expect([pace.unitsPerSecond, pace.byDistance]).toEqual([22, []]);
  });

  it("marks nothing by the time a flight has played", () => {
    const pace = paceOf(EVERY_MARK, "normal", FLIGHT_PACE);

    expect(pace.byTime).toEqual([]);
  });

  it("plays at the speeds and the dash it is handed", () => {
    const pace = paceOf({ marks: [10], lastStrike: 30 }, "normal", {
      ...FLIGHT_PACE,
      speeds: { ...FLIGHT_PACE.speeds, normal: [10, 20, 30, 40] },
      dash: 5,
    });

    expect(speedsOf(pace)).toEqual([10, 20, 100]);
  });
});

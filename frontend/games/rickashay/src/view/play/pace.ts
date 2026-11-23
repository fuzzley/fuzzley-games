// How fast a flight plays back, as the design's "The feel, in numbers" sets
// it: a speed from the release, quicker from each of its strikes at
// `RALLY_MARKS`, three times that from its last strike as it dashes home,
// and four times all of it fast-forwarded. A flight's moments are where its
// speed changes, so its pace is `@fz/brick-wall`'s marks by distance.

import type { Pace, PaceMark } from "@fz/brick-wall/view/playback";
import type { Flight } from "../../rules/flight/events";
import type { RALLY_MARKS } from "../../rules/tuning";

/** Every speed a flight plays back at, as the settings offer them. */
export const FLIGHT_SPEEDS = [
  "normal",
  "fast",
] as const satisfies readonly string[];

/** Names how fast a flight plays back, such as "fast". */
export type FlightSpeed = (typeof FLIGHT_SPEEDS)[number];

/** Describes the moments of a flight its pace changes at: its strikes at each of `RALLY_MARKS`, and its last strike. */
export type FlightMoments = Pick<Flight, "marks" | "lastStrike">;

/** A number for each entry of a list, in a list as long. */
type NumberEach<List extends readonly unknown[]> = {
  readonly [Entry in keyof List]: number;
};

/**
 * A flight's speeds at one setting, in units a second: from its release,
 * then from its strike at each of `RALLY_MARKS`, one for each, so a mark
 * added there fails to compile until its speed is.
 */
export type Speeds = readonly [
  fromRelease: number,
  ...fromMarks: NumberEach<typeof RALLY_MARKS>,
];

/** Describes how fast a flight plays back, the numbers a debug menu may tune. */
export interface FlightPace {
  /** A flight's speeds at each setting. */
  readonly speeds: Readonly<Record<FlightSpeed, Speeds>>;
  /** How many times its speed a flight flies from its last strike to the floor, dashing home. */
  readonly dash: number;
  /** How many times faster a flight plays while fast-forward is on, at either setting. */
  readonly fastForward: number;
}

/** The pace a flight plays back at, as the design sets it, untuned. */
export const FLIGHT_PACE = {
  speeds: { normal: [14, 17, 20, 24], fast: [22, 26, 30, 36] },
  dash: 3,
  fastForward: 4,
} as const satisfies FlightPace;

/**
 * Returns the pace a flight plays back at, at a setting: its first speed,
 * quickening to the next from its strike at each of `RALLY_MARKS` it made,
 * and dashing home from its last strike, by the units it has flown.
 */
export function paceOf(
  flight: FlightMoments,
  speed: FlightSpeed,
  pace: FlightPace,
): Pace {
  const [first, ...fromMarks] = pace.speeds[speed];
  const byDistance: PaceMark[] = [];
  let before = first;
  fromMarks.forEach((after, nth) => {
    const from = flight.marks[nth];
    // Each mark is on top of those before it, as the playback stacks them.
    if (from !== undefined) byDistance.push({ from, times: after / before });
    before = after;
  });
  if (flight.lastStrike !== null) {
    byDistance.push({ from: flight.lastStrike, times: pace.dash });
  }
  return { unitsPerSecond: first, byDistance, byTime: [] };
}

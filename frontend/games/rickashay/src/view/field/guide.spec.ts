import { COLUMNS, MOST_DEPTH } from "@fz/brick-wall/rules/field";
import type { Waypoint } from "@fz/brick-wall/rules/track";
import type { GuideDot, GuidePlace } from "@fz/brick-wall/view/guide";
import type { FlightEvent } from "../../rules/flight/events";
import { FLIGHT_RULES } from "../../rules/tuning";
import { billionths } from "../../testing/art_frames";
import {
  GUIDE_DOT_GAP,
  type GuideFlight,
  type GuideReach,
  MOST_GUIDE_DOTS,
  MOST_GUIDE_RINGS,
  MOST_GUIDE_TURNS,
  WallGuides,
  wallGuideOf,
} from "./guide";

/** A brick a flight strikes, and when. */
interface Strike {
  readonly at: number;
  readonly cell: number;
}

/** Returns a strike of a brick at a moment, as a flight's events have one. */
function strikeOf({ at, cell }: Strike): FlightEvent {
  return { kind: "strike", at, cell, took: 1, broke: false, rally: 1 };
}

/**
 * Returns a flight through some places in order, joined by straight lines
 * flown at a unit a unit of `at`: it turns at each place between its first
 * and its last, strikes as given, and lands at its last, or, as the rules
 * stop the guide's cast, ends there in the air.
 */
function flightThrough(
  places: readonly GuidePlace[],
  {
    strikes = [],
    lands = true,
  }: { strikes?: readonly Strike[]; lands?: boolean } = {},
): GuideFlight {
  const waypoints: Waypoint[] = [];
  let at = 0;
  places.forEach((place, index) => {
    const before = places[index - 1];
    at += before ? Math.hypot(place.x - before.x, place.y - before.y) : 0;
    waypoints.push({ at, x: place.x, y: place.y });
  });
  const turns = waypoints
    .slice(1, -1)
    .map(({ at: turnAt, x, y }): FlightEvent => ({
      kind: "turn",
      at: turnAt,
      x,
      y,
      dx: 0,
      dy: 0,
      off: "wall",
      cells: [],
    }));
  const last = waypoints.at(-1) ?? { at: 0, x: 0, y: 0 };
  const land: readonly FlightEvent[] = lands
    ? [{ kind: "land", at: last.at, x: last.x }]
    : [];
  // A copy sorted in a way that keeps the order of a moment's events: its
  // turn, then its strikes.
  const events = [...turns, ...strikes.map(strikeOf), ...land].sort(
    (a, b) => a.at - b.at,
  );
  return {
    track: { ball: 0, role: "player", waypoints },
    events,
  };
}

/** The places of a flight with three turns, its legs 3.5 long: up the field, across it, down it, and across it again. */
const ZIGZAG_PLACES: readonly GuidePlace[] = [
  { x: 1, y: 1 },
  { x: 1, y: 4.5 },
  { x: 4.5, y: 4.5 },
  { x: 4.5, y: 1 },
  { x: 8, y: 1 },
];

/** A flight with three turns that lands, 14 long. */
const ZIGZAG = flightThrough(ZIGZAG_PLACES);

/** The flight the guide is cast as, stopped in the air 1.5 past its third turn, at 12. */
const STOPPED = flightThrough([...ZIGZAG_PLACES.slice(0, -1), { x: 6, y: 1 }], {
  lands: false,
});

/** How far the guide follows a shot, as the rules set it: to its third turn, and 1.5 past it. */
const REACH: GuideReach = FLIGHT_RULES;

/** How far the guide runs on past its last turn, as the rules set it. */
const PAST = REACH.guidePast;

/** Returns a guide's dots to a billionth, how strongly each shows where it says. */
function dotsOf(flight: GuideFlight, reach = REACH): GuideDot[] {
  return wallGuideOf(flight, reach).dots.map(({ x, y, alpha }) => ({
    x: billionths(x),
    y: billionths(y),
    ...(alpha === undefined ? {} : { alpha: billionths(alpha) }),
  }));
}

describe("wallGuideOf", () => {
  it("lays a dot a gap along the flight from where it leaves", () => {
    expect(dotsOf(ZIGZAG).slice(0, 3)).toEqual([
      { x: 1, y: billionths(1 + GUIDE_DOT_GAP) },
      { x: 1, y: billionths(1 + 2 * GUIDE_DOT_GAP) },
      { x: 1, y: billionths(1 + 3 * GUIDE_DOT_GAP) },
    ]);
  });

  it("carries its dots round a turn a gap apart along the flight, not across the corner", () => {
    expect(dotsOf(ZIGZAG).slice(8, 10)).toEqual([
      { x: 1, y: billionths(1 + 9 * GUIDE_DOT_GAP) },
      { x: billionths(1 + 10 * GUIDE_DOT_GAP - 3.5), y: 4.5 },
    ]);
  });

  it("rings each of the flight's turns", () => {
    expect(wallGuideOf(STOPPED, REACH).turns).toEqual(
      ZIGZAG_PLACES.slice(1, -1),
    );
  });

  it("fades the dots past the turn the guide follows a flight to, to nothing where the rules stop it", () => {
    // The third turn is 10.5 along; the cast stops 1.5 past it, at 12.
    expect(dotsOf(STOPPED).slice(28)).toEqual([
      { x: 4.5, y: billionths(4.5 - (29 * GUIDE_DOT_GAP - 7)) },
      ...[30, 31, 32, 33].map((dot) => ({
        x: billionths(4.5 + dot * GUIDE_DOT_GAP - 10.5),
        y: 1,
        alpha: billionths(1 - (dot * GUIDE_DOT_GAP - 10.5) / PAST),
      })),
    ]);
  });

  it("fades the dots of a flight that lands soon past that turn as fast, to where it lands", () => {
    const flight = flightThrough([
      ...ZIGZAG_PLACES.slice(0, -1),
      { x: 5.5, y: 1 },
    ]);

    expect(
      dotsOf(flight)
        .slice(29)
        .map(({ alpha }) => alpha),
    ).toEqual(
      [30, 31].map((dot) =>
        billionths(1 - (dot * GUIDE_DOT_GAP - 10.5) / PAST),
      ),
    );
  });

  it("shows a flight that lands before that turn to where it lands, no dot faded", () => {
    const dots = dotsOf(ZIGZAG, { ...REACH, guideTurns: MOST_GUIDE_TURNS });

    expect({
      count: dots.length,
      faded: dots.filter((dot) => dot.alpha !== undefined),
    }).toEqual({ count: Math.floor(14 / GUIDE_DOT_GAP), faded: [] });
  });

  it("marks each brick the flight strikes, once each, in the order it strikes them", () => {
    const flight = flightThrough(ZIGZAG_PLACES, {
      strikes: [
        { at: 3.5, cell: 40 },
        { at: 7, cell: 12 },
        { at: 10.5, cell: 40 },
        { at: 13, cell: 3 },
      ],
    });

    expect(wallGuideOf(flight, REACH).struck).toEqual([40, 12, 3]);
  });

  it("leaves no dot between a portal's eye and its twin's", () => {
    const flight: GuideFlight = {
      track: {
        ball: 0,
        role: "player",
        waypoints: [
          { at: 0, x: 1, y: 1 },
          { at: 0.5, x: 1, y: 1.5 },
          { at: 0.5, x: 6, y: 3 },
          { at: 2, x: 6, y: 4.5 },
        ],
      },
      events: [{ kind: "land", at: 2, x: 6 }],
    };

    expect(dotsOf(flight).slice(0, 2)).toEqual([
      { x: 1, y: billionths(1 + GUIDE_DOT_GAP) },
      { x: 6, y: billionths(3 + 2 * GUIDE_DOT_GAP - 0.5) },
    ]);
  });

  it("shows no more dots than the most it shows, along the longest guide: its most turns, each across the deepest field from corner to corner, and the way past", () => {
    const corners = Array.from({ length: MOST_GUIDE_TURNS + 1 }, (_, at) =>
      at % 2 === 0 ? { x: 0, y: 0 } : { x: COLUMNS, y: MOST_DEPTH },
    );
    const leg = Math.hypot(COLUMNS, MOST_DEPTH);
    const last = corners.at(-1) ?? { x: 0, y: 0 };
    // On from the last corner toward the one across, as far as the guide runs past it.
    const way = last.x === 0 ? 1 : -1;
    const past = {
      x: last.x + (way * PAST * COLUMNS) / leg,
      y: last.y + (way * PAST * MOST_DEPTH) / leg,
    };
    const { dots } = wallGuideOf(
      flightThrough([...corners, past], { lands: false }),
      { ...REACH, guideTurns: MOST_GUIDE_TURNS },
    );

    expect(dots.length).toBeLessThanOrEqual(MOST_GUIDE_DOTS);
  });

  it("rings every turn of a guide that crosses a gap a cell wide every half a unit on the way past its last turn, as many as its pool holds", () => {
    const flight = flightThrough(
      [
        { x: 1, y: 1 },
        { x: 1, y: 4 },
        { x: 4, y: 4 },
        { x: 4, y: 1 },
        { x: 2, y: 1 },
        // The last turn the guide follows the shot to, then across the gap
        // and back, turning every half a unit, till the rules stop it.
        { x: 3.25, y: 5 },
        { x: 3.75, y: 5 },
        { x: 3.25, y: 5 },
        { x: 3.75, y: 5 },
        // Where the rules stop it, at its last turn's own place, so that
        // place is a turn and not the end.
        { x: 3.75, y: 5 },
      ],
      { lands: false },
    );

    expect(
      wallGuideOf(flight, { ...REACH, guideTurns: MOST_GUIDE_TURNS }).turns,
    ).toHaveLength(MOST_GUIDE_RINGS);
  });
});

describe("WallGuides", () => {
  it("shows no guide for no flight", () => {
    expect(new WallGuides().of(null, REACH)).toBeNull();
  });

  it("makes one guide of a flight, however often it is read", () => {
    const guides = new WallGuides();

    const first = guides.of(STOPPED, REACH);

    expect(guides.of(STOPPED, { ...REACH })).toBe(first);
  });

  it("makes a guide again for a flight cast again", () => {
    const guides = new WallGuides();
    guides.of(STOPPED, REACH);

    expect(guides.of(ZIGZAG, REACH)).toEqual(wallGuideOf(ZIGZAG, REACH));
  });

  it.each<[string, GuideReach]>([
    ["turn it follows a shot to", { ...REACH, guideTurns: 2 }],
    ["way past that turn", { ...REACH, guidePast: 3 }],
  ])("makes a guide again as the %s is retuned", (_, retuned) => {
    const guides = new WallGuides();
    guides.of(STOPPED, REACH);

    expect(guides.of(STOPPED, retuned)).toEqual(wallGuideOf(STOPPED, retuned));
  });
});

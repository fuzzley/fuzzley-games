import {
  type At,
  type BallTrack,
  type KeyedEvent,
  type Waypoint,
  byMoment,
  positionAt,
} from "./track";

/** Roles made up for the specs: the fuzzball shot, and one that follows it. */
type Role = "lead" | "follower";

/** Returns the lead's track through places given as [at, x, y]. */
function trackOf(
  ...places: (readonly [number, number, number])[]
): BallTrack<Role> {
  return {
    ball: 0,
    role: "lead",
    waypoints: places.map(([at, x, y]) => ({ at, x, y })),
  };
}

/** Returns an event at a moment keyed by its section, what it happens to, its rank and when it happened. */
function keyed(
  at: number,
  section: number,
  who: number,
  rank: number,
  seq: number,
): KeyedEvent<At> {
  return { event: { at }, section, who, rank, seq };
}

// Up to the right wall, back to the left, up to a brick, down to the floor:
// five legs, so the search by halves has room to go wrong in.
const ZIGZAG = trackOf(
  [2, 4.5, 0.25],
  [6, 8.5, 0.25],
  [10, 8.5, 4.25],
  [14, 4.5, 4.25],
  [16, 4.5, 6.25],
  [22, 4.5, 0.25],
);

describe("positionAt", () => {
  it("has no fuzzball before it leaves", () => {
    expect(positionAt(ZIGZAG, 1.999)).toBeNull();
  });

  it("finds it where it leaves from as it leaves", () => {
    expect(positionAt(ZIGZAG, 2)).toEqual({ at: 2, x: 4.5, y: 0.25 });
  });

  it.each<[number, Waypoint]>([
    [3, { at: 3, x: 5.5, y: 0.25 }],
    [7, { at: 7, x: 8.5, y: 1.25 }],
    [11, { at: 11, x: 7.5, y: 4.25 }],
    [15, { at: 15, x: 4.5, y: 5.25 }],
    [19, { at: 19, x: 4.5, y: 3.25 }],
  ])("finds it on its leg between two turns at %s", (at, place) => {
    expect(positionAt(ZIGZAG, at)).toEqual(place);
  });

  it.each<[number, Waypoint]>([
    [6, { at: 6, x: 8.5, y: 0.25 }],
    [10, { at: 10, x: 8.5, y: 4.25 }],
    [14, { at: 14, x: 4.5, y: 4.25 }],
    [16, { at: 16, x: 4.5, y: 6.25 }],
  ])("finds it where it turns at %s", (at, place) => {
    expect(positionAt(ZIGZAG, at)).toEqual(place);
  });

  it("finds it where it lands as it lands", () => {
    expect(positionAt(ZIGZAG, 22)).toEqual({ at: 22, x: 4.5, y: 0.25 });
  });

  // Taken from its last leg, 4.5 + (0.1 - 4.5) would come to 0.0999…96.
  it("finds it exactly where it lands, however its last leg rounds", () => {
    const track = trackOf([0, 4.5, 0.25], [8, 0.1, 6.25]);

    expect(positionAt(track, 8)).toEqual({ at: 8, x: 0.1, y: 6.25 });
  });

  it("has no fuzzball after it lands", () => {
    expect(positionAt(ZIGZAG, 22.001)).toBeNull();
  });

  it("finds a fuzzball through a pair of twins where it comes out, at the moment it goes in", () => {
    const track = trackOf(
      [0, 4.5, 0.25],
      [3, 4.5, 3.25],
      [3, 1.5, 7.5],
      [6, 1.5, 10.5],
    );

    expect([positionAt(track, 3), positionAt(track, 4)]).toEqual([
      { at: 3, x: 1.5, y: 7.5 },
      { at: 4, x: 1.5, y: 8.5 },
    ]);
  });

  it("finds a fuzzball with a single waypoint only at its moment", () => {
    const track = trackOf([5, 2, 0.25]);

    expect([
      positionAt(track, 4.9),
      positionAt(track, 5),
      positionAt(track, 5.1),
    ]).toEqual([null, { at: 5, x: 2, y: 0.25 }, null]);
  });

  it("finds no fuzzball on a track with no waypoints", () => {
    expect(positionAt(trackOf(), 0)).toBeNull();
  });

  it("finds no fuzzball at no moment", () => {
    expect(positionAt(ZIGZAG, Number.NaN)).toBeNull();
  });
});

describe("byMoment", () => {
  it.each<[string, KeyedEvent<At>, KeyedEvent<At>]>([
    ["an earlier moment", keyed(1, 9, 9, 9, 9), keyed(2, 0, 0, 0, 0)],
    [
      "a lower section, at one moment",
      keyed(1, 0, 9, 9, 9),
      keyed(1, 1, 0, 0, 0),
    ],
    [
      "a lower fuzzball or cell, in one section",
      keyed(1, 1, 0, 9, 9),
      keyed(1, 1, 1, 0, 0),
    ],
    [
      "a lower rank, for one fuzzball or cell",
      keyed(1, 1, 1, 0, 9),
      keyed(1, 1, 1, 1, 0),
    ],
    [
      "an earlier happening, at one rank",
      keyed(1, 1, 1, 1, 0),
      keyed(1, 1, 1, 1, 1),
    ],
  ])("puts an event first for %s", (_, first, second) => {
    expect([
      Math.sign(byMoment(first, second)),
      Math.sign(byMoment(second, first)),
    ]).toEqual([-1, 1]);
  });

  it("puts an event level with itself", () => {
    const event = keyed(1, 1, 1, 1, 1);

    expect(byMoment(event, event)).toBe(0);
  });

  it("sorts a flight's events into one order, whichever order they were written in", () => {
    const events = [
      keyed(2, 0, 0, 0, 4),
      keyed(1, 1, 3, 0, 1),
      keyed(1, 0, 1, 2, 2),
      keyed(1, 0, 1, 0, 0),
      keyed(1, 0, 0, 8, 3),
    ];

    const orders = [events, [...events].reverse()].map((written) =>
      [...written].sort(byMoment).map(({ seq }) => seq),
    );

    expect(orders).toEqual([
      [3, 0, 2, 1, 4],
      [3, 0, 2, 1, 4],
    ]);
  });
});

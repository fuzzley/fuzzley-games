import { type BallTrack, type Waypoint, positionAt } from "./events";

/** Returns the player's track through places given as [at, x, y]. */
function trackOf(...places: (readonly [number, number, number])[]): BallTrack {
  return {
    ball: 0,
    role: "player",
    waypoints: places.map(([at, x, y]) => ({ at, x, y })),
  };
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

  it("finds a fuzzball through a portal where it comes out, at the moment it goes in", () => {
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

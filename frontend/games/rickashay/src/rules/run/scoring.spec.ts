import { FLIGHT_FIXTURES } from "../../testing/flight_fixtures";
import { BOUNCE_POINTS, JUMP_POINTS, STAR_POINTS } from "../tuning";
import {
  type LevelTally,
  UNTALLIED,
  levelPoints,
  rallyPoints,
  rallyStep,
  roundPoints,
  starPoints,
  strikePoints,
  tallied,
} from "./scoring";

/** A round of a rally of 7 that earned no floor bounce and didn't jump the wall. */
const SEVEN = { rally: 7, earned: 0, jumped: false } as const;

/** A level's tally, two rounds in: a rally of 24 and one of 1, a jump and two floor bounces. */
const TALLY: LevelTally = { jumps: 1, earned: 2, bestRally: 24 };

/** A run on a level in play with {@link TALLY}: its strikes' 600, its floor bounces' 200 and its jump's 100 past what it banked. */
const PLAYING = { tally: TALLY, banked: 3000, score: 3900 } as const;

/** The run of {@link PLAYING} with its level cleared, its two stars' 400 added. */
const CLEARED = { ...PLAYING, score: 4300 } as const;

describe("rallyStep", () => {
  it.each([
    [1, 1],
    [4, 1],
    [5, 2],
    [9, 2],
    [10, 3],
    [24, 3],
    [25, 4],
    [44, 4],
    [45, 5],
    [162, 5],
  ])("scores a flight's strike at a rally of %i %i times", (rally, times) => {
    expect(rallyStep(rally)).toBe(times);
  });
});

describe("strikePoints", () => {
  it.each([
    [1, 10],
    [5, 20],
    [10, 30],
    [25, 40],
    [45, 50],
  ])(
    "scores the strike that makes a rally of %i %i points",
    (rally, points) => {
      expect(strikePoints(rally)).toBe(points);
    },
  );
});

describe("rallyPoints", () => {
  it("scores each rally to 200 as the one before it and its last strike", () => {
    const rallies = Array.from({ length: 200 }, (_, index) => index + 1);

    const added = rallies.map(
      (rally) => rallyPoints(rally) - rallyPoints(rally - 1),
    );

    expect(added).toEqual(rallies.map(strikePoints));
  });

  it("scores every strike past the 44th at 50, in a rally as long as storage might claim", () => {
    expect(rallyPoints(1e9)).toBe(rallyPoints(44) + (1e9 - 44) * 50);
  });

  it.each([
    [0, 0],
    [1, 10],
    [7, 100],
    [33, 950],
    [79, 3140],
  ])(
    'scores a rally of %i %i points, as "The feel, in numbers" does',
    (rally, points) => {
      expect(rallyPoints(rally)).toBe(points);
    },
  );
});

describe("roundPoints", () => {
  it("scores a round its flight's strikes", () => {
    expect(roundPoints(SEVEN)).toBe(100);
  });

  it("adds 100 for each floor bounce its flight earned and kept", () => {
    expect(roundPoints({ ...SEVEN, earned: 2 })).toBe(100 + 2 * BOUNCE_POINTS);
  });

  it("adds 100 for a jump", () => {
    expect(roundPoints({ ...SEVEN, jumped: true })).toBe(100 + JUMP_POINTS);
  });

  it("scores every round made by hand as it scores itself", () => {
    const rounds = Object.values(FLIGHT_FIXTURES).map(({ round }) => [
      round.outcome.points,
      roundPoints(round.outcome),
    ]);

    expect(rounds.filter(([made, scored]) => made !== scored)).toEqual([]);
  });
});

describe("starPoints", () => {
  it("adds a star's points for each star", () => {
    expect([0, 1, 3].map(starPoints)).toEqual([
      0,
      STAR_POINTS,
      3 * STAR_POINTS,
    ]);
  });
});

describe("tallied", () => {
  it("tallies nothing of a level before its first round", () => {
    expect(UNTALLIED).toEqual({ jumps: 0, earned: 0, bestRally: 0 });
  });

  it("counts a round that jumped the wall", () => {
    expect(tallied(TALLY, { ...SEVEN, jumped: true }).jumps).toBe(2);
  });

  it("counts no jump for a round that didn't", () => {
    expect(tallied(TALLY, SEVEN).jumps).toBe(1);
  });

  it("adds the floor bounces a round's flight earned and kept", () => {
    expect(tallied(TALLY, { ...SEVEN, earned: 3 }).earned).toBe(5);
  });

  it.each([
    [7, 24],
    [24, 24],
    [40, 40],
  ])("keeps the best rally, a round of %i bringing it to %i", (rally, best) => {
    expect(tallied(TALLY, { ...SEVEN, rally }).bestRally).toBe(best);
  });

  it("leaves the tally it is handed as it was", () => {
    const before = structuredClone(TALLY);

    tallied(TALLY, { rally: 50, earned: 3, jumped: true });

    expect(TALLY).toEqual(before);
  });
});

describe("levelPoints", () => {
  it("adds a cleared level's points up from its strikes, its floor bounces, its jumps and its stars", () => {
    expect(levelPoints(CLEARED, 2)).toEqual({
      strikes: rallyPoints(24) + rallyPoints(1),
      bounces: 2 * BOUNCE_POINTS,
      jumps: JUMP_POINTS,
      stars: 2 * STAR_POINTS,
    });
  });

  it("counts each of the level's jumps", () => {
    const run = { tally: { ...TALLY, jumps: 2 }, banked: 3000, score: 4000 };

    expect(levelPoints(run, 0).jumps).toBe(2 * JUMP_POINTS);
  });

  it("gives a level not yet cleared no stars' points", () => {
    expect(levelPoints(PLAYING, 0)).toEqual({
      strikes: rallyPoints(24) + rallyPoints(1),
      bounces: 2 * BOUNCE_POINTS,
      jumps: JUMP_POINTS,
      stars: 0,
    });
  });
});

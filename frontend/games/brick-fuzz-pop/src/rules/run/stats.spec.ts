import { LEVELS } from "../levels/levels";
import type { Run } from "./run";
import {
  type LevelResult,
  type Stats,
  isNewBest,
  levelResultOf,
  statsOf,
  withLevelCleared,
  withRunEnded,
  withRunStarted,
} from "./stats";

/** Records as storage keeps them, every key written out, so renaming one fails. */
const STORED = {
  runs: 4,
  best: 5200,
  furthest: 6,
  levels: {
    "hello-wall": { points: 900, rounds: 5, stars: 3 },
    stripes: { points: 700, rounds: 9, stars: 2 },
  },
};

/** The records {@link STORED} reads as. */
const STATS: Stats = statsOf(STORED, LEVELS);

/** What clearing Stripes brings, beating none of its records. */
const NO_BETTER: LevelResult = { points: 600, rounds: 10, stars: 1 };

/** Returns a run cleared, at a level, in so many rounds, with so many points of its own. */
function clearedRun(change: Partial<Run> = {}): Run {
  return {
    id: 1,
    lastLevel: LEVELS.length,
    firstLevel: 1,
    level: 2,
    depth: 11,
    par: 8,
    rounds: 9,
    jumps: 1,
    banked: 1500,
    score: 2500,
    ending: null,
    outcome: "cleared",
    ...change,
  };
}

describe("statsOf", () => {
  it("reads the records storage keeps", () => {
    expect(STATS).toEqual(STORED);
  });

  it.each([undefined, 5, "stats", []])("reads %j as no records", (value) => {
    expect(statsOf(value, LEVELS)).toEqual({
      runs: 0,
      best: 0,
      furthest: 0,
      levels: {},
    });
  });

  it.each([
    ["runs", -1],
    ["best", "5200"],
    ["furthest", 6.5],
  ])("drops the runs' records where %s is %j", (key, value) => {
    const stats = statsOf({ ...STORED, [key]: value }, LEVELS);

    expect(stats).toEqual({ ...STORED, runs: 0, best: 0, furthest: 0 });
  });

  it("drops the records of a level the game no longer has, and a count that isn't one", () => {
    const stats = statsOf(
      {
        ...STORED,
        levels: {
          "hello-wall": { points: 900, rounds: "5", stars: 3 },
          gone: { points: 100, rounds: 1, stars: 3 },
        },
      },
      LEVELS,
    );

    expect(stats.levels).toEqual({ "hello-wall": { points: 900, stars: 3 } });
  });
});

describe("statsOf's levels", () => {
  it.each([
    ["no rounds", { points: 900, rounds: 0, stars: 3 }],
    ["no stars", { points: 900, rounds: 5, stars: 0 }],
    ["more stars than a level earns", { points: 900, rounds: 5, stars: 4 }],
  ])("drops a level's records of %s", (_, records) => {
    const stats = statsOf(
      { ...STORED, levels: { "hello-wall": records } },
      LEVELS,
    );

    expect(stats.levels).toEqual({});
  });

  it("keeps a level's records that lack a round or a star", () => {
    const levels = { "hello-wall": { points: 900 }, stripes: { stars: 1 } };

    expect(statsOf({ ...STORED, levels }, LEVELS).levels).toEqual(levels);
  });
});

describe("withRunStarted", () => {
  it("counts a run", () => {
    expect(withRunStarted(STATS).runs).toBe(5);
  });
});

describe("withRunEnded", () => {
  it("keeps a run's score as the best, if it beats it", () => {
    expect(withRunEnded(STATS, { score: 6000, level: 2 })).toEqual({
      ...STATS,
      best: 6000,
    });
  });

  it("keeps the level a run reached as the furthest, if it passes it", () => {
    expect(withRunEnded(STATS, { score: 100, level: 8 })).toEqual({
      ...STATS,
      furthest: 8,
    });
  });

  it("returns the same stats for a run that beats neither", () => {
    expect(withRunEnded(STATS, { score: 5200, level: 6 })).toBe(STATS);
  });

  it("counts a run that beats neither, ended before any was counted as started", () => {
    const stats = { ...STATS, runs: 0 };

    expect(withRunEnded(stats, { score: 10, level: 2 })).toEqual({
      ...STATS,
      runs: 1,
    });
  });

  it("counts a run ended before any was counted as started", () => {
    const stats = statsOf(undefined, LEVELS);

    expect(withRunEnded(stats, { score: 0, level: 1 })).toEqual({
      ...stats,
      runs: 1,
      furthest: 1,
    });
  });
});

describe("isNewBest", () => {
  it.each([
    [5201, true],
    [5200, false],
    [10, false],
  ])("says a score of %i is a new best: %s", (score, best) => {
    expect(isNewBest(STATS, { score, level: 1 })).toBe(best);
  });
});

describe("levelResultOf", () => {
  it("takes a cleared level's own points, its rounds and its stars", () => {
    expect(levelResultOf(clearedRun())).toEqual({
      points: 1000,
      rounds: 9,
      stars: 2,
    });
  });

  it("takes the last level's when the run is won", () => {
    const run = clearedRun({ level: LEVELS.length, outcome: "won" });

    expect(levelResultOf(run)).toEqual({ points: 1000, rounds: 9, stars: 2 });
  });

  it.each(["playing", "over"] as const)(
    "takes nothing of a level %s",
    (outcome) => {
      expect(levelResultOf(clearedRun({ outcome }))).toBeNull();
    },
  );
});

describe("withLevelCleared", () => {
  it("keeps a level's first records", () => {
    const stats = withLevelCleared(STATS, "pips", NO_BETTER);

    expect(stats.levels["pips"]).toEqual(NO_BETTER);
  });

  it("keeps more points as the best", () => {
    const stats = withLevelCleared(STATS, "stripes", {
      ...NO_BETTER,
      points: 800,
    });

    expect(stats.levels["stripes"]).toEqual({
      points: 800,
      rounds: 9,
      stars: 2,
    });
  });

  it("keeps fewer rounds as the fewest", () => {
    const stats = withLevelCleared(STATS, "stripes", {
      ...NO_BETTER,
      rounds: 8,
    });

    expect(stats.levels["stripes"]).toEqual({
      points: 700,
      rounds: 8,
      stars: 2,
    });
  });

  it("keeps more stars as the most", () => {
    const stats = withLevelCleared(STATS, "stripes", {
      ...NO_BETTER,
      stars: 3,
    });

    expect(stats.levels["stripes"]).toEqual({
      points: 700,
      rounds: 9,
      stars: 3,
    });
  });

  it("returns the same stats for a level that beats none of its records", () => {
    expect(withLevelCleared(STATS, "stripes", NO_BETTER)).toBe(STATS);
  });

  it("returns the same stats for a level that only equals them", () => {
    const equal = { points: 700, rounds: 9, stars: 2 };

    expect(withLevelCleared(STATS, "stripes", equal)).toBe(STATS);
  });

  it("leaves the other levels' records as they were", () => {
    const stats = withLevelCleared(STATS, "stripes", {
      points: 2000,
      rounds: 1,
      stars: 3,
    });

    expect(stats.levels["hello-wall"]).toBe(STATS.levels["hello-wall"]);
  });
});

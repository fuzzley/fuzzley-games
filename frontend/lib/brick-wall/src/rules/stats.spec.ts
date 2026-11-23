import { isCount, isListOf, isRecord } from "@fz/core/json";
import type { Run } from "./run";
import {
  type ClearedLevel,
  type Stats,
  type StatsRules,
  isNewBest,
  levelResultOf,
  statsOf,
  withLevelCleared,
  withRunEnded,
  withRunStarted,
} from "./stats";

/** What the spec's game tallies of a level's rounds: its longest streak. */
interface Tally {
  readonly longest: number;
}

/**
 * What the spec's game keeps of a level cleared: its best points, and its
 * stars as three flags, each kept once earned: cleared, within par, and a
 * streak of 10.
 */
interface Marks {
  readonly points: number;
  readonly stars: readonly boolean[];
}

/** Returns whether a value is the spec's stars as stored: three flags. */
function isStars(value: unknown): value is boolean[] {
  return (
    isListOf(value, (flag) => typeof flag === "boolean") && value.length === 3
  );
}

/** The rules of the spec's game, whose stars are three flags. */
const RULES: StatsRules<Tally, Marks> = {
  readLevel: (value) => {
    if (!isRecord(value)) return null;
    const { points, stars } = value;
    return isCount(points) && isStars(stars) ? { points, stars } : null;
  },
  resultOf: ({ points, rounds, par, tally }) => ({
    points,
    stars: [true, rounds <= par, tally.longest >= 10],
  }),
  merge: (kept, result) => {
    const points = Math.max(kept.points, result.points);
    const stars = kept.stars.map(
      (earned, star) => earned || result.stars[star] === true,
    );
    const beaten =
      points > kept.points ||
      stars.some((earned, star) => earned !== kept.stars[star]);
    return beaten ? { points, stars } : kept;
  },
};

/** Four levels made up for the spec, the last named as every object's own key is. */
const LEVELS = ["low", "mid", "high", "constructor"].map((id) => ({
  data: { id },
}));

/** Records as storage keeps them, every key written out, so renaming one fails. */
const STORED = {
  runs: 4,
  best: 5200,
  furthest: 3,
  levels: {
    low: { points: 900, stars: [true, true, false] },
    mid: { points: 700, stars: [true, false, false] },
  },
};

/** The records {@link STORED} reads as. */
const STATS: Stats<Marks> = statsOf(STORED, LEVELS, RULES);

/** What clearing the middle level brings, beating none of its record. */
const NO_BETTER: Marks = { points: 600, stars: [true, false, false] };

/** Returns a run made up for the spec, its level cleared, as it stands once the round that cleared it has landed. */
function clearedRun(change: Partial<Run<Tally>> = {}): Run<Tally> {
  return {
    id: 1,
    lastLevel: 4,
    firstLevel: 1,
    level: 2,
    depth: 14,
    par: 8,
    rounds: 7,
    tally: { longest: 12 },
    banked: 1500,
    stars: 5,
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
    expect(statsOf(value, LEVELS, RULES)).toEqual({
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
    const stats = statsOf({ ...STORED, [key]: value }, LEVELS, RULES);

    expect(stats).toEqual({ ...STORED, runs: 0, best: 0, furthest: 0 });
  });

  it("keeps the levels' records where the runs' are dropped", () => {
    const stats = statsOf({ levels: STORED.levels }, LEVELS, RULES);

    expect(stats.levels).toEqual(STORED.levels);
  });

  it("drops the record of a level the game no longer has, and one the game can't read", () => {
    const levels = {
      low: { points: 900, stars: [true] },
      mid: STORED.levels.mid,
      gone: { points: 100, stars: [true, true, true] },
    };

    const stats = statsOf({ ...STORED, levels }, LEVELS, RULES);

    expect(stats.levels).toEqual({ mid: STORED.levels.mid });
  });

  it("reads no record for a level whose id every object has, where none is stored", () => {
    const stats = statsOf(STORED, LEVELS, { readLevel: (value) => value });

    expect(Object.keys(stats.levels)).toEqual(["low", "mid"]);
  });

  it("reads a level's records in the order the game has its levels", () => {
    const levels = { mid: STORED.levels.mid, low: STORED.levels.low };

    const stats = statsOf({ ...STORED, levels }, LEVELS, RULES);

    expect(Object.keys(stats.levels)).toEqual(["low", "mid"]);
  });

  it("reads no levels' records that aren't a record", () => {
    expect(statsOf({ ...STORED, levels: [] }, LEVELS, RULES).levels).toEqual(
      {},
    );
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
    expect(withRunEnded(STATS, { score: 100, level: 4 })).toEqual({
      ...STATS,
      furthest: 4,
    });
  });

  it("returns the same records for a run that beats neither", () => {
    expect(withRunEnded(STATS, { score: 5200, level: 3 })).toBe(STATS);
  });

  it("counts a run that beats neither, ended before any was counted as started", () => {
    const stats = { ...STATS, runs: 0 };

    expect(withRunEnded(stats, { score: 10, level: 2 })).toEqual({
      ...STATS,
      runs: 1,
    });
  });

  it("counts a run ended before any was counted as started", () => {
    const stats = statsOf(undefined, LEVELS, RULES);

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
    expect(isNewBest(STATS, { score })).toBe(best);
  });
});

describe("levelResultOf", () => {
  it("hands the game the level as it was played, with its own points", () => {
    const level = levelResultOf(clearedRun(), {
      resultOf: (cleared: ClearedLevel<Tally>) => cleared,
    });

    expect(level).toEqual({
      level: 2,
      depth: 14,
      par: 8,
      rounds: 7,
      tally: { longest: 12 },
      points: 1000,
    });
  });

  it("takes what the game makes of a cleared level", () => {
    expect(levelResultOf(clearedRun(), RULES)).toEqual({
      points: 1000,
      stars: [true, true, true],
    });
  });

  it("takes the last level's when the run is won", () => {
    const run = clearedRun({ level: 4, rounds: 9, outcome: "won" });

    expect(levelResultOf(run, RULES)).toEqual({
      points: 1000,
      stars: [true, false, true],
    });
  });

  it.each(["ready", "playing", "paused", "over"] as const)(
    "takes nothing of a level %s",
    (outcome) => {
      expect(levelResultOf(clearedRun({ outcome }), RULES)).toBeNull();
    },
  );
});

describe("withLevelCleared", () => {
  it("keeps a level's first record as its result", () => {
    const stats = withLevelCleared(STATS, "high", NO_BETTER, RULES);

    expect(stats.levels).toEqual({ ...STATS.levels, high: NO_BETTER });
  });

  it("merges a result into a level's record, as the game merges them", () => {
    const stats = withLevelCleared(
      STATS,
      "mid",
      { points: 650, stars: [true, true, false] },
      RULES,
    );

    expect(stats.levels["mid"]).toEqual({
      points: 700,
      stars: [true, true, false],
    });
  });

  it("returns the same records for a result that beats none of its level's", () => {
    expect(withLevelCleared(STATS, "mid", NO_BETTER, RULES)).toBe(STATS);
  });

  it("leaves the other levels' records as they were", () => {
    const stats = withLevelCleared(
      STATS,
      "mid",
      { points: 2000, stars: [true, true, true] },
      RULES,
    );

    expect(stats.levels["low"]).toBe(STATS.levels["low"]);
  });

  it("keeps the first record of a level whose id every object has", () => {
    const stats = withLevelCleared(STATS, "constructor", NO_BETTER, RULES);

    expect(Object.entries(stats.levels)).toContainEqual([
      "constructor",
      NO_BETTER,
    ]);
  });

  it("leaves the records it is handed as they were", () => {
    const before = structuredClone(STATS);

    withLevelCleared(
      STATS,
      "mid",
      { points: 2000, stars: [true, true, true] },
      RULES,
    );

    expect(STATS).toEqual(before);
  });
});

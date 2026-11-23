import {
  levelResultOf,
  statsOf,
  withLevelCleared,
} from "@fz/brick-wall/rules/stats";
import { LEVELS } from "../levels/levels";
import type { Run } from "./run";
import {
  type LevelRecords,
  type LevelResult,
  STATS_RULES,
  type Stats,
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
const STATS: Stats = statsOf(STORED, LEVELS, STATS_RULES);

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
    tally: { jumps: 1 },
    banked: 1500,
    stars: 5,
    score: 2500,
    ending: null,
    outcome: "cleared",
    ...change,
  };
}

/** Returns the records of Stripes once a result is kept. */
function stripesAfter(result: LevelResult): LevelRecords | undefined {
  return withLevelCleared(STATS, "stripes", result, STATS_RULES).levels[
    "stripes"
  ];
}

describe("STATS_RULES", () => {
  it("reads the records storage keeps", () => {
    expect(STATS).toEqual(STORED);
  });

  it("drops a count that isn't one, keeping the level's others", () => {
    const stats = statsOf(
      {
        ...STORED,
        levels: { "hello-wall": { points: 900, rounds: "5", stars: 3 } },
      },
      LEVELS,
      STATS_RULES,
    );

    expect(stats.levels).toEqual({ "hello-wall": { points: 900, stars: 3 } });
  });

  it.each([
    ["no rounds", { points: 900, rounds: 0, stars: 3 }],
    ["no stars", { points: 900, rounds: 5, stars: 0 }],
    ["more stars than a level earns", { points: 900, rounds: 5, stars: 4 }],
    ["no count at all", { points: "900" }],
    ["no records but a list", [900, 5, 3]],
  ])("drops a level's records of %s", (_, records) => {
    const stats = statsOf(
      { ...STORED, levels: { "hello-wall": records } },
      LEVELS,
      STATS_RULES,
    );

    expect(stats.levels).toEqual({});
  });

  it("keeps a level's records that lack a round or a star", () => {
    const levels = { "hello-wall": { points: 900 }, stripes: { stars: 1 } };

    expect(statsOf({ ...STORED, levels }, LEVELS, STATS_RULES).levels).toEqual(
      levels,
    );
  });

  it("writes a level's records in the order it keeps them, whatever order they were stored in", () => {
    const levels = { stripes: { stars: 2, rounds: 9, points: 700 } };

    const stats = statsOf({ ...STORED, levels }, LEVELS, STATS_RULES);

    expect(JSON.stringify(stats.levels)).toBe(
      JSON.stringify({ stripes: { points: 700, rounds: 9, stars: 2 } }),
    );
  });

  it("takes a cleared level's own points, its rounds and the stars its tiers earn, in the order storage keeps them", () => {
    const result = levelResultOf(clearedRun(), STATS_RULES);

    expect(JSON.stringify(result)).toBe('{"points":1000,"rounds":9,"stars":2}');
  });

  it("keeps a level's first records as storage keeps them", () => {
    const result = levelResultOf(clearedRun(), STATS_RULES) ?? NO_BETTER;

    const stats = withLevelCleared(STATS, "pips", result, STATS_RULES);

    expect(JSON.stringify(stats.levels["pips"])).toBe(
      '{"points":1000,"rounds":9,"stars":2}',
    );
  });

  it("keeps more points as the best", () => {
    expect(stripesAfter({ ...NO_BETTER, points: 800 })).toEqual({
      points: 800,
      rounds: 9,
      stars: 2,
    });
  });

  it("keeps fewer rounds as the fewest", () => {
    expect(stripesAfter({ ...NO_BETTER, rounds: 8 })).toEqual({
      points: 700,
      rounds: 8,
      stars: 2,
    });
  });

  it("keeps more stars as the most", () => {
    expect(stripesAfter({ ...NO_BETTER, stars: 3 })).toEqual({
      points: 700,
      rounds: 9,
      stars: 3,
    });
  });

  it("returns the same records for a level that beats none of them", () => {
    expect(withLevelCleared(STATS, "stripes", NO_BETTER, STATS_RULES)).toBe(
      STATS,
    );
  });

  it("returns the same records for a level that only equals them", () => {
    const equal = { points: 700, rounds: 9, stars: 2 };

    expect(withLevelCleared(STATS, "stripes", equal, STATS_RULES)).toBe(STATS);
  });

  it("fills in a record a level's kept records lack, after those they have", () => {
    const stats = statsOf(
      { ...STORED, levels: { stripes: { stars: 2 } } },
      LEVELS,
      STATS_RULES,
    );

    const kept = withLevelCleared(stats, "stripes", NO_BETTER, STATS_RULES);

    expect(JSON.stringify(kept.levels["stripes"])).toBe(
      JSON.stringify({ stars: 2, points: 600, rounds: 10 }),
    );
  });
});

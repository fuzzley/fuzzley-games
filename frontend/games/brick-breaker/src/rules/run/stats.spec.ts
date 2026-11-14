import { type LevelData, levelsOf } from "../levels/levels";
import type { Speed } from "../speed";
import {
  type EndedRun,
  type Stats,
  isNewBest,
  statsOf,
  withLevelPoints,
  withRunEnded,
  withRunStarted,
} from "./stats";

const NONE = { runs: 0, best: 0, furthest: 0 };

/** Returns a level of one brick, named by its id. */
function levelOf(id: string): LevelData {
  return { id, name: id, capsules: [], bricks: ["o"] };
}

/** A level as first drawn, which names no layout. */
const STRIPES = levelOf("stripes");

/** A level drawn again, on its second layout. */
const REDRAWN: LevelData = { ...levelOf("redrawn"), layout: 2 };

/** The levels the stats are read for: two as first drawn, and one redrawn. */
const LEVELS = levelsOf([
  {
    id: "set",
    name: "Set",
    drops: 0,
    levels: [STRIPES, levelOf("gifts"), REDRAWN],
  },
]);

/** Returns stats with no runs and no bests. */
function noStats(): Stats {
  return statsOf(null, LEVELS);
}

/** Returns a run ended at a speed, a score and a level. */
function ended(speed: Speed, score: number, level: number): EndedRun {
  return { speed, score, level };
}

describe("statsOf", () => {
  it("reads nothing stored as no runs and no bests", () => {
    expect(statsOf(null, LEVELS)).toEqual({
      speeds: { relaxed: NONE, normal: NONE, fast: NONE, custom: NONE },
      levels: {},
      layouts: {},
    });
  });

  it("keeps whatever stored still makes sense, dropping the rest", () => {
    const stored = {
      speeds: {
        relaxed: { runs: 2, best: 900, furthest: 3 },
        normal: { runs: -1, best: 5, furthest: 1 },
        fast: "lots",
        custom: { runs: 1, best: 300, furthest: 2 },
      },
      levels: {
        stripes: { normal: 4100, fast: 2.5, custom: 700 },
        gifts: { relaxed: "high" },
        gone: { normal: 100 },
      },
    };

    expect(statsOf(stored, LEVELS)).toEqual({
      speeds: {
        relaxed: { runs: 2, best: 900, furthest: 3 },
        normal: NONE,
        fast: NONE,
        custom: { runs: 1, best: 300, furthest: 2 },
      },
      levels: { stripes: { normal: 4100, custom: 700 } },
      layouts: { stripes: 1 },
    });
  });

  it("reads bests stored with no layout, as before layouts were kept, as made on the first", () => {
    const stored = {
      levels: { stripes: { normal: 4100 }, redrawn: { normal: 2500 } },
    };

    const { levels, layouts } = statsOf(stored, LEVELS);

    expect({ levels, layouts }).toEqual({
      levels: { stripes: { normal: 4100 } },
      layouts: { stripes: 1 },
    });
  });

  it("keeps a level's bests made on the layout it has now", () => {
    const stored = {
      levels: { stripes: { normal: 4100 }, redrawn: { normal: 2500 } },
      layouts: { stripes: 1, redrawn: 2 },
    };

    const { levels, layouts } = statsOf(stored, LEVELS);

    expect({ levels, layouts }).toEqual({
      levels: { stripes: { normal: 4100 }, redrawn: { normal: 2500 } },
      layouts: { stripes: 1, redrawn: 2 },
    });
  });

  it.each([
    ["another layout than its own", { stripes: 2, redrawn: 1 }],
    ["a layout that is no number", { stripes: "1", redrawn: "2" }],
    ["no layout at all", { stripes: null, redrawn: null }],
  ])("drops a level's bests made on %s", (_, layouts) => {
    const stored = {
      levels: { stripes: { normal: 4100 }, redrawn: { normal: 2500 } },
      layouts,
    };

    const { levels, layouts: kept } = statsOf(stored, LEVELS);

    expect({ levels, layouts: kept }).toEqual({ levels: {}, layouts: {} });
  });

  it("reads back the stats it keeps", () => {
    const stats = withLevelPoints(
      withLevelPoints(noStats(), STRIPES, "normal", 4100),
      REDRAWN,
      "fast",
      2500,
    );

    expect(statsOf(JSON.parse(JSON.stringify(stats)), LEVELS)).toEqual(stats);
  });
});

describe("statsOf's speeds", () => {
  it.each([
    ["runs", { runs: -1, best: 5, furthest: 1 }],
    ["best", { runs: 1, best: -5, furthest: 1 }],
    ["furthest", { runs: 1, best: 5, furthest: 2.5 }],
  ])("drop a speed's stats whose %s makes no sense", (_, normal) => {
    expect(statsOf({ speeds: { normal } }, LEVELS).speeds.normal).toEqual(NONE);
  });
});

describe("withRunStarted", () => {
  it("counts a run at its speed alone", () => {
    const stats = withRunStarted(noStats(), "fast");

    expect(stats.speeds).toEqual({
      relaxed: NONE,
      normal: NONE,
      fast: { runs: 1, best: 0, furthest: 0 },
      custom: NONE,
    });
  });
});

describe("withRunEnded", () => {
  it("keeps an ended run's score and level as the best and the furthest", () => {
    const stats = withRunEnded(
      withRunStarted(noStats(), "normal"),
      ended("normal", 4400, 2),
    );

    expect(stats.speeds.normal).toEqual({ runs: 1, best: 4400, furthest: 2 });
  });

  it("keeps the best and the furthest through a lesser run", () => {
    const before = withRunEnded(noStats(), ended("normal", 600, 3));

    const stats = withRunEnded(before, ended("normal", 500, 2));

    expect(stats.speeds.normal).toEqual({ runs: 1, best: 600, furthest: 3 });
  });

  it("keeps each speed's stats apart", () => {
    const stats = withRunEnded(noStats(), ended("fast", 900, 4));

    expect(stats.speeds.normal).toEqual(NONE);
  });

  it("gives back the same stats for a run that beats neither the best nor the furthest", () => {
    const stats = withRunEnded(
      withRunStarted(noStats(), "normal"),
      ended("normal", 600, 3),
    );

    expect(withRunEnded(stats, ended("normal", 600, 3))).toBe(stats);
  });
});

describe("isNewBest", () => {
  const stats = withRunEnded(noStats(), ended("normal", 500, 1));

  it.each([
    [600, true],
    [500, false],
    [400, false],
  ])(
    "calls a score of %i at a best of 500 a new best: %s",
    (score, newBest) => {
      expect(isNewBest(stats, ended("normal", score, 1))).toBe(newBest);
    },
  );

  it("calls no score a new best", () => {
    expect(isNewBest(noStats(), ended("relaxed", 0, 1))).toBe(false);
  });
});

describe("withLevelPoints", () => {
  it("keeps a level's best points at each speed", () => {
    const once = withLevelPoints(noStats(), STRIPES, "normal", 4100);

    const stats = withLevelPoints(once, STRIPES, "fast", 3000);

    expect(stats.levels).toEqual({ stripes: { normal: 4100, fast: 3000 } });
  });

  it("keeps the layout each level's points were made on, the first where its data names none", () => {
    const once = withLevelPoints(noStats(), STRIPES, "normal", 4100);

    const stats = withLevelPoints(once, REDRAWN, "normal", 2500);

    expect(stats.layouts).toEqual({ stripes: 1, redrawn: 2 });
  });

  it.each([2500, 4100])(
    "gives back the same stats for %i points, at a best of 4100",
    (points) => {
      const stats = withLevelPoints(noStats(), STRIPES, "normal", 4100);

      expect(withLevelPoints(stats, STRIPES, "normal", points)).toBe(stats);
    },
  );
});

import {
  type EndedRun,
  NO_STATS,
  type Stats,
  isNewBest,
  statsOf,
  withClearedAll,
  withRunEnded,
  withRunStarted,
  withStraysHome,
} from "./stats";

/** Returns a run ended at Normal, at a score and a wave, started at the inner belt. */
function ended(score: number, wave: number): EndedRun {
  return { speed: "normal", score, wave, sector: "inner-belt" };
}

/** Returns records with one run ended at Normal kept. */
function after(run: EndedRun): Stats {
  return withRunEnded(withRunStarted(NO_STATS, run.speed), run);
}

describe("statsOf", () => {
  it("starts a player who has none with no runs and no bests", () => {
    expect(statsOf(null, ["inner-belt"])).toEqual(NO_STATS);
  });

  it("takes back the records it stored", () => {
    const stats = withClearedAll(
      withStraysHome(after(ended(4200, 3)), "normal", 2),
      "normal",
    );

    const read = statsOf(JSON.parse(JSON.stringify(stats)), ["inner-belt"]);

    expect(read).toEqual(stats);
  });

  it.each([
    ["no record", "fast"],
    [
      "a speed's runs that aren't a count",
      { runs: -1, best: 0, furthest: 0, strays: 0 },
    ],
    [
      "a speed's best that isn't a count",
      { runs: 1, best: 1.5, furthest: 0, strays: 0 },
    ],
    [
      "a speed's furthest that isn't a count",
      { runs: 1, best: 0, furthest: "3", strays: 0 },
    ],
    ["a speed's strays that aren't a count", { runs: 1, best: 0, furthest: 0 }],
  ])("drops %s for a speed", (_, normal) => {
    expect(statsOf({ speeds: { normal } }, []).speeds.normal).toEqual(
      NO_STATS.speeds.normal,
    );
  });

  it("drops the bests of a sector the game no longer has", () => {
    const stored = {
      sectors: { "inner-belt": { normal: 900 }, gone: { normal: 50 } },
    };

    expect(statsOf(stored, ["inner-belt"]).sectors).toEqual({
      "inner-belt": { normal: 900 },
    });
  });

  it("drops a sector's best that isn't a count, and the sector with none left", () => {
    const stored = {
      sectors: {
        "inner-belt": { normal: 900, fast: -3 },
        storm: { fast: "a" },
      },
    };

    expect(statsOf(stored, ["inner-belt", "storm"]).sectors).toEqual({
      "inner-belt": { normal: 900 },
    });
  });

  it("drops sectors that aren't a record", () => {
    expect(
      statsOf({ sectors: { "inner-belt": 900 } }, ["inner-belt"]).sectors,
    ).toEqual({});
  });

  it("reads a speed's records kept before a run could clear all thirty as none having", () => {
    const read = statsOf(
      { speeds: { normal: { runs: 2, best: 900, furthest: 4, strays: 1 } } },
      ["inner-belt"],
    );

    expect(read.speeds.normal).toEqual({
      runs: 2,
      best: 900,
      furthest: 4,
      strays: 1,
      clearedAll: false,
    });
  });
});

describe("withRunStarted", () => {
  it("counts a run at its speed alone", () => {
    const stats = withRunStarted(NO_STATS, "fast");

    expect({
      fast: stats.speeds.fast.runs,
      normal: stats.speeds.normal.runs,
    }).toEqual({ fast: 1, normal: 0 });
  });
});

describe("withRunEnded", () => {
  it("keeps a first run's score and wave as the best and the furthest, and its sector's best", () => {
    const stats = after(ended(4200, 3));

    expect({ normal: stats.speeds.normal, sectors: stats.sectors }).toEqual({
      normal: {
        runs: 1,
        best: 4200,
        furthest: 3,
        strays: 0,
        clearedAll: false,
      },
      sectors: { "inner-belt": { normal: 4200 } },
    });
  });

  it.each([
    [
      "a later run that goes further",
      ended(1000, 5),
      { best: 4200, furthest: 5 },
    ],
    [
      "a later run that scores more",
      ended(5000, 1),
      { best: 5000, furthest: 3 },
    ],
  ])(
    "keeps the best and the furthest of two runs, each from its own, after %s",
    (_, second, kept) => {
      const stats = withRunEnded(after(ended(4200, 3)), second);

      expect(stats.speeds.normal).toMatchObject(kept);
    },
  );

  it("keeps a sector's best apart from another's", () => {
    const stats = withRunEnded(after(ended(4200, 3)), {
      ...ended(1000, 12),
      sector: "iron-reach",
    });

    expect(stats.sectors).toEqual({
      "inner-belt": { normal: 4200 },
      "iron-reach": { normal: 1000 },
    });
  });

  it("keeps a sector's best at each speed apart", () => {
    const stats = withRunEnded(after(ended(4200, 3)), {
      ...ended(1000, 2),
      speed: "fast",
    });

    expect(stats.sectors["inner-belt"]).toEqual({ normal: 4200, fast: 1000 });
  });

  it("returns the same records for a run that beats none of them", () => {
    const stats = after(ended(4200, 3));

    expect(withRunEnded(stats, ended(4200, 3))).toBe(stats);
  });

  it("keeps a run that beats only its sector's best", () => {
    const stats = withRunEnded(after(ended(4200, 3)), {
      ...ended(4200, 1),
      sector: "iron-reach",
    });

    expect(stats.sectors["iron-reach"]).toEqual({ normal: 4200 });
  });
});

describe("withClearedAll", () => {
  it("keeps that a run at a speed cleared all thirty, at that speed alone", () => {
    const stats = withClearedAll(NO_STATS, "fast");

    expect([
      stats.speeds.fast.clearedAll,
      stats.speeds.normal.clearedAll,
    ]).toEqual([true, false]);
  });

  it("returns the same records where a run had", () => {
    const stats = withClearedAll(NO_STATS, "fast");

    expect(withClearedAll(stats, "fast")).toBe(stats);
  });
});

describe("withStraysHome", () => {
  it("adds the strays brought home to their speed's", () => {
    const stats = withStraysHome(
      withStraysHome(NO_STATS, "relaxed", 2),
      "relaxed",
      1,
    );

    expect(stats.speeds.relaxed.strays).toBe(3);
  });

  it("returns the same records for none", () => {
    expect(withStraysHome(NO_STATS, "relaxed", 0)).toBe(NO_STATS);
  });
});

describe("isNewBest", () => {
  it.each([
    [4201, true],
    [4200, false],
  ])(
    "calls a score of %i against a best of 4,200 a new best: %s",
    (score, best) => {
      expect(isNewBest(after(ended(4200, 3)), ended(score, 1))).toBe(best);
    },
  );

  it("calls a first run's points a new best", () => {
    expect(isNewBest(NO_STATS, ended(40, 1))).toBe(true);
  });
});

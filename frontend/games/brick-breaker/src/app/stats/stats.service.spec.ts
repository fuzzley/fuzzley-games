import { TestBed } from "@angular/core/testing";
import { type Run, createRun } from "../../rules/run";
import type { Speed } from "../../rules/speed";
import { provideSpecLevels } from "../../testing/play";
import { STATS_KEY, StatsService } from "./stats.service";

/** Stores stats as a player's browser would hold them. */
function store(value: unknown): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(value));
}

/** Returns a run ended at a speed, a score and a level. */
function endedRun(speed: Speed, score: number, level: number): Run {
  const run = createRun({ id: 1, seed: 1, speed, lastLevel: 8, level: 1 });
  return { ...run, score, level, lives: 0, outcome: "over" };
}

const NONE = { runs: 0, best: 0, furthest: 0 };

beforeEach(() => {
  TestBed.configureTestingModule({ providers: provideSpecLevels() });
});

describe("StatsService", () => {
  it("starts a new player with no runs and no bests", () => {
    const stats = TestBed.inject(StatsService);

    expect(stats.stats()).toEqual({
      speeds: { relaxed: NONE, normal: NONE, fast: NONE },
      levels: {},
    });
  });

  it("counts a run started at its speed", () => {
    const stats = TestBed.inject(StatsService);

    stats.recordStart("fast");

    expect(stats.stats().speeds.fast.runs).toBe(1);
  });

  it("keeps an ended run's score and level as the best and the furthest", () => {
    const stats = TestBed.inject(StatsService);
    stats.recordStart("normal");

    stats.recordEnd(endedRun("normal", 4400, 2));

    expect(stats.stats().speeds.normal).toEqual({
      runs: 1,
      best: 4400,
      furthest: 2,
    });
  });

  it("calls a score above the best a new best", () => {
    const stats = TestBed.inject(StatsService);
    stats.recordEnd(endedRun("normal", 500, 1));

    expect(stats.recordEnd(endedRun("normal", 600, 1))).toBe(true);
  });

  it("calls a score that only matches the best no new best, keeping the furthest", () => {
    const stats = TestBed.inject(StatsService);
    stats.recordEnd(endedRun("normal", 500, 3));

    const newBest = stats.recordEnd(endedRun("normal", 500, 2));

    expect({ newBest, normal: stats.stats().speeds.normal }).toEqual({
      newBest: false,
      normal: { runs: 1, best: 500, furthest: 3 },
    });
  });

  it("calls no score a new best", () => {
    const stats = TestBed.inject(StatsService);

    expect(stats.recordEnd(endedRun("relaxed", 0, 1))).toBe(false);
  });

  it("keeps each speed's stats apart", () => {
    const stats = TestBed.inject(StatsService);

    stats.recordEnd(endedRun("fast", 900, 4));

    expect(stats.stats().speeds.normal).toEqual(NONE);
  });

  it("keeps a level's best points at each speed", () => {
    const stats = TestBed.inject(StatsService);

    stats.recordLevel("blasts", "normal", 4100);
    stats.recordLevel("blasts", "fast", 3000);
    stats.recordLevel("blasts", "normal", 2500);

    expect(stats.stats().levels).toEqual({
      blasts: { normal: 4100, fast: 3000 },
    });
  });

  it("keeps the stats for the next visit", () => {
    TestBed.inject(StatsService).recordLevel("wide", "relaxed", 1200);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: provideSpecLevels() });

    expect(TestBed.inject(StatsService).stats().levels).toEqual({
      wide: { relaxed: 1200 },
    });
  });

  it("keeps whatever stored still makes sense, dropping the rest", () => {
    store({
      version: 1,
      speeds: {
        relaxed: { runs: 2, best: 900, furthest: 3 },
        normal: { runs: -1, best: 5, furthest: 1 },
        fast: "lots",
      },
      levels: {
        blasts: { normal: 4100, fast: 2.5 },
        steel: { relaxed: "high" },
        gone: { normal: 100 },
      },
    });

    const stats = TestBed.inject(StatsService);

    expect(stats.stats()).toEqual({
      speeds: {
        relaxed: { runs: 2, best: 900, furthest: 3 },
        normal: NONE,
        fast: NONE,
      },
      levels: { blasts: { normal: 4100 } },
    });
  });

  it("starts afresh from stats stored in another shape", () => {
    store({
      version: 2,
      speeds: { normal: { runs: 3, best: 1, furthest: 1 } },
    });

    const stats = TestBed.inject(StatsService);

    expect(stats.stats().speeds.normal).toEqual(NONE);
  });
});

import { TestBed } from "@angular/core/testing";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import type { EndedRun, LevelResult } from "../../rules/run/stats";
import { StatsService } from "./stats.service";

/** Where the stats are kept, in its own words, so a rename fails. */
const STATS_KEY = "brick-fuzz-pop-stats";

/** What the player's browser keeps, empty for each test. */
let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  TestBed.configureTestingModule({
    providers: [provideMemoryStorage(storage)],
  });
});

/** Stores stats as a player's browser would hold them. */
function store(value: unknown): void {
  storage.setItem(STATS_KEY, JSON.stringify(value));
}

/** Returns what is stored, as a player's browser holds it. */
function stored(): unknown {
  return JSON.parse(storage.getItem(STATS_KEY) ?? "null");
}

/** Returns a run ended at a score and a level. */
function endedRun(score: number, level: number): EndedRun {
  return { score, level };
}

/** Returns what a level cleared brings to its records. */
function cleared(points: number, rounds: number, stars: number): LevelResult {
  return { points, rounds, stars };
}

describe("StatsService", () => {
  it("starts a new player with no runs and no records", () => {
    const stats = TestBed.inject(StatsService);

    expect(stats.stats()).toEqual({
      runs: 0,
      best: 0,
      furthest: 0,
      levels: {},
    });
  });

  it("counts a run started", () => {
    const stats = TestBed.inject(StatsService);

    stats.recordStart();
    stats.recordStart();

    expect(stats.stats().runs).toBe(2);
  });

  it("keeps an ended run's score and level as the best and the furthest", () => {
    const stats = TestBed.inject(StatsService);
    stats.recordStart();

    stats.recordEnd(endedRun(4400, 3));

    expect(stats.stats()).toEqual({
      runs: 1,
      best: 4400,
      furthest: 3,
      levels: {},
    });
  });

  it("calls a score above every run's before a new best, asking before it keeps it", () => {
    const stats = TestBed.inject(StatsService);

    const newBests = [500, 600, 550, 600].map((score) =>
      stats.recordEnd(endedRun(score, 1)),
    );

    expect(newBests).toEqual([true, true, false, false]);
  });

  it("keeps a cleared level's best points, fewest rounds and most stars, each by itself", () => {
    const stats = TestBed.inject(StatsService);

    stats.recordLevel("pips", cleared(4000, 9, 2));
    stats.recordLevel("pips", cleared(3000, 7, 3));

    expect(stats.stats().levels).toEqual({
      pips: { points: 4000, rounds: 7, stars: 3 },
    });
  });

  it("stores nothing for a cleared level that beats none of its records", () => {
    const stats = TestBed.inject(StatsService);
    stats.recordLevel("pips", cleared(4000, 7, 3));
    const elsewhere = { version: 1, runs: 0, best: 0, furthest: 0, levels: {} };
    store(elsewhere);

    stats.recordLevel("pips", cleared(3000, 9, 2));

    expect(stored()).toEqual(elsewhere);
  });

  it("keeps the stats for the next visit", () => {
    TestBed.inject(StatsService).recordLevel("stripes", cleared(1200, 5, 3));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideMemoryStorage(storage)],
    });

    expect(TestBed.inject(StatsService).stats().levels).toEqual({
      stripes: { points: 1200, rounds: 5, stars: 3 },
    });
  });

  it("reads the stats stored, for the levels the game has", () => {
    store({
      version: 1,
      runs: 2,
      best: 900,
      furthest: 3,
      levels: {
        pips: { points: 4100, rounds: 8, stars: 2 },
        gone: { points: 100, rounds: 1, stars: 1 },
      },
    });

    const stats = TestBed.inject(StatsService);

    expect(stats.stats()).toEqual({
      runs: 2,
      best: 900,
      furthest: 3,
      levels: { pips: { points: 4100, rounds: 8, stars: 2 } },
    });
  });
});

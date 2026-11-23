import { TestBed } from "@angular/core/testing";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import type { LevelResult } from "../../rules/run/stats";
import { StatsService } from "./stats.service";

// How the records are kept and read is `@fz/brick-wall/app/stored`'s
// `StoredStats`, whose spec holds it: this one holds the game's key, its
// levels and its rules.

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

/** Returns what a level cleared brings to its records. */
function cleared(points: number, rounds: number, stars: number): LevelResult {
  return { points, rounds, stars };
}

describe("StatsService", () => {
  it("keeps a cleared level's best points, fewest rounds and most stars, each by itself", () => {
    const stats = TestBed.inject(StatsService);

    stats.recordLevel("pips", cleared(4000, 9, 2));
    stats.recordLevel("pips", cleared(3000, 7, 3));

    expect(stats.stats().levels).toEqual({
      pips: { points: 4000, rounds: 7, stars: 3 },
    });
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

import { TestBed } from "@angular/core/testing";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import type { LevelRecord } from "../../rules/run/stats";
import { StatsService } from "./stats.service";

// How the records are kept and read is `@fz/brick-wall/app/stored`'s
// `StoredStats`, whose spec holds it: this one holds the game's key, its
// levels and its rules.

/** Where the stats are kept, in its own words, so a rename fails. */
const STATS_KEY = "rickashay-stats";

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

/** Returns what a level cleared brings to its records, its star for par and its rally mark's as given. */
function cleared(
  points: number,
  rounds: number,
  rally: number,
  par: boolean,
  mark: boolean,
): LevelRecord {
  return { points, rounds, rally, stars: { cleared: true, par, mark } };
}

describe("StatsService", () => {
  it("keeps a cleared level's best points, fewest rounds, best rally and each star, each by itself", () => {
    const stats = TestBed.inject(StatsService);

    stats.recordLevel("pips", cleared(4000, 9, 12, false, true));
    stats.recordLevel("pips", cleared(3000, 7, 8, true, false));

    expect(stats.stats().levels).toEqual({
      pips: cleared(4000, 7, 12, true, true),
    });
  });

  it("keeps the stats for the next visit", () => {
    TestBed.inject(StatsService).recordLevel(
      "columns",
      cleared(1200, 5, 9, true, false),
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideMemoryStorage(storage)],
    });

    expect(TestBed.inject(StatsService).stats().levels).toEqual({
      columns: cleared(1200, 5, 9, true, false),
    });
  });

  it("reads the stats stored, for the levels the game has", () => {
    const pips = cleared(4100, 8, 14, true, false);
    store({
      version: 1,
      runs: 2,
      best: 900,
      furthest: 3,
      levels: { pips, gone: cleared(100, 1, 1, true, true) },
    });

    const stats = TestBed.inject(StatsService);

    expect(stats.stats()).toEqual({
      runs: 2,
      best: 900,
      furthest: 3,
      levels: { pips },
    });
  });
});

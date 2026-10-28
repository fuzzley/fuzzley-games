import { TestBed } from "@angular/core/testing";
import { STATS_KEY, StatsService } from "./stats.service";

/** Stores stats as a player's browser would hold them. */
function store(value: unknown): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(value));
}

const NONE = { runs: 0, best: 0, longest: 0 };

describe("StatsService", () => {
  it("starts a new player with no runs at any speed", () => {
    const stats = TestBed.inject(StatsService);

    expect(stats.stats()).toEqual({ slow: NONE, normal: NONE, fast: NONE });
  });

  it("counts a run started at its speed", () => {
    const stats = TestBed.inject(StatsService);

    stats.recordStart("fast");

    expect(stats.stats().fast.runs).toBe(1);
  });

  it("keeps a run's score and length as the best and the longest", () => {
    const stats = TestBed.inject(StatsService);
    stats.recordStart("normal");

    stats.recordEnd("normal", 12, 15);

    expect(stats.stats().normal).toEqual({ runs: 1, best: 12, longest: 15 });
  });

  it("calls a score above the best a new best", () => {
    const stats = TestBed.inject(StatsService);
    stats.recordEnd("normal", 5, 8);

    expect(stats.recordEnd("normal", 6, 9)).toBe(true);
  });

  it("calls a score that only matches the best no new best, and keeps the best", () => {
    const stats = TestBed.inject(StatsService);
    stats.recordEnd("normal", 5, 8);

    const newBest = stats.recordEnd("normal", 5, 7);

    expect({ newBest, normal: stats.stats().normal }).toEqual({
      newBest: false,
      normal: { runs: 1, best: 5, longest: 8 },
    });
  });

  it("calls no score a new best", () => {
    const stats = TestBed.inject(StatsService);

    expect(stats.recordEnd("slow", 0, 3)).toBe(false);
  });

  it("keeps each speed's stats apart", () => {
    const stats = TestBed.inject(StatsService);

    stats.recordEnd("fast", 9, 12);

    expect(stats.stats().slow).toEqual(NONE);
  });

  it("keeps the stats for the next visit", () => {
    TestBed.inject(StatsService).recordEnd("slow", 4, 7);

    TestBed.resetTestingModule();

    expect(TestBed.inject(StatsService).stats().slow.best).toBe(4);
  });

  it("drops a speed's stored stats that make no sense, and keeps the rest", () => {
    store({
      version: 1,
      slow: { runs: 2, best: 3, longest: 6 },
      normal: { runs: -1, best: 3, longest: 6 },
      fast: { runs: 2, best: "lots", longest: 6 },
    });

    const stats = TestBed.inject(StatsService);

    expect(stats.stats()).toEqual({
      slow: { runs: 2, best: 3, longest: 6 },
      normal: NONE,
      fast: NONE,
    });
  });

  it("starts afresh from stats stored in another shape", () => {
    store({ version: 2, slow: { runs: 2, best: 3, longest: 6 } });

    const stats = TestBed.inject(StatsService);

    expect(stats.stats().slow).toEqual(NONE);
  });
});

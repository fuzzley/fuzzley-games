import { TestBed } from "@angular/core/testing";
import { STATS_KEY, StatsService } from "./stats.service";

/** Stores stats as a player's browser would hold them. */
function store(value: unknown): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(value));
}

describe("StatsService", () => {
  it("starts a new player with no games", () => {
    const stats = TestBed.inject(StatsService);

    expect(stats.stats().medium).toEqual({ played: 0, solved: 0, best: null });
  });

  it("counts a game started at its level", () => {
    const stats = TestBed.inject(StatsService);

    stats.recordStart("hard");

    expect(stats.stats().hard).toEqual({ played: 1, solved: 0, best: null });
  });

  it("counts a game solved, and keeps its time as the best", () => {
    const stats = TestBed.inject(StatsService);
    stats.recordStart("easy");

    stats.recordSolve("easy", 95, 0);

    expect(stats.stats().easy).toEqual({ played: 1, solved: 1, best: 95 });
  });

  it("calls the first solve a new best", () => {
    const stats = TestBed.inject(StatsService);

    expect(stats.recordSolve("easy", 95, 0)).toBe(true);
  });

  it("calls a faster solve a new best", () => {
    store({ version: 1, easy: { played: 2, solved: 1, best: 95 } });
    const stats = TestBed.inject(StatsService);

    expect(stats.recordSolve("easy", 80, 0)).toBe(true);
  });

  it("keeps the best time through a slower solve", () => {
    store({ version: 1, easy: { played: 2, solved: 1, best: 95 } });
    const stats = TestBed.inject(StatsService);

    const best = stats.recordSolve("easy", 120, 0);

    expect(best).toBe(false);
    expect(stats.stats().easy.best).toBe(95);
  });

  it("counts a solve with a hint, but not its time", () => {
    store({ version: 1, easy: { played: 2, solved: 1, best: 95 } });
    const stats = TestBed.inject(StatsService);

    const best = stats.recordSolve("easy", 30, 1);

    expect(best).toBe(false);
    expect(stats.stats().easy).toEqual({ played: 2, solved: 2, best: 95 });
  });

  it("counts a solve whose start went uncounted as played too", () => {
    const stats = TestBed.inject(StatsService);

    stats.recordSolve("expert", 600, 0);

    expect(stats.stats().expert.played).toBe(1);
  });

  it("keeps the stats for the next visit", () => {
    TestBed.inject(StatsService).recordStart("medium");

    TestBed.resetTestingModule();

    expect(TestBed.inject(StatsService).stats().medium.played).toBe(1);
  });

  it("drops a level's stats that make no sense", () => {
    store({
      version: 1,
      easy: { played: 1, solved: 2, best: 95 },
      medium: { played: 3, solved: 1, best: 200 },
    });

    const stats = TestBed.inject(StatsService);

    expect(stats.stats().easy).toEqual({ played: 0, solved: 0, best: null });
    expect(stats.stats().medium).toEqual({ played: 3, solved: 1, best: 200 });
  });

  it("drops a best time before any solve", () => {
    store({ version: 1, hard: { played: 1, solved: 0, best: 40 } });

    const stats = TestBed.inject(StatsService);

    expect(stats.stats().hard.best).toBeNull();
  });

  it("starts afresh from stats stored in another shape", () => {
    store({ version: 2, easy: { played: 4, solved: 4, best: 60 } });

    const stats = TestBed.inject(StatsService);

    expect(stats.stats().easy.played).toBe(0);
  });
});

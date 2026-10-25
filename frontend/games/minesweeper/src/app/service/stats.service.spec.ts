import { TestBed } from "@angular/core/testing";
import { STATS_KEY, StatsService } from "./stats.service";

/** Stores stats as a player's browser would hold them. */
function store(value: unknown): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(value));
}

describe("StatsService", () => {
  it("starts a new player with no games", () => {
    const stats = TestBed.inject(StatsService);

    expect(stats.stats().medium).toEqual({ played: 0, won: 0, best: null });
  });

  it("counts a game started at its difficulty", () => {
    const stats = TestBed.inject(StatsService);

    stats.recordStart("hard");

    expect(stats.stats().hard).toEqual({ played: 1, won: 0, best: null });
  });

  it("counts a game won, and keeps its time as the best", () => {
    const stats = TestBed.inject(StatsService);
    stats.recordStart("easy");

    stats.recordWin("easy", 95);

    expect(stats.stats().easy).toEqual({ played: 1, won: 1, best: 95 });
  });

  it("calls the first win a new best", () => {
    const stats = TestBed.inject(StatsService);

    expect(stats.recordWin("easy", 95)).toBe(true);
  });

  it("calls a faster win a new best", () => {
    store({ version: 1, easy: { played: 2, won: 1, best: 95 } });
    const stats = TestBed.inject(StatsService);

    expect(stats.recordWin("easy", 80)).toBe(true);
  });

  it("keeps the best time through a slower win", () => {
    store({ version: 1, easy: { played: 2, won: 1, best: 95 } });
    const stats = TestBed.inject(StatsService);

    const best = stats.recordWin("easy", 120);

    expect(best).toBe(false);
    expect(stats.stats().easy.best).toBe(95);
  });

  it("keeps no best time for Custom, whose fields differ", () => {
    const stats = TestBed.inject(StatsService);

    const best = stats.recordWin("custom", 30);

    expect(best).toBe(false);
    expect(stats.stats().custom).toEqual({ played: 0, won: 1, best: null });
  });

  it("keeps the stats", () => {
    const stats = TestBed.inject(StatsService);

    stats.recordStart("medium");

    expect(JSON.parse(localStorage.getItem(STATS_KEY) ?? "null")).toMatchObject(
      {
        version: 1,
        medium: { played: 1, won: 0, best: null },
      },
    );
  });

  it("reads the stats stored", () => {
    store({ version: 1, hard: { played: 9, won: 2, best: 400 } });

    const stats = TestBed.inject(StatsService);

    expect(stats.stats().hard).toEqual({ played: 9, won: 2, best: 400 });
  });

  it("drops a difficulty's stats that make no sense", () => {
    store({
      version: 1,
      easy: { played: 1, won: 3, best: 50 },
      medium: { played: 4, won: 2, best: 133 },
    });

    const stats = TestBed.inject(StatsService);

    expect(stats.stats().easy).toEqual({ played: 0, won: 0, best: null });
    expect(stats.stats().medium).toEqual({ played: 4, won: 2, best: 133 });
  });

  it("drops a best time with no win to go with it", () => {
    store({ version: 1, easy: { played: 3, won: 0, best: 50 } });

    const stats = TestBed.inject(StatsService);

    expect(stats.stats().easy).toEqual({ played: 3, won: 0, best: null });
  });

  it("ignores stats from another version", () => {
    store({ version: 2, easy: { played: 3, won: 1, best: 50 } });

    const stats = TestBed.inject(StatsService);

    expect(stats.stats().easy).toEqual({ played: 0, won: 0, best: null });
  });
});

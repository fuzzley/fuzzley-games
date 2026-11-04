import { TestBed } from "@angular/core/testing";
import type { EndedRun } from "../../rules/stats";
import { provideSpecWaves } from "../../testing/play";
import { STATS_KEY, StatsService } from "./stats.service";

/** Returns a run ended at Normal, at a score and a wave, started at the specs' sector. */
function ended(score: number, wave: number): EndedRun {
  return { speed: "normal", score, wave, sector: "specs" };
}

/** Returns what is stored, as a player's browser holds it. */
function stored(): unknown {
  return JSON.parse(localStorage.getItem(STATS_KEY) ?? "null");
}

/** Stores records as a player's browser would hold them, at the version the service writes. */
function store(stats: object): void {
  localStorage.setItem(STATS_KEY, JSON.stringify({ version: 1, ...stats }));
}

beforeEach(() => {
  TestBed.configureTestingModule({ providers: provideSpecWaves() });
});

describe("StatsService", () => {
  it("starts a new player with no runs", () => {
    const stats = TestBed.inject(StatsService);

    expect(stats.stats().speeds.normal).toEqual({
      runs: 0,
      best: 0,
      furthest: 0,
      strays: 0,
      clearedAll: false,
    });
  });

  it("calls a score above the best a new best, and keeps it", () => {
    const stats = TestBed.inject(StatsService);
    stats.recordStart("normal");

    const newBest = stats.recordEnd(ended(900, 2));

    expect({ newBest, normal: stats.stats().speeds.normal }).toEqual({
      newBest: true,
      normal: { runs: 1, best: 900, furthest: 2, strays: 0, clearedAll: false },
    });
  });

  it("calls a score no more than the best no new best", () => {
    const stats = TestBed.inject(StatsService);
    stats.recordEnd(ended(900, 2));

    expect(stats.recordEnd(ended(900, 1))).toBe(false);
  });

  it("counts the strays brought home", () => {
    const stats = TestBed.inject(StatsService);

    stats.recordStrays("normal", 2);

    expect(stats.stats().speeds.normal.strays).toBe(2);
  });

  it("stores the records as they change", () => {
    const stats = TestBed.inject(StatsService);

    stats.recordStart("fast");

    expect(stored()).toMatchObject({
      version: 1,
      speeds: { fast: { runs: 1 } },
    });
  });

  it("stores nothing for a change that changes nothing", () => {
    const stats = TestBed.inject(StatsService);

    stats.recordStrays("normal", 0);

    expect(stored()).toBeNull();
  });

  it("takes up the best of a run started in Endless", () => {
    store({ sectors: { endless: { normal: 1200 } } });

    const stats = TestBed.inject(StatsService);

    expect(stats.stats().sectors).toEqual({ endless: { normal: 1200 } });
  });

  it("takes up the records stored, dropping a sector the game no longer has", () => {
    store({
      speeds: { normal: { runs: 2, best: 900, furthest: 3, strays: 1 } },
      sectors: { specs: { normal: 900 }, gone: { normal: 40 } },
    });

    const stats = TestBed.inject(StatsService);

    expect({
      normal: stats.stats().speeds.normal,
      sectors: stats.stats().sectors,
    }).toEqual({
      normal: { runs: 2, best: 900, furthest: 3, strays: 1, clearedAll: false },
      sectors: { specs: { normal: 900 } },
    });
  });
});

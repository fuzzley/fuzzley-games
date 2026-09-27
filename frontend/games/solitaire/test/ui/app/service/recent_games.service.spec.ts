// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  RecentGamesService,
  type RecentGame,
} from "@/ui/app/service/recent_games.service";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import { createMockGameModel } from "@test/support/ui/game_mock";
import {
  asCatalog,
  createMockCatalog,
  type MockCatalogHarness,
} from "@test/support/ui/catalog_mock";

const STORAGE_KEY = "fsolitaire-recent-games";

/** Klondike by the mock catalog's starting rules. */
const KLONDIKE: RecentGame = {
  gameId: "klondike",
  values: { drawCount: 3, almostWin: 0 },
};

interface Harness {
  readonly recent: RecentGamesService;
  readonly catalog: MockCatalogHarness;
}

/** Starts the service over the mock catalog, with `stored` already saved. */
function start(stored?: unknown): Harness {
  if (stored !== undefined) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }
  const catalog = createMockCatalog(createMockGameModel());
  TestBed.configureTestingModule({
    providers: [
      { provide: GameCatalogService, useValue: asCatalog(catalog.catalog) },
    ],
  });
  const recent = TestBed.inject(RecentGamesService);
  TestBed.flushEffects();
  return { recent, catalog };
}

/** Returns the recent games' ids, newest first. */
function ids(harness: Harness): string[] {
  return harness.recent.games().map((game) => game.gameId);
}

describe("RecentGamesService", () => {
  it("remembers the game on the table, by its rules", () => {
    const harness = start();

    expect(harness.recent.games()).toEqual([KLONDIKE]);
  });

  it("puts the game dealt most recently first", () => {
    const harness = start();

    harness.catalog.catalog.select("freecell");
    TestBed.flushEffects();

    expect(ids(harness)).toEqual(["freecell", "klondike"]);
  });

  it("remembers the same game by other rules as another game", () => {
    const harness = start();

    harness.catalog.catalog.setOption("drawCount", 1);
    TestBed.flushEffects();

    expect(harness.recent.games()).toEqual([
      { ...KLONDIKE, values: { drawCount: 1, almostWin: 0 } },
      KLONDIKE,
    ]);
  });

  it("moves a game played again to the front rather than listing it twice", () => {
    const harness = start();
    harness.catalog.catalog.select("freecell");
    TestBed.flushEffects();

    harness.catalog.catalog.select("klondike");
    TestBed.flushEffects();

    expect(ids(harness)).toEqual(["klondike", "freecell"]);
  });

  it("keeps what it remembers in storage", () => {
    const harness = start();

    harness.catalog.catalog.select("freecell");
    TestBed.flushEffects();

    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "");
    expect(stored).toEqual(harness.recent.games());
  });

  it("carries on from the games stored before", () => {
    const harness = start([{ gameId: "freecell", values: {} }]);

    expect(ids(harness)).toEqual(["klondike", "freecell"]);
  });

  it("drops the oldest game once it remembers eight", () => {
    // Eight FreeCell games told apart by a rule, the last the oldest.
    const stored = Array.from({ length: 8 }, (_, age) => ({
      gameId: "freecell",
      values: { age },
    }));

    const harness = start(stored);

    expect(harness.recent.games().map((game) => game.values)).toEqual([
      KLONDIKE.values,
      ...stored.slice(0, 7).map((game) => game.values),
    ]);
  });

  it("forgets a stored game the catalog no longer has", () => {
    const harness = start([{ gameId: "retired", values: {} }]);

    expect(ids(harness)).toEqual(["klondike"]);
  });

  it("starts afresh, with a warning, when what is stored is malformed", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const harness = start([{ gameId: 7 }]);

    expect(ids(harness)).toEqual(["klondike"]);
    expect(warn).toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { GameMetricsService } from "@/ui/app/service/game_metrics.service";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import {
  createMockGameModel,
  type MockGameModel,
  type MockGameModelOverrides,
} from "@test/support/ui/game_mock";
import { asCatalog, createMockCatalog } from "@test/support/ui/catalog_mock";

interface Harness {
  metrics: GameMetricsService;
  model: MockGameModel;
  catalog: ReturnType<typeof createMockCatalog>;
}

function buildMetrics(overrides: MockGameModelOverrides = {}): Harness {
  const model = createMockGameModel(overrides);
  const catalog = createMockCatalog(model);

  TestBed.configureTestingModule({
    providers: [
      { provide: GameCatalogService, useValue: asCatalog(catalog.catalog) },
    ],
  });

  const metrics = TestBed.inject(GameMetricsService);
  // The readings are bound by an effect, so it has to have run before a test
  // can read them.
  TestBed.flushEffects();
  return { metrics, model, catalog };
}

describe("GameMetricsService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("following the game on the table", () => {
    it("reports the score the game publishes", () => {
      const { metrics, model } = buildMetrics();

      model.state.score$.next(100);

      expect(metrics.score()).toBe(100);
    });

    it("reports the moves the game publishes", () => {
      const { metrics, model } = buildMetrics();

      model.state.moves$.next(12);

      expect(metrics.moves()).toBe(12);
    });

    it("re-binds to a game that replaces it", () => {
      const { metrics, catalog } = buildMetrics({ score: 10 });

      catalog.deal(createMockGameModel({ score: 99 }));
      TestBed.flushEffects();

      expect(metrics.score()).toBe(99);
    });

    it("stops following the game that left", () => {
      const { metrics, model, catalog } = buildMetrics({ score: 10 });
      catalog.deal(createMockGameModel({ score: 99 }));
      TestBed.flushEffects();

      model.state.score$.next(555);

      expect(metrics.score()).toBe(99);
    });
  });

  describe("the stopwatch", () => {
    it("stays at zero until the first move", () => {
      const { metrics } = buildMetrics();

      vi.advanceTimersByTime(5000);

      expect(metrics.timerText()).toBe("00:00");
    });

    it("starts once the first move is made", () => {
      const { metrics, model } = buildMetrics();

      model.state.moves$.next(1);
      TestBed.flushEffects();
      vi.advanceTimersByTime(5000);

      expect(metrics.timerText()).toBe("00:05");
    });

    it("freezes once the game is won", () => {
      const { metrics, model } = buildMetrics();
      model.state.moves$.next(1);
      TestBed.flushEffects();
      vi.advanceTimersByTime(1000);

      model.emit("game-won");
      TestBed.flushEffects();
      vi.advanceTimersByTime(5000);

      expect(metrics.timerText()).toBe("00:01");
    });

    it("clears on reset, for a freshly dealt game", () => {
      const { metrics, model } = buildMetrics();
      model.state.moves$.next(1);
      TestBed.flushEffects();
      vi.advanceTimersByTime(3000);

      metrics.reset();

      expect(metrics.timerText()).toBe("00:00");
    });
  });

  describe("winning", () => {
    it("is marked won when the game says so", () => {
      const { metrics, model } = buildMetrics();

      model.emit("game-won");
      TestBed.flushEffects();

      expect(metrics.isGameWon()).toBe(true);
    });

    it("is no longer won after a reset", () => {
      const { metrics, model } = buildMetrics();
      model.emit("game-won");
      TestBed.flushEffects();

      metrics.reset();

      expect(metrics.isGameWon()).toBe(false);
    });
  });

  describe("whether a game is in progress", () => {
    it("is not, before a move is made", () => {
      expect(buildMetrics({ moves: 0 }).metrics.isInProgress()).toBe(false);
    });

    it("is, once moves have been made", () => {
      expect(buildMetrics({ moves: 4 }).metrics.isInProgress()).toBe(true);
    });

    it("is not, once the game is won", () => {
      const { metrics, model } = buildMetrics({ moves: 4 });

      model.emit("game-won");
      TestBed.flushEffects();

      expect(metrics.isInProgress()).toBe(false);
    });
  });

  describe("whether a move can be taken back", () => {
    it("cannot with nothing to take back", () => {
      expect(buildMetrics({ undoDepth: 0 }).metrics.canUndo()).toBe(false);
    });

    it("can once the game has history", () => {
      const { metrics, model } = buildMetrics({ undoDepth: 0 });

      model.state.undoDepth$.next(1);

      expect(metrics.canUndo()).toBe(true);
    });

    it("cannot on a won game, whose board is finished", () => {
      const { metrics, model } = buildMetrics({ undoDepth: 3 });

      model.emit("game-won");
      TestBed.flushEffects();

      expect(metrics.canUndo()).toBe(false);
    });
  });
});

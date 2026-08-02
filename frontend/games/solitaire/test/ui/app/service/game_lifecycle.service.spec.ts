// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { GameLifecycleService } from "@/ui/app/service/game_lifecycle.service";
import { GameMetricsService } from "@/ui/app/service/game_metrics.service";
import { ConfirmationService } from "@/ui/app/service/confirmation.service";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import {
  createMockGameModel,
  type MockGameModel,
  type MockGameModelOverrides,
} from "@test/support/ui/game_mock";
import { asCatalog, createMockCatalog } from "@test/support/ui/catalog_mock";

interface Harness {
  lifecycle: GameLifecycleService;
  metrics: GameMetricsService;
  confirmation: ConfirmationService;
  model: MockGameModel;
  catalog: ReturnType<typeof createMockCatalog>;
}

function buildLifecycle(overrides: MockGameModelOverrides = {}): Harness {
  const model = createMockGameModel(overrides);
  const catalog = createMockCatalog(model);

  TestBed.configureTestingModule({
    providers: [
      { provide: GameCatalogService, useValue: asCatalog(catalog.catalog) },
    ],
  });

  const lifecycle = TestBed.inject(GameLifecycleService);
  const metrics = TestBed.inject(GameMetricsService);
  const confirmation = TestBed.inject(ConfirmationService);
  TestBed.flushEffects();
  return { lifecycle, metrics, confirmation, model, catalog };
}

describe("GameLifecycleService", () => {
  describe("with a fresh game, which has nothing to lose", () => {
    it("restarts without asking", async () => {
      const harness = buildLifecycle();

      await harness.lifecycle.restartGame();

      expect(harness.model.restartGame).toHaveBeenCalledOnce();
      expect(harness.confirmation.isOpen()).toBe(false);
    });

    it("deals a new game without asking", async () => {
      const harness = buildLifecycle();

      await harness.lifecycle.startNewGame();

      expect(harness.model.startNewGame).toHaveBeenCalledOnce();
    });

    it("switches games without asking", async () => {
      const harness = buildLifecycle();

      await harness.lifecycle.selectGame("freecell");

      expect(harness.catalog.select).toHaveBeenCalledWith("freecell");
    });

    it("changes a rule without asking", async () => {
      const harness = buildLifecycle();

      await harness.lifecycle.setRuleOption("drawCount", 1);

      expect(harness.catalog.setOption).toHaveBeenCalledWith("drawCount", 1);
    });
  });

  describe("with a game in progress", () => {
    /** Starts an action and answers the prompt it raises. */
    async function answer(
      harness: Harness,
      action: Promise<void>,
      confirmed: boolean,
    ): Promise<void> {
      expect(harness.confirmation.isOpen()).toBe(true);
      if (confirmed) harness.confirmation.accept();
      else harness.confirmation.cancel();
      await action;
    }

    it("asks before restarting", () => {
      const harness = buildLifecycle({ moves: 5 });

      void harness.lifecycle.restartGame();

      expect(harness.confirmation.isOpen()).toBe(true);
      expect(harness.confirmation.message()).toContain("restart this game");
      expect(harness.model.restartGame).not.toHaveBeenCalled();
    });

    it("restarts once the prompt is accepted", async () => {
      const harness = buildLifecycle({ moves: 5 });

      await answer(harness, harness.lifecycle.restartGame(), true);

      expect(harness.model.restartGame).toHaveBeenCalledOnce();
    });

    it("does not restart when the prompt is declined", async () => {
      const harness = buildLifecycle({ moves: 5 });

      await answer(harness, harness.lifecycle.restartGame(), false);

      expect(harness.model.restartGame).not.toHaveBeenCalled();
    });

    it("asks before switching games", () => {
      const harness = buildLifecycle({ moves: 4 });

      void harness.lifecycle.selectGame("freecell");

      expect(harness.confirmation.isOpen()).toBe(true);
      expect(harness.catalog.select).not.toHaveBeenCalled();
    });

    it("switches once the prompt is accepted", async () => {
      const harness = buildLifecycle({ moves: 4 });

      await answer(harness, harness.lifecycle.selectGame("freecell"), true);

      expect(harness.catalog.select).toHaveBeenCalledWith("freecell");
    });

    it("asks before changing a rule, which deals a new game", async () => {
      const harness = buildLifecycle({ moves: 5 });

      const action = harness.lifecycle.setRuleOption("drawCount", 1);

      expect(harness.confirmation.message()).toContain("deal a new game");
      await answer(harness, action, true);
      expect(harness.catalog.setOption).toHaveBeenCalledWith("drawCount", 1);
    });

    it("stops asking once the game is won, since it is already over", async () => {
      const harness = buildLifecycle({ moves: 5 });
      harness.model.emit("game-won");
      TestBed.flushEffects();

      await harness.lifecycle.restartGame();

      expect(harness.confirmation.isOpen()).toBe(false);
      expect(harness.model.restartGame).toHaveBeenCalledOnce();
    });
  });

  describe("actions that change nothing", () => {
    it("ignores picking the game already in play, which would deal a new one", async () => {
      const harness = buildLifecycle({ moves: 4 });

      await harness.lifecycle.selectGame("klondike");

      expect(harness.catalog.select).not.toHaveBeenCalled();
      expect(harness.confirmation.isOpen()).toBe(false);
    });

    it("ignores setting a rule to the value it already has", async () => {
      const harness = buildLifecycle({ moves: 4 });

      await harness.lifecycle.setRuleOption("drawCount", 3);

      expect(harness.catalog.setOption).not.toHaveBeenCalled();
      expect(harness.confirmation.isOpen()).toBe(false);
    });
  });

  describe("undo", () => {
    it("takes the move back on the game", () => {
      const harness = buildLifecycle({ undoDepth: 2 });

      harness.lifecycle.undo();

      expect(harness.model.undo).toHaveBeenCalledOnce();
    });

    it("does nothing when there is nothing to take back", () => {
      const harness = buildLifecycle({ undoDepth: 0 });

      harness.lifecycle.undo();

      expect(harness.model.undo).not.toHaveBeenCalled();
    });
  });

  describe("after a game is dealt afresh", () => {
    it("clears the won flag, so the victory card goes away", async () => {
      const harness = buildLifecycle();
      harness.model.emit("game-won");
      TestBed.flushEffects();

      await harness.lifecycle.startNewGame();

      expect(harness.metrics.isGameWon()).toBe(false);
    });
  });
});

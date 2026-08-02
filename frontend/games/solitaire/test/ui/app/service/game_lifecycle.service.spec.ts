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
      const h = buildLifecycle();

      await h.lifecycle.restartGame();

      expect(h.model.restartGame).toHaveBeenCalledOnce();
      expect(h.confirmation.isOpen()).toBe(false);
    });

    it("deals a new game without asking", async () => {
      const h = buildLifecycle();

      await h.lifecycle.startNewGame();

      expect(h.model.startNewGame).toHaveBeenCalledOnce();
    });

    it("switches games without asking", async () => {
      const h = buildLifecycle();

      await h.lifecycle.selectGame("freecell");

      expect(h.catalog.select).toHaveBeenCalledWith("freecell");
    });

    it("changes a rule without asking", async () => {
      const h = buildLifecycle();

      await h.lifecycle.setRuleOption("drawCount", 1);

      expect(h.catalog.setOption).toHaveBeenCalledWith("drawCount", 1);
    });
  });

  describe("with a game in progress", () => {
    /** Starts an action and answers the prompt it raises. */
    async function answer(
      h: Harness,
      action: Promise<void>,
      confirmed: boolean,
    ): Promise<void> {
      expect(h.confirmation.isOpen()).toBe(true);
      if (confirmed) h.confirmation.accept();
      else h.confirmation.cancel();
      await action;
    }

    it("asks before restarting", () => {
      const h = buildLifecycle({ moves: 5 });

      void h.lifecycle.restartGame();

      expect(h.confirmation.isOpen()).toBe(true);
      expect(h.confirmation.message()).toContain("restart this game");
      expect(h.model.restartGame).not.toHaveBeenCalled();
    });

    it("restarts once the prompt is accepted", async () => {
      const h = buildLifecycle({ moves: 5 });

      await answer(h, h.lifecycle.restartGame(), true);

      expect(h.model.restartGame).toHaveBeenCalledOnce();
    });

    it("does not restart when the prompt is declined", async () => {
      const h = buildLifecycle({ moves: 5 });

      await answer(h, h.lifecycle.restartGame(), false);

      expect(h.model.restartGame).not.toHaveBeenCalled();
    });

    it("asks before switching games", () => {
      const h = buildLifecycle({ moves: 4 });

      void h.lifecycle.selectGame("freecell");

      expect(h.confirmation.isOpen()).toBe(true);
      expect(h.catalog.select).not.toHaveBeenCalled();
    });

    it("switches once the prompt is accepted", async () => {
      const h = buildLifecycle({ moves: 4 });

      await answer(h, h.lifecycle.selectGame("freecell"), true);

      expect(h.catalog.select).toHaveBeenCalledWith("freecell");
    });

    it("asks before changing a rule, which deals a new game", async () => {
      const h = buildLifecycle({ moves: 5 });

      const action = h.lifecycle.setRuleOption("drawCount", 1);

      expect(h.confirmation.message()).toContain("deal a new game");
      await answer(h, action, true);
      expect(h.catalog.setOption).toHaveBeenCalledWith("drawCount", 1);
    });

    it("stops asking once the game is won, since it is already over", async () => {
      const h = buildLifecycle({ moves: 5 });
      h.model.emit("game-won");
      TestBed.flushEffects();

      await h.lifecycle.restartGame();

      expect(h.confirmation.isOpen()).toBe(false);
      expect(h.model.restartGame).toHaveBeenCalledOnce();
    });
  });

  describe("actions that change nothing", () => {
    it("ignores picking the game already in play, which would deal a new one", async () => {
      const h = buildLifecycle({ moves: 4 });

      await h.lifecycle.selectGame("klondike");

      expect(h.catalog.select).not.toHaveBeenCalled();
      expect(h.confirmation.isOpen()).toBe(false);
    });

    it("ignores setting a rule to the value it already has", async () => {
      const h = buildLifecycle({ moves: 4 });

      await h.lifecycle.setRuleOption("drawCount", 3);

      expect(h.catalog.setOption).not.toHaveBeenCalled();
      expect(h.confirmation.isOpen()).toBe(false);
    });
  });

  describe("undo", () => {
    it("takes the move back on the game", () => {
      const h = buildLifecycle({ undoDepth: 2 });

      h.lifecycle.undo();

      expect(h.model.undo).toHaveBeenCalledOnce();
    });

    it("does nothing when there is nothing to take back", () => {
      const h = buildLifecycle({ undoDepth: 0 });

      h.lifecycle.undo();

      expect(h.model.undo).not.toHaveBeenCalled();
    });
  });

  describe("after a game is dealt afresh", () => {
    it("clears the won flag, so the victory card goes away", async () => {
      const h = buildLifecycle();
      h.model.emit("game-won");
      TestBed.flushEffects();

      await h.lifecycle.startNewGame();

      expect(h.metrics.isGameWon()).toBe(false);
    });
  });
});

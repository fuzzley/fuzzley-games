// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SavedGameService } from "@/ui/app/service/saved_game.service";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import type { GamePosition } from "@/ui/app/model/game_position";
import type { GameSnapshot } from "@/engine/tableau/game_snapshot";
import {
  createMockGameModel,
  type MockGameModel,
} from "@test/support/ui/game_mock";
import {
  asCatalog,
  createMockCatalog,
  type MockCatalogHarness,
} from "@test/support/ui/catalog_mock";
import { flushMicrotasks } from "@test/support/async";

const STORAGE_KEY = "fsolitaire-saved-game";

/** A snapshot with a score to tell it apart from the mock's own. */
const SNAPSHOT: GameSnapshot = {
  piles: [],
  score: 250,
  moves: 7,
  history: [],
  deal: [],
  extra: null,
};

/** A saved Klondike game played by the mock catalog's rules. */
const SAVED: GamePosition = {
  gameId: "klondike",
  options: { drawCount: 3, almostWin: 0 },
  snapshot: SNAPSHOT,
};

interface Harness {
  readonly model: MockGameModel;
  readonly catalog: MockCatalogHarness;
}

/** Starts the service over the mock catalog, with `saved` already in storage. */
function start(
  saved?: unknown,
  model: MockGameModel = createMockGameModel(),
): Harness {
  if (saved !== undefined) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }
  const catalog = createMockCatalog(model);
  TestBed.configureTestingModule({
    providers: [
      { provide: GameCatalogService, useValue: asCatalog(catalog.catalog) },
    ],
  });
  TestBed.inject(SavedGameService);
  TestBed.flushEffects();
  return { model, catalog };
}

/** Returns the game in storage, or null when there is none. */
function stored(): GamePosition | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as GamePosition) : null;
}

describe("SavedGameService", () => {
  describe("at startup", () => {
    it("restores the saved game when it is the game on the table", () => {
      const { model } = start(SAVED);

      expect(model.restore).toHaveBeenCalledWith(SNAPSHOT);
    });

    it("leaves a saved game of another game alone", () => {
      const { model } = start({ ...SAVED, gameId: "freecell" });

      expect(model.restore).not.toHaveBeenCalled();
    });

    it("leaves a saved game played by other rules alone", () => {
      const { model } = start({ ...SAVED, options: { drawCount: 1 } });

      expect(model.restore).not.toHaveBeenCalled();
    });

    it("ignores a saved game it cannot read", () => {
      vi.spyOn(console, "warn").mockImplementation(() => undefined);

      const { model } = start({ gameId: "klondike" });

      expect(model.restore).not.toHaveBeenCalled();
    });

    it("carries on with a fresh deal when the saved game does not fit", () => {
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const model = createMockGameModel();
      model.restore.mockImplementation(() => {
        throw new Error("This game has no pile.");
      });

      expect(() => start(SAVED, model)).not.toThrow();
    });
  });

  describe("while playing", () => {
    it("saves the game on the table once it changes", async () => {
      const { model } = start();

      model.state.moves = 1;
      await flushMicrotasks();

      expect(stored()).toEqual({
        gameId: "klondike",
        options: { drawCount: 3, almostWin: 0 },
        snapshot: model.snapshot(),
      });
    });

    it("saves the game as the action left it, not partway through", async () => {
      const { model } = start();

      model.state.moves = 1;
      model.snapshot.mockReturnValue(SNAPSHOT);
      await flushMicrotasks();

      expect(stored()?.snapshot).toEqual(SNAPSHOT);
    });

    it("saves a freshly dealt game", async () => {
      const { model } = start();
      await flushMicrotasks();
      localStorage.clear();

      model.emit("game-reset");
      await flushMicrotasks();

      expect(stored()).not.toBeNull();
    });

    it("follows the game on the table when another is dealt", async () => {
      const { catalog } = start();
      const dealt = createMockGameModel();
      catalog.deal(dealt);
      TestBed.flushEffects();

      dealt.state.moves = 2;
      await flushMicrotasks();

      expect(stored()?.snapshot.moves).toBe(2);
    });
  });

  describe("once the game is won", () => {
    it("forgets it, so a reload deals afresh", async () => {
      const { model } = start();
      await flushMicrotasks();

      model.emit("game-won");

      expect(stored()).toBeNull();
    });

    it("does not save it again", async () => {
      const { model } = start();
      await flushMicrotasks();
      model.emit("game-won");

      model.state.score = 100;
      await flushMicrotasks();

      expect(stored()).toBeNull();
    });

    it("saves again once a new game is dealt", async () => {
      const { model } = start();
      model.emit("game-won");

      model.emit("game-reset");
      await flushMicrotasks();

      expect(stored()).not.toBeNull();
    });
  });
});

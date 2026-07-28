// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { GameSessionService } from "@/ui/app/service/game_session.service";
import { ConfirmationService } from "@/ui/app/service/confirmation.service";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import { PresentationSettingsService } from "@/ui/app/service/presentation_settings.service";
import {
  createMockGameModel,
  createMockPresentation,
  createMockCatalog,
  asCatalog,
  asPresentation,
  type MockCatalog,
  type MockGameModel,
  type MockPresentation,
} from "@test/support/game_model_mock";

interface Harness {
  session: GameSessionService;
  confirmation: ConfirmationService;
  model: MockGameModel;
  catalog: MockCatalog;
  presentation: MockPresentation;
  emitGameWon: () => void;
}

function buildSession(model: MockGameModel): Harness {
  let emitGameWon = () => {};
  model.on = vi.fn((event: string, callback: () => void) => {
    if (event === "game-won") emitGameWon = callback;
  });

  const presentation = createMockPresentation();
  const catalog = createMockCatalog(model);
  TestBed.configureTestingModule({
    providers: [
      { provide: GameCatalogService, useValue: asCatalog(catalog) },
      {
        provide: PresentationSettingsService,
        useValue: asPresentation(presentation),
      },
    ],
  });
  const session = TestBed.inject(GameSessionService);
  // The metrics are bound by an effect now, so it has to have run before a
  // test can read them.
  TestBed.flushEffects();
  const confirmation = TestBed.inject(ConfirmationService);
  return {
    session,
    confirmation,
    model,
    catalog,
    presentation,
    emitGameWon: () => emitGameWon(),
  };
}

describe("GameSessionService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("with a fresh game (no moves)", () => {
    let harness: Harness;

    beforeEach(() => {
      harness = buildSession(createMockGameModel());
    });

    it("bridges the model's state to signals", () => {
      harness.model.state.score$.next(100);
      harness.model.state.moves$.next(12);
      harness.model.settings.drawCount$.next(1);
      harness.presentation.cardBackStyle$.next("card-back-red");
      harness.catalog.setOption("drawCount", 1);

      expect(harness.session.score()).toBe(100);
      expect(harness.session.moves()).toBe(12);
      expect(harness.session.optionValues()["drawCount"]).toBe(1);
      expect(harness.session.cardBack()).toBe("card-back-red");
    });

    it("restarts immediately without confirmation", () => {
      harness.session.restartGame();

      expect(harness.model.restartGame).toHaveBeenCalled();
      expect(harness.confirmation.isOpen()).toBe(false);
    });

    it("starts the timer once the first move is made", () => {
      harness.model.state.moves$.next(1);
      TestBed.flushEffects();

      vi.advanceTimersByTime(5000);

      expect(harness.session.timerText()).toBe("00:05");
    });

    it("forwards the card back style to the model", () => {
      harness.session.setCardBack("card-back-red");

      expect(harness.presentation.setCardBackStyle).toHaveBeenCalledWith(
        "card-back-red",
      );
    });

    it("does nothing when the rule is already set to that value", () => {
      harness.session.setRuleOption("drawCount", 3); // default is 3

      expect(harness.catalog.setOption).not.toHaveBeenCalled();
      expect(harness.confirmation.isOpen()).toBe(false);
    });

    it("changes a rule without asking, since nothing is in progress", () => {
      harness.session.setRuleOption("drawCount", 1);

      expect(harness.catalog.setOption).toHaveBeenCalledWith("drawCount", 1);
      expect(harness.confirmation.isOpen()).toBe(false);
    });

    it("changes a debug rule the same way", () => {
      harness.session.setRuleOption("almostWin", 1);

      expect(harness.catalog.setOption).toHaveBeenCalledWith("almostWin", 1);
    });

    it("offers the game's rules, keeping the debug ones apart", () => {
      expect([
        harness.session.ruleOptions().map((option) => option.id),
        harness.session.debugOptions().map((option) => option.id),
      ]).toEqual([["drawCount"], ["almostWin"]]);
    });
  });

  describe("with a game in progress (moves > 0)", () => {
    let harness: Harness;

    beforeEach(() => {
      harness = buildSession(createMockGameModel({ moves: 5 }));
      TestBed.flushEffects();
    });

    it("defers restart behind a confirmation prompt", () => {
      harness.session.restartGame();

      expect(harness.confirmation.isOpen()).toBe(true);
      expect(harness.confirmation.message()).toContain("restart this game");
      expect(harness.model.restartGame).not.toHaveBeenCalled();
    });

    it("performs the restart after the prompt is accepted", () => {
      harness.session.restartGame();

      harness.confirmation.accept();

      expect(harness.model.restartGame).toHaveBeenCalled();
      expect(harness.confirmation.isOpen()).toBe(false);
    });

    it("defers a rule change behind confirmation", () => {
      harness.session.setRuleOption("drawCount", 1);

      expect(harness.confirmation.isOpen()).toBe(true);
      expect(harness.confirmation.message()).toContain("deal a new game");
      expect(harness.catalog.setOption).not.toHaveBeenCalled();

      harness.confirmation.accept();
      // The catalog deals the new game, rather than the old one being told to
      // restart itself: a rule change can alter which cards exist at all.
      expect(harness.catalog.setOption).toHaveBeenCalledWith("drawCount", 1);
    });

    it("does not restart when the prompt is cancelled", () => {
      harness.session.restartGame();

      harness.confirmation.cancel();

      expect(harness.model.restartGame).not.toHaveBeenCalled();
      expect(harness.confirmation.isOpen()).toBe(false);
    });

    it("skips confirmation once the game is won", () => {
      harness.emitGameWon();
      TestBed.flushEffects();

      harness.session.restartGame();

      expect(harness.confirmation.isOpen()).toBe(false);
      expect(harness.model.restartGame).toHaveBeenCalled();
    });
  });

  describe("when the game is won", () => {
    it("marks the session won and stops the timer", () => {
      const harness = buildSession(createMockGameModel());
      harness.model.state.moves$.next(1);
      TestBed.flushEffects();
      vi.advanceTimersByTime(1000);
      expect(harness.session.timerText()).toBe("00:01");

      harness.emitGameWon();
      TestBed.flushEffects();

      expect(harness.session.isGameWon()).toBe(true);
      vi.advanceTimersByTime(5000);
      expect(harness.session.timerText()).toBe("00:01");
    });
  });

  describe("undo", () => {
    it("is unavailable with nothing to take back", () => {
      const harness = buildSession(createMockGameModel({ undoDepth: 0 }));

      expect(harness.session.canUndo()).toBe(false);
    });

    it("becomes available once the model has history", () => {
      const harness = buildSession(createMockGameModel({ undoDepth: 0 }));

      harness.model.state.undoDepth$.next(1);

      expect(harness.session.canUndo()).toBe(true);
    });

    it("is unavailable on a won game, whose board is finished", () => {
      const harness = buildSession(createMockGameModel({ undoDepth: 3 }));

      harness.emitGameWon();
      TestBed.flushEffects();

      expect(harness.session.canUndo()).toBe(false);
    });

    it("takes the move back on the model", () => {
      const harness = buildSession(createMockGameModel({ undoDepth: 2 }));

      harness.session.undo();

      expect(harness.model.undo).toHaveBeenCalledTimes(1);
    });

    it("does nothing when there is nothing to take back", () => {
      const harness = buildSession(createMockGameModel({ undoDepth: 0 }));

      harness.session.undo();

      expect(harness.model.undo).not.toHaveBeenCalled();
    });
  });

  describe("choosing a game", () => {
    it("offers every game in the catalog", () => {
      const harness = buildSession(createMockGameModel());

      expect(harness.session.games.map((game) => game.id)).toEqual([
        "klondike",
        "freecell",
      ]);
    });

    it("reports which one is on the table", () => {
      const harness = buildSession(createMockGameModel());

      expect(harness.session.selectedGameId()).toBe("klondike");
    });

    it("switches immediately when no move has been made", () => {
      const harness = buildSession(createMockGameModel({ moves: 0 }));

      harness.session.selectGame("freecell");

      expect(harness.catalog.select).toHaveBeenCalledWith("freecell");
    });

    it("asks first when a game is in progress", () => {
      const harness = buildSession(createMockGameModel({ moves: 4 }));

      harness.session.selectGame("freecell");

      expect(harness.confirmation.isOpen()).toBe(true);
      expect(harness.catalog.select).not.toHaveBeenCalled();
    });

    it("switches once the prompt is accepted", () => {
      const harness = buildSession(createMockGameModel({ moves: 4 }));
      harness.session.selectGame("freecell");

      harness.confirmation.accept();

      expect(harness.catalog.select).toHaveBeenCalledWith("freecell");
    });

    it("ignores picking the game already in play, which would deal a new one", () => {
      const harness = buildSession(createMockGameModel({ moves: 4 }));

      harness.session.selectGame("klondike");

      expect(harness.catalog.select).not.toHaveBeenCalled();
      expect(harness.confirmation.isOpen()).toBe(false);
    });

    it("re-binds its metrics to the game that arrives", () => {
      const harness = buildSession(createMockGameModel({ score: 10 }));
      const replacement = createMockGameModel({ score: 99 });

      harness.catalog.session.set({
        game: replacement,
      });
      TestBed.flushEffects();

      expect(harness.session.score()).toBe(99);
    });

    it("stops following the game that left", () => {
      const harness = buildSession(createMockGameModel({ score: 10 }));
      const departing = harness.model;
      harness.catalog.session.set({
        game: createMockGameModel({ score: 99 }),
      });
      TestBed.flushEffects();

      departing.state.score$.next(555);

      expect(harness.session.score()).toBe(99);
    });
  });
});

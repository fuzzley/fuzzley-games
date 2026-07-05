// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { GameSessionService } from "@/ui/app/service/game_session.service";
import { ConfirmationService } from "@/ui/app/service/confirmation.service";
import { GAME_MODEL } from "@/ui/app/provider/game_model.provider";
import {
  createMockGameModel,
  asGameModel,
  type MockGameModel,
} from "@test/support/game_model_mock";

interface Harness {
  session: GameSessionService;
  confirmation: ConfirmationService;
  model: MockGameModel;
  emitGameWon: () => void;
}

function buildSession(model: MockGameModel): Harness {
  let emitGameWon = () => {};
  model.on = vi.fn((event: string, callback: () => void) => {
    if (event === "game-won") emitGameWon = callback;
  });

  TestBed.configureTestingModule({
    providers: [{ provide: GAME_MODEL, useValue: asGameModel(model) }],
  });
  const session = TestBed.inject(GameSessionService);
  const confirmation = TestBed.inject(ConfirmationService);
  return { session, confirmation, model, emitGameWon: () => emitGameWon() };
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
      harness.model.settings.cardBackStyle$.next("card-back-red");

      expect(harness.session.score()).toBe(100);
      expect(harness.session.moves()).toBe(12);
      expect(harness.session.drawCount()).toBe(1);
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

      expect(harness.model.setCardBackStyle).toHaveBeenCalledWith(
        "card-back-red",
      );
    });

    it("does nothing when the draw mode is unchanged", () => {
      harness.session.setDrawMode(3); // default is 3

      expect(harness.model.setDrawCount).not.toHaveBeenCalled();
      expect(harness.confirmation.isOpen()).toBe(false);
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

    it("defers a draw-mode change behind confirmation", () => {
      harness.session.setDrawMode(1);

      expect(harness.confirmation.isOpen()).toBe(true);
      expect(harness.confirmation.message()).toContain("draw mode");
      expect(harness.model.setDrawCount).not.toHaveBeenCalled();

      harness.confirmation.accept();
      expect(harness.model.setDrawCount).toHaveBeenCalledWith(1);
      expect(harness.model.startNewGame).toHaveBeenCalled();
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

    it("disables almostWin when starting a new game after winning", () => {
      const harness = buildSession(createMockGameModel({ almostWin: true }));
      harness.emitGameWon();
      TestBed.flushEffects();

      harness.session.startNewGame();

      expect(harness.model.setAlmostWin).toHaveBeenCalledWith(false);
      expect(harness.model.startNewGame).toHaveBeenCalled();
    });
  });
});

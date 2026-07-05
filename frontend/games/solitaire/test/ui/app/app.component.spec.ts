// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { BehaviorSubject } from "rxjs";
import { AppComponent } from "@/ui/app/app.component";
import { GAME_MODEL } from "@/ui/app/game-model.provider";

/** Creates a mock gameModel with observable state/settings matching the real API. */
function createMockGameModel(
  overrides: {
    score?: number;
    moves?: number;
    drawCount?: 1 | 3;
    cardBackStyle?: "card-back-blue" | "card-back-red";
  } = {},
) {
  return {
    state: {
      score$: new BehaviorSubject<number>(overrides.score ?? 0),
      moves$: new BehaviorSubject<number>(overrides.moves ?? 0),
      get score() {
        return this.score$.value;
      },
      set score(v: number) {
        this.score$.next(v);
      },
      get moves() {
        return this.moves$.value;
      },
      set moves(v: number) {
        this.moves$.next(v);
      },
    },
    settings: {
      drawCount$: new BehaviorSubject<1 | 3>(overrides.drawCount ?? 3),
      cardBackStyle$: new BehaviorSubject<"card-back-blue" | "card-back-red">(
        overrides.cardBackStyle ?? "card-back-blue",
      ),
      get drawCount() {
        return this.drawCount$.value;
      },
      get cardBackStyle() {
        return this.cardBackStyle$.value;
      },
    },
    on: vi.fn(),
    off: vi.fn(),
    startNewGame: vi.fn(),
    restartGame: vi.fn(),
    setDrawCount: vi.fn(),
    setCardBackStyle: vi.fn(),
    setBackgroundColor: vi.fn(),
  };
}

type MockGameModel = ReturnType<typeof createMockGameModel>;

/** Configures the TestBed with the given model and creates the component. */
async function buildComponent(model: MockGameModel): Promise<{
  fixture: ComponentFixture<AppComponent>;
  component: AppComponent;
}> {
  await TestBed.configureTestingModule({
    imports: [AppComponent],
    providers: [{ provide: GAME_MODEL, useValue: model }],
  }).compileComponents();

  const fixture = TestBed.createComponent(AppComponent);
  return { fixture, component: fixture.componentInstance };
}

describe("AppComponent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("with the default game model", () => {
    let component: AppComponent;
    let fixture: ComponentFixture<AppComponent>;
    let mockGameModel: MockGameModel;

    beforeEach(async () => {
      mockGameModel = createMockGameModel();
      ({ fixture, component } = await buildComponent(mockGameModel));
    });

    it("starts with zeroed metrics and default settings", () => {
      expect(component.score()).toBe(0);
      expect(component.moves()).toBe(0);
      expect(component.timerText()).toBe("00:00");
      expect(component.isGameWon()).toBe(false);
      expect(component.drawCount()).toBe(3);
      expect(component.cardBack()).toBe("card-back-blue");
    });

    it("starts with the green theme and settings hidden", () => {
      expect(component.selectedTheme).toBe("green");
      expect(component.showSettings).toBe(false);
    });

    it("toggles the settings panel", () => {
      component.toggleSettings();

      expect(component.showSettings).toBe(true);
    });

    it("restarts the game and resets the won state and timer", () => {
      component.isGameWon.set(true);

      component.restartGame();

      expect(mockGameModel.restartGame).toHaveBeenCalled();
      expect(component.isGameWon()).toBe(false);
      expect(component.timerText()).toBe("00:00");
    });

    it("starts a new game and resets the won state and timer", () => {
      component.isGameWon.set(true);

      component.startNewGame();

      expect(mockGameModel.startNewGame).toHaveBeenCalled();
      expect(component.isGameWon()).toBe(false);
      expect(component.timerText()).toBe("00:00");
    });

    it("sets the draw mode and restarts the game", () => {
      component.setDrawMode(1);

      expect(mockGameModel.setDrawCount).toHaveBeenCalledWith(1);
      expect(mockGameModel.startNewGame).toHaveBeenCalled();
    });

    describe("when a game is in progress (moves > 0)", () => {
      beforeEach(() => {
        mockGameModel.state.moves$.next(5);
        TestBed.flushEffects();
      });

      it("restarts the game only after user confirmation", () => {
        component.restartGame();

        expect(component.showConfirmation()).toBe(true);
        expect(component.confirmationMessage()).toContain("restart this game");
        expect(mockGameModel.restartGame).not.toHaveBeenCalled();

        component.acceptAction();
        expect(mockGameModel.restartGame).toHaveBeenCalled();
        expect(component.showConfirmation()).toBe(false);
      });

      it("starts a new game only after user confirmation", () => {
        component.startNewGame();

        expect(component.showConfirmation()).toBe(true);
        expect(component.confirmationMessage()).toContain("start a new game");
        expect(mockGameModel.startNewGame).not.toHaveBeenCalled();

        component.acceptAction();
        expect(mockGameModel.startNewGame).toHaveBeenCalled();
        expect(component.showConfirmation()).toBe(false);
      });

      it("sets draw mode only after user confirmation", () => {
        component.setDrawMode(1);

        expect(component.showConfirmation()).toBe(true);
        expect(component.confirmationMessage()).toContain("draw mode");
        expect(mockGameModel.setDrawCount).not.toHaveBeenCalled();

        component.acceptAction();
        expect(mockGameModel.setDrawCount).toHaveBeenCalledWith(1);
        expect(mockGameModel.startNewGame).toHaveBeenCalled();
        expect(component.showConfirmation()).toBe(false);
      });

      it("does not trigger confirmation if the same draw mode is selected", () => {
        component.setDrawMode(3); // default is 3

        expect(component.showConfirmation()).toBe(false);
        expect(mockGameModel.setDrawCount).not.toHaveBeenCalled();
      });

      it("cancels the action and does not reset the game/timer", () => {
        component.restartGame();

        expect(component.showConfirmation()).toBe(true);
        component.cancelAction();

        expect(mockGameModel.restartGame).not.toHaveBeenCalled();
        expect(component.showConfirmation()).toBe(false);
      });

      it("does not prompt for confirmation if the game is won", () => {
        component.isGameWon.set(true);
        component.restartGame();

        expect(component.showConfirmation()).toBe(false);
        expect(mockGameModel.restartGame).toHaveBeenCalled();
      });
    });

    it("sets the card back style on the game model", () => {
      component.setCardBack("card-back-red");

      expect(mockGameModel.setCardBackStyle).toHaveBeenCalledWith(
        "card-back-red",
      );
    });

    it("reflects observable state changes from the game model", () => {
      mockGameModel.state.score$.next(100);
      mockGameModel.state.moves$.next(12);
      mockGameModel.settings.drawCount$.next(1);
      mockGameModel.settings.cardBackStyle$.next("card-back-red");

      expect(component.score()).toBe(100);
      expect(component.moves()).toBe(12);
      expect(component.drawCount()).toBe(1);
      expect(component.cardBack()).toBe("card-back-red");
    });

    it("runs the timer once the first move is made", () => {
      mockGameModel.state.moves$.next(1);
      TestBed.flushEffects();

      vi.advanceTimersByTime(5000);

      expect(component.timerText()).toBe("00:05");
      fixture.destroy();
    });
  });

  describe("reading initial values from the model", () => {
    it("seeds the score and moves from the injected model", async () => {
      const model = createMockGameModel({ score: 42, moves: 3 });

      const { component } = await buildComponent(model);

      expect(component.score()).toBe(42);
      expect(component.moves()).toBe(3);
    });
  });

  describe("theming", () => {
    it("updates the theme and pushes the background color to the model", async () => {
      const model = createMockGameModel();
      const { component } = await buildComponent(model);

      component.setTheme("purple");

      expect(component.selectedTheme).toBe("purple");
      expect(model.setBackgroundColor).toHaveBeenCalledWith("#3c096c");
    });
  });

  describe("when the game is won", () => {
    let component: AppComponent;
    let mockGameModel: MockGameModel;
    let emitGameWon: () => void;

    beforeEach(async () => {
      emitGameWon = () => {};
      mockGameModel = createMockGameModel();
      mockGameModel.on = vi.fn((event: string, callback: () => void) => {
        if (event === "game-won") {
          emitGameWon = callback;
        }
      });
      ({ component } = await buildComponent(mockGameModel));
    });

    it("stops the timer and marks the game won", () => {
      mockGameModel.state.moves$.next(1);
      TestBed.flushEffects();
      vi.advanceTimersByTime(1000);
      expect(component.timerText()).toBe("00:01");

      emitGameWon();
      TestBed.flushEffects();

      expect(component.isGameWon()).toBe(true);
      vi.advanceTimersByTime(5000);
      expect(component.timerText()).toBe("00:01");
    });
  });
});

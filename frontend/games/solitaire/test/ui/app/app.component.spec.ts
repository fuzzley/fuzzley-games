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
    setDrawCount: vi.fn(),
    setCardBackStyle: vi.fn(),
  };
}

describe("AppComponent (TestBed)", () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let mockGameModel: ReturnType<typeof createMockGameModel>;

  beforeEach(async () => {
    vi.useFakeTimers();

    mockGameModel = createMockGameModel();

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: GAME_MODEL, useValue: mockGameModel }],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as any).solitaire;
  });

  it("should have correct initial values", () => {
    expect(component.score()).toBe(0);
    expect(component.moves()).toBe(0);
    expect(component.timerText()).toBe("00:00");
    expect(component.isGameWon()).toBe(false);
    expect(component.drawCount()).toBe(3);
    expect(component.cardBack()).toBe("card-back-blue");
    expect(component.selectedTheme).toBe("green");
    expect(component.showSettings).toBe(false);
  });

  it("should toggle showSettings when toggleSettings is called", () => {
    expect(component.showSettings).toBe(false);
    component.toggleSettings();
    expect(component.showSettings).toBe(true);
    component.toggleSettings();
    expect(component.showSettings).toBe(false);
  });

  it("should read initial values from the injected game model", () => {
    const model = createMockGameModel({
      score: 42,
      moves: 3,
      drawCount: 3,
      cardBackStyle: "card-back-blue",
    });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: GAME_MODEL, useValue: model }],
    });

    const f = TestBed.createComponent(AppComponent);
    const c = f.componentInstance;

    expect(c.score()).toBe(42);
    expect(c.moves()).toBe(3);
  });

  it("should restart game and reset state correctly", () => {
    component.isGameWon.set(true);

    component.restartGame();

    expect(mockGameModel.startNewGame).toHaveBeenCalled();
    expect(component.isGameWon()).toBe(false);
    expect(component.timerText()).toBe("00:00");
  });

  it("should start a new game and reset state correctly", () => {
    component.isGameWon.set(true);

    component.startNewGame();

    expect(mockGameModel.startNewGame).toHaveBeenCalled();
    expect(component.isGameWon()).toBe(false);
    expect(component.timerText()).toBe("00:00");
  });

  it("should set draw mode and restart the game", () => {
    component.setDrawMode(1);

    expect(mockGameModel.setDrawCount).toHaveBeenCalledWith(1);
    expect(mockGameModel.startNewGame).toHaveBeenCalled();
  });

  it("should set card back style on gameModel", () => {
    component.setCardBack("card-back-red");

    expect(mockGameModel.setCardBackStyle).toHaveBeenCalledWith(
      "card-back-red",
    );
  });

  it("should update theme and cameras main color on setTheme", () => {
    const mockCamera = {
      setBackgroundColor: vi.fn(),
    };
    const mockBoardScene = {
      cameras: {
        main: mockCamera,
      },
    };
    const mockGame = {
      scene: {
        getScene: vi.fn().mockReturnValue(mockBoardScene),
      },
    };

    (window as any).solitaire = {
      game: mockGame,
    };

    component.setTheme("purple");

    expect(component.selectedTheme).toBe("purple");
    expect(mockGame.scene.getScene).toHaveBeenCalledWith("board-scene");
    expect(mockCamera.setBackgroundColor).toHaveBeenCalledWith("#3c096c");
  });

  it("should update metrics when observable state changes", () => {
    // Push new values through BehaviorSubjects
    mockGameModel.state.score$.next(100);
    mockGameModel.state.moves$.next(12);
    mockGameModel.settings.drawCount$.next(1);
    mockGameModel.settings.cardBackStyle$.next("card-back-red");

    expect(component.score()).toBe(100);
    expect(component.moves()).toBe(12);
    expect(component.drawCount()).toBe(1);
    expect(component.cardBack()).toBe("card-back-red");
  });

  it("should start the timer when moves > 0 and timer is not running, and advance it correctly", () => {
    expect(component.timerText()).toBe("00:00");

    // Push moves > 0 to trigger timer start via effect
    mockGameModel.state.moves$.next(1);

    // Flush the effect
    TestBed.flushEffects();

    vi.advanceTimersByTime(5000);

    expect(component.timerText()).toBe("00:05");

    fixture.destroy();
  });

  it("should stop timer and set isGameWon to true when game-won is emitted", () => {
    // The component listens to game-won via fromGameEvent → toSignal.
    // The mock uses .on() to register the callback, so we capture it.
    let gameWonCallback: Function = () => {};
    mockGameModel.on = vi
      .fn()
      .mockImplementation((event: string, cb: Function) => {
        if (event === "game-won") {
          gameWonCallback = cb;
        }
      });

    // Recreate the component so it registers with the new mock
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: GAME_MODEL, useValue: mockGameModel }],
    });
    const f = TestBed.createComponent(AppComponent);
    const c = f.componentInstance;

    // Push moves > 0 to start the timer
    mockGameModel.state.moves$.next(1);
    TestBed.flushEffects();

    vi.advanceTimersByTime(1000);
    expect(c.timerText()).toBe("00:01");
    expect(c.isGameWon()).toBe(false);

    // Emit game-won
    gameWonCallback(undefined);
    TestBed.flushEffects();

    expect(c.isGameWon()).toBe(true);

    // Timer should be stopped
    vi.advanceTimersByTime(5000);
    expect(c.timerText()).toBe("00:01");
  });
});

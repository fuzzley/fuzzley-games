// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { AppComponent } from "@/ui/app/app.component";
import { setupTestBed } from "@analogjs/vitest-angular/setup-testbed";

setupTestBed({
  zoneless: false,
});

describe("AppComponent (TestBed)", () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    vi.useFakeTimers();

    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as any).solitaire;
  });

  it("should have correct initial values before ngOnInit", () => {
    expect(component.score).toBe(0);
    expect(component.moves).toBe(0);
    expect(component.timerText).toBe("00:00");
    expect(component.isGameWon).toBe(false);
    expect(component.drawCount).toBe(3);
    expect(component.cardBack).toBe("card-back-blue");
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

  it("should initialize game model if solitaire is immediately available on ngOnInit", () => {
    const mockCamera = {
      setBackgroundColor: vi.fn(),
    };
    const mockGameModel = {
      score: 42,
      moves: 3,
      drawCount: 3,
      cardBackStyle: "card-back-blue" as const,
      on: vi.fn(),
    };
    const mockBoardScene = {
      gameModel: mockGameModel,
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

    fixture.detectChanges();

    expect(mockGame.scene.getScene).toHaveBeenCalledWith("board-scene");
    expect(mockGameModel.on).toHaveBeenCalledWith(
      "state-changed",
      expect.any(Function),
    );
    expect(mockGameModel.on).toHaveBeenCalledWith(
      "game-won",
      expect.any(Function),
    );
    expect(component.score).toBe(42);
    expect(component.moves).toBe(3);
    expect(mockCamera.setBackgroundColor).toHaveBeenCalledWith("#0f4d0e");
  });

  it("should retry initialization using setTimeout if solitaire game is not immediately available", () => {
    const mockCamera = {
      setBackgroundColor: vi.fn(),
    };
    const mockGameModel = {
      score: 15,
      moves: 0,
      drawCount: 1,
      cardBackStyle: "card-back-red" as const,
      on: vi.fn(),
    };
    const mockBoardScene = {
      gameModel: mockGameModel,
      cameras: {
        main: mockCamera,
      },
    };
    const mockGame = {
      scene: {
        getScene: vi.fn().mockReturnValue(mockBoardScene),
      },
    };

    fixture.detectChanges();
    expect(component.score).toBe(0);

    (window as any).solitaire = {
      game: mockGame,
    };

    vi.advanceTimersByTime(100);

    expect(component.score).toBe(15);
    expect(component.drawCount).toBe(1);
    expect(component.cardBack).toBe("card-back-red");
  });

  it("should restart game and reset state correctly", () => {
    const mockGameModel = {
      startNewGame: vi.fn(),
    };
    component["gameModel"] = mockGameModel as any;
    component.isGameWon = true;
    component["secondsElapsed"] = 120;
    component.timerText = "02:00";

    component.restartGame();

    expect(mockGameModel.startNewGame).toHaveBeenCalled();
    expect(component.isGameWon).toBe(false);
    expect(component.timerText).toBe("00:00");
  });

  it("should start a new game and reset state correctly", () => {
    const mockGameModel = {
      startNewGame: vi.fn(),
    };
    component["gameModel"] = mockGameModel as any;
    component.isGameWon = true;
    component["secondsElapsed"] = 120;
    component.timerText = "02:00";

    component.startNewGame();

    expect(mockGameModel.startNewGame).toHaveBeenCalled();
    expect(component.isGameWon).toBe(false);
    expect(component.timerText).toBe("00:00");
  });

  it("should set draw mode and restart the game", () => {
    const mockGameModel = {
      setDrawCount: vi.fn(),
      startNewGame: vi.fn(),
    };
    component["gameModel"] = mockGameModel as any;

    component.setDrawMode(1);

    expect(mockGameModel.setDrawCount).toHaveBeenCalledWith(1);
    expect(mockGameModel.startNewGame).toHaveBeenCalled();
  });

  it("should set card back style on gameModel", () => {
    const mockGameModel = {
      setCardBackStyle: vi.fn(),
    };
    component["gameModel"] = mockGameModel as any;

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

  it("should update metrics when state-changed event is emitted", () => {
    let stateChangedCallback: Function = () => {};
    const mockGameModel = {
      score: 0,
      moves: 0,
      drawCount: 3,
      cardBackStyle: "card-back-blue" as const,
      on: vi.fn().mockImplementation((event: string, cb: Function) => {
        if (event === "state-changed") {
          stateChangedCallback = cb;
        }
      }),
    };

    component["gameModel"] = mockGameModel as any;
    component["setupListeners"]();

    stateChangedCallback({
      score: 100,
      moves: 12,
      drawCount: 1,
      cardBackStyle: "card-back-red",
    });

    expect(component.score).toBe(100);
    expect(component.moves).toBe(12);
    expect(component.drawCount).toBe(1);
    expect(component.cardBack).toBe("card-back-red");
  });

  it("should start the timer when moves > 0 and timer is not running, and advance it correctly", () => {
    let stateChangedCallback: Function = () => {};
    const mockGameModel = {
      score: 0,
      moves: 0,
      drawCount: 3,
      cardBackStyle: "card-back-blue" as const,
      on: vi.fn().mockImplementation((event: string, cb: Function) => {
        if (event === "state-changed") {
          stateChangedCallback = cb;
        }
      }),
    };

    component["gameModel"] = mockGameModel as any;
    component["setupListeners"]();

    expect(component.timerText).toBe("00:00");

    stateChangedCallback({
      score: 10,
      moves: 1,
      drawCount: 3,
      cardBackStyle: "card-back-blue",
    });

    vi.advanceTimersByTime(5000);

    expect(component.timerText).toBe("00:05");

    fixture.destroy();
  });

  it("should stop timer and set isGameWon to true when game-won is emitted", () => {
    let gameWonCallback: Function = () => {};
    let stateChangedCallback: Function = () => {};
    const mockGameModel = {
      score: 0,
      moves: 0,
      drawCount: 3,
      cardBackStyle: "card-back-blue" as const,
      on: vi.fn().mockImplementation((event: string, cb: Function) => {
        if (event === "game-won") {
          gameWonCallback = cb;
        } else if (event === "state-changed") {
          stateChangedCallback = cb;
        }
      }),
    };

    component["gameModel"] = mockGameModel as any;
    component["setupListeners"]();

    stateChangedCallback({
      score: 10,
      moves: 1,
      drawCount: 3,
      cardBackStyle: "card-back-blue",
    });

    vi.advanceTimersByTime(1000);
    expect(component.timerText).toBe("00:01");
    expect(component.isGameWon).toBe(false);

    gameWonCallback();

    expect(component.isGameWon).toBe(true);

    vi.advanceTimersByTime(5000);
    expect(component.timerText).toBe("00:01");
  });
});

import { TestBed } from "@angular/core/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { saveGrid } from "../../rules/saved_grid";
import { playOn } from "../../testing/game";
import { EASY, gridFrom, rowsOf, solvedBut } from "../../testing/grid_picture";
import { GameService } from "./game.service";
import { SAVED_GAME_KEY, SavedGameService } from "./saved_game.service";

/** The player's digits on `EASY`: two of the solution's, in row 1. */
const DIGITS = ["69.......", ...new Array<string>(8).fill(".........")];

/** Stores a game as a player's browser would hold it. */
function store(value: unknown): void {
  localStorage.setItem(SAVED_GAME_KEY, JSON.stringify(value));
}

/** Returns the game as stored, or null. */
function stored(): unknown {
  return JSON.parse(localStorage.getItem(SAVED_GAME_KEY) ?? "null");
}

/** Sets the page's visibility, as switching tabs does, and says so. */
function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

/** Starts the service, as the app does on load, and lets it keep the game. */
function start(): SavedGameService {
  const saved = TestBed.inject(SavedGameService);
  TestBed.tick();
  return saved;
}

describe("SavedGameService", () => {
  it("keeps a game under way, with its time", () => {
    start();
    playOn({ digits: DIGITS, level: "medium", seconds: 74 });

    TestBed.tick();

    expect(stored()).toEqual({
      version: 1,
      seconds: 74,
      grid: saveGrid(gridFrom(EASY, { digits: DIGITS, level: "medium" })),
      replay: false,
    });
  });

  it("keeps a restarted puzzle no move has touched yet", async () => {
    start();
    const game = playOn({ digits: DIGITS });
    TestBed.tick();

    const restarting = game.restart();
    TestBed.inject(ConfirmService).accept();
    await restarting;
    TestBed.tick();

    expect(stored()).toMatchObject({ grid: { history: [] } });
  });

  it("takes up a replay as a replay", () => {
    store({
      version: 1,
      seconds: 10,
      grid: saveGrid(gridFrom(EASY, { digits: DIGITS })),
      replay: true,
    });

    start();

    expect(TestBed.inject(GameService).replay()).toBe(true);
  });

  it("keeps the moves undo takes back", () => {
    start();
    const game = playOn();
    game.select(0);
    game.enter(6);

    TestBed.tick();

    expect(stored()).toMatchObject({ grid: { history: [[0, 0, 0, 6, 0]] } });
  });

  describe("as the clock runs", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      Reflect.deleteProperty(document, "visibilityState");
    });

    /** Starts a game ten seconds in, kept, and lets three more go by. */
    function playThreeSeconds(): void {
      start();
      playOn({ seconds: 10 });
      TestBed.tick();
      vi.advanceTimersByTime(3000);
      TestBed.tick();
    }

    it("writes the game once a move, not once a second", () => {
      playThreeSeconds();

      expect(stored()).toMatchObject({ seconds: 10 });
    });

    it("keeps the time as the page goes out of sight", () => {
      playThreeSeconds();

      setVisibility("hidden");

      expect(stored()).toMatchObject({ seconds: 13 });
    });

    it("keeps the time as the page is left", () => {
      playThreeSeconds();

      window.dispatchEvent(new Event("pagehide"));

      expect(stored()).toMatchObject({ seconds: 13 });
    });

    it("writes nothing more as the page comes back in sight", () => {
      playThreeSeconds();

      setVisibility("visible");

      expect(stored()).toMatchObject({ seconds: 10 });
    });
  });

  it("forgets a game once it is solved", () => {
    start();
    const game = playOn({ digits: solvedBut("r1c1") });
    TestBed.tick();
    game.select(0);

    game.enter(6);
    TestBed.tick();

    expect(stored()).toBeNull();
  });

  it("keeps no fresh deal the player hasn't touched", () => {
    start();

    expect(stored()).toBeNull();
  });

  it("takes up the game stored, where it was left", () => {
    store({
      version: 1,
      seconds: 74,
      grid: saveGrid(gridFrom(EASY, { digits: DIGITS, level: "hard" })),
    });

    start();

    const game = TestBed.inject(GameService);
    expect(rowsOf(game.grid().digits)[0]).toBe("69.5..2..");
    expect(game.level()).toBe("hard");
    expect(game.seconds()).toBe(74);
    expect(game.inProgress()).toBe(true);
  });

  it("deals a fresh game when the one stored is solved", () => {
    store({
      version: 1,
      seconds: 74,
      grid: saveGrid(gridFrom(EASY, { digits: solvedBut() })),
    });

    start();

    expect(TestBed.inject(GameService).inProgress()).toBe(false);
  });

  it.each([
    ["another version", { version: 2 }],
    ["a negative time", { seconds: -5 }],
    ["a broken grid", { grid: { version: 1, level: "easy" } }],
  ])("deals a fresh game when the one stored has %s", (_, change) => {
    store({
      version: 1,
      seconds: 74,
      grid: saveGrid(gridFrom(EASY, { digits: DIGITS })),
      ...change,
    });

    start();

    expect(TestBed.inject(GameService).inProgress()).toBe(false);
  });
});

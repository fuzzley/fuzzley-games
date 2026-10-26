import { TestBed } from "@angular/core/testing";
import { saveField } from "../../rules/saved_field";
import { fieldFrom, pictureOf } from "../../testing/field_picture";
import { playOn } from "../../testing/game";
import { GameService } from "./game.service";
import { SAVED_GAME_KEY, SavedGameService } from "./saved_game.service";

const IN_PLAY = ["*1_", ".21", "..*"];

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
  it("keeps a game under way, with its time and difficulty", () => {
    start();
    playOn(IN_PLAY, { seconds: 74, difficulty: "easy" });

    TestBed.tick();

    expect(stored()).toEqual({
      version: 1,
      difficulty: "easy",
      seconds: 74,
      field: saveField(fieldFrom(IN_PLAY)),
    });
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
      playOn(IN_PLAY, { seconds: 10 });
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

  it("forgets a game once it is over", () => {
    start();
    const game = playOn(IN_PLAY, { livesLeft: 1 });
    TestBed.tick();

    game.reveal(0);
    TestBed.tick();

    expect(stored()).toBeNull();
  });

  it("keeps no game that hasn't started", () => {
    start();

    expect(stored()).toBeNull();
  });

  it("takes up the game stored", () => {
    store({
      version: 1,
      difficulty: "hard",
      seconds: 74,
      field: saveField(fieldFrom(IN_PLAY)),
    });

    start();

    const game = TestBed.inject(GameService);
    expect(pictureOf(game.field())).toEqual(IN_PLAY);
    expect(game.seconds()).toBe(74);
    expect(game.difficulty()).toBe("hard");
  });

  it("deals a fresh game when the one stored is over", () => {
    store({
      version: 1,
      difficulty: "medium",
      seconds: 74,
      field: saveField(fieldFrom(IN_PLAY, { outcome: "lost" })),
    });

    start();

    expect(TestBed.inject(GameService).field().outcome).toBe("ready");
  });

  it.each([
    ["another version", { version: 2 }],
    ["an unknown difficulty", { difficulty: "nightmare" }],
    ["a negative time", { seconds: -5 }],
    ["a broken field", { field: { version: 1, rows: 3 } }],
  ])("deals a fresh game when the one stored has %s", (_, change) => {
    store({
      version: 1,
      difficulty: "medium",
      seconds: 74,
      field: saveField(fieldFrom(IN_PLAY)),
      ...change,
    });

    start();

    expect(TestBed.inject(GameService).field().outcome).toBe("ready");
  });
});

import { TestBed } from "@angular/core/testing";
import { AnnouncerService } from "@fz/ui/announcer";
import { ConfirmService } from "@fz/ui/confirm";
import { createRun, pause, step, turn } from "../../rules/run";
import { saveRun } from "../../rules/saved_run";
import { stepMs } from "../../rules/speed";
import { playToTheEnd, provideFixedSeed } from "../../testing/play";
import { GameService } from "./game.service";
import { SAVED_GAME_KEY, SavedGameService } from "./saved_game.service";

/** How long a first step lasts at Normal speed. */
const STEP = stepMs("normal", 0);

/** A run two squares up the board, paused, as a player leaves one. */
const LEFT = pause(
  step(step(turn(createRun({ id: 9, seed: 5, speed: "slow" }), "up"))),
);

/** Stores a run as a player's browser would hold it. */
function store(value: unknown): void {
  localStorage.setItem(SAVED_GAME_KEY, JSON.stringify(value));
}

/** Returns the run as stored, or null. */
function stored(): Record<string, unknown> | null {
  return JSON.parse(localStorage.getItem(SAVED_GAME_KEY) ?? "null") as Record<
    string,
    unknown
  > | null;
}

/** Starts the service, as the app does on load, and returns the game. */
function start(): GameService {
  TestBed.inject(SavedGameService);
  TestBed.tick();
  return TestBed.inject(GameService);
}

/** Returns the game with its run started up the board, and kept. */
function started(): GameService {
  const game = start();
  game.turn("up");
  TestBed.tick();
  return game;
}

describe("SavedGameService", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideFixedSeed()] });
  });

  describe("keeping", () => {
    it("keeps a run as it starts", () => {
      const game = started();

      expect(stored()).toEqual({ version: 1, ...saveRun(game.run()) });
    });

    it("doesn't write the run at every step", () => {
      const game = started();

      game.tick(STEP);
      TestBed.tick();

      expect(stored()).toMatchObject({ steps: 0 });
    });

    it("keeps the run where it stands as it pauses", () => {
      const game = started();
      game.tick(STEP);

      game.pause();
      TestBed.tick();

      expect(stored()).toMatchObject({ steps: 1 });
    });

    it("keeps the run as it eats an apple", () => {
      const game = start();
      game.turn("right");

      for (let i = 0; i < 8; i++) game.tick(STEP);
      TestBed.tick();

      expect(stored()).toMatchObject({ eaten: 1, steps: 8 });
    });

    it("keeps the run where it stands as the page goes away", () => {
      const game = started();
      game.tick(STEP);
      game.tick(STEP);

      window.dispatchEvent(new Event("pagehide"));

      expect(stored()).toMatchObject({ steps: 2 });
    });

    it("forgets a run that has ended", () => {
      const game = started();

      playToTheEnd(game);
      TestBed.tick();

      expect(stored()).toBeNull();
    });

    it("forgets the run thrown away for a new one", async () => {
      const game = started();

      const starting = game.newGame();
      TestBed.inject(ConfirmService).accept();
      await starting;
      TestBed.tick();

      expect(stored()).toBeNull();
    });

    it("keeps nothing of a run waiting for its first direction", () => {
      start();

      expect(stored()).toBeNull();
    });
  });

  describe("taking up", () => {
    it("takes up the run kept, paused, and says so", () => {
      store({ version: 1, ...saveRun(LEFT) });

      const game = start();

      expect(game.run()).toMatchObject({
        outcome: "paused",
        speed: "slow",
        snake: LEFT.snake,
        steps: 2,
      });
      expect(TestBed.inject(AnnouncerService).message()).toBe(
        "Your last run is paused, with a score of 0. Press a direction to go on.",
      );
    });

    it("gives the run taken up an id of its own", () => {
      store({ version: 1, ...saveRun(LEFT) });

      const game = start();

      expect(game.run().id).toBe(2);
    });

    it("leaves out a run it can't trust", () => {
      store({ version: 1, ...saveRun(LEFT), snake: [[99, 99]] });

      const game = start();

      expect(game.outcome()).toBe("ready");
    });

    it("leaves out a run kept in another shape", () => {
      store({ version: 2, ...saveRun(LEFT) });

      const game = start();

      expect(game.outcome()).toBe("ready");
    });
  });
});

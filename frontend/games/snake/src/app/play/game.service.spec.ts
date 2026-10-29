import { TestBed } from "@angular/core/testing";
import { installFakeViewport } from "@fz/game-ui/testing";
import { AnnouncerService } from "@fz/ui/announcer";
import { ConfirmService } from "@fz/ui/confirm";
import { pause } from "../../rules/run";
import { stepMs } from "../../rules/speed";
import { endedGame, playToTheEnd, wonGame } from "../../testing/play";
import { runFrom } from "../../testing/run_picture";
import { FADE_MS } from "../../view/timing";
import { SettingsService } from "../settings/settings.service";
import { StatsService } from "../stats/stats.service";
import { GameService } from "./game.service";

/** How long a first step lasts at Normal speed. */
const STEP = stepMs("normal", 0);

/** Returns what the live region last said. */
function said(): string {
  return TestBed.inject(AnnouncerService).message();
}

/** Returns the game with its run started up the board. */
function startedGame(): GameService {
  const game = TestBed.inject(GameService);
  game.turn("up");
  return game;
}

describe("GameService", () => {
  describe("a new run", () => {
    it("waits, at the speed in the settings, for its first direction", () => {
      TestBed.inject(SettingsService).update({ speed: "fast" });

      const game = TestBed.inject(GameService);

      expect(game.run()).toMatchObject({ speed: "fast", outcome: "ready" });
    });

    it("starts at a direction, and says so", () => {
      const game = TestBed.inject(GameService);

      game.turn("up");

      expect(game.outcome()).toBe("playing");
      expect(said()).toBe("Started, at Normal speed.");
    });

    it("counts a run started at its speed", () => {
      startedGame();

      expect(TestBed.inject(StatsService).stats().normal.runs).toBe(1);
    });

    it("doesn't start back the way the snake heads", () => {
      const game = TestBed.inject(GameService);

      game.turn("left");

      expect(game.outcome()).toBe("ready");
    });
  });

  describe("time", () => {
    it("steps the run once a step's time has passed", () => {
      const game = startedGame();

      game.tick(STEP);

      expect(game.run().steps).toBe(1);
    });

    it("leaves a run waiting for its first direction where it is", () => {
      const game = TestBed.inject(GameService);

      game.tick(10 * STEP);

      expect(game.run().steps).toBe(0);
    });

    it("glides the board toward the next step", () => {
      const game = startedGame();

      game.tick(STEP / 2);

      expect(game.frame().progress).toBe(0.5);
    });

    it("draws the board a square at a time where the snake steps", () => {
      TestBed.inject(SettingsService).update({ movement: "step" });
      const game = startedGame();

      game.tick(STEP / 2);

      expect(game.frame().progress).toBe(0);
    });

    it("hands the scene the same frame each time, written afresh", () => {
      const game = startedGame();
      const first = game.frame();

      game.tick(STEP);

      expect(game.frame()).toBe(first);
      expect(first.run.steps).toBe(1);
    });
  });

  describe("turns", () => {
    it("queues a turn the snake takes on its next step", () => {
      const game = TestBed.inject(GameService);
      game.turn("right");

      game.command("up");
      game.tick(STEP);

      expect(game.run().heading).toBe("up");
    });
  });

  describe("pausing", () => {
    it("pauses the run under way, and says so", () => {
      const game = startedGame();

      game.pause();

      expect(game.outcome()).toBe("paused");
      expect(said()).toBe(
        "Paused, with a score of 0. Press a direction to go on.",
      );
    });

    it("keeps a paused run still", () => {
      const game = startedGame();
      game.pause();

      game.tick(10 * STEP);

      expect(game.run().steps).toBe(0);
    });

    it("goes on at a direction, and says so", () => {
      const game = startedGame();
      game.pause();

      game.turn("up");

      expect(game.outcome()).toBe("playing");
      expect(said()).toBe("Going on.");
    });

    it("goes on at the direction back, and says so", () => {
      const game = startedGame();
      game.pause();

      game.turn("down");

      expect(game.outcome()).toBe("playing");
      expect(said()).toBe("Going on.");
    });

    it("goes on at Enter", () => {
      const game = startedGame();
      game.pause();

      game.command("go");

      expect(game.outcome()).toBe("playing");
    });

    it("does nothing at Enter to a run under way", () => {
      const game = startedGame();

      game.command("go");

      expect(game.outcome()).toBe("playing");
    });

    it("goes on at Resume", () => {
      const game = startedGame();
      game.pause();

      game.resume();

      expect(game.outcome()).toBe("playing");
    });

    it("pauses at the key that toggles", () => {
      const game = startedGame();

      game.command("toggle");

      expect(game.outcome()).toBe("paused");
    });

    it("goes on at the key that toggles", () => {
      const game = startedGame();
      game.command("pause");

      game.command("toggle");

      expect(game.outcome()).toBe("playing");
    });

    it("has nothing to pause before the run starts", () => {
      const game = TestBed.inject(GameService);

      game.pause();

      expect(game.outcome()).toBe("ready");
    });
  });

  describe("before the board is drawn", () => {
    it("starts nothing at a direction", () => {
      const game = TestBed.inject(GameService);
      game.setDrawn(false);

      game.turn("up");

      expect(game.outcome()).toBe("ready");
    });

    it("keeps a paused run paused at a direction or Resume", () => {
      const game = startedGame();
      game.pause();
      game.setDrawn(false);

      game.turn("up");
      game.resume();

      expect(game.outcome()).toBe("paused");
    });

    it("still pauses a run under way", () => {
      const game = startedGame();
      game.setDrawn(false);

      game.pause();

      expect(game.outcome()).toBe("paused");
    });

    it("starts at a direction once the board is drawn", () => {
      const game = TestBed.inject(GameService);
      game.setDrawn(false);

      game.setDrawn(true);
      game.turn("up");

      expect(game.outcome()).toBe("playing");
    });
  });

  describe("the end of a run", () => {
    it("says why the run ended, and its score", () => {
      endedGame();

      expect(said()).toBe("The snake ran into the wall. Score 0.");
    });

    it("keeps the run's score and length", () => {
      endedGame();

      expect(TestBed.inject(StatsService).stats().normal).toEqual({
        runs: 1,
        best: 0,
        longest: 3,
      });
    });

    it("calls a score above the best a new best, and says so", () => {
      const game = TestBed.inject(GameService);
      game.turn("right");

      playToTheEnd(game);

      expect(game.newBest()).toBe(true);
      expect(said()).toMatch(/A new best!$/);
    });

    it("says a run that fills the board won it", () => {
      const game = wonGame();

      expect(game.outcome()).toBe("won");
      expect(said()).toBe("You filled the board! Score 6. A new best!");
    });

    it("hands the scene whether the run set a new best", () => {
      const game = TestBed.inject(GameService);
      game.turn("right");

      playToTheEnd(game);

      expect(game.frame().newBest).toBe(true);
    });

    it("opens the result card at once where the player prefers less motion", () => {
      const game = endedGame();

      game.tick(16);

      expect(game.resultOpen()).toBe(true);
    });

    describe("where motion is welcome", () => {
      let viewport: ReturnType<typeof installFakeViewport>;

      beforeEach(() => {
        viewport = installFakeViewport(1024, 768);
      });

      afterEach(() => {
        viewport.restore();
      });

      it("waits for the crashed snake to fade before the result card", () => {
        const game = endedGame();

        game.tick(FADE_MS / 2);

        expect(game.resultOpen()).toBe(false);
      });

      it("opens the result card once the crashed snake has faded", () => {
        const game = endedGame();

        game.tick(FADE_MS);

        expect(game.resultOpen()).toBe(true);
      });
    });

    it("starts another run at the key that toggles once the result card is put away", async () => {
      const game = endedGame();
      game.closeResult();

      game.command("toggle");
      await Promise.resolve();

      expect(game.outcome()).toBe("ready");
    });

    it("starts another run at Enter once the result card is put away", async () => {
      const game = endedGame();
      game.closeResult();

      game.command("go");
      await Promise.resolve();

      expect(game.outcome()).toBe("ready");
    });

    it("starts nothing at a key before the result card is put away", async () => {
      const game = endedGame();
      const ended = game.run();

      game.command("toggle");
      game.command("go");
      await Promise.resolve();

      expect(game.run()).toBe(ended);
    });

    it("puts the result card away", () => {
      const game = endedGame();
      game.tick(16);

      game.closeResult();
      game.tick(16);

      expect(game.resultOpen()).toBe(false);
    });

    it("leaves an ended run as it is", () => {
      const game = endedGame();
      const ended = game.run();

      game.turn("right");

      expect(game.run()).toBe(ended);
    });
  });

  describe("a new game", () => {
    it("starts a new run without asking while none is under way", async () => {
      const game = TestBed.inject(GameService);

      const started = await game.newGame();

      expect(started).toBe(true);
      expect(TestBed.inject(ConfirmService).isOpen()).toBe(false);
    });

    it("asks before it throws away the run under way", () => {
      const game = startedGame();

      void game.newGame();

      expect(TestBed.inject(ConfirmService).prompt().title).toBe(
        "Start a new game?",
      );
    });

    it("names the speed before a run at another throws away the one under way", () => {
      const game = startedGame();

      void game.changeSpeed("fast");

      expect(TestBed.inject(ConfirmService).prompt()).toMatchObject({
        title: "Start a new Fast game?",
        confirmLabel: "New game",
      });
    });

    it("keeps the run under way when the player backs out", async () => {
      const game = startedGame();
      const before = game.run();

      const starting = game.newGame();
      TestBed.inject(ConfirmService).cancel();

      expect(await starting).toBe(false);
      expect(game.run()).toBe(before);
    });

    it("starts a new run when the player goes ahead", async () => {
      const game = startedGame();
      const before = game.run();

      const starting = game.newGame();
      TestBed.inject(ConfirmService).accept();

      expect(await starting).toBe(true);
      expect(game.run()).toMatchObject({
        id: before.id + 1,
        outcome: "ready",
        steps: 0,
      });
    });

    it("starts a new run without asking once the last has ended", async () => {
      const game = endedGame();

      const started = await game.newGame();

      expect(started).toBe(true);
      expect(game.newBest()).toBe(false);
    });

    it("counts each run begun, for the board to take the focus after", async () => {
      const game = TestBed.inject(GameService);

      await game.newGame();

      expect(game.runs()).toBe(1);
    });

    it("starts a run at another speed, and keeps it in the settings", async () => {
      const game = TestBed.inject(GameService);

      await game.changeSpeed("slow");

      expect(game.run().speed).toBe("slow");
      expect(TestBed.inject(SettingsService).settings().speed).toBe("slow");
    });
  });

  describe("a run taken up", () => {
    const SAVED = pause(
      runFrom([".....", ".>>@.", ".....", ".....", "....*"], {
        id: 40,
        eaten: 2,
        steps: 9,
        outcome: "playing",
      }),
    );

    it("is paused, and says so", () => {
      const game = TestBed.inject(GameService);

      game.takeUp(SAVED);

      expect(game.outcome()).toBe("paused");
      expect(said()).toBe(
        "Your last run is paused, with a score of 2. Press a direction to go on.",
      );
    });

    it("comes before the next new run", async () => {
      const game = TestBed.inject(GameService);
      game.takeUp(SAVED);

      const starting = game.newGame();
      TestBed.inject(ConfirmService).accept();
      await starting;

      expect(game.run().id).toBe(41);
    });
  });
});

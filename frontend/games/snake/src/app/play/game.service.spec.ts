import { TestBed } from "@angular/core/testing";
import { installFakeViewport } from "@fz/game-ui/testing";
import { AnnouncerService } from "@fz/ui/announcer";
import { ConfirmService } from "@fz/ui/confirm";
import { type Run, createRun, pause } from "../../rules/run";
import { stepMs } from "../../rules/speed";
import {
  endedGame,
  playToTheEnd,
  provideFixedSeed,
  wonGame,
} from "../../testing/play";
import { runFrom } from "../../testing/run_picture";
import { FADE_MS } from "../../view/timing";
import { SettingsService } from "../settings/settings.service";
import { StatsService } from "../stats/stats.service";
import { type EndStage, GameService } from "./game.service";

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
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideFixedSeed()] });
  });

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
      expect(said()).toBe("Started at Normal speed.");
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
      expect(said()).toBe("Paused. Score 0. Press Space to resume.");
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
      expect(said()).toBe("Resumed.");
    });

    it("goes on at the direction back, and says so", () => {
      const game = startedGame();
      game.pause();

      game.turn("down");

      expect(game.outcome()).toBe("playing");
      expect(said()).toBe("Resumed.");
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

    it("keeps a paused run paused at Escape", () => {
      const game = startedGame();
      game.pause();

      game.command("pause");

      expect(game.outcome()).toBe("paused");
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

    it("turns a run in play while the board isn't drawn", () => {
      const game = TestBed.inject(GameService);
      game.turn("right");
      game.setDrawn(false);

      game.command("up");
      game.tick(STEP);

      expect(game.run().heading).toBe("up");
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
      expect(said()).toMatch(/New best\.$/);
    });

    it("says a run that fills the board won it", () => {
      const game = wonGame();

      expect(game.outcome()).toBe("won");
      expect(said()).toBe("You filled the board. Score 6. New best.");
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
      beforeEach(() => {
        installFakeViewport(1024, 768);
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

      it("opens no result card for a run ended before a new one began", async () => {
        const game = endedGame();
        await game.newGame();

        game.tick(FADE_MS);

        expect(game.resultOpen()).toBe(false);
      });
    });

    it("starts another run at Enter once the result card is put away", async () => {
      const game = endedGame();
      game.closeResult();

      game.command("go");
      await Promise.resolve();

      expect(game.outcome()).toBe("ready");
    });

    it("starts nothing, and says nothing, at a key before the result card is put away", async () => {
      const game = endedGame();
      const ended = game.run();
      const lastWords = said();

      game.command("toggle");
      game.command("go");
      await Promise.resolve();

      expect({ run: game.run(), said: said() }).toEqual({
        run: ended,
        said: lastWords,
      });
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

  describe("the end's stage", () => {
    it("holds no new best and its card to come for a run under way", () => {
      const game = startedGame();

      expect(game.endStage()).toEqual({ newBest: false, card: "coming" });
    });

    it("holds an ended run's new best, its card still to come", () => {
      const game = endedGame("right");

      expect(game.endStage()).toEqual({ newBest: true, card: "coming" });
    });

    it("holds the card over an ended run as showing, once it shows", () => {
      const game = endedGame();

      game.tick(16);

      expect(game.endStage().card).toBe("open");
    });

    it("holds the card over an ended run as put away", () => {
      const game = endedGame();
      game.tick(16);

      game.closeResult();

      expect(game.endStage().card).toBe("closed");
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
      expect(said()).toBe("Paused. Score 2. Press Space to resume.");
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

  describe("a reported run taken up", () => {
    /** A run that ran into the wall on the right, an apple eaten. */
    const CRASHED: Run = {
      ...runFrom([".....", "..>>@", ".....", ".....", "*...."], {
        id: 30,
        eaten: 1,
        steps: 12,
        outcome: "over",
      }),
      crash: "wall",
      last: "crashed",
    };

    /** Resolves to what the game made of a reported run, asked nothing. */
    function takeUpReported(
      run: Run,
      stage: EndStage = { newBest: false, card: "coming" },
    ): Promise<boolean> {
      return TestBed.inject(GameService).takeUpReported(run, stage);
    }

    it("is paused where it was under way, and says so", async () => {
      const playing = runFrom([".....", ".>>@.", ".....", ".....", "....*"], {
        eaten: 2,
        steps: 9,
        outcome: "playing",
      });

      await takeUpReported(playing);

      expect(TestBed.inject(GameService).run()).toEqual(pause(playing));
      expect(said()).toBe("Paused. Score 2. Press Space to resume.");
    });

    it("waits for its first direction where it did, saying nothing", async () => {
      const ready = createRun({ id: 3, seed: 8, speed: "slow" });

      await takeUpReported(ready);

      expect(TestBed.inject(GameService).run()).toEqual(ready);
      expect(said()).toBe("");
    });

    it("ends as it ended, with its new best, and says how", async () => {
      await takeUpReported(CRASHED, { newBest: true, card: "closed" });

      const game = TestBed.inject(GameService);
      expect({ run: game.run(), stage: game.endStage() }).toEqual({
        run: CRASHED,
        stage: { newBest: true, card: "closed" },
      });
      expect(said()).toBe("The snake ran into the wall. Score 1. New best.");
    });

    it("opens the card over an ended run where it was showing", async () => {
      await takeUpReported(CRASHED, { newBest: false, card: "open" });

      expect(TestBed.inject(GameService).resultOpen()).toBe(true);
    });

    it("opens the card over an ended run once its fade has run, where it was still to come", async () => {
      await takeUpReported(CRASHED);
      const game = TestBed.inject(GameService);

      game.tick(16);

      expect(game.resultOpen()).toBe(true);
    });

    it("comes before the next new run", async () => {
      await takeUpReported(CRASHED);
      const game = TestBed.inject(GameService);

      await game.newGame();

      expect(game.run().id).toBe(31);
    });

    it("asks first where a run is under way", () => {
      startedGame();

      void takeUpReported(CRASHED);

      expect(TestBed.inject(ConfirmService).prompt()).toMatchObject({
        title: "Load this game?",
        message: "You'll lose the game in progress.",
        confirmLabel: "Load",
      });
    });

    it("takes the run's place once the player says to", async () => {
      startedGame();

      const taking = takeUpReported(CRASHED);
      TestBed.inject(ConfirmService).accept();

      expect(await taking).toBe(true);
      expect(TestBed.inject(GameService).run()).toEqual(CRASHED);
    });

    it("leaves the run under way where the player says no", async () => {
      const game = startedGame();
      const before = game.run();

      const taking = takeUpReported(CRASHED);
      TestBed.inject(ConfirmService).cancel();

      expect(await taking).toBe(false);
      expect(game.run()).toBe(before);
    });
  });
});

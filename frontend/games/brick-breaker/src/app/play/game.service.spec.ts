import { TestBed } from "@angular/core/testing";
import { installFakeViewport } from "@fz/game-ui/testing";
import { AnnouncerService } from "@fz/ui/announcer";
import { ConfirmService } from "@fz/ui/confirm";
import { FEW_BRICKS } from "../../rules/describe";
import { levelsOf } from "../../rules/levels";
import { STEP_MS } from "../../rules/stepper";
import {
  FIELD_HEIGHT,
  FIELD_WIDTH,
  FIRST_LIVES,
  TALLEST_FIELD,
} from "../../rules/tuning";
import {
  FRAME_MS,
  SPEC_LEVEL,
  SPEC_LEVELS,
  STILL,
  TWO_SETS,
  awayFrom,
  clearToNext,
  loseBall,
  playFor,
  playToClear,
  playUntil,
  provideSpecLevels,
  under,
  underCapsule,
} from "../../testing/play";
import { CLEARED_MS, FADE_MS, SERVE_MS } from "../../view/timing";
import { SettingsService } from "../settings/settings.service";
import { ProgressService } from "../stats/progress.service";
import { StatsService } from "../stats/stats.service";
import { GameService } from "./game.service";
import { GAME_LEVELS } from "../tokens";

/**
 * Two levels: six rows of blast bricks, which a hit clears for more points
 * than the first extra life needs, then a row of them to finish on.
 */
const RICH_LEVELS = levelsOf([
  {
    id: "rich",
    name: "Rich",
    drops: 0,
    levels: [
      {
        id: "rich",
        name: "Rich",
        capsules: [],
        bricks: Array.from({ length: 6 }, () => "*".repeat(13)),
      },
      { id: "after", name: "After", capsules: [], bricks: ["*".repeat(13)] },
    ],
  },
]);

/** Returns whether the paddle has been made wide. */
function isWide(game: GameService): boolean {
  return game.frame().field.effects["paddle-size"].capsule === "wide";
}

/** Returns how many balls in play the paddle holds. */
function heldBalls(game: GameService): number {
  return game.frame().field.balls.filter((ball) => ball.live && ball.held)
    .length;
}

/** Lets every promise the game is waiting on settle. */
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Returns what the live region last said. */
function said(): string {
  return TestBed.inject(AnnouncerService).message();
}

/** Returns the game with a new run at one of the specs' levels, waiting for its first serve. */
async function gameAt(level: number): Promise<GameService> {
  const game = TestBed.inject(GameService);
  await game.startAt(level);
  return game;
}

/** Returns how far the first ball moves in the game's next frame, the paddle still. */
function travelled(game: GameService): number {
  const [ball] = game.frame().field.balls;
  if (!ball) throw new Error("No ball on the field.");
  const { x, y } = ball;
  game.tick(FRAME_MS, STILL);
  return Math.hypot(ball.x - x, ball.y - y);
}

/** Returns the game with its run's level started, the ball served. */
async function launchedAt(level: number): Promise<GameService> {
  const game = await gameAt(level);
  game.launch();
  return game;
}

/** Returns the game with the level its run is at cleared. */
async function clearedAt(level: number): Promise<GameService> {
  const game = await gameAt(level);
  playToClear(game);
  return game;
}

/** Returns the game with a run at a level that has lost every life. */
async function endedAt(level: number): Promise<GameService> {
  const game = await gameAt(level);
  for (let life = 0; life < FIRST_LIVES; life++) loseBall(game);
  return game;
}

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: provideSpecLevels(),
  });
});

describe("GameService", () => {
  describe("a new run", () => {
    it("waits at the first level, its ball on the paddle, for its first serve", () => {
      const game = TestBed.inject(GameService);

      expect({
        outcome: game.outcome(),
        level: game.level().number,
        lives: game.lives(),
        serving: game.serving(),
      }).toEqual({ outcome: "ready", level: 1, lives: 3, serving: true });
    });

    it("stops waiting on the serve as the ball is launched", () => {
      const game = TestBed.inject(GameService);

      game.launch();

      expect(game.serving()).toBe(false);
    });

    it("starts its level at the first launch, serving the ball, and says which level it is", () => {
      const game = TestBed.inject(GameService);

      game.launch();

      expect({
        outcome: game.outcome(),
        field: game.frame().field.state,
        said: said(),
      }).toEqual({
        outcome: "playing",
        field: "playing",
        said: "Level 1, Blasts. 13 bricks.",
      });
    });

    it("lets the paddle be steered before the first serve", () => {
      const game = TestBed.inject(GameService);

      playFor(game, 1000, { to: 3, by: 0, push: 0 });

      expect(game.frame().field.paddle.x).toBeLessThan(FIELD_WIDTH / 2);
    });
  });

  describe("time", () => {
    it("steps the field by the time a frame took", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);

      game.tick(3 * STEP_MS, STILL);

      expect(game.frame().field.steps).toBe(3);
    });

    it("glides the field toward its next step", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);

      game.tick(1.5 * STEP_MS, STILL);

      expect(game.frame().alpha).toBeCloseTo(0.5);
    });

    it("hands the scene the field's events as they happen", async () => {
      const game = await gameAt(SPEC_LEVEL.steel);

      game.launch();

      expect(game.frame().events.latest).toBe(1);
    });

    it("hands the scene the same frame each time, written afresh", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);
      const first = game.frame();

      game.tick(STEP_MS, STILL);

      expect({
        same: game.frame() === first,
        steps: first.field.steps,
      }).toEqual({ same: true, steps: 1 });
    });

    it("copies how many times a hit scores, by the streak, for the bar", async () => {
      const game = await launchedAt(SPEC_LEVEL.few);

      playUntil(game, under, () => game.frame().field.streak >= 5);

      expect(game.multiplier()).toBe(2);
    });

    it("scores a hit once again on a new run", async () => {
      const game = await launchedAt(SPEC_LEVEL.few);
      playUntil(game, under, () => game.frame().field.streak >= 8);

      const starting = game.newGame();
      TestBed.inject(ConfirmService).accept();
      await starting;

      expect(game.multiplier()).toBe(1);
    });
  });

  describe("the field's height", () => {
    it("is the height asked for at once while the ball waits to be served", async () => {
      const game = await gameAt(SPEC_LEVEL.steel);

      game.setFieldHeight(TALLEST_FIELD);

      expect({
        height: game.fieldHeight(),
        field: game.frame().field.height,
      }).toEqual({ height: TALLEST_FIELD, field: TALLEST_FIELD });
    });

    it("stays as it is while a ball is in play", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);

      game.setFieldHeight(TALLEST_FIELD);

      expect(game.fieldHeight()).toBe(FIELD_HEIGHT);
    });

    it("becomes the height asked for as the next ball waits on the paddle", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);
      game.setFieldHeight(TALLEST_FIELD);
      loseBall(game);

      game.tick(SERVE_MS, STILL);

      expect(game.fieldHeight()).toBe(TALLEST_FIELD);
    });

    it("is the height asked for on the next level", async () => {
      const game = await clearedAt(SPEC_LEVEL.blasts);
      game.setFieldHeight(TALLEST_FIELD);
      playUntil(game, () => STILL, game.clearedOpen);

      game.nextLevel();

      expect(game.fieldHeight()).toBe(TALLEST_FIELD);
    });
  });

  describe("the ball's speed scale", () => {
    it("moves the ball as far again a frame at twice the scale", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);
      const unscaled = travelled(game);

      game.setBallSpeedScale(2);

      expect(travelled(game) / unscaled).toBeCloseTo(2);
    });

    it("holds on the next level", async () => {
      const game = await clearedAt(SPEC_LEVEL.blasts);
      game.setBallSpeedScale(2);
      playUntil(game, () => STILL, game.clearedOpen);
      game.nextLevel();
      game.launch();

      const scaled = travelled(game);

      game.setBallSpeedScale(1);
      expect(scaled / travelled(game)).toBeCloseTo(2);
    });
  });

  describe("a lost ball", () => {
    it("takes a life, and says so", async () => {
      const game = await gameAt(SPEC_LEVEL.steel);

      loseBall(game);

      expect({ lives: game.lives(), said: said() }).toEqual({
        lives: 2,
        said: "Ball lost. 2 lives left.",
      });
    });

    it("leaves the paddle empty for a beat", async () => {
      const game = await gameAt(SPEC_LEVEL.steel);
      loseBall(game);

      game.tick(SERVE_MS / 2, STILL);

      expect(game.serving()).toBe(false);
    });

    it("puts the next ball on the paddle after the beat, to be served", async () => {
      const game = await gameAt(SPEC_LEVEL.steel);
      loseBall(game);

      game.tick(SERVE_MS, STILL);

      expect({ serving: game.serving(), outcome: game.outcome() }).toEqual({
        serving: true,
        outcome: "playing",
      });
    });

    it("leaves the paddle empty for a beat after every lost ball", async () => {
      const game = await gameAt(SPEC_LEVEL.steel);
      loseBall(game);
      loseBall(game);

      game.tick(SERVE_MS / 2, STILL);

      expect(game.serving()).toBe(false);
    });

    it("starts a new run's beat afresh", async () => {
      const game = await gameAt(SPEC_LEVEL.steel);
      loseBall(game);
      game.tick(SERVE_MS / 2, STILL);
      const starting = game.newGame();
      TestBed.inject(ConfirmService).accept();
      await starting;
      loseBall(game);

      game.tick(SERVE_MS / 2, STILL);

      expect(game.serving()).toBe(false);
    });

    it("holds the beat while the level is paused", async () => {
      const game = await gameAt(SPEC_LEVEL.steel);
      loseBall(game);
      game.tick(SERVE_MS / 2, STILL);
      game.pause();

      game.tick(SERVE_MS, STILL);

      expect(game.frame().field.state).toBe("lost");
    });

    it("serves the next ball once the beat has run, paused or not", async () => {
      const game = await gameAt(SPEC_LEVEL.steel);
      loseBall(game);
      game.tick(SERVE_MS / 2, STILL);
      game.pause();
      game.tick(SERVE_MS, STILL);
      game.resume();

      game.tick(SERVE_MS / 2, STILL);

      expect(game.serving()).toBe(true);
    });

    it("serves no ball on a frame that loses the last life, however long", async () => {
      const game = await gameAt(SPEC_LEVEL.steel);
      loseBall(game);
      loseBall(game);
      playUntil(game, () => STILL, game.serving);
      game.launch();

      playUntil(game, awayFrom, game.ended, SERVE_MS);

      expect({
        field: game.frame().field.state,
        serving: game.serving(),
      }).toEqual({ field: "lost", serving: false });
    });

    it("ends the run at the last life, and says so", async () => {
      const game = await endedAt(SPEC_LEVEL.steel);

      expect({
        outcome: game.outcome(),
        ended: game.ended(),
        said: said(),
      }).toEqual({
        outcome: "over",
        ended: true,
        said: "Game over. Score 0, at level 3.",
      });
    });

    it("serves no ball once the run is over", async () => {
      const game = await endedAt(SPEC_LEVEL.steel);

      game.tick(SERVE_MS, STILL);

      expect(game.frame().field.state).toBe("lost");
    });
  });

  describe("capsules", () => {
    it("names a capsule as it is caught", async () => {
      const game = await launchedAt(SPEC_LEVEL.wide);

      playUntil(game, underCapsule, () => isWide(game));

      expect(said()).toBe("Wide paddle.");
    });

    it("names a capsule once", async () => {
      const game = await launchedAt(SPEC_LEVEL.wide);
      playUntil(game, underCapsule, () => isWide(game));

      game.tick(FRAME_MS, STILL);

      expect(said()).toBe("Wide paddle.");
    });

    it("names a capsule caught on the level after one cleared", async () => {
      const game = await clearedAt(SPEC_LEVEL.blasts);
      game.tick(FRAME_MS, STILL);
      game.command("go");
      game.launch();

      playUntil(game, underCapsule, () => isWide(game));

      expect(said()).toBe("Wide paddle.");
    });

    it("fires the laser at a launch", async () => {
      const game = await launchedAt(SPEC_LEVEL.laser);
      playUntil(game, underCapsule, () => game.frame().field.mode === "laser");

      game.launch();

      expect(game.frame().field.bolts.filter((bolt) => bolt.live)).toHaveLength(
        2,
      );
    });

    it("lets go of a caught ball at a launch", async () => {
      const game = await launchedAt(SPEC_LEVEL.catch);
      playUntil(game, underCapsule, () => game.frame().field.mode === "catch");
      playUntil(game, under, () => heldBalls(game) > 0);

      game.launch();

      expect(heldBalls(game)).toBe(0);
    });

    it("says an extra life once, with the lives there are", async () => {
      const game = await launchedAt(SPEC_LEVEL.lives);

      playUntil(game, underCapsule, () => game.lives() > FIRST_LIVES);

      expect(said()).toBe("Extra life. 4 lives.");
    });
  });

  describe("clearing a level", () => {
    it("says once few bricks are left", async () => {
      const game = await launchedAt(SPEC_LEVEL.few);

      playUntil(game, under, () => game.frame().field.needed <= FEW_BRICKS);

      expect(said()).toBe("5 bricks left.");
    });

    it("banks the level, and says so with the score", async () => {
      const game = await clearedAt(SPEC_LEVEL.blasts);

      expect({ outcome: game.outcome(), said: said() }).toEqual({
        outcome: "cleared",
        said: "Level 1 cleared! Score 4,100.",
      });
    });

    it("adds up the level's points for its card", async () => {
      const game = await clearedAt(SPEC_LEVEL.blasts);

      const tally = game.tally();

      expect(tally && tally.bricks + tally.streaks + tally.bonus).toBe(
        game.score(),
      );
    });

    it("forgets the level's points as a new run begins", async () => {
      const game = await clearedAt(SPEC_LEVEL.blasts);

      const starting = game.newGame();
      TestBed.inject(ConfirmService).accept();
      await starting;

      expect(game.tally()).toBeNull();
    });

    it("opens the cleared card at the next frame where the player prefers less motion", async () => {
      const game = await clearedAt(SPEC_LEVEL.blasts);

      game.tick(FRAME_MS, STILL);

      expect(game.clearedOpen()).toBe(true);
    });

    it("goes on to the next level at a launch once the card shows, and says which", async () => {
      const game = await clearedAt(SPEC_LEVEL.blasts);
      game.tick(FRAME_MS, STILL);

      game.launch();

      expect({
        outcome: game.outcome(),
        level: game.level().number,
        field: game.frame().field.state,
        events: game.frame().events.latest,
        open: game.clearedOpen(),
        said: said(),
      }).toEqual({
        outcome: "playing",
        level: SPEC_LEVEL.wide,
        field: "serve",
        events: 0,
        open: false,
        said: "Level 2, Wide. 13 bricks.",
      });
    });

    it("goes on to the next level at Enter once the card shows", async () => {
      const game = await clearedAt(SPEC_LEVEL.blasts);
      game.tick(FRAME_MS, STILL);

      game.command("go");

      expect(game.level().number).toBe(SPEC_LEVEL.wide);
    });

    it("never banks a cleared level again once the next is under way", async () => {
      const game = await clearedAt(SPEC_LEVEL.blasts);
      const score = game.score();
      game.tick(FRAME_MS, STILL);
      game.launch();

      game.tick(FRAME_MS, STILL);

      expect({ score: game.score(), outcome: game.outcome() }).toEqual({
        score,
        outcome: "playing",
      });
    });

    it("wins the run at the last level, and says so", async () => {
      const game = await clearedAt(SPEC_LEVEL.last);

      expect({ outcome: game.outcome(), said: said() }).toEqual({
        outcome: "won",
        said: `Every level cleared! Score 4,100, at level ${String(SPEC_LEVEL.last)}. A new best!`,
      });
    });

    describe("where motion is welcome", () => {
      let viewport: ReturnType<typeof installFakeViewport>;

      beforeEach(() => {
        viewport = installFakeViewport(1024, 768);
      });

      afterEach(() => {
        viewport.restore();
      });

      it("waits for the last shards to fly before the cleared card", async () => {
        const game = await clearedAt(SPEC_LEVEL.blasts);

        game.tick(CLEARED_MS / 2, STILL);

        expect(game.clearedOpen()).toBe(false);
      });

      it("opens the cleared card once the last shards have flown", async () => {
        const game = await clearedAt(SPEC_LEVEL.blasts);

        game.tick(CLEARED_MS, STILL);

        expect(game.clearedOpen()).toBe(true);
      });

      it("opens no card over a new run paused during the cleared card's wait", async () => {
        const game = await clearedAt(SPEC_LEVEL.blasts);
        const starting = game.newGame();
        TestBed.inject(ConfirmService).accept();
        await starting;
        game.launch();
        game.pause();

        game.tick(FADE_MS, STILL);

        expect({
          cleared: game.clearedOpen(),
          result: game.resultOpen(),
        }).toEqual({ cleared: false, result: false });
      });

      it("goes nowhere at a launch before the card shows", async () => {
        const game = await clearedAt(SPEC_LEVEL.blasts);

        game.launch();

        expect({ outcome: game.outcome(), level: game.level().number }).toEqual(
          { outcome: "cleared", level: SPEC_LEVEL.blasts },
        );
      });
    });
  });

  describe("pausing", () => {
    it("pauses the level in play, and says so", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);

      game.pause();

      expect({ outcome: game.outcome(), said: said() }).toEqual({
        outcome: "paused",
        said: "Paused, with a score of 0. Press Enter to go on.",
      });
    });

    it("keeps a paused field still", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);
      game.pause();

      game.tick(10 * STEP_MS, STILL);

      expect(game.frame().field.steps).toBe(0);
    });

    it("goes on at a launch, and says so", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);
      game.pause();

      game.launch();

      expect({ outcome: game.outcome(), said: said() }).toEqual({
        outcome: "playing",
        said: "Going on.",
      });
    });

    it("goes on at Enter", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);
      game.pause();

      game.command("go");

      expect(game.outcome()).toBe("playing");
    });

    it("pauses at the key that toggles", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);

      game.command("toggle");

      expect(game.outcome()).toBe("paused");
    });

    it("goes on at the key that toggles", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);
      game.command("pause");

      game.command("toggle");

      expect(game.outcome()).toBe("playing");
    });

    it("has nothing to pause before the first serve", () => {
      const game = TestBed.inject(GameService);

      game.pause();

      expect(game.outcome()).toBe("ready");
    });
  });

  describe("before the board is drawn", () => {
    it("serves nothing at a launch", () => {
      const game = TestBed.inject(GameService);
      game.setDrawn(false);

      game.command("launch");

      expect(game.outcome()).toBe("ready");
    });

    it("keeps a paused run paused at a launch or Resume", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);
      game.pause();
      game.setDrawn(false);

      game.launch();
      game.resume();

      expect(game.outcome()).toBe("paused");
    });

    it("still pauses a level in play", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);
      game.setDrawn(false);

      game.pause();

      expect(game.outcome()).toBe("paused");
    });

    it("stays on a cleared level", async () => {
      const game = await clearedAt(SPEC_LEVEL.blasts);
      game.tick(FRAME_MS, STILL);
      game.setDrawn(false);

      game.nextLevel();

      expect(game.level().number).toBe(SPEC_LEVEL.blasts);
    });

    it("serves at a launch once the board is drawn", () => {
      const game = TestBed.inject(GameService);
      game.setDrawn(false);

      game.setDrawn(true);
      game.launch();

      expect(game.outcome()).toBe("playing");
    });
  });

  describe("the end of a run", () => {
    it("opens the result card at the next frame where the player prefers less motion", async () => {
      const game = await endedAt(SPEC_LEVEL.steel);

      game.tick(FRAME_MS, STILL);

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

      it("waits for the last ball to fade before the result card", async () => {
        const game = await endedAt(SPEC_LEVEL.steel);

        game.tick(FADE_MS / 2, STILL);

        expect(game.resultOpen()).toBe(false);
      });

      it("opens the result card once the last ball has faded", async () => {
        const game = await endedAt(SPEC_LEVEL.steel);

        game.tick(FADE_MS, STILL);

        expect(game.resultOpen()).toBe(true);
      });
    });

    it("puts the result card away", async () => {
      const game = await endedAt(SPEC_LEVEL.steel);
      game.tick(FRAME_MS, STILL);

      game.closeResult();
      game.tick(FRAME_MS, STILL);

      expect({ open: game.resultOpen(), closed: game.resultClosed() }).toEqual({
        open: false,
        closed: true,
      });
    });

    it.each(["launch", "toggle", "go"] as const)(
      "starts another run at %s once the result card is put away",
      async (command) => {
        const game = await endedAt(SPEC_LEVEL.steel);
        const ended = game.run();
        game.closeResult();

        game.command(command);
        await flush();

        expect({
          id: game.run().id > ended.id,
          outcome: game.outcome(),
          closed: game.resultClosed(),
        }).toEqual({ id: true, outcome: "ready", closed: false });
      },
    );

    it("starts nothing at a key before the result card is put away", async () => {
      const game = await endedAt(SPEC_LEVEL.steel);
      const ended = game.run();

      game.command("launch");
      game.command("toggle");
      game.command("go");
      await flush();

      expect(game.run()).toBe(ended);
    });

    it("tries again at the level the run reached", async () => {
      const game = await clearedAt(SPEC_LEVEL.blasts);
      game.tick(FRAME_MS, STILL);
      game.launch();
      for (let life = 0; life < FIRST_LIVES; life++) loseBall(game);

      game.tryAgain();

      expect({
        level: game.level().number,
        outcome: game.outcome(),
        lives: game.lives(),
        score: game.score(),
      }).toEqual({
        level: SPEC_LEVEL.wide,
        outcome: "ready",
        lives: 3,
        score: 0,
      });
    });

    it("puts away the result card to try again", async () => {
      const game = await endedAt(SPEC_LEVEL.steel);
      game.tick(FRAME_MS, STILL);

      game.tryAgain();

      expect(game.resultOpen()).toBe(false);
    });

    it("tries nothing again while the run is under way", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);
      const run = game.run();

      game.tryAgain();

      expect(game.run()).toBe(run);
    });
  });

  describe("the records", () => {
    /** Returns the game with a run lost on its second level, after clearing the first. */
    async function lostOnSecond(): Promise<GameService> {
      const game = await gameAt(SPEC_LEVEL.blasts);
      clearToNext(game);
      for (let life = 0; life < FIRST_LIVES; life++) loseBall(game);
      return game;
    }

    it("starts a run at the speed the settings keep", () => {
      TestBed.inject(SettingsService).update({ speed: "fast" });

      const game = TestBed.inject(GameService);

      expect(game.run().speed).toBe("fast");
    });

    it("keeps a new speed in the settings", async () => {
      const game = TestBed.inject(GameService);

      await game.changeSpeed("relaxed");

      expect(TestBed.inject(SettingsService).settings().speed).toBe("relaxed");
    });

    it("counts a run as its first ball is served", async () => {
      const game = await gameAt(SPEC_LEVEL.steel);

      game.launch();

      expect(TestBed.inject(StatsService).stats().speeds.normal.runs).toBe(1);
    });

    it("counts no run before its first serve", async () => {
      await gameAt(SPEC_LEVEL.steel);

      expect(TestBed.inject(StatsService).stats().speeds.normal.runs).toBe(0);
    });

    it("counts a run once, however many levels it plays", async () => {
      const game = await launchedAt(SPEC_LEVEL.blasts);

      clearToNext(game);
      game.launch();

      expect(TestBed.inject(StatsService).stats().speeds.normal.runs).toBe(1);
    });

    it("opens the level after one cleared", async () => {
      await clearedAt(SPEC_LEVEL.blasts);

      expect(TestBed.inject(ProgressService).isOpen(SPEC_LEVEL.wide)).toBe(
        true,
      );
    });

    it("keeps a cleared level's points as its best at the speed", async () => {
      await clearedAt(SPEC_LEVEL.blasts);

      expect(TestBed.inject(StatsService).stats().levels).toEqual({
        blasts: { normal: 4100 },
      });
    });

    it("keeps a won run's last level cleared, with its best", async () => {
      await clearedAt(SPEC_LEVEL.last);

      expect({
        cleared: TestBed.inject(ProgressService).cleared().has("last"),
        best: TestBed.inject(StatsService).stats().levels["last"],
      }).toEqual({ cleared: true, best: { normal: 4100 } });
    });

    it("keeps the records at the run's own speed", async () => {
      TestBed.inject(SettingsService).update({ speed: "fast" });

      await clearedAt(SPEC_LEVEL.blasts);

      const stats = TestBed.inject(StatsService).stats();
      expect({
        runs: stats.speeds.fast.runs,
        best: stats.levels["blasts"],
      }).toEqual({ runs: 1, best: { fast: 4100 } });
    });

    it("keeps a level's own points as its best, not the run's score", async () => {
      TestBed.overrideProvider(GAME_LEVELS, { useValue: TWO_SETS });
      const game = await launchedAt(1);

      clearToNext(game);
      playToClear(game);

      expect(TestBed.inject(StatsService).stats().levels["again"]).toEqual({
        normal: 4100,
      });
    });

    it("keeps an ended run's score as the best, and calls it new", async () => {
      const game = await lostOnSecond();

      expect({
        newBest: game.newBest(),
        best: game.best(),
        said: said(),
      }).toEqual({
        newBest: true,
        best: 4400,
        said: "Game over. Score 4,400, at level 2. A new best!",
      });
    });

    it("gives the best of the run's own speed", async () => {
      const game = TestBed.inject(GameService);
      TestBed.inject(StatsService).recordEnd({
        ...game.run(),
        speed: "fast",
        score: 900,
      });

      await game.changeSpeed("fast");

      expect(game.best()).toBe(900);
    });

    it("calls no score a new best", async () => {
      const game = await endedAt(SPEC_LEVEL.steel);

      expect(game.newBest()).toBe(false);
    });

    it("forgets a new best as the next run begins", async () => {
      const game = await lostOnSecond();

      game.tryAgain();

      expect(game.newBest()).toBe(false);
    });

    it("calls for the chime as a new best's card opens", async () => {
      const game = await lostOnSecond();
      const before = game.chimes();

      playUntil(game, () => STILL, game.resultOpen);

      expect([before, game.chimes()]).toEqual([0, 1]);
    });

    it("calls for no chime as the card of a run with no new best opens", async () => {
      const game = await endedAt(SPEC_LEVEL.steel);

      playUntil(game, () => STILL, game.resultOpen);

      expect(game.chimes()).toBe(0);
    });

    it("calls for the chime for a life the points brought", async () => {
      TestBed.overrideProvider(GAME_LEVELS, { useValue: RICH_LEVELS });
      const game = await launchedAt(1);

      playToClear(game);

      expect({ lives: game.lives(), chimes: game.chimes() }).toEqual({
        lives: FIRST_LIVES + 1,
        chimes: 1,
      });
    });

    it("calls for no chime for a life a capsule brought", async () => {
      const game = await launchedAt(SPEC_LEVEL.lives);

      playUntil(game, underCapsule, () => game.lives() > FIRST_LIVES);

      expect(game.chimes()).toBe(0);
    });
  });

  describe("a new game", () => {
    it("starts a new run without asking while none is under way", async () => {
      const game = TestBed.inject(GameService);

      const started = await game.newGame();

      expect({
        started,
        asked: TestBed.inject(ConfirmService).isOpen(),
        runs: game.runs(),
      }).toEqual({ started: true, asked: false, runs: 1 });
    });

    it("starts at the level the last run started at", async () => {
      const game = await gameAt(SPEC_LEVEL.few);

      await game.newGame();

      expect(game.level().number).toBe(SPEC_LEVEL.few);
    });

    it("asks before it throws away the run under way", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);

      void game.newGame();

      expect(TestBed.inject(ConfirmService).prompt()).toMatchObject({
        title: "Start a new game?",
        confirmLabel: "New game",
      });
    });

    it("asks before it throws away a level just cleared", async () => {
      const game = await clearedAt(SPEC_LEVEL.blasts);

      void game.newGame();

      expect(TestBed.inject(ConfirmService).isOpen()).toBe(true);
    });

    it("keeps the run under way when the player backs out", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);
      const before = game.run();

      const starting = game.newGame();
      TestBed.inject(ConfirmService).cancel();

      expect({ started: await starting, run: game.run() }).toEqual({
        started: false,
        run: before,
      });
    });

    it("throws the run away once the player agrees, and lays its level out afresh", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);
      game.tick(10.5 * STEP_MS, STILL);
      const before = game.run();

      const starting = game.newGame();
      TestBed.inject(ConfirmService).accept();
      await starting;

      expect({
        newId: game.run().id > before.id,
        outcome: game.outcome(),
        steps: game.frame().field.steps,
        alpha: game.frame().alpha,
        serving: game.serving(),
      }).toEqual({
        newId: true,
        outcome: "ready",
        steps: 0,
        alpha: 0,
        serving: true,
      });
    });

    it("glides a new run's field from its first step", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);
      game.tick(10.5 * STEP_MS, STILL);
      const starting = game.newGame();
      TestBed.inject(ConfirmService).accept();
      await starting;

      game.tick(0.25 * STEP_MS, STILL);

      expect(game.frame().alpha).toBeCloseTo(0.25);
    });

    it("clears what the last run had said", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);

      const starting = game.newGame();
      TestBed.inject(ConfirmService).accept();
      await starting;

      expect(said()).toBe("");
    });

    it("names the speed before a run at another throws away the one under way", async () => {
      const game = await launchedAt(SPEC_LEVEL.steel);

      void game.changeSpeed("fast");

      expect(TestBed.inject(ConfirmService).prompt().title).toBe(
        "Start a new Fast game?",
      );
    });

    it("starts a run at another speed, at the level the last one started at", async () => {
      const game = await gameAt(SPEC_LEVEL.few);

      await game.changeSpeed("relaxed");

      expect({ speed: game.run().speed, level: game.level().number }).toEqual({
        speed: "relaxed",
        level: SPEC_LEVEL.few,
      });
    });

    it("keeps the run where it is when asked for a level the game hasn't", async () => {
      const game = TestBed.inject(GameService);
      const before = game.run();

      await expect(game.startAt(SPEC_LEVELS.length + 1)).rejects.toThrow(
        `No level ${String(SPEC_LEVELS.length + 1)}.`,
      );

      expect(game.run()).toBe(before);
    });

    it("starts at a level of the player's choosing", async () => {
      const game = TestBed.inject(GameService);

      await game.startAt(SPEC_LEVEL.last);

      expect(game.level().number).toBe(SPEC_LEVEL.last);
    });
  });
});

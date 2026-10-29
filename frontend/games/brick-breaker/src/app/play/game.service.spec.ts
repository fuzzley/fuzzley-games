import { TestBed } from "@angular/core/testing";
import { installFakeViewport } from "@fz/game-ui/testing";
import { AnnouncerService } from "@fz/ui/announcer";
import { ConfirmService } from "@fz/ui/confirm";
import { FEW_BRICKS } from "../../rules/describe";
import type { LevelData, LevelEntry, LevelSetData } from "../../rules/levels";
import type { Steer } from "../../rules/paddle";
import { multiplier } from "../../rules/scoring";
import { STEP_MS } from "../../rules/stepper";
import { FIELD_WIDTH, FIRST_LIVES } from "../../rules/tuning";
import { CLEARED_MS, FADE_MS, SERVE_MS } from "../../view/timing";
import { GAME_LEVELS, GAME_RANDOM, GameService } from "./game.service";

/** How long a frame of the board takes, at 60 a second. */
const FRAME_MS = 1000 / 60;

/** The most game time a spec plays for something to happen. */
const PLAY_LIMIT_MS = 60_000;

/** Returns a level of gifts that each let a capsule fall, before a wall of steel. */
function giftsOf(capsule: string, name: string): LevelData {
  return {
    id: capsule,
    name,
    capsules: [],
    legend: { g: { kind: "gift", capsule } },
    bricks: ["#".repeat(13), ".............", "g".repeat(13)],
  };
}

/** The levels the specs play: small, each set up to come to one thing soon. */
const SET: LevelSetData = {
  id: "specs",
  name: "Specs",
  drops: 0,
  levels: [
    // A row of blast bricks, which a hit on any one of them clears.
    { id: "blasts", name: "Blasts", capsules: [], bricks: ["*".repeat(13)] },
    // Gifts that each let a wide paddle fall, before steel.
    giftsOf("wide", "Wide"),
    // A wall of steel, which no ball gets past, before the brick it needs.
    {
      id: "steel",
      name: "Steel",
      capsules: [],
      bricks: ["......o......", ".............", "#".repeat(13)],
    },
    // Five bricks the blasts below them can't reach.
    {
      id: "few",
      name: "Few",
      capsules: [],
      bricks: ["ooooo........", ".............", "*".repeat(13)],
    },
    giftsOf("life", "Lives"),
    giftsOf("laser", "Laser"),
    giftsOf("catch", "Catch"),
    // The last level, blasts again, clearing which wins the run.
    { id: "last", name: "Last", capsules: [], bricks: ["*".repeat(13)] },
  ],
};

/** The specs' levels, numbered from 1. */
const LEVELS: readonly LevelEntry[] = SET.levels.map((data: LevelData, i) => ({
  number: i + 1,
  set: SET,
  data,
}));

/** The specs' levels by name. */
const BLASTS = 1;
const WIDE = 2;
const STEEL = 3;
const FEW = 4;
const LIVES = 5;
const LASER = 6;
const CATCH = 7;
const LAST = 8;

/** Leaves the paddle where it is. */
const STILL: Readonly<Steer> = { to: null, by: 0, push: 0 };

/** Returns the steering that keeps the paddle under the lowest ball in play. */
function under(game: GameService): Steer {
  return { to: lowestBallX(game), by: 0, push: 0 };
}

/** Returns the steering that sends the paddle to the wall farthest from the lowest ball. */
function awayFrom(game: GameService): Steer {
  const x = lowestBallX(game) ?? FIELD_WIDTH / 2;
  return { to: x < FIELD_WIDTH / 2 ? FIELD_WIDTH : 0, by: 0, push: 0 };
}

/** Returns the steering that puts the paddle under a falling capsule, else under the ball. */
function underCapsule(game: GameService): Steer {
  const capsule = game.frame().field.falling.find((each) => each.live);
  return capsule ? { to: capsule.x, by: 0, push: 0 } : under(game);
}

/** Returns where the lowest ball in play is across, or null with none. */
function lowestBallX(game: GameService): number | null {
  let lowest: { x: number; y: number } | null = null;
  for (const ball of game.frame().field.balls) {
    if (ball.live && (!lowest || ball.y > lowest.y)) lowest = ball;
  }
  return lowest?.x ?? null;
}

/**
 * Ticks the game a frame at a time, steered as a rule says, until something
 * comes to pass, failing past a minute of game time.
 */
function playUntil(
  game: GameService,
  steer: (game: GameService) => Readonly<Steer>,
  done: () => boolean,
): void {
  for (let ms = 0; !done(); ms += FRAME_MS) {
    if (ms > PLAY_LIMIT_MS) throw new Error("It never came to pass.");
    game.tick(FRAME_MS, steer(game));
  }
}

/** Ticks the game a frame at a time for a while, steered the same way throughout. */
function playFor(game: GameService, ms: number, steer: Readonly<Steer>): void {
  for (let played = 0; played < ms; played += FRAME_MS) {
    game.tick(FRAME_MS, steer);
  }
}

/** Returns whether the paddle has been made wide. */
function isWide(game: GameService): boolean {
  return game.frame().field.effects["paddle-size"].capsule === "wide";
}

/** Returns how many balls in play the paddle holds. */
function heldBalls(game: GameService): number {
  return game.frame().field.balls.filter((ball) => ball.live && ball.held)
    .length;
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

/** Returns the game with its run's level started, the ball served. */
async function launchedAt(level: number): Promise<GameService> {
  const game = await gameAt(level);
  game.launch();
  return game;
}

/** Returns the game with the level its run is at cleared. */
async function clearedAt(level: number): Promise<GameService> {
  const game = await launchedAt(level);
  playUntil(game, under, () => game.outcome() !== "playing");
  return game;
}

/** Serves the ball, at once or once it is back on the paddle, and plays it until it is lost. */
function loseBall(game: GameService): void {
  playUntil(game, () => STILL, game.serving);
  const lives = game.lives();
  game.launch();
  playUntil(game, awayFrom, () => game.lives() < lives);
}

/** Returns the game with a run at a level that has lost every life. */
async function endedAt(level: number): Promise<GameService> {
  const game = await gameAt(level);
  for (let life = 0; life < FIRST_LIVES; life++) loseBall(game);
  return game;
}

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      { provide: GAME_LEVELS, useValue: LEVELS },
      { provide: GAME_RANDOM, useValue: () => 0.5 },
    ],
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
      const game = await launchedAt(STEEL);

      game.tick(3 * STEP_MS, STILL);

      expect(game.frame().field.steps).toBe(3);
    });

    it("glides the field toward its next step", async () => {
      const game = await launchedAt(STEEL);

      game.tick(1.5 * STEP_MS, STILL);

      expect(game.frame().alpha).toBeCloseTo(0.5);
    });

    it("hands the scene the field's events as they happen", async () => {
      const game = await gameAt(STEEL);

      game.launch();

      expect(game.frame().events.latest).toBe(1);
    });

    it("hands the scene the same frame each time, written afresh", async () => {
      const game = await launchedAt(STEEL);
      const first = game.frame();

      game.tick(STEP_MS, STILL);

      expect({
        same: game.frame() === first,
        steps: first.field.steps,
      }).toEqual({ same: true, steps: 1 });
    });

    it("copies how many times a hit scores, by the streak, for the bar", async () => {
      const game = await launchedAt(FEW);

      playUntil(game, under, () => game.frame().field.streak >= 8);

      expect(game.multiplier()).toBe(multiplier(game.frame().field.streak));
    });

    it("scores a hit once again on a new run", async () => {
      const game = await launchedAt(FEW);
      playUntil(game, under, () => game.frame().field.streak >= 8);

      const starting = game.newGame();
      TestBed.inject(ConfirmService).accept();
      await starting;

      expect(game.multiplier()).toBe(1);
    });
  });

  describe("a lost ball", () => {
    it("takes a life, and says so", async () => {
      const game = await gameAt(STEEL);

      loseBall(game);

      expect({ lives: game.lives(), said: said() }).toEqual({
        lives: 2,
        said: "Ball lost. 2 lives left.",
      });
    });

    it("leaves the paddle empty for a beat", async () => {
      const game = await gameAt(STEEL);
      loseBall(game);

      game.tick(SERVE_MS / 2, STILL);

      expect(game.serving()).toBe(false);
    });

    it("puts the next ball on the paddle after the beat, to be served", async () => {
      const game = await gameAt(STEEL);
      loseBall(game);

      game.tick(SERVE_MS, STILL);

      expect({ serving: game.serving(), outcome: game.outcome() }).toEqual({
        serving: true,
        outcome: "playing",
      });
    });

    it("ends the run at the last life, and says so", async () => {
      const game = await endedAt(STEEL);

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
      const game = await endedAt(STEEL);

      game.tick(SERVE_MS, STILL);

      expect(game.frame().field.state).toBe("lost");
    });
  });

  describe("capsules", () => {
    it("names a capsule as it is caught", async () => {
      const game = await launchedAt(WIDE);

      playUntil(game, underCapsule, () => isWide(game));

      expect(said()).toBe("Wide paddle.");
    });

    it("names a capsule once", async () => {
      const game = await launchedAt(WIDE);
      playUntil(game, underCapsule, () => isWide(game));

      game.tick(FRAME_MS, STILL);

      expect(said()).toBe("Wide paddle.");
    });

    it("names a capsule caught on the level after one cleared", async () => {
      const game = await clearedAt(BLASTS);
      game.tick(FRAME_MS, STILL);
      game.command("go");
      game.launch();

      playUntil(game, underCapsule, () => isWide(game));

      expect(said()).toBe("Wide paddle.");
    });

    it("fires the laser at a launch", async () => {
      const game = await launchedAt(LASER);
      playUntil(game, underCapsule, () => game.frame().field.mode === "laser");

      game.launch();

      expect(game.frame().field.bolts.filter((bolt) => bolt.live)).toHaveLength(
        2,
      );
    });

    it("lets go of a caught ball at a launch", async () => {
      const game = await launchedAt(CATCH);
      playUntil(game, underCapsule, () => game.frame().field.mode === "catch");
      playUntil(game, under, () => heldBalls(game) > 0);

      game.launch();

      expect(heldBalls(game)).toBe(0);
    });

    it("says an extra life once, with the lives there are", async () => {
      const game = await launchedAt(LIVES);

      playUntil(game, underCapsule, () => game.lives() > FIRST_LIVES);

      expect(said()).toBe("Extra life. 4 lives.");
    });
  });

  describe("clearing a level", () => {
    it("says once few bricks are left", async () => {
      const game = await launchedAt(FEW);

      playUntil(game, under, () => game.frame().field.needed <= FEW_BRICKS);

      expect(said()).toBe("5 bricks left.");
    });

    it("banks the level, and says so with the score", async () => {
      const game = await clearedAt(BLASTS);

      expect({ outcome: game.outcome(), said: said() }).toEqual({
        outcome: "cleared",
        said: `Level 1 cleared! Score ${String(game.score())}.`,
      });
    });

    it("opens the cleared card at the next frame where the player prefers less motion", async () => {
      const game = await clearedAt(BLASTS);

      game.tick(FRAME_MS, STILL);

      expect(game.clearedOpen()).toBe(true);
    });

    it("goes on to the next level at a launch once the card shows, and says which", async () => {
      const game = await clearedAt(BLASTS);
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
        level: WIDE,
        field: "serve",
        events: 0,
        open: false,
        said: "Level 2, Wide. 13 bricks.",
      });
    });

    it("goes on to the next level at Enter once the card shows", async () => {
      const game = await clearedAt(BLASTS);
      game.tick(FRAME_MS, STILL);

      game.command("go");

      expect(game.level().number).toBe(WIDE);
    });

    it("never banks a cleared level again once the next is under way", async () => {
      const game = await clearedAt(BLASTS);
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
      const game = await clearedAt(LAST);

      expect({ outcome: game.outcome(), said: said() }).toEqual({
        outcome: "won",
        said: `Every level cleared! Score ${String(game.score())}, at level ${String(LAST)}.`,
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
        const game = await clearedAt(BLASTS);

        game.tick(CLEARED_MS / 2, STILL);

        expect(game.clearedOpen()).toBe(false);
      });

      it("opens the cleared card once the last shards have flown", async () => {
        const game = await clearedAt(BLASTS);

        game.tick(CLEARED_MS, STILL);

        expect(game.clearedOpen()).toBe(true);
      });

      it("goes nowhere at a launch before the card shows", async () => {
        const game = await clearedAt(BLASTS);

        game.launch();

        expect({ outcome: game.outcome(), level: game.level().number }).toEqual(
          { outcome: "cleared", level: BLASTS },
        );
      });
    });
  });

  describe("pausing", () => {
    it("pauses the level in play, and says so", async () => {
      const game = await launchedAt(STEEL);

      game.pause();

      expect({ outcome: game.outcome(), said: said() }).toEqual({
        outcome: "paused",
        said: "Paused, with a score of 0. Press Enter to go on.",
      });
    });

    it("keeps a paused field still", async () => {
      const game = await launchedAt(STEEL);
      game.pause();

      game.tick(10 * STEP_MS, STILL);

      expect(game.frame().field.steps).toBe(0);
    });

    it("goes on at a launch, and says so", async () => {
      const game = await launchedAt(STEEL);
      game.pause();

      game.launch();

      expect({ outcome: game.outcome(), said: said() }).toEqual({
        outcome: "playing",
        said: "Going on.",
      });
    });

    it("goes on at Enter", async () => {
      const game = await launchedAt(STEEL);
      game.pause();

      game.command("go");

      expect(game.outcome()).toBe("playing");
    });

    it("pauses at the key that toggles", async () => {
      const game = await launchedAt(STEEL);

      game.command("toggle");

      expect(game.outcome()).toBe("paused");
    });

    it("goes on at the key that toggles", async () => {
      const game = await launchedAt(STEEL);
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
      const game = await launchedAt(STEEL);
      game.pause();
      game.setDrawn(false);

      game.launch();
      game.resume();

      expect(game.outcome()).toBe("paused");
    });

    it("still pauses a level in play", async () => {
      const game = await launchedAt(STEEL);
      game.setDrawn(false);

      game.pause();

      expect(game.outcome()).toBe("paused");
    });

    it("stays on a cleared level", async () => {
      const game = await clearedAt(BLASTS);
      game.tick(FRAME_MS, STILL);
      game.setDrawn(false);

      game.nextLevel();

      expect(game.level().number).toBe(BLASTS);
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
      const game = await endedAt(STEEL);

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
        const game = await endedAt(STEEL);

        game.tick(FADE_MS / 2, STILL);

        expect(game.resultOpen()).toBe(false);
      });

      it("opens the result card once the last ball has faded", async () => {
        const game = await endedAt(STEEL);

        game.tick(FADE_MS, STILL);

        expect(game.resultOpen()).toBe(true);
      });
    });

    it("puts the result card away", async () => {
      const game = await endedAt(STEEL);
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
        const game = await endedAt(STEEL);
        const ended = game.run();
        game.closeResult();

        game.command(command);
        await Promise.resolve();

        expect({
          id: game.run().id > ended.id,
          outcome: game.outcome(),
          closed: game.resultClosed(),
        }).toEqual({ id: true, outcome: "ready", closed: false });
      },
    );

    it("starts nothing at a key before the result card is put away", async () => {
      const game = await endedAt(STEEL);
      const ended = game.run();

      game.command("launch");
      game.command("toggle");
      game.command("go");
      await Promise.resolve();

      expect(game.run()).toBe(ended);
    });

    it("tries again at the level the run reached", async () => {
      const game = await clearedAt(BLASTS);
      game.tick(FRAME_MS, STILL);
      game.launch();
      for (let life = 0; life < FIRST_LIVES; life++) loseBall(game);

      game.tryAgain();

      expect({
        level: game.level().number,
        outcome: game.outcome(),
        lives: game.lives(),
        score: game.score(),
      }).toEqual({ level: WIDE, outcome: "ready", lives: 3, score: 0 });
    });

    it("tries nothing again while the run is under way", async () => {
      const game = await launchedAt(STEEL);
      const run = game.run();

      game.tryAgain();

      expect(game.run()).toBe(run);
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
      const game = await gameAt(FEW);

      await game.newGame();

      expect(game.level().number).toBe(FEW);
    });

    it("asks before it throws away the run under way", async () => {
      const game = await launchedAt(STEEL);

      void game.newGame();

      expect(TestBed.inject(ConfirmService).prompt()).toMatchObject({
        title: "Start a new game?",
        confirmLabel: "New game",
      });
    });

    it("asks before it throws away a level just cleared", async () => {
      const game = await clearedAt(BLASTS);

      void game.newGame();

      expect(TestBed.inject(ConfirmService).isOpen()).toBe(true);
    });

    it("keeps the run under way when the player backs out", async () => {
      const game = await launchedAt(STEEL);
      const before = game.run();

      const starting = game.newGame();
      TestBed.inject(ConfirmService).cancel();

      expect({ started: await starting, run: game.run() }).toEqual({
        started: false,
        run: before,
      });
    });

    it("throws the run away once the player agrees, and lays its level out afresh", async () => {
      const game = await launchedAt(STEEL);
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
      const game = await launchedAt(STEEL);
      game.tick(10.5 * STEP_MS, STILL);
      const starting = game.newGame();
      TestBed.inject(ConfirmService).accept();
      await starting;

      game.tick(0.25 * STEP_MS, STILL);

      expect(game.frame().alpha).toBeCloseTo(0.25);
    });

    it("clears what the last run had said", async () => {
      const game = await launchedAt(STEEL);

      const starting = game.newGame();
      TestBed.inject(ConfirmService).accept();
      await starting;

      expect(said()).toBe("");
    });

    it("names the speed before a run at another throws away the one under way", async () => {
      const game = await launchedAt(STEEL);

      void game.changeSpeed("fast");

      expect(TestBed.inject(ConfirmService).prompt().title).toBe(
        "Start a new Fast game?",
      );
    });

    it("starts a run at another speed, at the level the last one started at", async () => {
      const game = await gameAt(FEW);

      await game.changeSpeed("relaxed");

      expect({ speed: game.run().speed, level: game.level().number }).toEqual({
        speed: "relaxed",
        level: FEW,
      });
    });

    it("starts at a level of the player's choosing", async () => {
      const game = TestBed.inject(GameService);

      await game.startAt(LAST);

      expect(game.level().number).toBe(LAST);
    });
  });
});

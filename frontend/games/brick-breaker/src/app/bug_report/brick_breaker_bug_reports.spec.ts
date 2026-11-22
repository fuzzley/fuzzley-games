import { TestBed } from "@angular/core/testing";
import { FRAME_MS, playFor, playUntil } from "@fz/core/testing";
import { BUILD_INFO } from "@fz/game-ui/build_info";
import {
  BUG_REPORT_CONFIG,
  BugReportService,
  packState,
  unpackState,
} from "@fz/game-ui/bug_report";
import { installCompressionStreams } from "@fz/game-ui/testing";
import { provideFakePhaserCanvas } from "@fz/phaser/testing";
import { paintRoles } from "@fz/style/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { render } from "@testing-library/angular";
import { EFFECT_KINDS } from "../../rules/bricks/capsules";
import { CAPSULE_IDS, capsule } from "../../rules/catalog/capsules";
import { createField } from "../../rules/field/field";
import { LEVELS, type LevelEntry, parseLevel } from "../../rules/levels/levels";
import { type ReportedPlay, reportPlay } from "../../rules/run/report_state";
import {
  type Run,
  createRun,
  levelSeed,
  startLevel,
} from "../../rules/run/run";
import { FRIEND_INKS, TALLEST_FIELD } from "../../rules/tuning";
import {
  SPEC_LEVEL,
  SPEC_LEVELS,
  STILL,
  awayFrom,
  provideSpecLevels,
  under,
  underCapsule,
} from "../../testing/play";
import { ROLES } from "../../testing/roles";
import { BoardComponent } from "../board/board.component";
import { FIELD_ROLES } from "../board/field_roles";
import type { EffectInPlay } from "../panels/panels";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import {
  BrickBreakerBugReports,
  provideBrickBreakerBugReports,
} from "./brick_breaker_bug_reports";
import { readBrickBreakerState, reportState } from "./brick_breaker_state";

/** Returns Brick Breaker's reports, over the game as a spec has left it. */
function reports(): BrickBreakerBugReports {
  return TestBed.inject(BrickBreakerBugReports);
}

/** Returns the game, its run on the steel level, its ball served and half a second in play, paused. */
async function steelPaused(): Promise<GameService> {
  const game = TestBed.inject(GameService);
  await game.startAt(SPEC_LEVEL.steel);
  game.launch();
  playUntil(game, under, () => game.frame().field.steps > 60);
  game.pause();
  return game;
}

/** Says what the page shows of the game. */
interface Shown {
  /** The run, but its id, which a run taken up takes anew. */
  readonly run: Omit<Run, "id">;
  /** The field the scene draws, as JSON, but what a field laid back makes anew and the aim, which no press holds. */
  readonly field: string;
  readonly serving: boolean;
  readonly streak: number;
  readonly bestStreak: number;
  /**
   * The effects in play, each by its capsule and the whole seconds the
   * panel says it has left; the share its bar shows is written afresh as a
   * run is taken up, from as long as a second before.
   */
  readonly effects: readonly Omit<EffectInPlay, "share">[];
  readonly fieldHeight: number;
  readonly ballSpeedScale: number;
  readonly customPercent: number | null;
  /** What the board says, its card's words among it. */
  readonly board: string;
}

/**
 * Returns the steering under a falling capsule, else under the ball, after
 * a launch, which serves a ball, lets go of one caught or fires the laser.
 */
function launchingUnder(game: GameService): ReturnType<typeof underCapsule> {
  game.launch();
  return underCapsule(game);
}

/**
 * Resolves to what a question's asker made of it, once the player says yes,
 * which does nothing where nothing was asked.
 */
function sayingYes<T>(asking: Promise<T>): Promise<T> {
  TestBed.inject(ConfirmService).accept();
  return asking;
}

/** Returns how many bricks a level lays out. */
function bricksIn(entry: LevelEntry): number {
  return parseLevel(entry).cells.filter((cell) => cell !== null).length;
}

/** Returns a number of the field's that JSON writes out to its last digit, the nth of a series. */
function untidy(n: number, most: number): number {
  return ((n + 1) * Math.SQRT2 * 7.31) % most;
}

/**
 * Returns the largest state a report is likely to take: the game's level
 * with the most bricks, an hour into a Custom run, with every ball, capsule
 * and bolt the field keeps records for in play, and an effect of every
 * group, each number written out to its last digit.
 */
function largestPlay(): ReportedPlay {
  const entry = LEVELS.reduce((most, each) =>
    bricksIn(each) > bricksIn(most) ? each : most,
  );
  const run = startLevel(
    createRun({
      id: 1,
      seed: 2_147_483_647,
      speed: "custom",
      lastLevel: LEVELS.length,
      level: entry.number,
    }),
  );
  const field = createField(parseLevel(entry), {
    speed: run.speed,
    seed: levelSeed(run),
  });
  field.steps = 432_000;
  field.draws = 98_765;
  field.height = untidy(0, TALLEST_FIELD);
  field.climbed = untidy(1, 40);
  field.ballSpeedScale = 1.95;
  for (const [n, ball] of field.balls.entries()) {
    Object.assign(ball, {
      live: true,
      held: false,
      x: untidy(n, 26),
      y: untidy(n + 10, 30),
      lastX: untidy(n + 20, 26),
      lastY: untidy(n + 30, 30),
      dx: untidy(n + 40, 1),
      dy: -untidy(n + 50, 1),
      offset: untidy(n + 60, 2),
      bounces: 11,
      ink: n % FRIEND_INKS,
      seeks: true,
      portalled: true,
      jumpedAt: 431_000 + n,
    });
  }
  for (const [n, falling] of field.falling.entries()) {
    Object.assign(falling, {
      live: true,
      id: CAPSULE_IDS[n % CAPSULE_IDS.length],
      x: untidy(n + 70, 26),
      y: untidy(n + 80, 30),
      lastY: untidy(n + 90, 30),
    });
  }
  for (const [n, bolt] of field.bolts.entries()) {
    Object.assign(bolt, {
      live: true,
      x: untidy(n + 100, 26),
      y: untidy(n + 110, 30),
      lastY: untidy(n + 120, 30),
    });
  }
  for (const kind of EFFECT_KINDS) {
    field.effects[kind].capsule =
      CAPSULE_IDS.find((id) => capsule(id).effect.kind === kind) ?? null;
    field.effects[kind].endsAt = 433_000;
  }
  Object.assign(field.paddle, {
    x: untidy(130, 26),
    lastX: untidy(131, 26),
    width: untidy(132, 6),
    goalWidth: untidy(133, 6),
    target: untidy(134, 26),
    speed: untidy(135, 40),
  });
  return reportPlay(run, field, LEVELS);
}

describe("BrickBreakerBugReports", () => {
  installCompressionStreams();

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideSpecLevels()] });
  });

  it("files reports as Brick Breaker's, under its tag", () => {
    expect({ title: reports().title, tag: reports().tag }).toEqual({
      title: "Brick Breaker",
      tag: "bb1",
    });
  });

  it("names the game, the run's speed and the level in play", async () => {
    const game = TestBed.inject(GameService);
    await game.changeSpeed("fast");
    await game.startAt(SPEC_LEVEL.steel);

    expect(reports().game()).toBe("Brick Breaker · Fast · Level 3: Steel");
  });

  it("words each setting as the drawer shows it", async () => {
    TestBed.inject(SettingsService).update({
      customPercent: 150,
      touch: "follow",
      sound: false,
    });
    await TestBed.inject(GameService).changeSpeed("relaxed");

    expect(reports().settings()).toEqual([
      "Speed: Relaxed",
      "Touch controls: Follow the finger",
      "Sound: Off",
    ]);
  });

  it("adds Custom's ball speed while the run is at Custom", async () => {
    TestBed.inject(SettingsService).update({ customPercent: 150 });
    await TestBed.inject(GameService).changeSpeed("custom");

    expect(reports().settings().slice(0, 2)).toEqual([
      "Speed: Custom",
      "Custom ball speed: 150% of Normal",
    ]);
  });

  it("adds the ball's speed where the debug menu tunes it", () => {
    TestBed.inject(GameService).setBallSpeedScale(1.25);

    expect(reports().settings().at(-1)).toBe("Ball speed (debug): ×1.25");
  });

  describe("the state", () => {
    it("takes the level in play as it stands, with the ball's speed", async () => {
      const game = await steelPaused();
      game.setBallSpeedScale(1.5);
      const { field } = game.frame();

      const { summary, value } = reports().capture();

      expect({ summary, value }).toEqual({
        summary: "Level 3 · Score 0 · 3 lives · 1 ball in play",
        value: {
          game: game.saved(),
          moment: expect.objectContaining({
            state: "playing",
            balls: field.balls.map((ball) => ({ ...ball })),
            paddle: { ...field.paddle },
            ballSpeedScale: 1.5,
          }) as unknown,
          ballSpeedScale: 1.5,
        },
      });
    });

    it("takes a run waiting for its first serve as one begun", () => {
      const { value } = reports().capture();

      expect(
        readBrickBreakerState(value, SPEC_LEVELS, 5).takenUp.run,
      ).toMatchObject({
        level: SPEC_LEVEL.blasts,
        score: 0,
        outcome: "paused",
      });
    });

    it("reads back as it was packed", async () => {
      const game = await steelPaused();
      const { value } = reports().capture();

      const read = readBrickBreakerState(
        await unpackState("bb1", await packState("bb1", value)),
        SPEC_LEVELS,
        game.run().id + 1,
      );

      expect(read).toEqual(
        readBrickBreakerState(value, SPEC_LEVELS, game.run().id + 1),
      );
      expect(read.takenUp.run).toEqual({
        ...game.run(),
        id: game.run().id + 1,
      });
    });

    it("fits the largest likely, every record in play on the level with the most bricks, in the link whole", async () => {
      TestBed.configureTestingModule({
        providers: [
          provideBrickBreakerBugReports(),
          {
            provide: BUILD_INFO,
            useValue: {
              commit: "0123456789abcdef0123456789abcdef01234567",
              buildTime: "2026-11-22T12:00:00Z",
            },
          },
        ],
      });
      TestBed.inject(GameService).setBallSpeedScale(1.95);
      const state = reportState(largestPlay(), 1.95);

      const link = await TestBed.inject(BugReportService).issueUrl(state);
      const field = new URL(link).searchParams.get("game-state") ?? "";

      expect(link.length).toBeLessThanOrEqual(
        TestBed.inject(BUG_REPORT_CONFIG).maxUrlChars,
      );
      expect(await unpackState("bb1", field)).toEqual(state.value);
    });
  });

  describe("a state loaded", () => {
    beforeEach(() => {
      paintRoles(FIELD_ROLES, ROLES);
    });

    /** Renders the board, on a fake canvas, and returns what reads what it shows. */
    async function renderGame(): Promise<() => Promise<Shown>> {
      const view = await render("<app-board />", {
        imports: [BoardComponent],
        providers: [provideFakePhaserCanvas()],
      });
      await view.fixture.whenStable();
      return async () => {
        view.detectChanges();
        await view.fixture.whenStable();
        const game = TestBed.inject(GameService);
        const { id: _, ...run } = game.run();
        const { field } = game.frame();
        return {
          run,
          field: JSON.stringify({
            ...field,
            level: null,
            setup: null,
            events: null,
            aim: null,
          }),
          serving: game.serving(),
          streak: game.streak(),
          bestStreak: game.bestStreak(),
          effects: game
            .effectsInPlay()
            .map(({ capsule, seconds }) => ({ capsule, seconds })),
          fieldHeight: game.fieldHeight(),
          ballSpeedScale: game.ballSpeedScale(),
          customPercent: game.customPercent(),
          board: (view.fixture.nativeElement as HTMLElement).textContent,
        };
      };
    }

    /**
     * Packs a state, the whole one a report takes unless another is given,
     * and reads it back, then starts another run, on another level, at
     * another speed and ball's speed, as the one who loads it may have.
     */
    async function reportAndPlayOn(
      value: unknown = reports().capture().value,
    ): Promise<unknown> {
      const packed = await packState("bb1", value);
      const game = TestBed.inject(GameService);
      await sayingYes(game.changeSpeed("normal"));
      await game.startAt(SPEC_LEVEL.few);
      game.launch();
      game.setBallSpeedScale(1);
      TestBed.inject(SettingsService).update({ customPercent: 100 });
      return unpackState("bb1", packed);
    }

    /** Plays the wide level at Custom, the ball tuned, until a wide paddle is in effect, and pauses. */
    async function wideAtCustom(): Promise<void> {
      const game = TestBed.inject(GameService);
      TestBed.inject(SettingsService).update({ customPercent: 75 });
      await game.changeSpeed("custom");
      await game.startAt(SPEC_LEVEL.wide);
      game.setBallSpeedScale(0.8);
      game.launch();
      playUntil(game, launchingUnder, () => game.effectsInPlay().length > 0);
      game.pause();
    }

    /** Plays the steel level until its ball is lost, and pauses before the next is served. */
    async function lostAtSteel(): Promise<void> {
      const game = TestBed.inject(GameService);
      await game.startAt(SPEC_LEVEL.steel);
      game.launch();
      playUntil(game, awayFrom, () => game.frame().field.state === "lost");
      game.pause();
    }

    /** Plays the laser level until a bolt rises, a capsule falling, and pauses. */
    async function firingAtLaser(): Promise<void> {
      const game = TestBed.inject(GameService);
      await game.startAt(SPEC_LEVEL.laser);
      game.launch();
      playUntil(game, launchingUnder, () =>
        game.frame().field.bolts.some((bolt) => bolt.live),
      );
      game.pause();
    }

    it.each<[string, () => Promise<void>]>([
      ["a level at Custom, an effect in play", wideAtCustom],
      ["a level whose ball was lost, before the next is served", lostAtSteel],
      ["a level whose laser fires", firingAtLaser],
    ])("shows %s as it was reported, paused", async (_, play) => {
      const shown = await renderGame();
      await play();
      const reported = await shown();
      const state = await reportAndPlayOn();

      await sayingYes(reports().load(state));

      const loaded = await shown();
      expect(loaded).toEqual(reported);
      expect(loaded.run.outcome).toBe("paused");
    });

    it("plays on from a state loaded as the run reported would have", async () => {
      const game = await steelPaused();
      const packed = await packState("bb1", reports().capture().value);
      game.resume();
      playFor(game, 500, STILL);
      const played = game.frame().field.balls.map((ball) => ({ ...ball }));
      await sayingYes(reports().load(await unpackState("bb1", packed)));
      game.resume();

      playFor(game, 500, STILL);

      expect(game.frame().field.balls).toEqual(played);
    });

    it("takes up a run waiting for its first serve paused, its paddle where it was", async () => {
      const game = TestBed.inject(GameService);
      playFor(game, 20 * FRAME_MS, { ...STILL, to: 4 });
      const paddle = { ...game.frame().field.paddle };
      const state = await reportAndPlayOn();

      await sayingYes(reports().load(state));

      expect({
        outcome: game.outcome(),
        level: game.run().level,
        paddle: game.frame().field.paddle,
      }).toEqual({ outcome: "paused", level: SPEC_LEVEL.blasts, paddle });
    });

    it("takes up a state trimmed to its bricks at its level, the ball waiting on the paddle", async () => {
      await firingAtLaser();
      const game = TestBed.inject(GameService);
      game.setBallSpeedScale(1.2);
      const bricks = JSON.stringify(game.frame().field.bricks);
      const state = await reportAndPlayOn(
        reports().capture().trim?.at(0).value,
      );

      await sayingYes(reports().load(state));

      expect({
        level: game.run().level,
        outcome: game.outcome(),
        serving: game.serving(),
        scale: game.ballSpeedScale(),
        bricks: JSON.stringify(game.frame().field.bricks),
      }).toEqual({
        level: SPEC_LEVEL.laser,
        outcome: "paused",
        serving: true,
        scale: 1.2,
        bricks,
      });
    });

    it("loads the whole game-state field of a report", async () => {
      TestBed.configureTestingModule({
        providers: [provideBrickBreakerBugReports()],
      });
      await steelPaused();
      const { summary, value } = reports().capture();
      const packed = await packState("bb1", value);
      await sayingYes(TestBed.inject(GameService).startAt(SPEC_LEVEL.blasts));

      const loaded = await TestBed.inject(BugReportService).load(
        `${summary}\n\n\`\`\`\n${packed}\n\`\`\`\n`,
      );

      expect(loaded).toBe(true);
      expect(TestBed.inject(GameService).run().level).toBe(SPEC_LEVEL.steel);
    });

    it("leaves the run under way and the ball's speed where the player says no", async () => {
      await steelPaused();
      const state = await reportAndPlayOn();
      const game = TestBed.inject(GameService);
      game.setBallSpeedScale(0.8);
      const before = game.run();

      const loading = reports().load(state);
      TestBed.inject(ConfirmService).cancel();

      expect(await loading).toBe(false);
      expect({ run: game.run(), scale: game.ballSpeedScale() }).toEqual({
        run: before,
        scale: 0.8,
      });
    });

    it("refuses a state that doesn't fit, naming its part, before asking", async () => {
      const game = await steelPaused();
      const { value } = reports().capture();

      const loading = reports().load({ ...(value as object), stage: null });

      await expect(loading).rejects.toThrow(
        "The game state's stage doesn't fit this build.",
      );
      expect(TestBed.inject(ConfirmService).isOpen()).toBe(false);
      expect(game.outcome()).toBe("paused");
    });
  });
});

import { TestBed } from "@angular/core/testing";
import { playUntil } from "@fz/core/testing";
import { BUILD_INFO } from "@fz/game-ui/build_info";
import {
  BUG_REPORT_CONFIG,
  BUG_REPORT_SOURCE,
  BugReportService,
  packState,
  unpackState,
} from "@fz/game-ui/bug_report";
import { installCompressionStreams } from "@fz/game-ui/testing";
import { EFFECT_KINDS } from "../../rules/bricks/capsules";
import { CAPSULE_IDS, capsule } from "../../rules/catalog/capsules";
import { createField } from "../../rules/field/field";
import { LEVELS, type LevelEntry, parseLevel } from "../../rules/levels/levels";
import { type ReportedPlay, reportPlay } from "../../rules/run/report_state";
import { createRun, levelSeed, startLevel } from "../../rules/run/run";
import { FRIEND_INKS, TALLEST_FIELD } from "../../rules/tuning";
import {
  SPEC_LEVEL,
  SPEC_LEVELS,
  provideSpecLevels,
  under,
} from "../../testing/play";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import { BrickBreakerBugReports } from "./brick_breaker_bug_reports";
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
          { provide: BUG_REPORT_SOURCE, useExisting: BrickBreakerBugReports },
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
});

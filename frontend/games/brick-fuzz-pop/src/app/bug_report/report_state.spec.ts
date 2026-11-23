import { TestBed } from "@angular/core/testing";
import { MOST_DEPTH } from "@fz/brick-wall/rules/field";
import {
  createRun,
  landRound,
  startLevel,
  takeRound,
} from "@fz/brick-wall/rules/run";
import { FRAME_MS } from "@fz/core/testing";
import { createRandom } from "@fz/core/random";
import {
  BUG_REPORT_SOURCE,
  BugReportService,
  type BugReportSource,
  packState,
  unpackState,
} from "@fz/game-ui/bug_report";
import { installCompressionStreams } from "@fz/game-ui/testing";
import { NO_INSETS } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";
import { ConfirmService } from "@fz/ui/confirm";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { LEVELS, parseLevel } from "../../rules/levels/levels";
import { RULES, type RoundStart, playRound } from "../../rules/round/round";
import {
  type PlayedGame,
  type PlayedRound,
  type ReportedGame,
  readReportedGame,
  reportedGameOf,
} from "../../rules/run/reported_game";
import { RUN_RULES, type Run, levelOf, openingOf } from "../../rules/run/run";
import {
  RELEASE,
  SPEC_LEVELS,
  STILL,
  type SpecRound,
  playOut,
  playRoundOut,
  playUntilCard,
  provideSpecPlay,
  release,
  scriptedRounds,
} from "../../testing/play";
import { GameService, provideGame } from "../play/game.service";
import { SavedGameService } from "../play/saved_game.service";
import { REPORT_TAG, reportStateOf, summaryOf } from "./report_state";

/** A browser's user agent as long as a phone's runs, which the report's Environment lists. */
const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.135 Mobile Safari/537.36";

/** A tall board, which holds the deepest field. */
const TALL: Viewport = {
  width: 900,
  height: 2400,
  pixelRatio: 1,
  insets: NO_INSETS,
};

/** A wide, low board, which holds the shallowest field. */
const LOW: Viewport = { ...TALL, width: 1600, height: 500 };

/** Returns the game, its rounds played as a script says, over the specs' levels. */
function gameOf(...script: readonly SpecRound[]): GameService {
  TestBed.configureTestingModule({
    providers: provideSpecPlay(scriptedRounds(...script)),
  });
  return TestBed.inject(GameService);
}

/** Returns the game's state as a report takes it, as JSON. */
function reported(game: GameService): ReportedGame {
  return reportStateOf(game, SPEC_LEVELS).value as ReportedGame;
}

/** Releases a shot aimed and charged as given, with a frame of the game's. */
function shoot(game: GameService, aim: number, charge: 0 | 1 | 2): void {
  game.tick(FRAME_MS, { ...RELEASE, aim, charge });
}

describe("reportStateOf", () => {
  installCompressionStreams();

  it("takes the level's shots before the round in the air, and that round at its moment", () => {
    const game = gameOf("step");
    shoot(game, 100, 1);
    playOut(game);
    shoot(game, 400, 2);
    game.tick(FRAME_MS, STILL);

    const { game: saved, record, round } = reported(game);

    expect({
      rounds: saved.rounds,
      shots: record?.shots,
      round: round && { ...round, moment: round.moment > 0 },
    }).toEqual({
      rounds: 1,
      shots: [[100, 1]],
      round: {
        shot: [400, 2],
        boon: game.levelBoon(),
        bored: RULES.bored,
        moment: true,
        dropped: null,
      },
    });
  });

  it("takes a round in the air as it was dropped, and the shots before it as they flew", () => {
    const game = gameOf("step");
    shoot(game, 100, 1);
    playOut(game);
    release(game);
    game.tick(FRAME_MS, STILL);
    const moment = reported(game).round?.moment;

    game.drop();

    const { record, round } = reported(game);
    expect({ shots: record?.shots, dropped: round?.dropped }).toEqual({
      shots: [[100, 1]],
      dropped: moment,
    });
  });

  it("takes whether the run keeps no records", async () => {
    const game = gameOf("step");

    await game.startAt(2);

    expect(reported(game).game.tuned).toBe(true);
  });

  it("takes the record from where the level began", () => {
    const game = gameOf("step");
    const opening = reported(game).game;
    playRoundOut(game);

    const { record } = reported(game);

    expect(record?.from).toEqual(opening);
  });

  it("starts the record again as the next level begins", () => {
    const game = gameOf("step", "cleared");
    playUntilCard(game);

    game.nextLevel();

    expect(reported(game)).toEqual({
      game: expect.objectContaining({ level: 2, rounds: 0 }) as unknown,
      record: null,
      round: null,
    });
  });

  it("starts the record again as a new run begins", async () => {
    const game = gameOf("step");
    playRoundOut(game);

    const starting = game.startAt(2);
    TestBed.inject(ConfirmService).accept();
    await starting;

    expect(reported(game).record).toBeNull();
  });

  it("records a run taken up from where it stood", () => {
    const storage = new MemoryStorage();
    playRoundOut(keptIn(storage));
    TestBed.tick();
    TestBed.resetTestingModule();
    const game = keptIn(storage);
    game.resume();
    playRoundOut(game);

    const { record } = reported(game);

    expect(record?.from).toEqual(
      expect.objectContaining({
        rounds: 1,
        start: expect.anything() as unknown,
      }),
    );
  });

  it("packs a state that reads back as the game it was taken from", async () => {
    const game = gameOf("step");
    playRoundOut(game);
    shoot(game, 300, 1);
    game.tick(FRAME_MS, STILL);
    const state = reportStateOf(game, SPEC_LEVELS);

    const unpacked = await unpackState(
      REPORT_TAG,
      await packState(REPORT_TAG, state.value),
    );

    expect({
      unpacked,
      run: readReportedGame(unpacked, SPEC_LEVELS, 9).game.run,
    }).toEqual({
      unpacked: state.value,
      run: {
        ...game.report().rounds[1]?.started,
        id: 9,
        outcome: "paused",
      },
    });
  });

  it("offers the record and the round in the air to leave out", () => {
    const game = gameOf("step");
    playRoundOut(game);
    release(game);

    const { trim } = reportStateOf(game, SPEC_LEVELS);

    expect(trim?.at(0).note).toBe(
      "without the level's shots or the shot in the air",
    );
  });

  it("offers nothing to leave out of a level waiting for its first shot", () => {
    const game = gameOf("step");

    expect(reportStateOf(game, SPEC_LEVELS).trim).toBeUndefined();
  });
});

describe("summaryOf", () => {
  it("says the level, the shots, the score and the field's depth as a level is aimed", () => {
    const game = gameOf("step");
    playRoundOut(game);

    expect(summaryOf(game)).toBe(
      `Level 1 · 1 shot · Score ${String(game.score())} · ${String(game.shape().depth)} rows`,
    );
  });

  it("says the field's depth as it stands, not the one the level began on", () => {
    const game = gameOf("step");
    game.setRoom(LOW);
    playRoundOut(game);

    game.setRoom(TALL);

    expect(summaryOf(game)).toMatch(/ · 22 rows$/);
  });

  it("says a shot is in the air, counting the shots as the bar does", () => {
    const game = gameOf("step");
    release(game);

    expect(summaryOf(game)).toMatch(
      /^Level 1 · 0 shots · .* · shot in the air$/,
    );
  });

  it("says a level is cleared", () => {
    const game = gameOf("cleared");
    playUntilCard(game);

    expect(summaryOf(game)).toMatch(/ · level cleared$/);
  });

  it("says the game is over", () => {
    const game = gameOf("lost");
    playUntilCard(game);

    expect(summaryOf(game)).toMatch(/ · game over$/);
  });

  it("says every level is cleared", () => {
    const game = gameOf("cleared");
    playUntilCard(game);
    game.nextLevel();
    playUntilCard(game);
    game.nextLevel();
    playUntilCard(game);

    expect(summaryOf(game)).toMatch(/ · every level cleared$/);
  });
});

describe("the largest likely state", () => {
  installCompressionStreams();

  it("fits the report's link whole", async () => {
    stubUserAgent();
    TestBed.configureTestingModule({
      providers: [{ provide: BUG_REPORT_SOURCE, useValue: STAND_IN }],
    });
    const state = {
      summary: "Level 36 · 39 shots · Score 12,345 · 22 rows · shot in the air",
      value: reportedGameOf(largestGame(), LEVELS),
    };

    const url = await TestBed.inject(BugReportService).issueUrl(state);

    expect({
      fits: url.length <= 6000,
      whole: new URL(url).searchParams.get("game-state")?.includes("without"),
    }).toEqual({ fits: true, whole: false });
  });
});

/** Returns the game as the page starts it, the saved game made first, which keeps it in a store. */
function keptIn(storage: MemoryStorage): GameService {
  TestBed.configureTestingModule({
    providers: [
      ...provideSpecPlay(scriptedRounds("step")),
      ...provideGame(),
      provideMemoryStorage(storage),
    ],
  });
  TestBed.inject(SavedGameService);
  return TestBed.inject(GameService);
}

/** Gives the page {@link USER_AGENT}, until the test finishes. */
function stubUserAgent(): void {
  const agent = vi
    .spyOn(navigator, "userAgent", "get")
    .mockReturnValue(USER_AGENT);
  onTestFinished(() => {
    agent.mockRestore();
  });
}

/** Stands in for the game's source, with a game line and settings as long as its own. */
const STAND_IN: BugReportSource = {
  title: "Brick Fuzz Pop",
  tag: REPORT_TAG,
  game: () => "Brick Fuzz Pop · Level 36: The Great Wall",
  settings: () => [
    "Aiming: Point and hold",
    "Shot speed: Normal",
    "Speed up long shots: On",
    "Show aim guide: On",
    "Play sounds: On",
    "Fast-forward: Off",
  ],
  capture: () => ({ summary: "", value: null }),
  load: () => Promise.resolve(false),
};

/**
 * The most shots a level likely takes: a wall of the most rows, its lowest
 * broken as they come, on the deepest field.
 */
const MOST_SHOTS = 60;

/**
 * Returns the game a long report would take: the level with the most rows,
 * on the deepest field, played by {@link MOST_SHOTS} careless shots, half of
 * them dropped, each that would end it played again from where the last
 * left the wall, as a player who keeps the wall up would; its record begun
 * after its first shot, as a run taken up there would have it, and its last
 * shot in the air, dropped.
 */
function largestGame(): PlayedGame {
  const entry = LEVELS.reduce((most, each) =>
    parseLevel(each.data).rows > parseLevel(most.data).rows ? each : most,
  );
  const level = parseLevel(entry.data);
  const random = createRandom(entry.number);
  let run: Run = createRun(
    { id: 1, level: entry.number, depth: MOST_DEPTH },
    LEVELS,
    RUN_RULES,
  );
  let start: RoundStart = openingOf(run, levelOf(run, LEVELS));
  const rounds: PlayedRound[] = [];
  while (rounds.length < MOST_SHOTS) {
    const shot = {
      aim: Math.floor(random() * 657),
      charge: Math.floor(random() * 6) as 0 | 1 | 2 | 3 | 4 | 5,
    };
    const dropped = random() < 0.5 ? null : random() * 100;
    const started = startLevel(run);
    rounds.push({
      started,
      start,
      shot,
      levelBoon: level.boon,
      rules: RULES,
      dropped,
    });
    const round = playRound(
      start,
      shot,
      level.boon,
      RULES,
      dropped === null ? undefined : { stop: "drop", at: dropped },
    );
    if (round.outcome.result === "on") {
      run = landRound(takeRound(started, round.outcome, RUN_RULES), RUN_RULES);
      start = round.next;
    }
  }
  const inPlay: PlayedRound = {
    started: startLevel(run),
    start,
    shot: { aim: 328, charge: 5 },
    levelBoon: level.boon,
    rules: RULES,
    dropped: 41.123456789,
  };
  return {
    run: takeRound(
      inPlay.started,
      { points: 0, jumped: false, result: "on" },
      RUN_RULES,
    ),
    start,
    rounds: [...rounds.slice(1), inPlay],
    inPlay: true,
    moment: 52.987654321,
    tuned: false,
  };
}

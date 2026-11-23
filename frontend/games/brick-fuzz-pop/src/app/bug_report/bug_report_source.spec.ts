import { TestBed } from "@angular/core/testing";
import { lineOf, readCertificates } from "@fz/brick-wall/app/certificates";
import { MOST_DEPTH } from "@fz/brick-wall/rules/field";
import {
  createRun,
  landRound,
  startLevel,
  takeRound,
} from "@fz/brick-wall/rules/run";
import { FRAME_MS, playFor, playUntil } from "@fz/core/testing";
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
import {
  type CertifiedShot,
  readCertifiedShot,
} from "../../rules/levels/certificate";
import warmUp from "../../rules/levels/certificates/warm-up.json";
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
import type { Charge } from "../../rules/shot";
import type { Wall } from "../../rules/wall/wall";
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
import type { BoardCard } from "../board/board_card.component";
import { DebugService } from "../debug/debug.service";
import { GameService, provideGame } from "../play/game.service";
import { SavedGameService } from "../play/saved_game.service";
import { type Settings, SettingsService } from "../settings/settings.service";
import type { RoundPlayer } from "../tokens";
import {
  BrickFuzzPopReports,
  REPORT_TAG,
  provideBugReports,
} from "./bug_report_source";

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

/** Returns the source the bug reports are handed, over the specs' levels, its rounds played by the rules themselves. */
function reports(): BrickFuzzPopReports {
  TestBed.configureTestingModule({
    providers: [...provideSpecPlay(playRound), ...provideBugReports()],
  });
  return TestBed.inject(BrickFuzzPopReports);
}

/** Returns the game, its rounds played as a script says, over the specs' levels. */
function gameOf(...script: readonly SpecRound[]): GameService {
  TestBed.configureTestingModule({
    providers: provideSpecPlay(scriptedRounds(...script)),
  });
  return TestBed.inject(GameService);
}

/** Returns the game's state as a report takes it, as JSON. */
function reported(): ReportedGame {
  return TestBed.inject(BrickFuzzPopReports).capture().value as ReportedGame;
}

/** Releases a shot aimed and charged as given, with a frame of the game's. */
function shootAt(game: GameService, aim: number, charge: 0 | 1 | 2): void {
  game.tick(FRAME_MS, { ...RELEASE, aim, charge });
}

/** Returns the game over the specs' levels, its rounds played by a round player, the rules themselves unless given another, on a board. */
function gameOn(room: Viewport, play: RoundPlayer = playRound): GameService {
  TestBed.configureTestingModule({ providers: provideSpecPlay(play) });
  const game = TestBed.inject(GameService);
  game.setRoom(room);
  return game;
}

/** A certificate's line of three shots or more. */
type LongLine = readonly [
  CertifiedShot,
  CertifiedShot,
  CertifiedShot,
  ...CertifiedShot[],
];

/**
 * Returns the first level's certificate on the field's depth: shots that
 * keep it standing until the last clears it, three at least.
 */
function lineFor(game: GameService): LongLine {
  const [first, second, third, ...rest] =
    lineOf(
      readCertificates(warmUp, readCertifiedShot),
      "hello-wall",
      game.shape().depth,
    ) ?? [];
  if (!first || !second || !third) {
    throw new Error(
      "No certificate of three shots holds the first level here.",
    );
  }
  return [first, second, third, ...rest];
}

/** Releases a certificate's shot, with a frame of the game's. */
function shoot(game: GameService, [aim, charge]: CertifiedShot): void {
  game.tick(FRAME_MS, { ...RELEASE, aim, charge: charge as Charge });
}

/** Lands a certificate's shot at once, as the page hidden does, then goes on. */
function landed(game: GameService, shot: CertifiedShot): void {
  shoot(game, shot);
  game.lookAway("hidden");
  game.resume();
}

/** Describes what the game shows, as the specs hold a load to what was reported. */
interface Shown {
  readonly level: number;
  readonly rounds: number;
  readonly score: number;
  readonly phase: string;
  readonly depth: number;
  readonly start: RoundStart;
  readonly wall: Wall;
  readonly balls: readonly unknown[];
  readonly card: BoardCard | null;
  readonly droppable: boolean;
}

/** Returns what the game shows, each fuzzball's place to nine places, as the specs hold a load to what was reported. */
function shown(game: GameService): Shown {
  const { wall, balls } = game.view();
  return {
    level: game.run().level,
    rounds: game.rounds(),
    score: game.score(),
    phase: game.phase(),
    depth: game.shape().depth,
    start: game.start(),
    wall,
    balls: balls.map(({ ball, x, y }) => ({
      ball,
      x: x.toFixed(9),
      y: y.toFixed(9),
    })),
    card: game.boardCard(),
    droppable: game.droppable(),
  };
}

/** Describes a game reported: its state packed, and what it showed. */
interface Reported {
  readonly text: string;
  readonly value: ReportedGame;
  readonly shown: Shown;
}

/**
 * Returns a game's state as a report packs it and what it showed, paused as
 * the settings drawer leaves it, then readies the next game's TestBed, as a
 * page loaded afresh.
 */
async function reportOf(game: GameService): Promise<Reported> {
  game.pause();
  const value = reportedGameOf(game.report(), SPEC_LEVELS);
  const reported = {
    text: await packState(REPORT_TAG, value),
    value,
    shown: shown(game),
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideMemoryStorage()] });
  return reported;
}

/** Resolves to what a load threw, or to nothing where it didn't. */
async function problemOf(loading: Promise<boolean>): Promise<string> {
  try {
    await loading;
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** Loads a packed state into the game, as the debug menu's loader does, resolving to whether it did. */
async function load(text: string): Promise<boolean> {
  return TestBed.inject(BrickFuzzPopReports).load(
    await unpackState(REPORT_TAG, text),
  );
}

describe("BrickFuzzPopReports", () => {
  it("is the source the bug reports are handed", () => {
    const source = reports();

    expect(TestBed.inject(BUG_REPORT_SOURCE)).toBe(source);
  });

  it("files a report under the game's name, its state under its tag", () => {
    const source = reports();

    expect({ title: source.title, tag: source.tag }).toEqual({
      title: "Brick Fuzz Pop",
      tag: REPORT_TAG,
    });
  });

  it("names the level in play", () => {
    const source = reports();

    expect(source.game()).toBe("Brick Fuzz Pop · Level 1: Hello, wall");
  });

  it("lists the settings as the drawer and the bar word them", () => {
    const source = reports();

    expect(source.settings()).toEqual([
      "Aiming: Point and hold",
      "Shot speed: Normal",
      "Speed up long shots: On",
      "Show aim guide: On",
      "Play sounds: On",
      "Fast-forward: Off",
    ]);
  });

  it.each<readonly [Partial<Settings>, number, string]>([
    [{ aiming: "pullBack" }, 0, "Aiming: Pull back"],
    [{ flightSpeed: "fast" }, 1, "Shot speed: Fast"],
    [{ speedUpLongFlights: false }, 2, "Speed up long shots: Off"],
    [{ guide: false }, 3, "Show aim guide: Off"],
    [{ sound: false }, 4, "Play sounds: Off"],
    [{ fastForward: true }, 5, "Fast-forward: On"],
  ])("lists %o as the player changed it", (changed, index, line) => {
    const source = reports();
    const before = source.settings();
    TestBed.inject(SettingsService).update(changed);

    expect(source.settings()).toEqual(
      before.map((each, at) => (at === index ? line : each)),
    );
  });

  it("adds what the debug menu has moved, as its controls name it", () => {
    const source = reports();
    const debug = TestBed.inject(DebugService);
    debug.setDepth(13);
    debug.tuning.tune("bored", 300);
    debug.tuning.tune("longFlightMs", 2500);

    expect(source.settings().slice(6)).toEqual([
      "The field's depth: 13 rows (debug)",
      "A long flight speeds up after: 2.5 s (debug)",
      "Bored after: 300 units (debug)",
    ]);
  });

  it("takes the game's state from the game itself, as the game keeps it", () => {
    const source = reports();
    const game = TestBed.inject(GameService);
    playRoundOut(game);

    const { value } = source.capture();

    expect(value).toEqual(reportedGameOf(game.report(), SPEC_LEVELS));
  });

  it("puts a state it took back in play, paused and off the record", async () => {
    const source = reports();
    const game = TestBed.inject(GameService);
    playRoundOut(game);
    const { value } = source.capture();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideMemoryStorage()] });
    const fresh = reports();

    const loaded = await fresh.load(value);

    const taken = TestBed.inject(GameService);
    expect({
      loaded,
      rounds: taken.rounds(),
      outcome: taken.outcome(),
      tuned: taken.tuned(),
    }).toEqual({ loaded: true, rounds: 1, outcome: "paused", tuned: true });
  });
});

describe("the state taken", () => {
  installCompressionStreams();

  it("takes the level's shots before the round in the air, and that round at its moment", () => {
    const game = gameOf("step");
    shootAt(game, 100, 1);
    playOut(game);
    shootAt(game, 400, 2);
    game.tick(FRAME_MS, STILL);

    const { game: saved, record, round } = reported();

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
    shootAt(game, 100, 1);
    playOut(game);
    release(game);
    game.tick(FRAME_MS, STILL);
    const moment = reported().round?.moment;

    game.drop();

    const { record, round } = reported();
    expect({ shots: record?.shots, dropped: round?.dropped }).toEqual({
      shots: [[100, 1]],
      dropped: moment,
    });
  });

  it("takes whether the run keeps no records", async () => {
    const game = gameOf("step");

    await game.startAt(2);

    expect(reported().game.tuned).toBe(true);
  });

  it("takes the record from where the level began", () => {
    const game = gameOf("step");
    const opening = reported().game;
    playRoundOut(game);

    const { record } = reported();

    expect(record?.from).toEqual(opening);
  });

  it("starts the record again as the next level begins", () => {
    const game = gameOf("step", "cleared");
    playUntilCard(game);

    game.nextLevel();

    expect(reported()).toEqual({
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

    expect(reported().record).toBeNull();
  });

  it("records a run taken up from where it stood", () => {
    const storage = new MemoryStorage();
    playRoundOut(keptIn(storage));
    TestBed.tick();
    TestBed.resetTestingModule();
    const game = keptIn(storage);
    game.resume();
    playRoundOut(game);

    const { record } = reported();

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
    shootAt(game, 300, 1);
    game.tick(FRAME_MS, STILL);
    const state = TestBed.inject(BrickFuzzPopReports).capture();

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

    const { trim } = TestBed.inject(BrickFuzzPopReports).capture();

    expect(trim?.at(0).note).toBe(
      "without the level's shots or the shot in the air",
    );
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

describe("a state loaded", () => {
  installCompressionStreams();

  it("shows a level aimed as it was reported, paused, on the field's depth", async () => {
    const played = gameOn(TALL);
    const line = lineFor(played);
    landed(played, line[0]);
    landed(played, line[1]);
    const reported = await reportOf(played);
    const game = gameOn(LOW);

    await load(reported.text);

    expect({ shown: shown(game), outcome: game.outcome() }).toEqual({
      shown: reported.shown,
      outcome: "paused",
    });
  });

  it("shows a shot in the air at the moment it was reported, paused", async () => {
    const played = gameOn(TALL);
    const line = lineFor(played);
    landed(played, line[0]);
    shoot(played, line[1]);
    playFor(played, 500, STILL);
    const reported = await reportOf(played);
    const game = gameOn(LOW);

    await load(reported.text);

    expect({
      shown: shown(game),
      outcome: game.outcome(),
      phase: game.phase(),
    }).toEqual({
      shown: reported.shown,
      outcome: "paused",
      phase: "flying",
    });
  });

  it("flies a shot in the air to the moment reported, whatever pace the game plays at", async () => {
    const played = gameOn(TALL);
    const line = lineFor(played);
    landed(played, line[0]);
    shoot(played, line[1]);
    playFor(played, 1500, STILL);
    const reported = await reportOf(played);
    const game = gameOn(LOW);
    TestBed.inject(SettingsService).update({
      flightSpeed: "fast",
      fastForward: true,
      speedUpLongFlights: true,
    });
    TestBed.inject(DebugService).tuning.tune("longFlightMs", 1000);

    await load(reported.text);

    expect(shown(game)).toEqual(reported.shown);
  });

  it("shows a dropped shot as it was reported, its fuzzballs coming down", async () => {
    const played = gameOn(TALL);
    const line = lineFor(played);
    landed(played, line[0]);
    shoot(played, line[1]);
    playFor(played, 300, STILL);
    played.drop();
    played.tick(FRAME_MS, STILL);
    const reported = await reportOf(played);
    const game = gameOn(LOW);

    await load(reported.text);

    expect({ shown: shown(game), phase: game.phase() }).toEqual({
      shown: reported.shown,
      phase: "flying",
    });
  });

  it("opens the card of a level a shot cleared once it lands, as it was reported", async () => {
    const played = gameOn(TALL);
    const line = lineFor(played);
    for (const shot of line.slice(0, -1)) landed(played, shot);
    shoot(played, line.at(-1) ?? line[0]);
    playUntil(
      played,
      () => STILL,
      () => played.card() !== null,
    );
    const reported = await reportOf(played);
    const game = gameOn(LOW);

    await load(reported.text);
    playUntil(
      game,
      () => STILL,
      () => game.card() !== null,
    );

    expect(game.boardCard()).toEqual(reported.shown.card);
  });

  it("loads a level aimed while the board isn't drawn", async () => {
    const played = gameOn(TALL);
    landed(played, lineFor(played)[0]);
    const reported = await reportOf(played);
    const game = gameOn(LOW);
    game.setDrawn(false);

    await load(reported.text);

    expect(shown(game)).toEqual(reported.shown);
  });

  it("takes a loaded game again as it was reported, its shots and its shot in the air", async () => {
    const played = gameOn(TALL);
    const line = lineFor(played);
    landed(played, line[0]);
    landed(played, line[1]);
    shoot(played, line[2]);
    playFor(played, 300, STILL);
    played.drop();
    const reported = await reportOf(played);
    gameOn(LOW);

    await load(reported.text);

    expect(TestBed.inject(BrickFuzzPopReports).capture().value).toEqual({
      ...reported.value,
      game: { ...reported.value.game, tuned: true },
      record: reported.value.record && {
        ...reported.value.record,
        from: { ...reported.value.record.from, tuned: true },
      },
    });
  });

  it("drops a shot in the air and flies it on at the very moments reported, where a time at the flight's pace would round them", async () => {
    const played = gameOn(TALL);
    const line = lineFor(played);
    landed(played, line[0]);
    shoot(played, line[1]);
    // A second of flight comes to a moment whose time at the normal pace,
    // played back, misses it.
    playFor(played, 1000, STILL);
    played.drop();
    playFor(played, FRAME_MS, STILL);
    const reported = await reportOf(played);
    const game = gameOn(LOW);

    await load(reported.text);

    expect(reportedGameOf(game.report(), SPEC_LEVELS).round).toEqual(
      reported.value.round,
    );
  });

  it("loads a report without its shots from the run and the wall it keeps", async () => {
    const played = gameOn(TALL);
    const line = lineFor(played);
    landed(played, line[0]);
    landed(played, line[1]);
    played.pause();
    const before = shown(played);
    const text = await packState(REPORT_TAG, {
      ...reportedGameOf(played.report(), SPEC_LEVELS),
      record: null,
    });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideMemoryStorage()] });
    const game = gameOn(LOW);

    await load(text);

    expect(shown(game)).toEqual(before);
  });

  it("plays the level's shots through the game's round player", async () => {
    const played = gameOn(TALL);
    landed(played, lineFor(played)[0]);
    const reported = await reportOf(played);
    const ending: RoundPlayer = (...round) => {
      const lost = playRound(...round);
      return { ...lost, outcome: { ...lost.outcome, result: "lost" } };
    };
    gameOn(LOW, ending);

    await expect(load(reported.text)).rejects.toThrow(
      "Shot 1 of the game state ends the level in this build.",
    );
  });

  it("names the part of a state that doesn't fit this build, asking nothing", async () => {
    const game = gameOn(LOW);
    landed(game, lineFor(game)[0]);
    const confirm = TestBed.inject(ConfirmService);

    const loading = TestBed.inject(BrickFuzzPopReports).load({
      game: { levelId: "pips" },
      record: null,
      round: null,
    });
    const asked = confirm.isOpen();
    confirm.cancel();

    expect({ problem: await problemOf(loading), asked }).toEqual({
      problem: "The game state names a level this build doesn't have.",
      asked: false,
    });
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

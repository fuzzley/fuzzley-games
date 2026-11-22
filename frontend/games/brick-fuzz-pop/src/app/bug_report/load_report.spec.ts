import { TestBed } from "@angular/core/testing";
import { FRAME_MS, playFor, playUntil } from "@fz/core/testing";
import { packState, unpackState } from "@fz/game-ui/bug_report";
import { installCompressionStreams } from "@fz/game-ui/testing";
import { NO_INSETS } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";
import { ConfirmService } from "@fz/ui/confirm";
import { provideMemoryStorage } from "@fz/ui/testing";
import type { CertifiedShot } from "../../rules/levels/certificate";
import warmUp from "../../rules/levels/certificates/warm-up.json";
import { type RoundStart, playRound } from "../../rules/round/round";
import type { Charge } from "../../rules/shot";
import type { Wall } from "../../rules/wall/wall";
import {
  type ReportedGame,
  reportedGameOf,
} from "../../rules/run/reported_game";
import {
  RELEASE,
  SPEC_LEVELS,
  STILL,
  provideSpecPlay,
} from "../../testing/play";
import { lineOf, readCertificates } from "../../view/debug/certificates";
import type { BoardCard } from "../board/board_card.component";
import { DebugService } from "../debug/debug.service";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import type { RoundPlayer } from "../tokens";
import { loadReport } from "./load_report";
import { REPORT_TAG, reportStateOf } from "./report_state";

/** A tall board, which holds the deepest field. */
const TALL: Viewport = {
  width: 900,
  height: 2400,
  pixelRatio: 1,
  insets: NO_INSETS,
};

/** A wide, low board, which holds the shallowest field. */
const LOW: Viewport = { ...TALL, width: 1600, height: 500 };

/** Returns the game over the specs' levels, its rounds played by the rules themselves, on a board. */
function gameOn(room: Viewport): GameService {
  TestBed.configureTestingModule({ providers: provideSpecPlay(playRound) });
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
    lineOf(readCertificates(warmUp), "hello-wall", game.shape().depth) ?? [];
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

/** Loads a packed state into a game, as the debug menu's loader does, resolving to whether it did. */
async function load(game: GameService, text: string): Promise<boolean> {
  return loadReport(
    await unpackState(REPORT_TAG, text),
    game,
    SPEC_LEVELS,
    playRound,
  );
}

describe("loadReport", () => {
  installCompressionStreams();

  it("shows a level aimed as it was reported, paused, on the field's depth", async () => {
    const played = gameOn(TALL);
    const line = lineFor(played);
    landed(played, line[0]);
    landed(played, line[1]);
    const reported = await reportOf(played);
    const game = gameOn(LOW);

    await load(game, reported.text);

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

    await load(game, reported.text);

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

    await load(game, reported.text);

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

    await load(game, reported.text);

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

    await load(game, reported.text);
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

    await load(game, reported.text);

    expect(shown(game)).toEqual(reported.shown);
  });

  it("refuses a shot in the air while the board isn't drawn, asking nothing", async () => {
    const played = gameOn(TALL);
    const line = lineFor(played);
    landed(played, line[0]);
    shoot(played, line[1]);
    const reported = await reportOf(played);
    const game = gameOn(LOW);
    landed(game, lineFor(game)[0]);
    game.setDrawn(false);
    const state = await unpackState(REPORT_TAG, reported.text);
    const confirm = TestBed.inject(ConfirmService);

    const loading = loadReport(state, game, SPEC_LEVELS, playRound);
    const asked = confirm.isOpen();
    confirm.cancel();

    expect({ problem: await problemOf(loading), asked }).toEqual({
      problem: "The board isn't drawn yet. Try again once it shows.",
      asked: false,
    });
  });

  it("forces the field's depth to the one the reported round starts on", async () => {
    const played = gameOn(TALL);
    landed(played, lineFor(played)[0]);
    const depth = played.shape().depth;
    const reported = await reportOf(played);
    const game = gameOn(LOW);

    await load(game, reported.text);

    expect(TestBed.inject(DebugService).depth()).toBe(depth);
  });

  it("takes a loaded game up as a run of its own, under a new id", async () => {
    const played = gameOn(TALL);
    landed(played, lineFor(played)[0]);
    const reported = await reportOf(played);
    const game = gameOn(LOW);
    const before = game.run().id;

    await load(game, reported.text);

    expect(game.run().id).toBeGreaterThan(before);
  });

  it("plays a loaded game off the record", async () => {
    const played = gameOn(TALL);
    landed(played, lineFor(played)[0]);
    const reported = await reportOf(played);
    const game = gameOn(LOW);

    await load(game, reported.text);

    expect(game.tuned()).toBe(true);
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
    const game = gameOn(LOW);

    await load(game, reported.text);

    expect(reportStateOf(game, SPEC_LEVELS).value).toEqual({
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

    await load(game, reported.text);

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

    await load(game, text);

    expect(shown(game)).toEqual(before);
  });

  it("asks first where a run in progress would be lost, and leaves it be if the player says no", async () => {
    const played = gameOn(TALL);
    landed(played, lineFor(played)[0]);
    const reported = await reportOf(played);
    const game = gameOn(LOW);
    landed(game, lineFor(game)[0]);
    const before = shown(game);
    const state = await unpackState(REPORT_TAG, reported.text);

    const loading = loadReport(state, game, SPEC_LEVELS, playRound);
    const confirm = TestBed.inject(ConfirmService);
    const asked = confirm.prompt();
    confirm.cancel();

    expect({
      asked,
      loaded: await loading,
      shown: shown(game),
    }).toEqual({
      asked: expect.objectContaining({
        title: "Load this game?",
        message: "You'll lose the game in progress.",
        confirmLabel: "Load",
        tone: "danger",
      }) as unknown,
      loaded: false,
      shown: before,
    });
  });

  it("plays the level's shots through the round player handed", async () => {
    const played = gameOn(TALL);
    landed(played, lineFor(played)[0]);
    const reported = await reportOf(played);
    const game = gameOn(LOW);
    const ending: RoundPlayer = (...round) => {
      const lost = playRound(...round);
      return { ...lost, outcome: { ...lost.outcome, result: "lost" } };
    };

    await expect(
      loadReport(
        await unpackState(REPORT_TAG, reported.text),
        game,
        SPEC_LEVELS,
        ending,
      ),
    ).rejects.toThrow("Shot 1 of the game state ends the level in this build.");
  });

  it("names the part of a state that doesn't fit this build, asking nothing", async () => {
    const game = gameOn(LOW);
    landed(game, lineFor(game)[0]);
    const confirm = TestBed.inject(ConfirmService);

    const loading = loadReport(
      { game: { levelId: "pips" }, record: null, round: null },
      game,
      SPEC_LEVELS,
      playRound,
    );
    const asked = confirm.isOpen();
    confirm.cancel();

    expect({ problem: await problemOf(loading), asked }).toEqual({
      problem: "The game state names a level this build doesn't have.",
      asked: false,
    });
  });
});

import { TestBed } from "@angular/core/testing";
import { FRAME_MS, playFor, playUntil } from "@fz/core/testing";
import { installFakeViewport } from "@fz/game-ui/testing";
import { NO_INSETS } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";
import { AnnouncerService } from "@fz/ui/announcer";
import { ConfirmService } from "@fz/ui/confirm";
import { paintRoles } from "@fz/style/testing";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { ThemeService } from "@fz/ui/theme";
import { type Round, RULES } from "../../rules/round/round";
import { tallyOf } from "../../rules/run/scoring";
import { guideOf } from "../../rules/flight/guide";
import { GUIDE_PAST_TURN } from "../../rules/tuning";
import {
  describeCleared,
  describeEnd,
  describeLevel,
  describePause,
  describeRound,
  describeRows,
  describeShot,
  describeTakenUp,
} from "../../rules/run/describe";
import { levelOf, openingOf } from "../../rules/run/run";
import {
  type TakenUp,
  restoreGame,
  saveGame,
} from "../../rules/run/saved_game";
import { parOf } from "../../rules/run/stars";
import type { Line } from "../../rules/levels/certificate";
import type { Pictures } from "../../scene/pictures";
import {
  FREED_INK,
  RELEASE,
  SPEC_LEVELS,
  SPEC_POINTS,
  STILL,
  type SpecRound,
  playOut,
  playRoundOut,
  playUntilCard,
  provideSpecPlay,
  release,
  scriptedRounds,
} from "../../testing/play";
import { PALETTES } from "../../testing/roles";
import { FIELD_ROLES, wallPalette } from "../../view/colors/palette";
import {
  type FieldMetrics,
  fieldMetrics,
  fieldShape,
} from "../../view/field/field_metrics";
import { FLIGHT_PACE } from "../../view/round_play";
import { DebugService } from "../debug/debug.service";
import { BY_POINTER } from "../../view/steering/aiming";
import { waitingRows } from "../panels/panels";
import { SettingsService } from "../settings/settings.service";
import { ProgressService } from "../stats/progress.service";
import { StatsService } from "../stats/stats.service";
import type { RoundPlayer } from "../tokens";
import { GameService, provideGame } from "./game.service";
import { KEPT_GAME, SavedGameService } from "./saved_game.service";

/** A tall canvas, which holds the deepest field. */
const TALL: Viewport = {
  width: 900,
  height: 2400,
  pixelRatio: 1,
  insets: NO_INSETS,
};

/** A wide, low canvas, which holds the shallowest field. */
const LOW: Viewport = { ...TALL, width: 1600, height: 500 };

/** A canvas with no room in it, as a hidden board's is. */
const HIDDEN: Viewport = { ...TALL, width: 0, height: 0 };

/** The first spec level's id, by which its records are kept. */
const FIRST_ID = SPEC_LEVELS[0]?.data.id ?? "";

/** The second spec level's id. */
const SECOND_ID = SPEC_LEVELS[1]?.data.id ?? "";

/** Returns the game, its rounds played as a script says, over the specs' levels. */
function gameOf(...script: readonly SpecRound[]): GameService {
  return gameWith(scriptedRounds(...script));
}

/** Returns the game, its rounds played by a round player, over the specs' levels. */
function gameWith(rounds: RoundPlayer): GameService {
  TestBed.configureTestingModule({ providers: provideSpecPlay(rounds) });
  return TestBed.inject(GameService);
}

/** Gives the next game of a test a TestBed of its own, and a store of its own, as each test's is. */
function afresh(): void {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideMemoryStorage()] });
}

/** Returns the game as the page starts it, the saved game made first, which keeps it in a store. */
function keptIn(storage: MemoryStorage): GameService {
  TestBed.configureTestingModule({
    providers: [
      ...provideSpecPlay(),
      ...provideGame(),
      provideMemoryStorage(storage),
    ],
  });
  TestBed.inject(SavedGameService);
  return TestBed.inject(GameService);
}

/** Returns what the live region last said. */
function said(): string {
  return TestBed.inject(AnnouncerService).message();
}

/** Returns the game with every spec level cleared, the run won, its result card open. */
function won(): GameService {
  const game = carded("cleared");
  game.nextLevel();
  playUntilCard(game);
  game.nextLevel();
  playUntilCard(game);
  return game;
}

/** Returns the game with its first level played until its card opens, its rounds as a script says. */
function carded(...script: readonly SpecRound[]): GameService {
  const game = gameOf(...script);
  playUntilCard(game);
  return game;
}

/** Lets every promise the game is waiting on settle. */
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Answers the question a new game asks, as the player would. */
async function answered(
  starting: Promise<boolean>,
  yes: boolean,
): Promise<boolean> {
  const confirm = TestBed.inject(ConfirmService);
  if (yes) confirm.accept();
  else confirm.cancel();
  return starting;
}

/** Describes a game and every round it asked the rules for, as the round player was handed it. */
interface AskingGame {
  readonly game: GameService;
  readonly asked: readonly Parameters<RoundPlayer>[];
}

/** Returns the game, its rounds played as a script says, keeping what it asked of each. */
function askingGameOf(...script: readonly SpecRound[]): AskingGame {
  const asked: Parameters<RoundPlayer>[] = [];
  const rounds = scriptedRounds(...script);
  const game = gameWith((start, shot, boon, rules) => {
    asked.push([start, shot, boon, rules]);
    return rounds(start, shot, boon);
  });
  return { game, asked };
}

/** Returns the game, its rounds played as a script says, its field set to a depth by the debug menu. */
function onDepth(depth: number, ...script: readonly SpecRound[]): GameService {
  const game = gameOf(...script);
  game.setRoom(TALL);
  TestBed.inject(DebugService).setDepth(depth);
  TestBed.tick();
  return game;
}

/** A certificate's line of two shots. */
const LINE: Line = [
  [100, 2],
  [300, 4],
];

/** The shots {@link LINE} lets fly. */
const LINE_SHOTS = [
  { aim: 100, charge: 2 },
  { aim: 300, charge: 4 },
];

/** Releases the round aimed and returns it, failing the spec if none flies. */
function released(game: GameService): Round {
  release(game);
  const round = game.round();
  if (round === null) throw new Error("No round flies.");
  return round;
}

/** Returns a game's run as storage would take it up, under an id, failing the spec if it would not. */
function kept(game: GameService, id: number, tuned = false): TakenUp {
  const saved = saveGame(game.run(), game.nextStart(), SPEC_LEVELS, { tuned });
  const taken = restoreGame(saved, SPEC_LEVELS, id);
  if (taken === null) throw new Error("Storage would not take the run up.");
  return taken;
}

/**
 * Returns a round player whose flights are a script's slowed down, every
 * moment of each times a factor, so its fuzzballs fly the same paths that
 * many times as long.
 */
function slowed(rounds: RoundPlayer, factor: number): RoundPlayer {
  return (start, shot, boon) => {
    const round = rounds(start, shot, boon);
    const { flight } = round;
    const events = flight.events.map((event) => ({
      ...event,
      at: event.at * factor,
    }));
    const tracks = flight.tracks.map((track) => ({
      ...track,
      waypoints: track.waypoints.map((point) => ({
        ...point,
        at: point.at * factor,
      })),
    }));
    const length = flight.length * factor;
    return { ...round, flight: { ...flight, events, tracks, length } };
  };
}

/**
 * Returns whether a flight some 18 seconds long at Normal is still in the
 * air a while after its release, long flights sped up or not.
 */
function flyingAfter(ms: number, speedUpLongFlights: boolean): boolean {
  const game = gameWith(slowed(scriptedRounds("step"), 20));
  TestBed.inject(SettingsService).update({ speedUpLongFlights });
  release(game);
  playFor(game, ms, STILL);
  const flying = game.flying();
  afresh();
  return flying;
}

/** Returns where the player's fuzzball is drawn in the air, across and up, to a millionth of a unit. */
function placeOf(game: GameService): readonly string[] {
  const ball = game.view().balls[0];
  return ball ? [ball.x.toFixed(6), ball.y.toFixed(6)] : [];
}

/** Releases the round aimed and returns each score the bar showed until its flight landed, in order. */
function scoresUntilLanded(game: GameService): number[] {
  const scores: number[] = [];
  release(game);
  playUntil(
    game,
    () => STILL,
    () => {
      if (game.score() !== scores.at(-1)) scores.push(game.score());
      return !game.flying();
    },
  );
  return scores;
}

/** Plays the round in the air out and returns each thing said on the way, in order. */
function heardPlayingOut(game: GameService): string[] {
  const heard: string[] = [];
  playUntil(
    game,
    () => STILL,
    () => {
      const words = said();
      if (words !== "" && words !== heard.at(-1)) heard.push(words);
      return game.phase() === "aiming";
    },
  );
  return heard;
}

describe("GameService", () => {
  describe("a new run", () => {
    it("waits on the first level for its first shot, with no rounds and no points", () => {
      const game = gameOf();

      expect({
        outcome: game.outcome(),
        level: game.level().number,
        rounds: game.rounds(),
        score: game.score(),
        phase: game.phase(),
      }).toEqual({
        outcome: "ready",
        level: 1,
        rounds: 0,
        score: 0,
        phase: "aiming",
      });
    });

    it("lays its level out on the field's depth, with the level's par on it", () => {
      const game = gameOf();
      const { depth } = game.shape();

      expect({ start: game.start(), par: game.par() }).toEqual({
        start: openingOf({ depth }, levelOf({ level: 1 }, SPEC_LEVELS)),
        par: parOf(FIRST_ID, depth),
      });
    });

    it("aims its first round in the view", () => {
      const game = gameOf();

      expect({ wall: game.view().wall, x: game.waitingX() }).toEqual({
        wall: game.start().wall,
        x: game.start().x,
      });
    });

    it("is in no progress a new game would lose", () => {
      const game = gameOf();

      expect(game.inProgress()).toBe(false);
    });
  });

  describe("the room", () => {
    it("lays a run with no round played out again on the room's depth, its par with it", () => {
      const game = gameOf();
      const { depth } = fieldShape(TALL);

      game.setRoom(TALL);

      expect({
        shape: game.shape(),
        depth: game.run().depth,
        start: game.start(),
        aimed: game.view().wall,
      }).toEqual({
        shape: fieldShape(TALL),
        depth,
        start: openingOf({ depth }, levelOf({ level: 1 }, SPEC_LEVELS)),
        aimed: game.start().wall,
      });
    });

    it("keeps the shape it has for a room with no area", () => {
      const game = gameOf();
      const before = game.shape();

      game.setRoom(HIDDEN);

      expect(game.shape()).toBe(before);
    });

    it("changes nothing for a room of the same shape", () => {
      const game = gameOf();
      game.setRoom(TALL);
      const [run, start, shape] = [game.run(), game.start(), game.shape()];

      game.setRoom({ ...TALL, width: TALL.width + 1 });

      expect({
        sameRun: game.run() === run,
        sameStart: game.start() === start,
        sameShape: game.shape() === shape,
      }).toEqual({ sameRun: true, sameStart: true, sameShape: true });
    });

    it("takes a room of the same depth at its new size", () => {
      const game = gameOf();
      game.setRoom(TALL);
      const twice = { ...TALL, width: 2 * TALL.width, height: 2 * TALL.height };

      game.setRoom(twice);

      expect([game.shape(), game.shape().depth]).toEqual([
        fieldShape(twice),
        fieldShape(TALL).depth,
      ]);
    });

    it("keeps a level's wall where it stands from the floor once a round is played, and the depth it began on", () => {
      const game = gameOf("step");
      game.setRoom(TALL);
      playRoundOut(game);
      const start = game.start();

      game.setRoom(LOW);

      expect({ start: game.start(), began: game.run().depth }).toEqual({
        start: { ...start, depth: fieldShape(LOW).depth },
        began: fieldShape(TALL).depth,
      });
    });

    it("waits for the round in the air to come to rest", () => {
      const game = gameOf("step");
      game.setRoom(TALL);
      release(game);

      game.setRoom(LOW);

      expect(game.shape()).toEqual(fieldShape(TALL));
    });

    it("lays the next round out on the room's depth once the round in the air comes to rest", () => {
      const game = gameOf("step");
      game.setRoom(TALL);
      release(game);
      game.setRoom(LOW);

      playOut(game);

      expect([game.shape(), game.start().depth]).toEqual([
        fieldShape(LOW),
        fieldShape(LOW).depth,
      ]);
    });

    it("lays the next level out on the room's depth", () => {
      const game = carded("cleared");
      game.setRoom(TALL);

      game.nextLevel();

      expect([game.shape(), game.run().depth, game.start().depth]).toEqual([
        fieldShape(TALL),
        fieldShape(TALL).depth,
        fieldShape(TALL).depth,
      ]);
    });

    it("begins a level after a cleared one again on the room's depth, its par with it, while no round is played", () => {
      const game = carded("cleared");
      game.nextLevel();
      const score = game.score();
      const { depth } = fieldShape(TALL);

      game.setRoom(TALL);

      expect({
        score: game.score(),
        depth: game.run().depth,
        par: game.par(),
        start: game.start(),
      }).toEqual({
        score,
        depth,
        par: parOf(SECOND_ID, depth),
        start: openingOf({ depth }, levelOf({ level: 2 }, SPEC_LEVELS)),
      });
    });
  });

  describe("releasing a round", () => {
    it("begins the level, the run counting the round and scoring it at once", () => {
      const game = gameOf("step");

      release(game);

      expect({
        outcome: game.outcome(),
        rounds: game.run().rounds,
        score: game.run().score,
        phase: game.phase(),
      }).toEqual({
        outcome: "playing",
        rounds: 1,
        score: SPEC_POINTS.step,
        phase: "flying",
      });
    });

    it("plays the round through the rules from where it starts, at the shot let fly, with the level's boon, on the rules' own numbers", () => {
      const asked: Parameters<RoundPlayer>[] = [];
      const rounds = scriptedRounds("step");
      const game = gameWith((start, shot, boon, rules) => {
        asked.push([start, shot, boon, rules]);
        return rounds(start, shot, boon);
      });
      const start = game.start();

      game.tick(FRAME_MS, { ...RELEASE, aim: 100, charge: 3 });

      expect(asked).toEqual([
        [start, { aim: 100, charge: 3 }, "hot", { bored: RULES.bored }],
      ]);
    });

    it("keeps the round's next start with the run, so the saved game keeps both at once", () => {
      const game = gameOf("step");

      release(game);

      expect(game.nextStart()).toBe(game.round()?.next);
    });

    it("plays the round's flight back in the view", () => {
      const game = gameOf("step");

      release(game);

      expect(game.view().balls).toHaveLength(1);
    });

    it("lets no other shot fly while a round is in the air", () => {
      const game = gameOf();
      release(game);

      release(game);

      expect(game.run().rounds).toBe(1);
    });

    it("lets no shot fly while the level is paused", () => {
      const game = gameOf("step");
      playRoundOut(game);
      game.pause();

      release(game);

      expect([game.rounds(), game.phase()]).toEqual([1, "aiming"]);
    });

    it("lets no shot fly once the level is cleared", () => {
      const game = carded("cleared");

      release(game);

      expect([game.rounds(), game.phase()]).toEqual([1, "settling"]);
    });
  });

  describe("playing a round back", () => {
    it("aims the next round from where the last left it once its wall comes to rest", () => {
      const game = gameOf("step");
      const { next } = released(game);

      playOut(game);

      expect({
        phase: game.phase(),
        round: game.round(),
        start: game.start(),
      }).toEqual({ phase: "aiming", round: null, start: next });
    });

    it("says what the round came to as its wall comes to rest", () => {
      const game = gameOf("step");
      const round = released(game);

      playOut(game);

      expect(said()).toBe(describeRound(round.outcome, round.next));
    });

    it("says how far the wall stands from a jump on the depth the field takes as the wall comes to rest", () => {
      const game = onDepth(12, "step");
      const round = released(game);
      TestBed.inject(DebugService).setDepth(17);
      TestBed.tick();

      playOut(game);

      expect(said()).toBe(
        describeRound(round.outcome, { ...round.next, depth: 17 }),
      );
    });

    it("says a friend freed in the round's words alone", () => {
      const game = gameOf("freed");
      const round = released(game);

      const heard = heardPlayingOut(game);

      expect(heard).toEqual([describeRound(round.outcome, round.next)]);
    });

    it("plays the flight four times as fast while fast-forward is held", () => {
      const slow = gameOf("step");
      release(slow);
      slow.tick(400, STILL);
      afresh();
      const fast = gameOf("step");
      release(fast);

      fast.tick(100, { ...STILL, fast: true });

      expect(placeOf(fast)).toEqual(placeOf(slow));
    });

    it("plays fast while fast-forward is held", () => {
      const game = gameOf("step");
      release(game);

      game.tick(FRAME_MS, { ...STILL, fast: true });

      expect(game.fast()).toBe(true);
    });

    it("plays fast no more once fast-forward is let go", () => {
      const game = gameOf("step");
      release(game);
      game.tick(FRAME_MS, { ...STILL, fast: true });

      game.tick(FRAME_MS, STILL);

      expect(game.fast()).toBe(false);
    });

    it("plays fast as the bar asks", () => {
      const game = gameOf("step");
      release(game);

      game.fastForward(true);

      expect(game.fast()).toBe(true);
    });

    it("plays fast no more once the flight lands", () => {
      const game = gameOf("step");
      release(game);
      game.fastForward(true);

      playOut(game);

      expect(game.fast()).toBe(false);
    });

    it("forgets the bar's fast-forward as the next round is released", () => {
      const game = gameOf("step");
      release(game);
      game.fastForward(true);
      playOut(game);

      release(game);

      expect(game.fast()).toBe(false);
    });

    it("plays the flight at the settings' speed", () => {
      const { normal, fast } = FLIGHT_PACE.unitsPerSecond;
      const atNormal = gameOf("step");
      atNormal.tick(0, RELEASE);
      atNormal.tick(fast * 10, STILL);
      afresh();
      const atFast = gameOf("step");
      TestBed.inject(SettingsService).update({ flightSpeed: "fast" });
      atFast.tick(0, RELEASE);

      atFast.tick(normal * 10, STILL);

      expect(placeOf(atFast)).toEqual(placeOf(atNormal));
    });

    it("brings the wall to rest at once for a player who asks for less motion", () => {
      installFakeViewport(1280).setReducedMotion(true);
      const game = gameOf("step");
      release(game);
      game.skip();

      playFor(game, 2 * FRAME_MS, STILL);

      expect(game.phase()).toBe("aiming");
    });

    it("eases the wall down a step for a player who welcomes motion", () => {
      installFakeViewport(1280);
      const game = gameOf("step");
      release(game);
      game.skip();

      playFor(game, 2 * FRAME_MS, STILL);

      expect(game.phase()).toBe("settling");
    });

    it("speeds a long flight up as the settings say, or not", () => {
      const sped = flyingAfter(15_000, true);
      const steady = flyingAfter(15_000, false);

      expect({ sped, steady }).toEqual({ sped: false, steady: true });
    });

    it("holds the flight still while the level is paused", () => {
      const game = gameOf("step");
      release(game);
      const before = placeOf(game);
      game.pause();

      game.tick(100, STILL);

      expect(placeOf(game)).toEqual(before);
    });

    it("says it is flying while paused mid-flight", () => {
      const game = gameOf("step");
      release(game);

      game.pause();

      expect(game.flying()).toBe(true);
    });

    it("holds how the level ends until the flight lands", () => {
      const game = gameOf("cleared");

      release(game);

      expect([game.outcome(), game.run().ending]).toEqual([
        "playing",
        "cleared",
      ]);
    });

    it("clears the level as the flight lands", () => {
      const game = gameOf("cleared");
      release(game);

      game.fieldCommand("skip");
      game.tick(FRAME_MS, STILL);

      expect(game.outcome()).toBe("cleared");
    });
  });

  describe("skipping a flight", () => {
    it("lands the flight at the next frame", () => {
      const game = gameOf("step");
      release(game);

      game.skip();
      game.tick(FRAME_MS, STILL);

      expect(game.flying()).toBe(false);
    });

    it("leaves the landing to the frame, after which the scene reads the view", () => {
      const game = gameOf("step");
      release(game);

      game.skip();

      expect(game.flying()).toBe(true);
    });

    it("lands a paused flight at once, the level's end held while it is paused", () => {
      const game = gameOf("cleared");
      release(game);
      game.pause();

      game.skip();

      expect([game.flying(), game.outcome()]).toEqual([false, "paused"]);
    });

    it("ends the level the paused flight ended once the level goes on", () => {
      const game = gameOf("cleared");
      release(game);
      game.pause();
      game.skip();
      game.resume();

      game.tick(FRAME_MS, STILL);

      expect(game.outcome()).toBe("cleared");
    });

    it("does nothing with no flight in the air", () => {
      const game = gameOf("step");
      const view = { ...game.view() };

      game.skip();
      game.tick(FRAME_MS, STILL);

      expect(game.view()).toEqual(view);
    });
  });

  describe("a level's end", () => {
    it("opens the Cleared card once the level's last flight has landed, and says so", () => {
      const game = gameOf("cleared");

      playUntilCard(game);

      expect({
        card: game.card(),
        open: game.clearedOpen(),
        said: said(),
      }).toEqual({
        card: "cleared",
        open: true,
        said: describeCleared(game.run()),
      });
    });

    it("goes on to the next level from the Cleared card, waiting for its first shot, and says which it is", () => {
      const game = carded("cleared");

      game.command("go");

      expect({
        level: game.level().number,
        outcome: game.outcome(),
        start: game.start(),
        round: game.round(),
        aimed: game.view().wall,
        card: game.card(),
        said: said(),
      }).toEqual({
        level: 2,
        outcome: "ready",
        start: openingOf(game.run(), levelOf({ level: 2 }, SPEC_LEVELS)),
        round: null,
        aimed: game.start().wall,
        card: null,
        said: describeLevel(game.level(), game.levelBoon()),
      });
    });

    it("waits for the Cleared card before going on", () => {
      const game = gameOf("cleared");
      release(game);
      game.skip();
      game.tick(FRAME_MS, STILL);

      game.nextLevel();

      expect(game.level().number).toBe(1);
    });

    it("waits for the board to be drawn before going on", () => {
      const game = carded("cleared");
      game.setDrawn(false);

      game.nextLevel();

      expect(game.level().number).toBe(1);
    });

    it("ends the run as the flight that loses the level lands", () => {
      const game = gameOf("lost");
      release(game);

      game.skip();
      game.tick(FRAME_MS, STILL);

      expect([game.outcome(), game.ended()]).toEqual(["over", true]);
    });

    it("opens the result card once a lost level's wall has rested a while, and says how the run ended", () => {
      const game = gameOf("lost");

      playUntilCard(game);

      expect({
        card: game.card(),
        open: game.resultOpen(),
        cleared: game.clearedOpen(),
        said: said(),
      }).toEqual({
        card: "result",
        open: true,
        cleared: false,
        said: describeEnd(game.run(), game.newBest()),
      });
    });

    it("opens the result card, not Cleared, as the last level is cleared, and says both", () => {
      const game = carded("cleared");
      game.nextLevel();
      playUntilCard(game);
      game.nextLevel();

      playUntilCard(game);

      expect({
        outcome: game.outcome(),
        card: game.card(),
        said: said(),
      }).toEqual({
        outcome: "won",
        card: "result",
        said: `${describeCleared(game.run())} ${describeEnd(game.run(), game.newBest())}`,
      });
    });

    it("puts the result card away, leaving the board to look at", () => {
      const game = carded("lost");

      game.closeResult();

      expect([game.resultOpen(), game.resultClosed()]).toEqual([false, true]);
    });

    it("tries the lost level again at Enter once its result card is put away", () => {
      const game = carded("cleared", "lost");
      game.nextLevel();
      playUntilCard(game);
      game.closeResult();

      game.command("go");

      expect([game.outcome(), game.level().number]).toEqual(["ready", 2]);
    });

    it("tries the lost level again at P once its result card is put away", () => {
      const game = carded("cleared", "lost");
      game.nextLevel();
      playUntilCard(game);
      game.closeResult();

      game.command("toggle");

      expect([game.outcome(), game.level().number]).toEqual(["ready", 2]);
    });

    it("leaves a lost run as it is at Enter while its result card shows", () => {
      const game = carded("lost");

      game.command("go");

      expect(game.outcome()).toBe("over");
    });

    it("leaves a lost run as it is at Escape once its result card is put away", () => {
      const game = carded("lost");
      game.closeResult();

      game.command("pause");

      expect(game.outcome()).toBe("over");
    });

    it("starts a new game at Enter once a won run's card is put away", async () => {
      const game = carded("cleared");
      game.nextLevel();
      playUntilCard(game);
      game.nextLevel();
      playUntilCard(game);
      game.closeResult();

      game.command("go");
      await flush();

      expect([game.outcome(), game.level().number]).toEqual(["ready", 1]);
    });

    it("has no result card to put away before one opens", () => {
      const game = carded("cleared");

      game.closeResult();

      expect(game.resultClosed()).toBe(false);
    });

    it("tries a lost level again in a new run", () => {
      const game = carded("cleared", "lost");
      game.nextLevel();
      playUntilCard(game);
      const id = game.run().id;

      game.tryAgain();

      expect({
        id: game.run().id > id,
        level: game.level().number,
        first: game.run().firstLevel,
        outcome: game.outcome(),
      }).toEqual({ id: true, level: 2, first: 2, outcome: "ready" });
    });

    it("tries nothing again once the last level is cleared", () => {
      const game = carded("cleared");
      game.nextLevel();
      playUntilCard(game);
      game.nextLevel();
      playUntilCard(game);
      const run = game.run();

      game.tryAgain();

      expect(game.run()).toBe(run);
    });

    it("tries nothing again while the run goes on", () => {
      const game = gameOf("step");
      playRoundOut(game);
      const run = game.run();

      game.tryAgain();

      expect(game.run()).toBe(run);
    });
  });

  describe("the records", () => {
    it("counts a run started as it plays its first round, and not again at its second", () => {
      const game = gameOf("step");
      playRoundOut(game);

      playRoundOut(game);

      expect(TestBed.inject(StatsService).stats().runs).toBe(1);
    });

    it("keeps a level cleared as its last round is released, before it lands", () => {
      const game = gameOf("cleared");

      release(game);

      expect({
        cleared: TestBed.inject(ProgressService).cleared().has(FIRST_ID),
        stars: TestBed.inject(StatsService).stats().levels[FIRST_ID]?.stars,
      }).toEqual({ cleared: true, stars: 3 });
    });

    it("keeps the run's end, and a new best, as the round that ends it is released", () => {
      const game = gameOf("step", "lost");
      playRoundOut(game);

      release(game);

      expect({
        best: TestBed.inject(StatsService).stats().best,
        newBest: game.newBest(),
      }).toEqual({ best: SPEC_POINTS.step, newBest: true });
    });

    it("keeps nothing for a run played on retuned numbers", () => {
      const game = gameOf("step", "cleared");
      playRoundOut(game);
      game.takeUp(kept(game, game.run().id + 1, true));
      game.resume();

      release(game);

      expect(TestBed.inject(ProgressService).cleared().size).toBe(0);
    });
  });

  describe("pausing and going on", () => {
    it("pauses a level under way, and says so, with the score the bar shows", () => {
      const game = gameOf("step");
      playRoundOut(game);
      release(game);

      game.pause();

      expect([game.outcome(), said()]).toEqual([
        "paused",
        describePause({ ...game.run(), score: SPEC_POINTS.step }),
      ]);
    });

    it("leaves a level waiting for its first shot as it is", () => {
      const game = gameOf("step");

      game.pause();

      expect([game.outcome(), said()]).toEqual(["ready", ""]);
    });

    it("goes on with a paused level, and says so", () => {
      const game = gameOf("step");
      release(game);
      game.pause();

      game.resume();

      expect([game.outcome(), said()]).toEqual(["playing", "Going on."]);
    });

    it("waits for the board to be drawn before going on", () => {
      const game = gameOf("step");
      release(game);
      game.pause();
      game.setDrawn(false);

      game.resume();

      expect(game.outcome()).toBe("paused");
    });

    it("leaves a level not paused as it is", () => {
      const game = gameOf("step");
      release(game);
      const run = game.run();

      game.resume();

      expect({ same: game.run() === run, said: said() }).toEqual({
        same: true,
        said: "",
      });
    });
  });

  describe("a new game", () => {
    it("starts a new run at the level the last one started at, waiting for its first shot", async () => {
      const game = gameOf("step");
      await game.startAt(2);
      const id = game.run().id;

      await game.newGame();

      expect({
        id: game.run().id > id,
        level: game.level().number,
        outcome: game.outcome(),
        said: said(),
      }).toEqual({
        id: true,
        level: 2,
        outcome: "ready",
        said: describeLevel(game.level(), game.levelBoon()),
      });
    });

    it("asks first with a run in progress, and starts none if the player says no", async () => {
      const game = gameOf("step");
      playRoundOut(game);
      const run = game.run();

      const started = await answered(game.newGame(), false);

      expect([started, game.run()]).toEqual([false, run]);
    });

    it("starts a run at a level chosen once the player says yes", async () => {
      const game = gameOf("step");
      playRoundOut(game);

      const started = await answered(game.startAt(3), true);

      expect([started, game.level().number, game.rounds()]).toEqual([
        true,
        3,
        0,
      ]);
    });

    it("aims the new run's first round in the view", async () => {
      const game = carded("lost");

      await game.newGame();

      expect(game.view().wall).toEqual(game.start().wall);
    });

    it("lays the new run out on the room's depth", async () => {
      const game = gameOf("step");
      game.setRoom(TALL);
      playRoundOut(game);

      await answered(game.newGame(), true);

      expect(game.run().depth).toBe(fieldShape(TALL).depth);
    });

    it("counts each run begun, for the board to take the focus after", async () => {
      const game = gameOf();

      await game.newGame();

      expect(game.runs()).toBe(1);
    });

    it("forgets the bar's fast-forward", async () => {
      const game = gameOf("step");
      release(game);
      game.fastForward(true);

      await answered(game.newGame(), true);

      expect(game.fast()).toBe(false);
    });

    it("forgets the last run's cards and what it set", async () => {
      const game = carded("lost");

      await game.newGame();

      expect({
        card: game.card(),
        newBest: game.newBest(),
        resultClosed: game.resultClosed(),
      }).toEqual({ card: null, newBest: false, resultClosed: false });
    });
  });

  describe("a run taken up", () => {
    it("takes the run up paused, aims its next round on the field's depth, and says so", () => {
      const played = gameOf("step");
      playRoundOut(played);
      const taken = kept(played, 2);
      afresh();
      const game = gameOf("step");
      game.setRoom(TALL);

      game.takeUp(taken);

      expect({
        outcome: game.outcome(),
        rounds: game.rounds(),
        par: game.par(),
        start: game.start(),
        said: said(),
      }).toEqual({
        outcome: "paused",
        rounds: 1,
        par: taken.run.par,
        start: { ...taken.start, depth: fieldShape(TALL).depth },
        said: describeTakenUp(taken.run, game.level()),
      });
    });

    it("begins a level with no round played again on the field's depth, its par with it", () => {
      const taken = kept(carded("cleared"), 2);
      afresh();
      const game = gameOf("step");
      game.setRoom(TALL);
      const { depth } = fieldShape(TALL);

      game.takeUp(taken);

      expect({
        depth: game.run().depth,
        par: game.par(),
        start: game.start(),
      }).toEqual({
        depth,
        par: parOf(SECOND_ID, depth),
        start: openingOf({ depth }, levelOf({ level: 2 }, SPEC_LEVELS)),
      });
    });

    it("numbers the next new run past the one taken up", async () => {
      const game = gameOf("step");
      playRoundOut(game);
      game.takeUp(kept(game, 40));

      await answered(game.newGame(), true);

      expect(game.run().id).toBe(41);
    });

    it("takes up whether the run is played on retuned numbers", () => {
      const game = gameOf("step");
      playRoundOut(game);

      game.takeUp(kept(game, 2, true));

      expect(game.tuned()).toBe(true);
    });
  });

  describe("what the board shows", () => {
    it("counts the rows waiting over the ceiling as the round aimed started", () => {
      const game = gameOf("step");

      const { wall, depth } = game.start();
      expect(game.rowsLeft()).toBe(waitingRows(wall, depth).length);
    });

    it("shows the friends freed, as the next round starts", () => {
      const game = gameOf("freed");

      playRoundOut(game);

      expect(game.friends()).toEqual([FREED_INK]);
    });

    it("lights the boon while a shot carrying it is aimed, not before a jump earns it nor once it flies", () => {
      const game = gameOf("jump");
      const unearned = game.lit();
      playRoundOut(game);
      const aimed = game.lit();

      release(game);

      expect([unearned, aimed, game.lit()]).toEqual([false, true, false]);
    });

    it("counts no round while its flight plays back", () => {
      const game = gameOf("step");

      release(game);

      expect(game.rounds()).toBe(0);
    });

    it("counts a round as its flight lands", () => {
      const game = gameOf("step");
      release(game);

      playUntil(
        game,
        () => STILL,
        () => !game.flying(),
      );

      expect(game.rounds()).toBe(1);
    });

    it("scores each break as the flight plays it back, and the jump's points as it lands", () => {
      const game = gameOf("jump");

      const scores = scoresUntilLanded(game);

      expect(scores).toEqual([0, 30, 70, SPEC_POINTS.jump]);
    });

    it("keeps the best score of any run", () => {
      const game = carded("step", "lost");

      expect(game.best()).toBe(SPEC_POINTS.step);
    });
  });

  describe("the scene's options", () => {
    it("hands the scene the round's view, the same record every frame", () => {
      const game = gameOf("step");
      const view = game.view();

      release(game);

      expect(game.view()).toBe(view);
    });

    it("hands the guide of the shot the steering aims, as the rules cast it", () => {
      const game = gameOf();

      game.tick(FRAME_MS, { ...STILL, aim: 100, charge: 2 });

      expect(game.guide()).toEqual(
        guideOf(game.start(), { aim: 100, charge: 2 }, GUIDE_PAST_TURN, RULES),
      );
    });

    it("casts the guide on the numbers the debug menu tunes", () => {
      const game = gameOf();
      game.tick(FRAME_MS, { ...STILL, aim: 100, charge: 2 });
      game.guide();
      const debug = TestBed.inject(DebugService);

      debug.tuning.tune("guidePastTurn", 4);
      debug.tuning.tune("bored", 40);

      expect(game.guide()).toEqual(
        guideOf(game.start(), { aim: 100, charge: 2 }, 4, { bored: 40 }),
      );
    });

    it("hands the same guide while the shot stays as it was aimed", () => {
      const game = gameOf();
      game.tick(FRAME_MS, STILL);
      const guide = game.guide();

      game.tick(FRAME_MS, STILL);

      expect(game.guide()).toBe(guide);
    });

    it.each([
      ["aim", { aim: 100 }],
      ["charge", { charge: 2 }],
    ] as const)("casts the guide afresh as the %s changes", (_, change) => {
      const game = gameOf();
      game.tick(FRAME_MS, STILL);
      game.guide();

      game.tick(FRAME_MS, { ...STILL, ...change });

      expect(game.guide()).toEqual(
        guideOf(
          game.start(),
          { aim: STILL.aim, charge: STILL.charge, ...change },
          GUIDE_PAST_TURN,
          RULES,
        ),
      );
    });

    it("casts the guide afresh as the round aimed changes", () => {
      const game = gameOf("step");
      game.guide();

      playRoundOut(game);

      expect(game.guide()).toEqual(
        guideOf(game.start(), STILL, GUIDE_PAST_TURN, RULES),
      );
    });

    it("hands no guide while the settings hide it", () => {
      const game = gameOf();

      TestBed.inject(SettingsService).update({ guide: false });

      expect(game.guide()).toBeNull();
    });

    it("hands no guide while a flight is in the air", () => {
      const game = gameOf("step");

      release(game);

      expect(game.guide()).toBeNull();
    });

    it("hands no guide while the level is paused", () => {
      const game = gameOf("step");
      playRoundOut(game);

      game.pause();

      expect(game.guide()).toBeNull();
    });

    it("hands no place for the fuzzball while it is in the air", () => {
      const game = gameOf("step");

      release(game);

      expect(game.waitingX()).toBeNull();
    });

    it("hands the waiting fuzzball the boon of the round aimed", () => {
      const game = gameOf("jump");

      playRoundOut(game);

      expect(game.boon()).toBe(game.levelBoon());
    });

    it("hands no boon while the fuzzball flies", () => {
      const game = gameOf("jump");
      playRoundOut(game);

      release(game);

      expect(game.boon()).toBeNull();
    });

    it("hands the boon a jump earned as the flight lands", () => {
      installFakeViewport(1280);
      const game = gameOf("jump");
      release(game);
      game.skip();

      playFor(game, 2 * FRAME_MS, STILL);

      expect({ phase: game.phase(), boon: game.boon() }).toEqual({
        phase: "settling",
        boon: game.levelBoon(),
      });
    });

    it("hands the crew of the round aimed, the friends it freed among them", () => {
      const game = gameOf("freed");

      playRoundOut(game);

      expect(game.crew().friends).toEqual([FREED_INK]);
    });

    it("hands the crew of the round in the air, without the friends it frees", () => {
      const game = gameOf("freed");

      release(game);

      expect(game.crew().friends).toEqual([]);
    });

    it("says whether the player welcomes motion, as the page does", () => {
      installFakeViewport(1280);
      const game = gameOf();

      expect(game.motion()).toBe(true);
    });

    it("plays sound as the settings say, and turns it off and on", () => {
      const game = gameOf();
      const before = game.sound();

      game.toggleSound();

      expect({
        before,
        after: game.sound(),
        shown: game.soundOn(),
        kept: TestBed.inject(SettingsService).settings().sound,
      }).toEqual({ before: true, after: false, shown: false, kept: false });
    });

    it("draws the field in the palette on the page", () => {
      const roles = PALETTES.rolesIn("midnight", FIELD_ROLES);
      paintRoles(FIELD_ROLES, roles);
      const game = gameOf();

      expect(game.palette()).toEqual(
        wallPalette(roles, TestBed.inject(ThemeService).mode()),
      );
    });

    it("hands the steering each kind of pointer's way of aiming, as the settings say", () => {
      const game = gameOf();
      const byPointer = game.aimings();

      TestBed.inject(SettingsService).update({ aiming: "pullBack" });

      expect([byPointer, game.aimings()]).toEqual([
        BY_POINTER,
        { mouse: "pullBack", finger: "pullBack" },
      ]);
    });

    it("takes where the scene laid the field out", () => {
      const game = gameOf();
      const metrics: FieldMetrics = fieldMetrics(TALL, fieldShape(TALL));

      game.onLayout(metrics);

      expect(game.metrics()).toBe(metrics);
    });

    it("takes the pictures of the bricks the scene baked", () => {
      const game = gameOf();
      const pictures = (): Pictures => {
        throw new Error("Not baked here.");
      };

      game.onPictures(pictures);

      expect(game.pictures()).toBe(pictures);
    });

    it("says the aim and the charge the keys moved", () => {
      const game = gameOf();

      game.tick(FRAME_MS, { ...STILL, aim: 0, charge: 2, keyed: true });

      expect(said()).toBe(describeShot({ aim: 0, charge: 2 }));
    });

    it("says a hot shot rather than the charge while the shot aimed carries one", () => {
      const game = gameOf("jump");
      playRoundOut(game);

      game.tick(FRAME_MS, { ...STILL, aim: 0, charge: 2, keyed: true });

      expect(said()).toBe("8 degrees, hot shot");
    });

    it("says the charge while the round that earns a hot shot flies", () => {
      const game = gameOf("jump");
      release(game);

      game.tick(FRAME_MS, { ...STILL, aim: 0, charge: 2, keyed: true });

      expect(said()).toBe("8 degrees, charge 2");
    });

    it("says the charge while a hot shot flies, the shot after it a plain one", () => {
      const game = gameOf("jump", "step");
      playRoundOut(game);
      release(game);

      game.tick(FRAME_MS, { ...STILL, aim: 0, charge: 2, keyed: true });

      expect(said()).toBe("8 degrees, charge 2");
    });

    it("says nothing of an aim the pointer moved", () => {
      const game = gameOf();

      game.tick(FRAME_MS, { ...STILL, aim: 0, charge: 2 });

      expect(said()).toBe("");
    });

    it("reads the wall's lowest rows at R", () => {
      const game = gameOf();

      game.fieldCommand("read");

      expect(said()).toBe(describeRows(game.start()));
    });

    it("skips the flight at its key", () => {
      const game = gameOf("step");
      release(game);

      game.fieldCommand("skip");
      game.tick(FRAME_MS, STILL);

      expect(game.flying()).toBe(false);
    });

    it("pauses at the keys every run shares", () => {
      const game = gameOf("step");
      release(game);

      game.fieldCommand("pause");

      expect(game.outcome()).toBe("paused");
    });
  });

  describe("the debug menu", () => {
    it("plays each round on the rules' numbers it tunes", () => {
      const asked: Parameters<RoundPlayer>[3][] = [];
      const rounds = scriptedRounds("step");
      const game = gameWith((start, shot, boon, rules) => {
        asked.push(rules);
        return rounds(start, shot, boon);
      });
      TestBed.inject(DebugService).tuning.tune("bored", 40);

      release(game);

      expect(asked).toEqual([{ bored: 40 }]);
    });

    it("plays the flight back at the pace it tunes, from the next frame", () => {
      const normal = gameOf("step");
      normal.tick(0, RELEASE);
      normal.tick(200, STILL);
      afresh();
      const tuned = gameOf("step");
      tuned.tick(0, RELEASE);

      TestBed.inject(DebugService).tuning.tune(
        "normalPace",
        2 * FLIGHT_PACE.unitsPerSecond.normal,
      );
      tuned.tick(100, STILL);

      expect(placeOf(tuned)).toEqual(placeOf(normal));
    });

    it("lays the field out at the depth it sets, between rounds", () => {
      const game = gameOf("step");
      game.setRoom(TALL);

      TestBed.inject(DebugService).setDepth(12);
      TestBed.tick();

      expect([game.shape(), game.start().depth]).toEqual([
        fieldShape(TALL, 12),
        12,
      ]);
    });

    it("waits for the round in the air before taking the depth it sets", () => {
      const game = gameOf("step");
      game.setRoom(TALL);
      release(game);

      TestBed.inject(DebugService).setDepth(12);
      TestBed.tick();

      expect(game.shape()).toEqual(fieldShape(TALL));
    });

    it("gives the field back the room's depth as it lets its own go", () => {
      const game = gameOf("step");
      game.setRoom(TALL);
      const debug = TestBed.inject(DebugService);
      debug.setDepth(12);
      TestBed.tick();

      debug.setDepth(null);
      TestBed.tick();

      expect(game.shape()).toEqual(fieldShape(TALL));
    });

    it("keeps no records for a run begun at a level the player hasn't opened", async () => {
      const game = gameOf("cleared");
      await game.startAt(3);

      release(game);

      expect({
        tuned: game.tuned(),
        cleared: TestBed.inject(ProgressService).cleared().size,
        runs: TestBed.inject(StatsService).stats().runs,
      }).toEqual({ tuned: true, cleared: 0, runs: 0 });
    });

    it("keeps the records of a run begun at a level the player has opened", async () => {
      const game = gameOf("cleared");
      await game.startAt(1);

      release(game);

      expect([
        game.tuned(),
        TestBed.inject(ProgressService).cleared().size,
      ]).toEqual([false, 1]);
    });

    it("keeps no records for a run once a number is retuned in it", () => {
      const game = gameOf("cleared");
      TestBed.inject(DebugService).tuning.tune("bored", 40);

      release(game);

      expect(TestBed.inject(ProgressService).cleared().size).toBe(0);
    });

    it("puts a new run back on the record once the numbers are the game's own", async () => {
      const game = gameOf("step");
      const debug = TestBed.inject(DebugService);
      debug.tuning.tune("bored", 40);
      debug.tuning.reset();

      await game.newGame();

      expect(game.tuned()).toBe(false);
    });
  });

  describe("a certificate's line", () => {
    it("lets its first shot fly as the level waits for it, whatever the player steers", async () => {
      const { game, asked } = askingGameOf("step");
      await game.playLine(1, () => LINE);

      game.tick(FRAME_MS, STILL);

      expect(asked.map(([, shot]) => shot)).toEqual([LINE_SHOTS[0]]);
    });

    it("lets each of its shots fly in turn, one a round", async () => {
      const { game, asked } = askingGameOf("step");
      await game.playLine(1, () => LINE);
      playRoundOut(game);

      playRoundOut(game);

      expect(asked.map(([, shot]) => shot)).toEqual(LINE_SHOTS);
    });

    it("plays on the rules' own numbers, whatever the debug menu has retuned", async () => {
      const { game, asked } = askingGameOf("step");
      TestBed.inject(DebugService).tuning.tune("bored", 40);
      await game.playLine(1, () => LINE);

      game.tick(FRAME_MS, STILL);

      expect(asked.map(([, , , rules]) => rules)).toEqual([RULES]);
    });

    it("leaves the player's own shots to the menu's numbers once it is played", async () => {
      const { game, asked } = askingGameOf("step");
      TestBed.inject(DebugService).tuning.tune("bored", 40);
      await game.playLine(1, () => LINE.slice(0, 1));
      playRoundOut(game);

      release(game);

      expect(asked.map(([, , , rules]) => rules)).toEqual([
        RULES,
        { bored: 40 },
      ]);
    });

    it("keeps the next of its shots for when a paused level goes on", async () => {
      const { game, asked } = askingGameOf("step");
      await game.playLine(1, () => LINE);
      playRoundOut(game);
      game.pause();
      game.tick(FRAME_MS, STILL);
      game.resume();

      game.tick(FRAME_MS, STILL);

      expect(asked.map(([, shot]) => shot)).toEqual(LINE_SHOTS);
    });

    it("lets none of its shots fly while the level is paused", async () => {
      const { game, asked } = askingGameOf("step");
      await game.playLine(1, () => LINE);
      playRoundOut(game);
      game.pause();

      game.tick(FRAME_MS, STILL);

      expect(asked).toHaveLength(1);
    });

    it("plays the level from its start, off the record, though the player has opened it", async () => {
      const game = gameOf("step");
      playRoundOut(game);
      const id = game.run().id;

      await answered(
        game.playLine(1, () => LINE),
        true,
      );

      expect({
        newRun: game.run().id > id,
        rounds: game.rounds(),
        offRecord: TestBed.inject(DebugService).runOffRecord(),
        said: said(),
      }).toEqual({
        newRun: true,
        rounds: 0,
        offRecord: true,
        said: describeLevel(game.level(), game.levelBoon()),
      });
    });

    it("takes the line for the field's depth", async () => {
      const game = onDepth(12, "step");

      const started = await game.playLine(2, (depth) =>
        depth === 12 ? LINE : null,
      );

      expect([started, game.run().depth]).toEqual([true, 12]);
    });

    it("asks nothing where no line holds the field's depth", async () => {
      const game = gameOf("step");
      playRoundOut(game);

      const started = await game.playLine(1, () => null);

      expect([started, TestBed.inject(ConfirmService).isOpen()]).toEqual([
        false,
        false,
      ]);
    });

    it("begins none where the field took another depth while the player was asked", async () => {
      const game = onDepth(12, "step");
      playRoundOut(game);
      const run = game.run();
      const starting = game.playLine(1, (depth) =>
        depth === 12 ? LINE : null,
      );
      TestBed.inject(DebugService).setDepth(13);
      TestBed.tick();

      const started = await answered(starting, true);

      expect([started, game.run()]).toEqual([false, run]);
    });

    it("stops once the field takes another depth", async () => {
      const { game, asked } = askingGameOf("step");
      const debug = TestBed.inject(DebugService);
      game.setRoom(TALL);
      debug.setDepth(12);
      TestBed.tick();
      await game.playLine(1, () => LINE);
      playRoundOut(game);
      debug.setDepth(13);
      TestBed.tick();

      game.tick(FRAME_MS, STILL);

      expect(asked).toHaveLength(1);
    });

    it("begins no run where no line holds that depth", async () => {
      const game = gameOf("step");
      const run = game.run();

      const started = await game.playLine(2, () => null);

      expect([started, game.run()]).toEqual([false, run]);
    });

    it("begins none if the player keeps the run in progress", async () => {
      const game = gameOf("step");
      playRoundOut(game);
      const run = game.run();

      const started = await answered(
        game.playLine(1, () => LINE),
        false,
      );

      expect([started, game.run()]).toEqual([false, run]);
    });

    it("stops as the next level begins", async () => {
      const { game, asked } = askingGameOf("cleared");
      await game.playLine(1, () => LINE);
      playUntilCard(game);
      game.nextLevel();

      game.tick(FRAME_MS, STILL);

      expect(asked).toHaveLength(1);
    });

    it("stops as another run begins", async () => {
      const { game, asked } = askingGameOf("step");
      await game.playLine(1, () => LINE);
      playRoundOut(game);
      await answered(game.startAt(2), true);

      game.tick(FRAME_MS, STILL);

      expect(asked).toHaveLength(1);
    });
  });

  describe("the board's card", () => {
    it("shows Ready as a level waits for its first shot, with the kind of brick it brings in", () => {
      const game = gameOf();

      expect(game.boardCard()).toEqual({
        kind: "ready",
        level: 1,
        name: "Hello, wall",
        boon: "hot",
        newKind: "brick",
      });
    });

    it("shows no kind of brick new on a level that brings none in", async () => {
      const game = gameOf();

      await game.startAt(2);

      expect(game.boardCard()).toMatchObject({ level: 2, newKind: null });
    });

    it("shows none while a flight is in the air", () => {
      const game = gameOf("step");

      release(game);

      expect(game.boardCard()).toBeNull();
    });

    it("shows Paused, with the score, while the level is paused", () => {
      const game = gameOf("step");
      playRoundOut(game);

      game.pause();

      expect(game.boardCard()).toEqual({
        kind: "paused",
        score: SPEC_POINTS.step,
      });
    });

    it("shows Cleared once its card is due, with the level's rounds, par, points and friends", () => {
      const game = gameOf("freed", "jump", "cleared");
      playRoundOut(game);
      playRoundOut(game);

      playUntilCard(game);

      const run = game.run();
      expect(game.boardCard()).toEqual({
        kind: "cleared",
        level: 1,
        rounds: 3,
        par: run.par,
        tally: tallyOf(run),
        score: run.score,
        friends: [FREED_INK],
      });
    });

    it("shows none while the result card is up", () => {
      const game = carded("lost");

      expect(game.boardCard()).toBeNull();
    });

    it("shows where a lost run ended once its result is put away", () => {
      const game = carded("lost");

      game.closeResult();

      expect(game.boardCard()).toEqual({
        kind: "ended",
        outcome: "over",
        level: 1,
        name: "Hello, wall",
        score: SPEC_POINTS.lost,
      });
    });

    it("shows a won run's score once its result is put away", () => {
      const game = won();

      game.closeResult();

      expect(game.boardCard()).toEqual({
        kind: "ended",
        outcome: "won",
        score: game.score(),
      });
    });
  });

  describe("the run's end", () => {
    it("is nothing while the run goes on", () => {
      const game = gameOf("step");

      playRoundOut(game);

      expect(game.runEnd()).toBeNull();
    });

    it("tells where a lost run ended, the levels it cleared and their stars", () => {
      const game = carded("cleared", "lost");
      game.nextLevel();

      playUntilCard(game);

      expect(game.runEnd()).toEqual({
        outcome: "over",
        firstLevel: 1,
        level: 2,
        levelName: "Stripes",
        score: game.score(),
        cleared: 1,
        stars: 3,
      });
    });

    it("tells the level a run started at", async () => {
      const game = gameOf("lost");
      await game.startAt(2);

      playUntilCard(game);

      expect(game.runEnd()).toMatchObject({ firstLevel: 2, level: 2 });
    });

    it("tells of a won run, every level cleared", () => {
      const game = won();

      expect(game.runEnd()).toMatchObject({
        outcome: "won",
        level: 3,
        cleared: 3,
        stars: 9,
      });
    });

    it("counts the stars afresh as a new run begins", () => {
      const game = carded("cleared", "lost");
      game.nextLevel();
      playUntilCard(game);
      game.tryAgain();

      playUntilCard(game);

      expect(game.runEnd()?.stars).toBe(0);
    });
  });

  describe("the saved game", () => {
    it("is the game the saved game keeps", () => {
      TestBed.configureTestingModule({
        providers: [...provideSpecPlay(), ...provideGame()],
      });

      expect(TestBed.inject(KEPT_GAME)).toBe(TestBed.inject(GameService));
    });

    it("comes back paused after a reload mid-flight, after the round in the air", () => {
      const storage = new MemoryStorage();
      const { next } = released(keptIn(storage));
      TestBed.tick();
      afresh();

      const game = keptIn(storage);

      expect({
        outcome: game.outcome(),
        rounds: game.rounds(),
        start: game.start(),
      }).toEqual({ outcome: "paused", rounds: 1, start: next });
    });
  });
});

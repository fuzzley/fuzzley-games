import { TestBed } from "@angular/core/testing";
import { waitingRows } from "@fz/brick-wall/app/panels";
import { startLevel, takeRound } from "@fz/brick-wall/rules/run";
import { fieldShape } from "@fz/brick-wall/view/field_metrics";
import { FIELD_ROLES } from "@fz/brick-wall/view/palette";
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
import { RUN_RULES, levelOf, openingOf } from "../../rules/run/run";
import {
  type TakenUp,
  restoreGame,
  saveGame,
} from "../../rules/run/saved_game";
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
import { FLIGHT_FIXTURES } from "../../testing/flight_fixtures";
import { PALETTES } from "../../testing/roles";
import { wallPalette } from "../../view/colors/palette";
import { FLIGHT_PACE } from "../../view/round_play";
import type { Steer } from "../../view/steering/steering";
import { DebugService } from "../debug/debug.service";
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

/**
 * Returns the game as the page starts it, the saved game made first, which
 * keeps it in a store, its rounds played as a script says.
 */
function keptIn(
  storage: MemoryStorage,
  ...script: readonly SpecRound[]
): GameService {
  TestBed.configureTestingModule({
    providers: [
      ...provideSpecPlay(scriptedRounds(...script)),
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

/** Returns the game, its rounds played as a script says, keeping what it asked of each, a drop among it. */
function askingGameOf(...script: readonly SpecRound[]): AskingGame {
  const asked: Parameters<RoundPlayer>[] = [];
  const rounds = scriptedRounds(...script);
  const game = gameWith((...round) => {
    asked.push(round);
    return rounds(...round);
  });
  return { game, asked };
}

/** Plays the flight in the air on until it lands. */
function playUntilLanded(game: GameService): void {
  playUntil(
    game,
    () => STILL,
    () => !game.flying(),
  );
}

/** Plays the flight in the air on past its first break, which the bar's score counts as it plays back. */
function playPastABreak(game: GameService): void {
  const score = game.score();
  playUntil(
    game,
    () => STILL,
    () => game.score() > score,
  );
}

/** Releases the round aimed, plays a frame of its flight, and drops it, returning the round dropped. */
function droppedAfterAFrame(game: GameService): Round {
  release(game);
  game.tick(FRAME_MS, STILL);
  game.drop();
  const round = game.round();
  if (round === null) throw new Error("No round flies.");
  return round;
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
  describe("releasing a round", () => {
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
  });

  describe("playing a round back", () => {
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

    it("plays the flight four times as fast while fast-forward is on", () => {
      const slow = gameOf("step");
      release(slow);
      slow.tick(400, STILL);
      afresh();
      const fast = gameOf("step");
      release(fast);
      fast.fastForward();

      fast.tick(100, STILL);

      expect(placeOf(fast)).toEqual(placeOf(slow));
    });

    it("switches fast-forward on while aiming", () => {
      const game = gameOf("step");

      game.fastForward();

      expect(game.fast()).toBe(true);
    });

    it("says nothing as the bar switches fast-forward, its button showing it", () => {
      const game = gameOf("step");

      game.fastForward();

      expect(said()).toBe("");
    });

    it("switches fast-forward off at the next press", () => {
      const game = gameOf("step");
      game.fastForward();
      release(game);

      game.fastForward();

      expect(game.fast()).toBe(false);
    });

    it("keeps fast-forward on in the settings", () => {
      const game = gameOf("step");

      game.fastForward();

      expect(TestBed.inject(SettingsService).settings().fastForward).toBe(true);
    });

    it("plays fast while the settings have fast-forward on", () => {
      const game = gameOf("step");

      TestBed.inject(SettingsService).update({ fastForward: true });

      expect(game.fast()).toBe(true);
    });

    it("keeps fast-forward on as the flight lands and the next is released", () => {
      const game = gameOf("step");
      release(game);
      game.fastForward();
      playOut(game);

      release(game);

      expect(game.fast()).toBe(true);
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
      playUntilLanded(game);

      game.tick(FRAME_MS, STILL);

      expect(game.phase()).toBe("aiming");
    });

    it("eases the wall down a step for a player who welcomes motion", () => {
      installFakeViewport(1280);
      const game = gameOf("step");
      release(game);
      playUntilLanded(game);

      game.tick(FRAME_MS, STILL);

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
  });

  describe("dropping a flight", () => {
    it("flies the round again from the same start, shot, level's boon and rules, dropped at the moment the playback has reached", () => {
      const { game, asked } = askingGameOf("step");
      const start = game.start();
      const shot = { aim: 100, charge: 3 } as const;
      const steer: Steer = { ...RELEASE, ...shot };
      game.tick(0, steer);
      // The steering writes its steer again each frame.
      steer.aim = 200;
      steer.release = false;
      TestBed.inject(DebugService).tuning.tune("bored", 40);
      game.tick(100, steer);

      game.drop();

      expect(asked).toEqual([
        [start, shot, "hot", RULES],
        [
          start,
          shot,
          "hot",
          RULES,
          {
            stop: "drop",
            at: (FLIGHT_PACE.unitsPerSecond.normal / 1000) * 100,
          },
        ],
      ]);
    });

    it("takes the round dropped into the run as it stood before the release, in place of the whole round", () => {
      const game = gameOf("cleared");
      const before = game.run();

      droppedAfterAFrame(game);

      expect(game.run()).toEqual(
        takeRound(
          startLevel(before),
          {
            // The whole round's less its brick's, broken after the drop.
            points:
              SPEC_POINTS.cleared -
              FLIGHT_FIXTURES.cleared.round.outcome.points,
            jumped: false,
            result: "on",
          },
          RUN_RULES,
        ),
      );
    });

    it("plays the round dropped on, its fuzzballs coming down, and aims the next round from it", () => {
      const game = gameOf("cleared");
      const dropped = droppedAfterAFrame(game);

      playOut(game);

      expect({
        drops: dropped.flight.events.some(({ kind }) => kind === "drop"),
        phase: game.phase(),
        start: game.start(),
      }).toEqual({ drops: true, phase: "aiming", start: dropped.next });
    });

    it("keeps no clear of a level the round dropped leaves on", () => {
      const game = gameOf("cleared");
      droppedAfterAFrame(game);

      playOut(game);

      expect({
        outcome: game.outcome(),
        card: game.card(),
        cleared: TestBed.inject(ProgressService).cleared().size,
      }).toEqual({ outcome: "playing", card: null, cleared: 0 });
    });

    it("keeps the clear of a level the round dropped after its last break still clears, as it lands", () => {
      const game = gameOf("cleared");
      release(game);
      playPastABreak(game);
      game.drop();

      playOut(game);

      expect({
        outcome: game.outcome(),
        cleared: TestBed.inject(ProgressService).cleared().has(FIRST_ID),
      }).toEqual({ outcome: "cleared", cleared: true });
    });

    it("leaves the bar's score as the flight played it back", () => {
      const game = gameOf("cleared");
      release(game);
      playPastABreak(game);
      const score = game.score();

      game.drop();

      expect(game.score()).toBe(score);
    });

    it("holds a flight dropped while paused still, the run left paused", () => {
      const game = gameOf("step");
      release(game);
      game.tick(FRAME_MS, STILL);
      game.pause();
      const place = placeOf(game);
      game.drop();

      game.tick(100, STILL);

      expect({ outcome: game.outcome(), place: placeOf(game) }).toEqual({
        outcome: "paused",
        place,
      });
    });

    it("brings a flight dropped while paused down as the run goes on", () => {
      const game = gameOf("step");
      release(game);
      game.tick(FRAME_MS, STILL);
      game.pause();
      game.drop();
      const dropped = game.round();
      game.resume();

      playOut(game);

      expect(game.start()).toBe(dropped?.next);
    });

    it("does nothing while a round is aimed", () => {
      const { game, asked } = askingGameOf("step");
      const run = game.run();

      game.drop();

      expect({ asked, run: game.run(), round: game.round() }).toEqual({
        asked: [],
        run,
        round: null,
      });
    });

    it("does nothing at a second drop", () => {
      const { game, asked } = askingGameOf("step");
      const dropped = droppedAfterAFrame(game);
      game.tick(FRAME_MS, STILL);

      game.drop();

      expect({ asked: asked.length, round: game.round() }).toEqual({
        asked: 2,
        round: dropped,
      });
    });

    it("is offered from a round's release, paused or not", () => {
      const game = gameOf("step");
      const aimed = game.droppable();
      release(game);
      const released = game.droppable();

      game.pause();

      expect([aimed, released, game.droppable()]).toEqual([false, true, true]);
    });

    it("is offered no more once the flight is dropped, though it still flies", () => {
      const game = gameOf("step");

      droppedAfterAFrame(game);

      expect([game.droppable(), game.flying()]).toEqual([false, true]);
    });

    it("is offered no more once the flight lands, while the wall comes down", () => {
      installFakeViewport(1280);
      const game = gameOf("step");
      release(game);

      playUntilLanded(game);

      expect([game.droppable(), game.phase()]).toEqual([false, "settling"]);
    });

    it("is offered no more as another run begins while the flight is in the air", async () => {
      const game = gameOf("step");
      release(game);
      game.pause();

      await answered(game.newGame(), true);

      expect(game.droppable()).toBe(false);
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
  });

  describe("the records", () => {
    it("counts a run started as its first round is released, before it lands", () => {
      const game = gameOf("step");

      release(game);

      expect(TestBed.inject(StatsService).stats().runs).toBe(1);
    });

    it("keeps no level cleared while the flight that clears it is in the air", () => {
      const game = gameOf("cleared");

      release(game);

      expect({
        cleared: TestBed.inject(ProgressService).cleared().has(FIRST_ID),
        levels: TestBed.inject(StatsService).stats().levels,
      }).toEqual({ cleared: false, levels: {} });
    });

    it("keeps a level cleared, with its stars, as the flight that clears it lands", () => {
      const game = gameOf("cleared");
      release(game);

      playOut(game);

      expect({
        cleared: TestBed.inject(ProgressService).cleared().has(FIRST_ID),
        stars: TestBed.inject(StatsService).stats().levels[FIRST_ID]?.stars,
      }).toEqual({ cleared: true, stars: 3 });
    });

    it("keeps no run's end while the flight that ends it is in the air", () => {
      const game = gameOf("step", "lost");
      playRoundOut(game);

      release(game);

      expect({
        best: TestBed.inject(StatsService).stats().best,
        newBest: game.newBest(),
      }).toEqual({ best: 0, newBest: false });
    });

    it("keeps the run's end, and a new best, as the flight that ends it lands", () => {
      const game = gameOf("step", "lost");
      playRoundOut(game);
      release(game);

      playOut(game);

      expect({
        best: TestBed.inject(StatsService).stats().best,
        newBest: game.newBest(),
      }).toEqual({ best: SPEC_POINTS.step, newBest: true });
    });

    it("says the new best the landing kept as the run's result opens", () => {
      const game = gameOf("step", "lost");
      playRoundOut(game);

      playUntilCard(game);

      expect(said()).toBe(describeEnd(game.run(), true));
    });

    it("keeps nothing of a flight dropped while paused, its level's end held", () => {
      const game = gameOf("cleared");
      release(game);
      playPastABreak(game);
      game.pause();

      game.drop();

      expect({
        cleared: TestBed.inject(ProgressService).cleared().size,
        ending: game.run().ending,
        outcome: game.outcome(),
      }).toEqual({ cleared: 0, ending: "cleared", outcome: "paused" });
    });

    it("keeps the level a flight dropped while paused clears once the level goes on", () => {
      const game = gameOf("cleared");
      release(game);
      playPastABreak(game);
      game.pause();
      game.drop();
      game.resume();

      playUntilLanded(game);

      expect(TestBed.inject(ProgressService).cleared().has(FIRST_ID)).toBe(
        true,
      );
    });

    it("keeps the level a flight paused in the air clears as another run begins", async () => {
      const game = gameOf("cleared");
      release(game);
      game.pause();

      await answered(game.startAt(1), true);

      expect(TestBed.inject(ProgressService).cleared().has(FIRST_ID)).toBe(
        true,
      );
    });

    it("keeps the run's end a flight paused in the air ends as another run begins", async () => {
      const game = gameOf("step", "lost");
      playRoundOut(game);
      release(game);
      game.pause();

      await answered(game.newGame(), true);

      expect(TestBed.inject(StatsService).stats().best).toBe(SPEC_POINTS.step);
    });

    it("keeps the next level open to a run begun on it while the flight that clears it is in the air", async () => {
      const game = gameOf("cleared");
      release(game);
      game.pause();

      await answered(game.startAt(2), true);

      expect(game.tuned()).toBe(false);
    });

    it("keeps nothing for a run played on retuned numbers", () => {
      const game = gameOf("step", "cleared");
      playRoundOut(game);
      game.takeUp(kept(game, game.run().id + 1, true));
      game.resume();

      playRoundOut(game);

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

    it("goes on with a paused level, and says so", () => {
      const game = gameOf("step");
      release(game);
      game.pause();

      game.resume();

      expect([game.outcome(), said()]).toEqual(["playing", "Resumed."]);
    });
  });

  describe("looking away", () => {
    it("keeps the level a flight in the air clears as the page is hidden", () => {
      const game = gameOf("cleared");
      release(game);

      game.lookAway("hidden");

      expect({
        outcome: game.outcome(),
        cleared: TestBed.inject(ProgressService).cleared().has(FIRST_ID),
        stars: TestBed.inject(StatsService).stats().levels[FIRST_ID]?.stars,
      }).toEqual({ outcome: "cleared", cleared: true, stars: 3 });
    });

    it("keeps the level a flight paused in the air clears as the page is hidden after the focus left", () => {
      const game = gameOf("cleared");
      release(game);
      game.lookAway("focus");

      game.lookAway("hidden");

      expect({
        outcome: game.outcome(),
        flying: game.flying(),
        cleared: TestBed.inject(ProgressService).cleared().has(FIRST_ID),
      }).toEqual({ outcome: "cleared", flying: false, cleared: true });
    });

    it("keeps the run's end and its best as a flight paused in the air ends the run and the page is hidden", () => {
      const game = gameOf("step", "lost");
      playRoundOut(game);
      release(game);
      game.lookAway("focus");

      game.lookAway("hidden");

      expect({
        outcome: game.outcome(),
        best: TestBed.inject(StatsService).stats().best,
        newBest: game.newBest(),
      }).toEqual({ outcome: "over", best: SPEC_POINTS.step, newBest: true });
    });

    it("keeps the level a flight dropped while paused clears as the page is hidden, its card left for the page to be seen", () => {
      const game = gameOf("cleared");
      release(game);
      playPastABreak(game);
      game.pause();
      game.drop();

      game.lookAway("hidden");

      expect({
        outcome: game.outcome(),
        cleared: TestBed.inject(ProgressService).cleared().has(FIRST_ID),
        card: game.card(),
      }).toEqual({ outcome: "cleared", cleared: true, card: null });
    });

    it("leaves the landed round's wall to come down once the run goes on, for a player who welcomes motion", () => {
      installFakeViewport(1280);
      const game = gameOf("step");
      release(game);

      game.lookAway("hidden");

      expect([game.phase(), game.outcome()]).toEqual(["settling", "paused"]);
    });

    it("brings the landed round's wall down and aims the next as the run goes on, for a player who welcomes motion", () => {
      installFakeViewport(1280);
      const game = gameOf("step");
      const { next } = released(game);
      game.lookAway("hidden");
      game.resume();

      playOut(game);

      expect([game.phase(), game.start()]).toEqual(["aiming", next]);
    });
  });

  describe("a new game", () => {
    it("keeps fast-forward on", async () => {
      const game = gameOf("step");
      release(game);
      game.fastForward();

      await answered(game.newGame(), true);

      expect(game.fast()).toBe(true);
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

    it("marks the levels it cleared before the one it is on as cleared", () => {
      const played = carded("cleared");
      played.nextLevel();
      playUntilCard(played);
      const taken = kept(played, 2);
      afresh();
      const game = gameOf("step");

      game.takeUp(taken);

      expect(TestBed.inject(ProgressService).cleared()).toEqual(
        new Set([FIRST_ID, SECOND_ID]),
      );
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
      playUntilLanded(game);

      game.tick(FRAME_MS, STILL);

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

    it("hands the steering the mouse's and fingers' way of aiming, as the settings say", () => {
      const game = gameOf();
      const first = game.pointerAiming();

      TestBed.inject(SettingsService).update({ aiming: "pullBack" });

      expect([first, game.pointerAiming()]).toEqual([
        "pointAndHold",
        "pullBack",
      ]);
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

    it.each([
      ["on", false, true, "Fast-forward on."],
      ["off", true, false, "Fast-forward off."],
    ])(
      "switches fast-forward %s at its key, and says so",
      (_, before, after, words) => {
        const game = gameOf("step");
        TestBed.inject(SettingsService).update({ fastForward: before });

        game.fieldCommand("fast");

        expect({ fast: game.fast(), said: said() }).toEqual({
          fast: after,
          said: words,
        });
      },
    );

    it("drops the flight at its key", () => {
      const game = gameOf("step");
      release(game);
      game.tick(FRAME_MS, STILL);

      game.fieldCommand("drop");

      expect(
        game.round()?.flight.events.some(({ kind }) => kind === "drop"),
      ).toBe(true);
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

    it("keeps no records for a run begun at a level the player hasn't opened", async () => {
      const game = gameOf("cleared");
      await game.startAt(3);

      playRoundOut(game);

      expect({
        tuned: game.tuned(),
        cleared: TestBed.inject(ProgressService).cleared().size,
        runs: TestBed.inject(StatsService).stats().runs,
      }).toEqual({ tuned: true, cleared: 0, runs: 0 });
    });

    it("keeps the records of a run begun at a level the player has opened", async () => {
      const game = gameOf("cleared");
      await game.startAt(1);

      playRoundOut(game);

      expect([
        game.tuned(),
        TestBed.inject(ProgressService).cleared().size,
      ]).toEqual([false, 1]);
    });

    it("keeps no records for a run once a number is retuned in it", () => {
      const game = gameOf("cleared");
      TestBed.inject(DebugService).tuning.tune("bored", 40);

      playRoundOut(game);

      expect(TestBed.inject(ProgressService).cleared().size).toBe(0);
    });

    it("keeps no records for a run whose number is retuned while its flight is in the air", () => {
      const game = gameOf("cleared");
      release(game);
      TestBed.inject(DebugService).tuning.tune("bored", 40);

      playOut(game);

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

    it("keeps its first shot until the board is drawn", async () => {
      const { game, asked } = askingGameOf("step");
      await game.playLine(1, () => LINE);
      game.setDrawn(false);
      game.tick(FRAME_MS, STILL);
      const askedUndrawn = asked.length;
      game.setDrawn(true);

      game.tick(FRAME_MS, STILL);

      expect([askedUndrawn, asked.map(([, shot]) => shot)]).toEqual([
        0,
        [LINE_SHOTS[0]],
      ]);
    });

    it("lets none of its flights be dropped", async () => {
      const { game, asked } = askingGameOf("step");
      await game.playLine(1, () => LINE);
      game.tick(FRAME_MS, STILL);

      game.drop();

      expect([asked.length, game.droppable()]).toEqual([1, false]);
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

  describe("the saved game", () => {
    it("is the game the saved game keeps", () => {
      TestBed.configureTestingModule({
        providers: [...provideSpecPlay(), ...provideGame()],
      });

      expect(TestBed.inject(KEPT_GAME)).toBe(TestBed.inject(GameService));
    });

    it("comes back after a page killed mid-flight with the level the flight in the air cleared marked cleared", () => {
      const storage = new MemoryStorage();
      released(keptIn(storage, "cleared"));
      TestBed.tick();
      afresh();

      keptIn(storage);

      expect(TestBed.inject(ProgressService).cleared().has(FIRST_ID)).toBe(
        true,
      );
    });

    it("comes back after a reload mid-flight, after the round a drop flew again", () => {
      const storage = new MemoryStorage();
      const dropping = keptIn(storage, "cleared");
      release(dropping);
      TestBed.tick();
      dropping.tick(FRAME_MS, STILL);
      dropping.drop();
      const next = dropping.round()?.next;
      TestBed.tick();
      afresh();

      const game = keptIn(storage);

      expect({
        level: game.level().number,
        rounds: game.rounds(),
        start: game.start(),
      }).toEqual({ level: 1, rounds: 1, start: next });
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

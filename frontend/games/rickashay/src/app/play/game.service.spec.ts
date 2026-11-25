import { TestBed } from "@angular/core/testing";
import { levelAt } from "@fz/brick-wall/rules/progress";
import { createRun } from "@fz/brick-wall/rules/run";
import { FRAME_MS, playFor, playUntil } from "@fz/core/testing";
import { installFakeViewport } from "@fz/game-ui/testing";
import { NO_INSETS } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";
import { paintRoles } from "@fz/style/testing";
import { AnnouncerService } from "@fz/ui/announcer";
import { ConfirmService } from "@fz/ui/confirm";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { ThemeService } from "@fz/ui/theme";
import type { RoundStart } from "../../rules/flight/events";
import { guideOf } from "../../rules/flight/guide";
import {
  describeAim,
  describeGuide,
  describeRound,
  describeRows,
} from "../../rules/run/describe";
import { type Run, levelOf, openingOf, runRulesOf } from "../../rules/run/run";
import type { Shot } from "../../rules/shot";
import { FLIGHT_RULES, type FlightRules } from "../../rules/tuning";
import { PALETTES } from "../../testing/roles";
import {
  RELEASE,
  SPEC_FLIGHTS,
  SPEC_LEVELS,
  SPEC_MARKS,
  STILL,
  type SpecRound,
  playOut,
  playRoundOut,
  playUntilCard,
  provideSpecPlay,
  release,
  scriptedRounds,
} from "../../testing/spec_play";
import { FIELD_ROLES, wallPalette } from "../../view/colors/palette";
import { DebugService } from "../debug/debug.service";
import { FLIGHT_PACE } from "../../view/play/pace";
import { SettingsService } from "../settings/settings.service";
import { ProgressService } from "../stats/progress.service";
import { StatsService } from "../stats/stats.service";
import type { RoundPlayer } from "../tokens";
import { GameService, provideGame } from "./game.service";
import { SavedGameService } from "./saved_game.service";

// How a wall game's run is driven, its records kept and its moves made is
// `@fz/brick-wall/app/round_driver`'s, whose spec holds it: this one holds
// Rickashay's wiring of it.

/** The first spec level's id, by which its records are kept. */
const FIRST_ID = levelAt(SPEC_LEVELS, 1).data.id;

/** An aim other than straight up. */
const LEANING = 200;

/** Returns the game, its rounds played as a script says, over the specs' levels. */
function gameOf(...script: readonly SpecRound[]): GameService {
  return gameWith(scriptedRounds(...script));
}

/** Returns the game, its rounds played by a round player, over the specs' levels. */
function gameWith(rounds: RoundPlayer): GameService {
  TestBed.configureTestingModule({ providers: provideSpecPlay(rounds) });
  return TestBed.inject(GameService);
}

/** Returns the game as the page starts it, the saved game made first, which keeps it in a store. */
function keptIn(
  storage: MemoryStorage,
  ...script: readonly SpecRound[]
): GameService {
  TestBed.resetTestingModule();
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

/** Returns the sounds the view's log of the round's events has called for, in order. */
function soundsCalledFor(game: GameService): string[] {
  const sounds: string[] = [];
  game.view().events.forEachSince(0, ({ effects }) => {
    sounds.push(...effects.sounds.map(({ sound }) => sound));
  });
  return sounds;
}

describe("GameService", () => {
  describe("a run", () => {
    it("begins at the first level, its par and its rally mark on the room's depth from the marks", () => {
      const game = gameOf();

      expect({
        level: game.run().level,
        depth: game.run().depth,
        par: game.par(),
        mark: game.rallyMark(),
      }).toEqual({ level: 1, depth: 13, par: 8, mark: 9 });
    });

    it("says a level begun with its par and its rally mark", async () => {
      const game = gameOf();

      await game.startAt(2);

      expect(said()).toBe("Level 2, Side door. Par 9. Rally mark 11.");
    });

    it("releases a shot the steering lets fly, its aim alone, on the rules' own numbers", () => {
      const shots: [Shot, FlightRules][] = [];
      const play = scriptedRounds("step");
      const game = gameWith((start, shot, rules) => {
        shots.push([shot, rules]);
        return play(start, shot, rules);
      });
      TestBed.inject(SettingsService).update({ guideTurns: 5 });

      game.tick(FRAME_MS, { ...RELEASE, aim: LEANING });

      expect([game.phase(), shots]).toEqual([
        "flying",
        [[{ aim: LEANING }, FLIGHT_RULES]],
      ]);
    });

    it("counts how many of the wall's rows wait over the ceiling", () => {
      const game = gameOf();

      expect(game.rowsLeft()).toBeGreaterThan(0);
    });

    it("keeps a level cleared in the records as its flight lands", () => {
      const game = gameOf("cleared");
      release(game);

      playOut(game);

      expect({
        cleared: [...TestBed.inject(ProgressService).cleared()],
        record: TestBed.inject(StatsService).stats().levels[FIRST_ID],
      }).toEqual({
        cleared: [FIRST_ID],
        record: {
          points: game.score(),
          rounds: 1,
          rally: 1,
          stars: { cleared: true, par: true, mark: false },
        },
      });
    });

    it("says a round's end as its wall comes to rest", () => {
      const game = gameOf("step");
      release(game);
      const round = game.round();

      playOut(game);

      expect(said()).toBe(round && describeRound(round.outcome, game.start()));
    });

    it("says the score once as the last level is cleared, in the run's end", async () => {
      const game = gameOf("cleared");
      await game.startAt(SPEC_LEVELS.length);

      playUntilCard(game);

      expect(said()).toBe(
        "Level 3 cleared in 1 shot. 2 stars: cleared and within 5 shots. Every level cleared. Score 410.",
      );
    });

    it("plays a level until its card opens", () => {
      const game = gameOf("step", "cleared");

      playUntilCard(game);

      expect([game.card(), game.outcome()]).toEqual(["cleared", "cleared"]);
    });
  });

  describe("a flight", () => {
    it("is called out at the level's rally mark", () => {
      const game = gameOf("rally");

      playRoundOut(game);

      expect(soundsCalledFor(game)).toContain("call");
    });

    it("is called out at no rally short of the mark", () => {
      const game = gameOf("step");

      playRoundOut(game);

      expect(soundsCalledFor(game)).not.toContain("call");
    });

    it("counts the level's best rally as it plays back, and once it lands", () => {
      const game = gameOf("rally");
      release(game);
      const leaving = game.bestRally();

      playOut(game);

      expect([leaving, game.bestRally()]).toEqual([
        0,
        SPEC_FLIGHTS.rally.rally,
      ]);
    });

    it("keeps the level's best rally while a shorter flight plays back", () => {
      const game = gameOf("rally", "step");
      playRoundOut(game);

      release(game);

      expect(game.bestRally()).toBe(SPEC_FLIGHTS.rally.rally);
    });

    it("plays at the speed the settings set, fast-forwarded as they keep it", () => {
      installFakeViewport(400, 700);
      const game = gameOf("rally");
      const settings = TestBed.inject(SettingsService);
      settings.update({ flightSpeed: "fast", fastForward: true });
      release(game);
      const moment = game.report().moment;

      playFor(game, 100, STILL);

      expect(game.report().moment - moment).toBeCloseTo(
        FLIGHT_PACE.speeds.fast[0] * FLIGHT_PACE.fastForward * 0.1,
        0,
      );
    });

    it("is landed at once by a Skip, with all it would have done", () => {
      const game = gameOf("rally");
      release(game);

      game.fieldCommand("skip");

      expect([game.flying(), game.bestRally()]).toEqual([
        false,
        SPEC_FLIGHTS.rally.rally,
      ]);
    });

    it("lands unseen and unheard as the page is hidden, the run paused", () => {
      const game = gameOf("rally");
      release(game);

      game.lookAway("hidden");

      expect({
        flying: game.flying(),
        outcome: game.outcome(),
        called: soundsCalledFor(game),
      }).toEqual({ flying: false, outcome: "paused", called: [] });
    });

    it("stays in the air, paused, as the player looks away otherwise", () => {
      const game = gameOf("rally");
      release(game);

      game.lookAway("focus");

      expect([game.flying(), game.outcome()]).toEqual([true, "paused"]);
    });

    it("comes back after itself, paused, as the page reloads mid-flight", () => {
      const storage = new MemoryStorage();
      const before = keptIn(storage, "step");
      release(before);
      TestBed.tick();
      const next = before.nextStart();

      const game = keptIn(storage, "step");

      expect([game.start(), game.outcome(), game.run().rounds]).toEqual([
        next,
        "paused",
        1,
      ]);
    });
  });

  describe("the announcer", () => {
    it("says the aim as the keys move it", () => {
      const game = gameOf();

      game.tick(FRAME_MS, { ...STILL, aim: LEANING, keyed: true });

      expect(said()).toBe(describeAim(LEANING));
    });

    it("leaves the aim unsaid as a pointer moves it", () => {
      const game = gameOf();
      const before = said();

      game.tick(FRAME_MS, { ...STILL, aim: LEANING });

      expect(said()).toBe(before);
    });

    it("says a floor bounce earned as the flight reaches it", () => {
      const game = gameOf("rally");
      release(game);

      playUntil(
        game,
        () => STILL,
        () => game.soFar().held > 0,
      );

      expect(said()).toBe("Rally 10: a floor bounce.");
    });

    it("says the flight's floor bounce and call before the round's end, where one frame brings both", () => {
      const game = gameOf("rally");
      release(game);

      game.tick(60_000, STILL);

      expect(said()).toMatch(
        /^Rickaashay! Rally 10: a floor bounce\. A rally of 11\./,
      );
    });

    it("says nothing of the floor bounces or the call a flight landed by Skip skipped", () => {
      const game = gameOf("rally");
      release(game);

      game.fieldCommand("skip");
      playUntil(
        game,
        () => STILL,
        () => game.phase() === "aiming",
      );

      expect(said()).not.toMatch(/floor bounce|Rickaashay/);
    });

    it("says the call as a flight reaches the level's rally mark", () => {
      const game = gameOf("rally");
      release(game);

      playUntil(
        game,
        () => STILL,
        () => game.call() !== null,
      );

      expect(said()).toBe("Rickaashay!");
    });
  });

  // The Ready card shows a level's par and rally mark for the field's depth,
  // which a turn of the screen can change before the level's first shot.
  describe("the announcer, as the Ready card's par and rally mark change", () => {
    /** A room 22 rows deep, where the run begins 13 deep. */
    const DEEPEST: Viewport = {
      width: 900,
      height: 2400,
      pixelRatio: 1,
      insets: NO_INSETS,
    };

    /** A room 22 rows deep too, a little taller. */
    const DEEPEST_TALLER: Viewport = { ...DEEPEST, height: 2500 };

    /** A room 13 rows deep, an upright phone's, as the run begins on. */
    const FIRST: Viewport = {
      width: 390,
      height: 640,
      pixelRatio: 1,
      insets: NO_INSETS,
    };

    /** Returns the game, level 2 begun and said on the first room's depth. */
    async function levelSaid(): Promise<GameService> {
      const game = gameOf();
      await game.startAt(2);
      return game;
    }

    it("says them as they are on the field's new depth", async () => {
      const game = await levelSaid();

      game.setRoom(DEEPEST);
      TestBed.tick();

      expect([said(), game.run().depth]).toEqual(["Par 6. Rally mark 15.", 22]);
    });

    it("says them once, not again as the room changes and they don't", async () => {
      const game = await levelSaid();
      game.setRoom(DEEPEST);
      TestBed.tick();

      game.setRoom(DEEPEST_TALLER);
      TestBed.tick();

      expect(said()).toBe("Par 6. Rally mark 15.");
    });

    it("says them again as they go back to those said as the level began", async () => {
      const game = await levelSaid();
      game.setRoom(DEEPEST);
      TestBed.tick();

      game.setRoom(FIRST);
      TestBed.tick();

      expect([said(), game.run().depth]).toEqual(["Par 9. Rally mark 11.", 13]);
    });

    it("says nothing of a level the page opened on, never said", () => {
      const game = gameOf();
      const before = said();

      game.setRoom(DEEPEST);
      TestBed.tick();

      expect(said()).toBe(before);
    });

    it("says nothing of a run taken up, its level never said, as it goes on", async () => {
      const game = await levelSaid();
      const rules = runRulesOf(SPEC_LEVELS, SPEC_MARKS);
      const run: Run = {
        ...createRun({ id: 9, level: 1, depth: 13 }, SPEC_LEVELS, rules),
        outcome: "paused",
      };
      const start = openingOf(run, levelOf(run, SPEC_LEVELS));
      game.takeUp({ run, start, tuned: false });

      game.resume();
      TestBed.tick();

      expect(said()).toBe("Resumed.");
    });
  });

  describe("aiming", () => {
    it("is under way as a level waits for its first shot", () => {
      const game = gameOf();

      expect(game.aiming()).toBe(true);
    });

    it("is under way as the next shot is aimed", () => {
      const game = gameOf();

      playRoundOut(game);

      expect(game.aiming()).toBe(true);
    });

    it("isn't while a flight is in the air", () => {
      const game = gameOf();

      release(game);

      expect(game.aiming()).toBe(false);
    });

    it("isn't while the level is paused", () => {
      const game = gameOf();
      playRoundOut(game);

      game.pause();

      expect(game.aiming()).toBe(false);
    });

    it("isn't once the level is lost", () => {
      const game = gameOf("lost");

      playUntilCard(game);

      expect(game.aiming()).toBe(false);
    });
  });

  describe("the guide", () => {
    it("is the rules' own flight for the aim, cast to the turn the settings ask for", () => {
      const game = gameOf();
      TestBed.inject(SettingsService).update({ guideTurns: 1 });

      game.tick(FRAME_MS, { ...STILL, aim: LEANING });

      expect(game.guide()).toEqual(
        guideOf(
          game.start(),
          { aim: LEANING },
          { ...FLIGHT_RULES, guideTurns: 1 },
        ),
      );
    });

    it("is cast once for an aim held still", () => {
      const game = gameOf();
      game.tick(FRAME_MS, STILL);
      const first = game.guide();

      game.tick(FRAME_MS, STILL);

      expect(game.guide()).toBe(first);
    });

    it("is cast again as the aim moves", () => {
      const game = gameOf();
      game.tick(FRAME_MS, STILL);
      const first = game.guide();

      game.tick(FRAME_MS, { ...STILL, aim: LEANING });

      expect(game.guide()).not.toBe(first);
    });

    it("is cast again as the settings ask for another turn", () => {
      const game = gameOf();
      game.tick(FRAME_MS, STILL);
      const first = game.guide();

      TestBed.inject(SettingsService).update({ guideTurns: 5 });

      expect(game.guide()).not.toBe(first);
    });

    it("is cast again from the next round's start", () => {
      const game = gameOf("step");
      game.tick(FRAME_MS, STILL);
      const first = game.guide();

      playRoundOut(game);

      expect(game.guide()).not.toBe(first);
    });
  });

  describe("the keys", () => {
    it("switch fast-forward on with F, kept in the settings, and say so", () => {
      const game = gameOf();

      game.fieldCommand("fast");

      expect([game.fast(), said()]).toEqual([true, "Fast-forward on."]);
    });

    it("read the guide with G: the aim and each turn it shows", () => {
      const game = gameOf();
      game.tick(FRAME_MS, { ...STILL, aim: LEANING });
      const guide = game.guide();

      game.fieldCommand("readGuide");

      expect(said()).toBe(
        describeGuide(LEANING, guide?.events ?? [], game.start()),
      );
    });

    it("read no guide with G while the fuzzball flies", () => {
      const game = gameOf();
      release(game);

      game.fieldCommand("readGuide");

      expect(said()).not.toMatch(/degrees/);
    });

    it("read the wall's lowest rows with R", () => {
      const game = gameOf();

      game.fieldCommand("readRows");

      expect(said()).toBe(describeRows(game.start()));
    });

    it("pause the run as every run's keys do", () => {
      const game = gameOf();
      release(game);

      game.fieldCommand("pause");

      expect(game.outcome()).toBe("paused");
    });
  });

  describe("the settings", () => {
    it("turn the sound off and on, kept", () => {
      const game = gameOf();

      game.toggleSound();

      expect({
        sound: game.sound(),
        shown: game.soundOn(),
        kept: TestBed.inject(SettingsService).settings().sound,
      }).toEqual({ sound: false, shown: false, kept: false });
    });

    it("hand the steering the way the mouse and fingers aim and let fly", () => {
      const game = gameOf();
      const first = [game.pointerAiming(), game.pointerRelease()];

      TestBed.inject(SettingsService).update({
        aiming: "pullBack",
        releaseByButton: true,
      });

      expect([first, [game.pointerAiming(), game.pointerRelease()]]).toEqual([
        ["pointAndHold", "onLetGo"],
        ["pullBack", "byButton"],
      ]);
    });

    it("hand the scene the rules' numbers, the guide's turn as they ask", () => {
      const game = gameOf();

      TestBed.inject(SettingsService).update({ guideTurns: 5 });

      expect(game.fieldRules()).toEqual({ ...FLIGHT_RULES, guideTurns: 5 });
    });
  });

  describe("Release", () => {
    it.each([
      [false, "onLetGo"],
      [true, "byButton"],
    ] as const)(
      "asks for the bar's button where the settings say %s",
      (byButton, release) => {
        const game = gameOf();

        TestBed.inject(SettingsService).update({ releaseByButton: byButton });

        expect([game.releaseByButton(), game.pointerRelease()]).toEqual([
          byButton,
          release,
        ]);
      },
    );
  });

  describe("the field", () => {
    it("is drawn in the palette on the page", () => {
      const roles = PALETTES.rolesIn("midnight", FIELD_ROLES);
      paintRoles(FIELD_ROLES, roles);
      const game = gameOf();

      expect(game.palette()).toEqual(
        wallPalette(roles, TestBed.inject(ThemeService).mode()),
      );
    });

    it("moves where motion is welcome", () => {
      installFakeViewport(400, 700);
      const game = gameOf();

      expect(game.motion()).toBe(true);
    });

    it("draws the next round's wall once it is aimed", () => {
      const game = gameOf("step");
      const first: RoundStart = game.start();

      playUntil(
        game,
        () => RELEASE,
        () => game.run().rounds === 1 && game.phase() === "aiming",
      );

      expect([game.start() === first, game.view().wall]).toEqual([
        false,
        game.start().wall,
      ]);
    });
  });

  describe("the debug menu", () => {
    /** A room tall enough for every depth the menu sets. */
    const TALL: Viewport = {
      width: 900,
      height: 2400,
      pixelRatio: 1,
      insets: NO_INSETS,
    };

    /** Answers the question a run's start asks before the run in progress is lost, yes or no, and returns whether it began. */
    async function answered(
      starting: Promise<boolean>,
      yes: boolean,
    ): Promise<boolean> {
      const confirm = TestBed.inject(ConfirmService);
      if (yes) confirm.accept();
      else confirm.cancel();
      return starting;
    }

    /** Returns the game in a room tall enough for every depth, the menu's depth set. */
    function onDepth(
      depth: number,
      ...script: readonly SpecRound[]
    ): GameService {
      const game = gameOf(...script);
      game.setRoom(TALL);
      TestBed.inject(DebugService).setDepth(depth);
      TestBed.tick();
      return game;
    }

    /** Returns the game, its rounds played as a script says, each shot and the rules it was released on kept in `shots`. */
    function gameKeeping(
      shots: [Shot, FlightRules][],
      ...script: readonly SpecRound[]
    ): GameService {
      const play = scriptedRounds(...script);
      return gameWith((start, shot, rules) => {
        shots.push([shot, rules]);
        return play(start, shot, rules);
      });
    }

    it("releases the player's shot on the numbers it tunes", () => {
      const shots: [Shot, FlightRules][] = [];
      const game = gameKeeping(shots);
      TestBed.inject(DebugService).tuning.tune("bored", 120);

      release(game);

      expect(shots.map(([, rules]) => rules.bored)).toEqual([120]);
    });

    it("casts the guide on the numbers it tunes", () => {
      const game = gameOf();

      TestBed.inject(DebugService).tuning.tune("guidePast", 0.5);

      expect(game.fieldRules().guidePast).toBe(0.5);
    });

    it("plays a flight back at the pace it tunes", () => {
      installFakeViewport(400, 700);
      const game = gameOf("rally");
      TestBed.inject(DebugService).tuning.tune("normal", 40);
      release(game);
      const moment = game.report().moment;

      playFor(game, 100, STILL);

      expect(game.report().moment - moment).toBeCloseTo(40 * 0.1, 0);
    });

    it("holds the hatches up as often as it tunes", () => {
      const game = gameOf();

      TestBed.inject(DebugService).tuning.tune("hatchHolds", 5);
      playRoundOut(game);

      expect(game.view().holdsLeft).toBe(5);
    });

    it("plays a line's shots, one as each round is aimed, on the rules' own numbers, off the record", async () => {
      const shots: [Shot, FlightRules][] = [];
      const game = gameKeeping(shots);
      const debug = TestBed.inject(DebugService);
      debug.tuning.tune("bored", 120);

      const began = await game.playLine(2, () => [300, 340]);
      playRoundOut(game);
      playRoundOut(game);

      expect({ began, shots, offRecord: debug.runOffRecord() }).toEqual({
        began: true,
        shots: [
          [{ aim: 300 }, FLIGHT_RULES],
          [{ aim: 340 }, FLIGHT_RULES],
        ],
        offRecord: true,
      });
    });

    it("plays the player's shots again once the line has flown", async () => {
      const shots: [Shot, FlightRules][] = [];
      const game = gameKeeping(shots);
      await game.playLine(1, () => [300]);
      playRoundOut(game);

      game.tick(FRAME_MS, { ...RELEASE, aim: LEANING });

      expect(shots.map(([shot]) => shot.aim)).toEqual([300, LEANING]);
    });

    it("drops a line as the next level begins", async () => {
      const shots: [Shot, FlightRules][] = [];
      const game = gameKeeping(shots, "cleared", "step");
      await game.playLine(1, () => [300, 340]);
      playRoundOut(game);
      playUntil(
        game,
        () => STILL,
        () => game.card() !== null,
      );

      game.nextLevel();
      game.tick(FRAME_MS, { ...RELEASE, aim: LEANING });

      expect(shots.map(([shot]) => shot.aim)).toEqual([300, LEANING]);
    });

    it("shows the hatches' own holds over a line's shot, which flies on the game's own rules", async () => {
      const game = gameOf("step");
      TestBed.inject(DebugService).tuning.tune("hatchHolds", 5);
      await game.playLine(1, () => [300, 340]);

      game.tick(FRAME_MS, STILL);

      expect(game.view().holdsLeft).toBe(FLIGHT_RULES.hatchHolds);
    });

    it("shows the holds it tunes again for the player's shot once the line has flown", async () => {
      const game = gameOf("step");
      TestBed.inject(DebugService).tuning.tune("hatchHolds", 5);
      await game.playLine(1, () => [300]);
      game.tick(FRAME_MS, STILL);

      playOut(game);

      expect(game.view().holdsLeft).toBe(5);
    });

    it("keeps the next of a line's shots for when a paused level goes on", async () => {
      const shots: [Shot, FlightRules][] = [];
      const game = gameKeeping(shots);
      await game.playLine(1, () => [300, 340]);
      playRoundOut(game);
      game.pause();
      game.tick(FRAME_MS, STILL);
      game.resume();

      game.tick(FRAME_MS, STILL);

      expect(shots.map(([shot]) => shot.aim)).toEqual([300, 340]);
    });

    it("lets none of a line's shots fly while the level is paused", async () => {
      const shots: [Shot, FlightRules][] = [];
      const game = gameKeeping(shots);
      await game.playLine(1, () => [300, 340]);
      playRoundOut(game);
      game.pause();

      game.tick(FRAME_MS, STILL);

      expect(shots).toHaveLength(1);
    });

    it("drops a line once the field takes another depth", async () => {
      const shots: [Shot, FlightRules][] = [];
      const game = gameKeeping(shots);
      game.setRoom(TALL);
      const debug = TestBed.inject(DebugService);
      debug.setDepth(12);
      TestBed.tick();
      await game.playLine(1, () => [300, 340]);
      playRoundOut(game);
      debug.setDepth(13);
      TestBed.tick();

      game.tick(FRAME_MS, STILL);

      expect(shots).toHaveLength(1);
    });

    it("drops a line as another run begins", async () => {
      const shots: [Shot, FlightRules][] = [];
      const game = gameKeeping(shots);
      await game.playLine(1, () => [300, 340]);
      playRoundOut(game);
      await answered(game.startAt(1), true);

      game.tick(FRAME_MS, { ...RELEASE, aim: LEANING });

      expect(shots.map(([shot]) => shot.aim)).toEqual([300, LEANING]);
    });

    it("takes the line for the field's depth", async () => {
      const game = onDepth(12, "step");

      const began = await game.playLine(2, (depth) =>
        depth === 12 ? [300] : null,
      );

      expect([began, game.run().depth]).toEqual([true, 12]);
    });

    it("begins none where the field took another depth while the player was asked", async () => {
      const game = onDepth(12, "step");
      playRoundOut(game);
      const run = game.run();
      const starting = game.playLine(1, (depth) =>
        depth === 12 ? [300] : null,
      );
      TestBed.inject(DebugService).setDepth(13);
      TestBed.tick();

      const began = await answered(starting, true);

      expect([began, game.run()]).toEqual([false, run]);
    });

    it("begins none if the player keeps the run in progress", async () => {
      const game = gameOf("step");
      playRoundOut(game);
      const run = game.run();

      const began = await answered(
        game.playLine(1, () => [300]),
        false,
      );

      expect([began, game.run()]).toEqual([false, run]);
    });

    it("asks nothing where no line holds the field's depth", async () => {
      const game = gameOf("step");
      playRoundOut(game);

      const began = await game.playLine(1, () => null);

      expect([began, TestBed.inject(ConfirmService).isOpen()]).toEqual([
        false,
        false,
      ]);
    });

    it("begins no run where no line holds the field's depth", async () => {
      const game = gameOf();

      const began = await game.playLine(2, () => null);

      expect([began, game.run().level]).toEqual([false, 1]);
    });
  });
});

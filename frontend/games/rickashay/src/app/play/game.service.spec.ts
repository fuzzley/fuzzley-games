import { TestBed } from "@angular/core/testing";
import { FRAME_MS, playFor, playUntil } from "@fz/core/testing";
import { installFakeViewport } from "@fz/game-ui/testing";
import { paintRoles } from "@fz/style/testing";
import { AnnouncerService } from "@fz/ui/announcer";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { ThemeService } from "@fz/ui/theme";
import type { RoundStart } from "../../rules/flight/events";
import { guideOf } from "../../rules/flight/guide";
import { levelEntryOf } from "../../rules/levels/levels";
import {
  describeGuide,
  describeRound,
  describeRows,
} from "../../rules/run/describe";
import type { Shot } from "../../rules/shot";
import { FLIGHT_RULES, type FlightRules } from "../../rules/tuning";
import { PALETTES } from "../../testing/roles";
import {
  RELEASE,
  SPEC_FLIGHTS,
  SPEC_LEVELS,
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
const FIRST_ID = levelEntryOf(SPEC_LEVELS, 1).data.id;

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
});

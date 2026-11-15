import { TestBed } from "@angular/core/testing";
import { formatPoints } from "@fz/core/format";
import { randomSeed } from "@fz/core/random";
import { FRAME_MS, playFor, playUntil } from "@fz/core/testing";
import { installFakeViewport } from "@fz/game-ui/testing";
import { NO_INSETS } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";
import { AnnouncerService } from "@fz/ui/announcer";
import { ConfirmService } from "@fz/ui/confirm";
import { fillFor } from "../../rules/field/fill";
import type { Rock } from "../../rules/rocks/rocks";
import {
  type SavedGame,
  type TakenUp,
  restoreGame,
} from "../../rules/run/saved_game";
import { RULES_VERSION, type SpeedStats } from "../../rules/run/stats";
import { STILL, type Steer } from "../../rules/ship/ship";
import { STEP_MS } from "../../rules/stepper";
import {
  CLEAN_POINTS,
  CLEAR_POINTS,
  FIELD_SHORT_SIDE,
  FIRST_CREW,
  STATIC_HOLD_MS,
  STATIC_STEPS,
} from "../../rules/tuning";
import { endlessWave } from "../../rules/waves/endless";
import {
  WAVES,
  type WaveEntry,
  isEndless,
  wavesOf,
} from "../../rules/waves/waves";
import { speedOf } from "../../testing/field_picture";
import {
  SECTOR_WAVES,
  SPEC_RANDOM,
  SPEC_WAVE,
  SPEC_WAVES,
  STRAY_WAVES,
  bringStraysHome,
  clearIn,
  clearToNext,
  endRun,
  loseShip,
  playToClear,
  pressOn,
  provideSpecWaves,
  shoot,
  takeUpCharged,
} from "../../testing/play";
import type { Feel } from "../../view/debug_tuning";
import { CLEARED_BUZZ, LOST_BUZZ } from "../../view/effects/haptics";
import { CLEARED_MS } from "../../view/effects/timing";
import type { BoardSetting } from "../../view/field/field_metrics";
import { constellationAt } from "../../view/field/specks";
import { TALLY_COUNT_MS } from "../../view/tally";
import { SettingsService } from "../settings/settings.service";
import { ProgressService } from "../stats/progress.service";
import { StatsService } from "../stats/stats.service";
import { GAME_WAVES, TUNING } from "../tokens";
import { GameService } from "./game.service";

/** A board with no margin and no deck, as on a screen with no touch. */
const BOARD: BoardSetting = {
  marginCss: 0,
  deck: false,
  stickOnRight: false,
  fireByItself: false,
};

/** A canvas on its side, which shapes a field wider than it is tall. */
const WIDE: Viewport = {
  width: 1280,
  height: 720,
  pixelRatio: 1,
  insets: NO_INSETS,
};

/** A square canvas, which shapes a field of the first wave's shape, the short side's square. */
const SQUARE: Viewport = { ...WIDE, width: 800, height: 800 };

/** Fire held, which a new wave's ship takes as held when it is held as the wave is laid out. */
const FIRE: Readonly<Steer> = { ...STILL, fire: true };

/** A turn of the keys, a first move that fires no shot. */
const TURN: Readonly<Steer> = { ...STILL, turn: 1 };

/** The points the specs' medium stone and its two small pieces score. */
const PEBBLE_POINTS = 100;

/** What a run has of its own as it begins: no static, its pilot at rest, no cards, nothing set. */
const BEGUN_OWN = {
  multiplier: 1,
  step: 0,
  face: "rest",
  lift: 0,
  tally: null,
  clearedOpen: false,
  tallyMs: 0,
  newBest: false,
  clearedAll: false,
  broughtHome: [],
  resultOpen: false,
  resultClosed: false,
};

/** Lets every promise the game is waiting on settle. */
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Tunes a number that sets the feel, as the debug menu does. */
function tune<K extends keyof Feel>(id: K, value: Feel[K]): void {
  TestBed.inject(TUNING).tune(id, value);
}

/** Puts the numbers that set the feel back to `tuning.ts`'s, as the debug menu does. */
function resetTuning(): void {
  TestBed.inject(TUNING).reset();
}

/** Returns what the live region last said. */
function said(): string {
  return TestBed.inject(AnnouncerService).message();
}

/** Returns the game with a new run at one of the specs' waves, waiting for its first move. */
async function gameAt(wave: number): Promise<GameService> {
  const game = TestBed.inject(GameService);
  await game.startAt(wave);
  return game;
}

/** Returns the game with its run's wave started by a first move. */
async function startedAt(wave: number): Promise<GameService> {
  const game = await gameAt(wave);
  game.tick(FRAME_MS, shoot(game));
  return game;
}

/** Returns the game with the wave its run is at cleared. */
async function clearedAt(wave: number): Promise<GameService> {
  const game = await gameAt(wave);
  playToClear(game);
  return game;
}

/** Returns the game over waves of a spec's own, its run waiting at the first for its first move. */
function gameOver(waves: readonly WaveEntry[]): GameService {
  TestBed.overrideProvider(GAME_WAVES, { useValue: waves });
  return TestBed.inject(GameService);
}

/** Returns the game with a run at a wave that has lost every ship. */
async function endedAt(wave: number): Promise<GameService> {
  const game = await gameAt(wave);
  endRun(game);
  return game;
}

/** Returns what the run on the board has of its own: its static, its pilot's face and fur, its cards and what it set. */
function ownOf(game: GameService): Record<string, unknown> {
  return {
    multiplier: game.multiplier(),
    step: game.step(),
    face: game.face(),
    lift: game.lift(),
    tally: game.tally(),
    clearedOpen: game.clearedOpen(),
    tallyMs: game.tallyMs(),
    newBest: game.newBest(),
    clearedAll: game.clearedAll(),
    broughtHome: game.broughtHome(),
    resultOpen: game.resultOpen(),
    resultClosed: game.resultClosed(),
  };
}

/** Returns a run the game kept, as a page would take it up, under the id its next run takes. */
function takenUp(
  game: GameService,
  saved: SavedGame | null,
  waves: readonly WaveEntry[] = SPEC_WAVES,
): TakenUp {
  const taken = restoreGame(saved, waves, game.run().id + 1);
  if (!taken) throw new Error("The run kept can't be taken up.");
  return taken;
}

beforeEach(() => {
  TestBed.configureTestingModule({ providers: provideSpecWaves() });
});

describe("GameService", () => {
  describe("a new run", () => {
    it("starts a visit's first run at the speed the settings keep", () => {
      TestBed.inject(SettingsService).update({ speed: "fast" });

      const game = TestBed.inject(GameService);

      expect(game.speed()).toBe("fast");
    });

    it("waits at the first wave for its first move, with the first ships and no points", () => {
      const game = TestBed.inject(GameService);

      expect({
        outcome: game.outcome(),
        wave: game.wave().number,
        speed: game.speed(),
        ships: game.ships(),
        score: game.score(),
      }).toEqual({
        outcome: "ready",
        wave: 1,
        speed: "normal",
        ships: FIRST_CREW,
        score: 0,
      });
    });

    it("starts its wave at the first move, and says which it is", () => {
      const game = TestBed.inject(GameService);

      game.tick(FRAME_MS, shoot(game));

      expect({ outcome: game.outcome(), said: said() }).toEqual({
        outcome: "playing",
        said: "Wave 1, Pebble. 1 rock.",
      });
    });

    it("takes its seed from the game's random, and strews its place's stars from it", () => {
      const game = TestBed.inject(GameService);

      expect([game.run().seed, game.frame().seed]).toEqual([
        randomSeed(SPEC_RANDOM),
        randomSeed(SPEC_RANDOM),
      ]);
    });
  });

  describe("time", () => {
    it("steps the field as often as a frame's time holds a step", () => {
      const game = TestBed.inject(GameService);

      game.tick(10.5 * STEP_MS, shoot(game));

      expect(game.frame().field.steps).toBe(10);
    });

    it("draws between steps as far as the time left over goes", () => {
      const game = TestBed.inject(GameService);

      game.tick(1.25 * STEP_MS, shoot(game));

      expect(game.frame().alpha).toBeCloseTo(0.25);
    });
  });

  describe("the crew", () => {
    it("flies a new run's ships with pilots in the first colors, and no one at home", () => {
      const game = TestBed.inject(GameService);

      expect(game.crew()).toMatchObject({ pilot: 0, tow: [1, 2], home: [] });
    });

    it("flies a stray brought home at once, in the next color, keeping it among those brought home", () => {
      const game = gameOver(STRAY_WAVES);

      bringStraysHome(game, 1);

      expect({
        crew: game.crew(),
        broughtHome: game.broughtHome(),
      }).toMatchObject({
        crew: { pilot: 0, tow: [1, 2, 3], home: [] },
        broughtHome: [3],
      });
    });

    it("keeps the pilots of the strays the run brings home, in the order they came", () => {
      const game = gameOver(STRAY_WAVES);

      bringStraysHome(game, 2);

      expect(game.broughtHome()).toEqual([3, 4]);
    });

    it("starts a new run with no strays brought home", () => {
      const game = gameOver(STRAY_WAVES);
      bringStraysHome(game, 1);
      endRun(game);

      game.tryAgain();

      expect(game.broughtHome()).toEqual([]);
    });
  });

  describe("static", () => {
    /** Where static's last step but full, ×4, starts. */
    const TOP_STEP = STATIC_STEPS[0].from;

    it("scores a new run's points once, on no step", () => {
      const game = TestBed.inject(GameService);

      expect([game.multiplier(), game.step()]).toEqual([1, 0]);
    });

    it("takes up a run with the static its field was kept with, before it goes on", async () => {
      const game = await startedAt(SPEC_WAVE.pebble);

      takeUpCharged(game, 25);

      expect([game.multiplier(), game.step()]).toEqual([3, 2]);
    });

    it("keeps static through a pause, as its drain stands still", async () => {
      const game = await startedAt(SPEC_WAVE.pebble);
      takeUpCharged(game, STATIC_STEPS[1].from);

      playFor(game, 2 * STATIC_HOLD_MS, STILL);

      expect([game.multiplier(), game.step()]).toEqual([3, 2]);
    });

    it("lays the next wave out with the static the run carries to it", async () => {
      const game = await clearedAt(SPEC_WAVE.pebble);
      const saved = game.saved();
      game.takeUp(takenUp(game, saved && { ...saved, charge: 25 }));
      game.resume();

      game.tick(FRAME_MS, shoot(game));

      expect([game.outcome(), game.multiplier()]).toEqual(["playing", 3]);
    });

    it("begins a new run with no static", async () => {
      const game = await startedAt(SPEC_WAVE.pebble);
      takeUpCharged(game, TOP_STEP);

      const starting = game.newGame();
      TestBed.inject(ConfirmService).accept();
      await starting;

      expect(game.multiplier()).toBe(1);
    });
  });

  describe("the pilot at the controls", () => {
    it("rests until its wave's field is first drawn", () => {
      const game = TestBed.inject(GameService);

      expect({ face: game.face(), lift: game.lift() }).toEqual({
        face: "rest",
        lift: 0,
      });
    });

    it("sleeps while its wave waits for the first move", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);

      game.tick(FRAME_MS, STILL);

      expect(game.face()).toBe("sleepy");
    });

    it("shows the face its field shows, set as the ship fires", async () => {
      const game = await startedAt(SPEC_WAVE.gift);

      game.tick(FRAME_MS, FIRE);

      expect(game.face()).toBe("set");
    });

    it("lifts its fur a step for each of static's past ×1, once a frame shows it", async () => {
      const game = await startedAt(SPEC_WAVE.pebble);
      takeUpCharged(game, STATIC_STEPS[1].from);

      game.tick(FRAME_MS, STILL);

      expect(game.lift()).toBe(2);
    });

    it("looks happy over a cleared wave", async () => {
      const game = await clearedAt(SPEC_WAVE.pebble);

      expect(game.face()).toBe("happy");
    });
  });

  describe("clearing a wave", () => {
    it("adds up the wave's points for its card", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);

      playToClear(game);

      expect(game.tally()).toEqual({
        rocks: PEBBLE_POINTS,
        sparks: 0,
        static: 0,
        strays: 0,
        cleared: CLEAR_POINTS,
        clean: CLEAN_POINTS,
      });
    });

    it("opens the card at the next frame where the player prefers less motion", async () => {
      const game = await clearedAt(SPEC_WAVE.pebble);

      game.tick(FRAME_MS, STILL);

      expect(game.clearedOpen()).toBe(true);
    });

    describe("where motion is welcome", () => {
      beforeEach(() => {
        installFakeViewport(1024, 768);
      });

      it("waits for the last shards to fly before the card", async () => {
        const game = await clearedAt(SPEC_WAVE.pebble);

        game.tick(CLEARED_MS - 1, STILL);

        expect(game.clearedOpen()).toBe(false);
      });
    });

    it("stays on the wave cleared until its card shows", async () => {
      const game = await clearedAt(SPEC_WAVE.pebble);

      game.nextWave();

      expect(game.wave().number).toBe(SPEC_WAVE.pebble);
    });

    it("goes on to the next wave once the card shows, laid out afresh to wait for its first move, and says which it is", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);

      clearToNext(game);

      expect({
        wave: game.wave().number,
        outcome: game.outcome(),
        steps: game.frame().field.steps,
        clearedOpen: game.clearedOpen(),
        said: said(),
      }).toEqual({
        wave: SPEC_WAVE.gift,
        outcome: "ready",
        steps: 0,
        clearedOpen: false,
        said: "Wave 2, Gift. 1 rock.",
      });
    });

    it("goes on to the next wave at Enter", async () => {
      const game = await clearedAt(SPEC_WAVE.pebble);
      game.tick(FRAME_MS, STILL);

      game.command("go");

      expect(game.wave().number).toBe(SPEC_WAVE.gift);
    });

    it("takes what was held as the wave was cleared as no move in the next", async () => {
      const game = await clearedAt(SPEC_WAVE.pebble);
      playUntil(game, () => FIRE, game.clearedOpen);
      game.nextWave();

      game.tick(FRAME_MS, FIRE);

      expect(game.outcome()).toBe("ready");
    });

    it("starts the next wave at a fresh move", async () => {
      const game = await clearedAt(SPEC_WAVE.pebble);
      playUntil(game, () => STILL, game.clearedOpen);
      game.nextWave();

      game.tick(FRAME_MS, FIRE);

      expect(game.outcome()).toBe("playing");
    });

    it("goes on into Endless past the last wave, and says so", async () => {
      const game = await gameAt(SPEC_WAVE.last);

      clearToNext(game);

      expect({
        number: game.wave().number,
        endless: isEndless(game.wave()),
        said: /^A new sector: Endless\. From wave 4\. .+ Wave 4, Endless\. \d+ rocks\. It starts when you fly\.$/.test(
          said(),
        ),
      }).toEqual({ number: SPEC_WAVE.last + 1, endless: true, said: true });
    });

    it.each([
      ["a sector's first wave", SPEC_WAVE.pebble, false],
      ["the last sector's last", SPEC_WAVE.last, true],
      ["Endless's first", SPEC_WAVE.last + 1, false],
    ])("calls %s before Endless or not", async (_, wave, before) => {
      const game = await gameAt(wave);

      expect(game.beforeEndless()).toBe(before);
    });

    it("calls the last wave of a sector but the last not before Endless", () => {
      const game = gameOver(SECTOR_WAVES);

      expect(game.beforeEndless()).toBe(false);
    });

    it("lays an Endless wave made from the run's seed, its constellation among the stars", async () => {
      const game = await gameAt(SPEC_WAVE.last);

      clearToNext(game);

      const { seed } = game.run();
      const { field, constellation } = game.frame();
      const made = endlessWave(seed, SPEC_WAVE.last + 1);
      expect({
        rocks: field.rocks.filter((rock) => rock.live).length,
        constellation,
      }).toEqual({
        rocks: fillFor(made, field.torus).rocks.reduce(
          (sum, rocks) => sum + rocks.count,
          0,
        ),
        constellation: constellationAt(seed, SPEC_WAVE.last + 1),
      });
    });

    it("lays no constellation in a sector's wave", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);

      expect(game.frame().constellation).toBeNull();
    });

    it("plays a sector's wave in the place its sector names", async () => {
      const [entry] = SPEC_WAVES;
      if (!entry) throw new Error("No waves");
      TestBed.configureTestingModule({
        providers: provideSpecWaves(
          wavesOf([{ ...entry.sector, id: "storm" }]),
        ),
      });
      const game = await gameAt(SPEC_WAVE.pebble);

      expect(game.frame().place).toBe("storm");
    });

    it("plays a spec's sector's wave, which has no place of its own, in the first sector's", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);

      expect(game.frame().place).toBe("inner-belt");
    });

    it("plays an Endless wave in Endless's place", async () => {
      const game = await gameAt(SPEC_WAVE.last);

      clearToNext(game);

      expect(game.frame().place).toBe("endless");
    });

    it("keeps a wave's entry past the last as the run changes", async () => {
      const game = await gameAt(SPEC_WAVE.last);
      clearToNext(game);
      const wave = game.wave();

      game.tick(FRAME_MS, TURN);

      expect({ outcome: game.outcome(), wave: game.wave() }).toEqual({
        outcome: "playing",
        wave,
      });
    });
  });

  describe("the Cleared card", () => {
    it("names the wave the run goes on to", async () => {
      const game = await clearedAt(SPEC_WAVE.pebble);

      expect(game.waveAfter().number).toBe(SPEC_WAVE.gift);
    });

    it("shows its sum whole at once where the player prefers less motion", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);

      clearIn(game);

      expect(game.tallyMs()).toBe(TALLY_COUNT_MS);
    });

    describe("where motion is welcome", () => {
      beforeEach(() => {
        installFakeViewport(1024, 768);
      });

      it("counts its sum up by the frames' time once it shows", async () => {
        const game = await gameAt(SPEC_WAVE.pebble);
        clearIn(game);
        const opened = game.tallyMs();

        game.tick(100, STILL);

        expect(game.tallyMs()).toBe(opened + 100);
      });

      it("counts its sum up no further than whole", async () => {
        const game = await gameAt(SPEC_WAVE.pebble);
        clearIn(game);

        playFor(game, TALLY_COUNT_MS + 100, STILL);

        expect(game.tallyMs()).toBe(TALLY_COUNT_MS);
      });

      it("counts the next wave's sum up from nothing", async () => {
        const game = await gameAt(SPEC_WAVE.pebble);
        clearIn(game);
        playFor(game, TALLY_COUNT_MS, STILL);
        game.nextWave();

        clearIn(game);

        expect(game.tallyMs()).toBe(FRAME_MS);
      });
    });
  });

  describe("one press going on", () => {
    it("goes on to the next wave at a flight key or a press on the field, which starts it", async () => {
      const game = await clearedAt(SPEC_WAVE.pebble);
      game.tick(FRAME_MS, STILL);

      pressOn(game);

      expect({
        wave: game.wave().number,
        outcome: game.outcome(),
        card: game.sectorCard(),
      }).toEqual({ wave: SPEC_WAVE.gift, outcome: "playing", card: null });
    });

    it("lays no card over a wave gone on to within a sector", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);

      clearToNext(game);

      expect({ outcome: game.outcome(), card: game.sectorCard() }).toEqual({
        outcome: "ready",
        card: null,
      });
    });
  });

  describe("the sector's card", () => {
    it("opens a new run's first wave, waiting for its first move, and says so", () => {
      const game = TestBed.inject(GameService);

      expect({ card: game.sectorCard(), said: said() }).toEqual({
        card: {
          opensRun: true,
          kicker: "A new run",
          name: "Specs",
          waves: "Waves 1 to 3",
          news: [],
          wave: "Wave 1, Pebble",
        },
        said: "A new run: Specs. Waves 1 to 3. Wave 1, Pebble. 1 rock. It starts when you fly.",
      });
    });

    it("opens every run begun, and says so", async () => {
      const game = await gameAt(SPEC_WAVE.gift);

      expect({ card: game.sectorCard()?.wave, said: said() }).toEqual({
        card: "Wave 2, Gift",
        said: "A new run: Specs. Waves 1 to 3. Wave 2, Gift. 1 rock. It starts when you fly.",
      });
    });

    it("goes as the first move starts the wave", () => {
      const game = TestBed.inject(GameService);

      game.tick(FRAME_MS, shoot(game));

      expect(game.sectorCard()).toBeNull();
    });

    it("opens a sector the run goes on to, and says so with the wave", () => {
      const game = gameOver(SECTOR_WAVES);

      clearToNext(game);

      expect({ card: game.sectorCard(), said: said() }).toEqual({
        card: {
          opensRun: false,
          kicker: "A new sector",
          name: "Far",
          waves: "Waves 2 to 3",
          news: [],
          wave: "Wave 2, Far",
        },
        said: "A new sector: Far. Waves 2 to 3. Wave 2, Far. 1 rock. It starts when you fly.",
      });
    });

    it("stays over a sector's first wave through the frame after the press that went on to it, held", () => {
      const game = gameOver(SECTOR_WAVES);
      clearIn(game);

      pressOn(game);

      expect({
        wave: game.wave().number,
        outcome: game.outcome(),
        card: game.sectorCard()?.name,
      }).toEqual({ wave: 2, outcome: "ready", card: "Far" });
    });

    it("goes at a fresh move after the press that went on", () => {
      const game = gameOver(SECTOR_WAVES);
      clearIn(game);
      pressOn(game);
      game.tick(FRAME_MS, STILL);

      game.tick(FRAME_MS, shoot(game));

      expect({ outcome: game.outcome(), card: game.sectorCard() }).toEqual({
        outcome: "playing",
        card: null,
      });
    });

    it("stays over a run a key or a press starts, held until a fresh move", async () => {
      const game = await endedAt(SPEC_WAVE.pebble);
      game.closeResult();
      game.command("go");
      await flush();

      game.tick(FRAME_MS, shoot(game));

      expect({
        outcome: game.outcome(),
        card: game.sectorCard()?.kicker,
        said: said(),
      }).toEqual({
        outcome: "ready",
        card: "A new run",
        said: "A new run: Specs. Waves 1 to 3. Wave 1, Pebble. 1 rock. It starts when you fly.",
      });
    });

    it("goes at a fresh move after the key or the press that started the run", async () => {
      const game = await endedAt(SPEC_WAVE.pebble);
      game.closeResult();
      game.command("go");
      await flush();
      game.tick(FRAME_MS, shoot(game));
      game.tick(FRAME_MS, STILL);

      game.tick(FRAME_MS, shoot(game));

      expect(game.outcome()).toBe("playing");
    });

    it("holds no move over a run begun but by a key or a press", async () => {
      const game = await endedAt(SPEC_WAVE.pebble);
      game.closeResult();
      await game.newGame();

      game.tick(FRAME_MS, shoot(game));

      expect(game.outcome()).toBe("playing");
    });

    it("stays over a sector's first wave taken up, as a key or a press goes on with it, and says it", () => {
      const game = gameOver(SECTOR_WAVES);
      clearIn(game);
      game.takeUp(takenUp(game, game.saved(), SECTOR_WAVES));
      game.command("go");

      game.tick(FRAME_MS, shoot(game));

      expect({
        outcome: game.outcome(),
        card: game.sectorCard()?.name,
        said: said(),
      }).toEqual({
        outcome: "ready",
        card: "Far",
        said: "Going on. A new sector: Far. Waves 2 to 3. Wave 2, Far. 1 rock. It starts when you fly.",
      });
    });
  });

  describe("pausing", () => {
    it("pauses the wave in play, and says so", async () => {
      const game = await startedAt(SPEC_WAVE.gift);

      game.pause();

      expect({ outcome: game.outcome(), said: said() }).toEqual({
        outcome: "paused",
        said: "Paused, with a score of 0. Press Enter to go on.",
      });
    });

    it("goes on at Enter, and says so", async () => {
      const game = await startedAt(SPEC_WAVE.gift);
      game.pause();

      game.command("go");

      expect({ outcome: game.outcome(), said: said() }).toEqual({
        outcome: "playing",
        said: "Going on.",
      });
    });

    it("has nothing to pause before the first move", () => {
      const game = TestBed.inject(GameService);

      game.pause();

      expect(game.outcome()).toBe("ready");
    });

    it("has nothing to pause before the next wave's first move", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);
      clearToNext(game);

      game.pause();

      expect(game.outcome()).toBe("ready");
    });
  });

  describe("before the board is drawn", () => {
    it("keeps a paused run paused at Enter or Resume", async () => {
      const game = await startedAt(SPEC_WAVE.gift);
      game.pause();
      game.setDrawn(false);

      game.command("go");
      game.resume();

      expect(game.outcome()).toBe("paused");
    });

    it("stays on a cleared wave", async () => {
      const game = await clearedAt(SPEC_WAVE.pebble);
      game.tick(FRAME_MS, STILL);
      game.setDrawn(false);

      game.nextWave();

      expect(game.wave().number).toBe(SPEC_WAVE.pebble);
    });

    it("goes on once the board is drawn", async () => {
      const game = await startedAt(SPEC_WAVE.gift);
      game.pause();
      game.setDrawn(false);

      game.setDrawn(true);
      game.resume();

      expect(game.outcome()).toBe("playing");
    });
  });

  describe("the room", () => {
    it("lays a wave waiting for its first move out again on a new room", () => {
      const game = TestBed.inject(GameService);

      game.setRoom(WIDE, BOARD);

      expect(game.frame().field.torus.width).toBeGreaterThan(FIELD_SHORT_SIDE);
    });

    it("keeps the field where the room keeps its shape", () => {
      const game = TestBed.inject(GameService);
      const frame = game.frame();

      game.setRoom(SQUARE, BOARD);

      expect(game.frame()).toBe(frame);
    });

    it("stretches a paused wave to a new room, keeping its field", async () => {
      const game = await startedAt(SPEC_WAVE.gift);
      game.pause();
      const { field } = game.frame();

      game.setRoom(WIDE, BOARD);

      expect({
        kept: game.frame().field === field,
        wide: field.torus.width > FIELD_SHORT_SIDE,
      }).toEqual({ kept: true, wide: true });
    });

    it("stretches a wave to a room it changed to in play, as it pauses", async () => {
      const game = await startedAt(SPEC_WAVE.gift);
      game.setRoom(WIDE, BOARD);

      game.pause();

      expect(game.frame().field.torus.width).toBeGreaterThan(FIELD_SHORT_SIDE);
    });

    it("leaves a wave in play as it is, and shapes the next for the room", async () => {
      const game = await startedAt(SPEC_WAVE.pebble);
      game.setRoom(WIDE, BOARD);
      const during = game.frame().field.torus.width;

      clearToNext(game);

      expect({
        during,
        next: game.frame().field.torus.width > FIELD_SHORT_SIDE,
      }).toEqual({ during: FIELD_SHORT_SIDE, next: true });
    });
  });

  describe("the end of a run", () => {
    it("ends once a hit comes with no one in tow, and says so", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);

      endRun(game);

      expect({
        ended: game.ended(),
        ships: game.ships(),
        said: said(),
      }).toEqual({
        ended: true,
        ships: 0,
        said: "Game over. Score 60, on wave 1. A new best!",
      });
    });

    it("says a run from the first wave cleared all thirty as it ends", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);
      clearToNext(game);
      clearToNext(game);
      clearToNext(game);

      endRun(game);

      expect(said()).toMatch(/Cleared all thirty!$/);
    });

    it("opens the result card at the next frame where the player prefers less motion", async () => {
      const game = await endedAt(SPEC_WAVE.pebble);

      game.tick(FRAME_MS, STILL);

      expect(game.resultOpen()).toBe(true);
    });

    it("puts the result card away", async () => {
      const game = await endedAt(SPEC_WAVE.pebble);
      game.tick(FRAME_MS, STILL);

      game.closeResult();

      expect({ open: game.resultOpen(), closed: game.resultClosed() }).toEqual({
        open: false,
        closed: true,
      });
    });

    it("starts another run at Enter once the result card is put away", async () => {
      const game = await endedAt(SPEC_WAVE.gift);
      const ended = game.run();
      game.closeResult();

      game.command("go");
      await flush();

      expect({
        newId: game.run().id > ended.id,
        outcome: game.outcome(),
        wave: game.wave().number,
      }).toEqual({ newId: true, outcome: "ready", wave: SPEC_WAVE.gift });
    });

    it("starts nothing, and says nothing, at a key before the result card is put away", async () => {
      const game = await endedAt(SPEC_WAVE.pebble);
      const ended = game.run();
      const lastWords = said();

      game.command("toggle");
      game.command("go");
      await flush();

      expect({ run: game.run(), said: said() }).toEqual({
        run: ended,
        said: lastWords,
      });
    });

    it("tries again from the wave the run started at, with the first ships", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);
      clearToNext(game);
      endRun(game);

      game.tryAgain();

      expect({
        outcome: game.outcome(),
        wave: game.wave().number,
        ships: game.ships(),
      }).toEqual({
        outcome: "ready",
        wave: SPEC_WAVE.pebble,
        ships: FIRST_CREW,
      });
    });

    it("names the sector the run started in, which trying again starts at", () => {
      const game = gameOver(SECTOR_WAVES);

      clearToNext(game);

      expect({
        wave: game.wave().sector.name,
        first: game.firstSector().name,
      }).toEqual({ wave: "Far", first: "Near" });
    });

    it("tries nothing again while the run goes on", async () => {
      const game = await startedAt(SPEC_WAVE.gift);
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

    it("starts at the wave the last run started at", async () => {
      const game = await gameAt(SPEC_WAVE.gift);

      await game.newGame();

      expect(game.wave().number).toBe(SPEC_WAVE.gift);
    });

    it("asks before it throws away the run under way", async () => {
      const game = await startedAt(SPEC_WAVE.gift);

      void game.newGame();

      expect(TestBed.inject(ConfirmService).prompt()).toMatchObject({
        title: "Start a new game?",
        confirmLabel: "New game",
      });
    });

    it("asks before it throws away a wave just cleared", async () => {
      const game = await clearedAt(SPEC_WAVE.pebble);

      void game.newGame();

      expect(TestBed.inject(ConfirmService).isOpen()).toBe(true);
    });

    it("asks before it throws away the next wave waiting for its first move", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);
      clearToNext(game);

      void game.newGame();

      expect(TestBed.inject(ConfirmService).isOpen()).toBe(true);
    });

    it("keeps the run under way when the player backs out", async () => {
      const game = await startedAt(SPEC_WAVE.gift);
      const before = game.run();

      const starting = game.newGame();
      TestBed.inject(ConfirmService).cancel();

      expect({ started: await starting, run: game.run() }).toEqual({
        started: false,
        run: before,
      });
    });

    it("throws the run away once the player agrees, and lays its wave out afresh", async () => {
      const game = await startedAt(SPEC_WAVE.gift);
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
      }).toEqual({
        newId: true,
        outcome: "ready",
        steps: 0,
        alpha: 0,
      });
    });

    it("forgets the last run's tally and its result card", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);
      clearToNext(game);
      endRun(game);
      game.tick(FRAME_MS, STILL);

      game.tryAgain();

      expect({ tally: game.tally(), resultOpen: game.resultOpen() }).toEqual({
        tally: null,
        resultOpen: false,
      });
    });

    it("forgets that the last run's result card was put away", async () => {
      const game = await endedAt(SPEC_WAVE.pebble);
      game.tick(FRAME_MS, STILL);
      game.closeResult();

      game.tryAgain();

      expect(game.resultClosed()).toBe(false);
    });

    it("counts each run begun", async () => {
      const game = TestBed.inject(GameService);

      await game.startAt(SPEC_WAVE.gift);
      await game.startAt(SPEC_WAVE.pebble);

      expect(game.runs()).toBe(2);
    });
  });

  describe("one run after another", () => {
    /**
     * Returns the game with a run over the strays' wave begun by a turn, and
     * that run as kept then.
     */
    function begunAndKept(): { game: GameService; saved: SavedGame | null } {
      const game = gameOver(STRAY_WAVES);
      game.tick(FRAME_MS, TURN);
      return { game, saved: game.saved() };
    }

    /** Brings a stray home and clears the strays' wave, the one written, until its card shows. */
    function clearWithStray(game: GameService): void {
      bringStraysHome(game, 1);
      playToClear(game);
      playUntil(game, () => STILL, game.clearedOpen);
    }

    /**
     * Brings a stray home, clears every written wave, and ends the run until
     * its result card shows.
     */
    function endWithAllCleared(game: GameService): void {
      clearWithStray(game);
      game.nextWave();
      endRun(game);
      playUntil(game, () => STILL, game.resultOpen);
    }

    it("tries again with none of the last run's static, cards or marks", () => {
      const game = gameOver(STRAY_WAVES);
      endWithAllCleared(game);

      game.tryAgain();

      expect(ownOf(game)).toEqual(BEGUN_OWN);
    });

    it("takes up a run with none of the last run's static, cards or marks", () => {
      const { game, saved } = begunAndKept();
      endWithAllCleared(game);

      game.takeUp(takenUp(game, saved, STRAY_WAVES));

      expect(ownOf(game)).toEqual(BEGUN_OWN);
    });

    it("takes up a run with none of the card over the last run's wave cleared", () => {
      const { game, saved } = begunAndKept();
      clearWithStray(game);

      game.takeUp(takenUp(game, saved, STRAY_WAVES));

      expect(ownOf(game)).toEqual(BEGUN_OWN);
    });

    it("takes up a run with none of the last run's result card put away", () => {
      const { game, saved } = begunAndKept();
      endWithAllCleared(game);
      game.closeResult();

      game.takeUp(takenUp(game, saved, STRAY_WAVES));

      expect(ownOf(game)).toEqual(BEGUN_OWN);
    });
  });

  describe("the records", () => {
    /** Returns the records at Normal, the specs' runs' speed. */
    function atNormal(): SpeedStats {
      return TestBed.inject(StatsService).stats().speeds.normal;
    }

    it("counts no run before its first wave's first move", async () => {
      await gameAt(SPEC_WAVE.gift);

      expect(atNormal().runs).toBe(0);
    });

    it("counts a run as its first wave starts", async () => {
      await startedAt(SPEC_WAVE.gift);

      expect(atNormal().runs).toBe(1);
    });

    it("counts the run no more as the next wave starts", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);
      clearToNext(game);

      game.tick(FRAME_MS, TURN);

      expect({ outcome: game.outcome(), runs: atNormal().runs }).toEqual({
        outcome: "playing",
        runs: 1,
      });
    });

    it("keeps that a run from the first wave cleared all thirty as it clears the last", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);
      clearToNext(game);
      clearToNext(game);

      playToClear(game);

      expect(atNormal().clearedAll).toBe(true);
    });

    it("starts a new run as none that has cleared all thirty", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);
      clearToNext(game);
      clearToNext(game);
      playToClear(game);

      const starting = game.startAt(SPEC_WAVE.pebble);
      TestBed.inject(ConfirmService).accept();
      await starting;

      expect(game.clearedAll()).toBe(false);
    });

    it("keeps no run from a later wave as one that cleared all thirty, as many waves on", async () => {
      const game = await gameAt(SPEC_WAVE.gift);
      clearToNext(game);
      clearToNext(game);

      playToClear(game);

      expect(atNormal().clearedAll).toBe(false);
    });

    it("keeps Endless shut while the last written wave is played", () => {
      const game = gameOver(STRAY_WAVES);

      bringStraysHome(game, 1);

      expect(TestBed.inject(ProgressService).isOpen("endless")).toBe(false);
    });

    it("opens Endless as the last written wave is cleared", async () => {
      const game = await gameAt(SPEC_WAVE.last);

      playToClear(game);

      expect(TestBed.inject(ProgressService).isOpen("endless")).toBe(true);
    });

    it("keeps an ended run's score and the wave it was lost on, and calls it a new best", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);
      clearToNext(game);

      endRun(game);

      expect({
        normal: atNormal(),
        best: game.best(),
        newBest: game.newBest(),
        said: said(),
      }).toEqual({
        normal: {
          runs: 1,
          best: game.score(),
          bestRules: RULES_VERSION,
          furthest: 2,
          strays: 0,
          clearedAll: false,
        },
        best: game.score(),
        newBest: true,
        said: `Game over. Score ${formatPoints(game.score())}, on wave 2. A new best!`,
      });
    });

    it("keeps the sector's best of a run started there", async () => {
      const game = await endedAt(SPEC_WAVE.gift);

      expect(TestBed.inject(StatsService).stats().sectors).toEqual({
        specs: { normal: game.score() },
      });
    });

    it("calls a run that scores no more than the best no new best", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);
      clearToNext(game);
      endRun(game);
      await game.startAt(SPEC_WAVE.gift);

      endRun(game);

      expect(game.newBest()).toBe(false);
    });

    it("forgets the last run's new best as a run begins", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);
      clearToNext(game);
      endRun(game);

      await game.newGame();

      expect(game.newBest()).toBe(false);
    });

    it("counts the strays brought home", () => {
      const game = gameOver(STRAY_WAVES);

      bringStraysHome(game, 2);

      expect(atNormal().strays).toBe(2);
    });

    it("keeps the first sector as the run's first wave starts", () => {
      const game = gameOver(SECTOR_WAVES);

      game.tick(FRAME_MS, shoot(game));

      expect(TestBed.inject(ProgressService).reached()).toEqual(
        new Set(["near"]),
      );
    });

    it("keeps the next sector as a run reaches it", () => {
      const game = gameOver(SECTOR_WAVES);

      clearToNext(game);

      expect(TestBed.inject(ProgressService).reached()).toEqual(
        new Set(["near", "far"]),
      );
    });

    it("keeps nothing of a run flown on numbers the debug menu tuned", async () => {
      const game = TestBed.inject(GameService);
      tune("rockSpeed", 1.5);
      await game.startAt(SPEC_WAVE.pebble);

      clearToNext(game);
      clearToNext(game);
      clearToNext(game);
      endRun(game);

      expect({
        normal: atNormal(),
        reached: TestBed.inject(ProgressService).reached(),
        newBest: game.newBest(),
        clearedAll: game.clearedAll(),
      }).toEqual({
        normal: {
          runs: 0,
          best: 0,
          bestRules: RULES_VERSION,
          furthest: 0,
          strays: 0,
          clearedAll: false,
        },
        reached: new Set(),
        newBest: false,
        clearedAll: false,
      });
    });

    it("keeps the records of a run whose numbers were put back before its first move", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);
      tune("rockSpeed", 1.5);
      resetTuning();

      game.tick(FRAME_MS, shoot(game));

      expect(atNormal().runs).toBe(1);
    });

    it("counts no strays a run flown on tuned numbers brings home", () => {
      const game = gameOver(STRAY_WAVES);
      tune("rockSpeed", 1.5);

      bringStraysHome(game, 1);

      expect(atNormal().strays).toBe(0);
    });

    it("keeps the records again from a run begun after a retuned one", async () => {
      const game = await startedAt(SPEC_WAVE.gift);
      tune("rockSpeed", 1.5);
      game.tick(FRAME_MS, STILL);
      resetTuning();
      endRun(game);

      await game.startAt(SPEC_WAVE.gift);
      game.tick(FRAME_MS, shoot(game));

      expect(atNormal().runs).toBe(2);
    });

    it("keeps the records of a run taken up after one flown on tuned numbers", async () => {
      const game = await startedAt(SPEC_WAVE.gift);
      const saved = game.saved();
      tune("rockSpeed", 1.5);
      game.tick(FRAME_MS, STILL);
      resetTuning();

      game.takeUp(takenUp(game, saved));
      game.resume();
      endRun(game);

      expect(atNormal().furthest).toBe(SPEC_WAVE.gift);
    });
  });

  describe("the thrust", () => {
    /** Returns a steer that thrusts at full, as a held key does. */
    function thrusting(): Steer {
      return { ...STILL, thrust: 1 };
    }

    it("is held while the ship thrusts and its wave plays on", async () => {
      const game = await startedAt(SPEC_WAVE.gift);

      game.tick(FRAME_MS, thrusting());

      expect(game.thrusting()).toBe(true);
    });

    it("is let go once the ship coasts", async () => {
      const game = await startedAt(SPEC_WAVE.gift);
      game.tick(FRAME_MS, thrusting());

      game.tick(FRAME_MS, STILL);

      expect(game.thrusting()).toBe(false);
    });

    it("is let go as the wave pauses, the key still held", async () => {
      const game = await startedAt(SPEC_WAVE.gift);
      game.tick(FRAME_MS, thrusting());

      game.pause();
      game.tick(FRAME_MS, thrusting());

      expect(game.thrusting()).toBe(false);
    });

    it("is not held before the first move", async () => {
      const game = await gameAt(SPEC_WAVE.gift);

      expect(game.thrusting()).toBe(false);
    });
  });

  describe("haptics", () => {
    let vibrate: ReturnType<typeof vi.fn<(pattern: VibratePattern) => boolean>>;

    beforeEach(() => {
      vibrate = vi.fn<(pattern: VibratePattern) => boolean>(() => true);
      Object.defineProperty(navigator, "vibrate", {
        value: vibrate,
        configurable: true,
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(navigator, "vibrate");
    });

    it("buzzes the phone once, firmly, as a ship is lost", async () => {
      const game = await startedAt(SPEC_WAVE.pebble);

      loseShip(game);

      expect(vibrate.mock.calls).toEqual([[LOST_BUZZ]]);
    });

    it("buzzes the phone twice, lightly, as a wave is cleared", async () => {
      const game = await gameAt(SPEC_WAVE.pebble);

      playToClear(game);

      expect(vibrate.mock.calls).toEqual([[CLEARED_BUZZ]]);
    });

    it("buzzes nothing, and goes on, where the phone can't buzz", async () => {
      const game = await startedAt(SPEC_WAVE.pebble);
      Reflect.deleteProperty(navigator, "vibrate");

      loseShip(game);

      expect(game.ships()).toBe(2);
    });
  });

  describe("a change of speed", () => {
    it("keeps the new speed in the settings", async () => {
      const game = await gameAt(SPEC_WAVE.gift);

      await game.changeSpeed("relaxed");

      expect(TestBed.inject(SettingsService).settings().speed).toBe("relaxed");
    });

    it("keeps the speed in the settings as it was when the player backs out", async () => {
      const game = await startedAt(SPEC_WAVE.gift);

      const starting = game.changeSpeed("relaxed");
      TestBed.inject(ConfirmService).cancel();
      await starting;

      expect(TestBed.inject(SettingsService).settings().speed).toBe("normal");
    });

    it("starts a run at the speed, at the wave the last run started at, without asking while none is under way", async () => {
      const game = await gameAt(SPEC_WAVE.gift);

      const started = await game.changeSpeed("fast");

      expect({
        started,
        asked: TestBed.inject(ConfirmService).isOpen(),
        speed: game.speed(),
        wave: game.wave().number,
        runs: game.runs(),
      }).toEqual({
        started: true,
        asked: false,
        speed: "fast",
        wave: SPEC_WAVE.gift,
        runs: 2,
      });
    });

    it("names the speed as it asks before it throws away the run under way", async () => {
      const game = await startedAt(SPEC_WAVE.gift);

      void game.changeSpeed("relaxed");

      expect(TestBed.inject(ConfirmService).prompt()).toMatchObject({
        title: "Start a new Relaxed game?",
        confirmLabel: "New game",
      });
    });

    it("keeps the run under way when the player backs out", async () => {
      const game = await startedAt(SPEC_WAVE.gift);
      const before = game.run();

      const starting = game.changeSpeed("relaxed");
      TestBed.inject(ConfirmService).cancel();

      expect({ started: await starting, run: game.run() }).toEqual({
        started: false,
        run: before,
      });
    });

    it("starts the run at the speed once the player agrees", async () => {
      const game = await startedAt(SPEC_WAVE.gift);

      const starting = game.changeSpeed("fast");
      TestBed.inject(ConfirmService).accept();
      await starting;

      expect({ speed: game.speed(), outcome: game.outcome() }).toEqual({
        speed: "fast",
        outcome: "ready",
      });
    });
  });

  describe("the debug menu's numbers", () => {
    /** Thrust held, nose up, for the ship's top speed. */
    const FULL_THRUST: Readonly<Steer> = { ...STILL, thrust: 1 };

    /** Returns the ship's speed, or 0 with none in play. */
    function shipSpeed(game: GameService): number {
      const { ship } = game.frame().field;
      return ship ? speedOf(ship) : 0;
    }

    /** Returns the places and the velocities of the field's whole rocks. */
    function rocksOf(game: GameService): Pick<Rock, "x" | "y" | "vx" | "vy">[] {
      return game
        .frame()
        .field.rocks.filter((rock) => rock.live)
        .map(({ x, y, vx, vy }) => ({ x, y, vx, vy }));
    }

    /**
     * Returns the waves with only the game's first, laid out as a wall,
     * whose rocks, from the specs' seed, come at the waiting ship at twice
     * the rocks' speed unless they are laid out for it.
     */
    function firstWaveAsWall(): WaveEntry[] {
      const [entry] = WAVES;
      if (!entry) throw new Error("No waves");
      return wavesOf([
        { ...entry.sector, waves: [{ ...entry.data, formation: "wall" }] },
      ]);
    }

    /**
     * Returns a game apart from the one the specs inject, on the same waves,
     * seeds and numbers.
     */
    function anotherGame(): GameService {
      return TestBed.runInInjectionContext(() => new GameService());
    }

    /** Returns the velocities of the field's whole rocks, across first. */
    function rockVelocities(game: GameService): number[] {
      return rocksOf(game).flatMap(({ vx, vy }) => [vx, vy]);
    }

    it("tune the field in play at once, its rocks in flight among it", async () => {
      const game = await startedAt(SPEC_WAVE.pebble);
      const before = rockVelocities(game);

      tune("rockSpeed", 2);

      expect(rockVelocities(game)).toEqual(before.map((v) => v * 2));
    });

    it("fly the ship in play as tuned", async () => {
      const game = await startedAt(SPEC_WAVE.pebble);

      tune("topSpeed", 6);
      playFor(game, 1000, FULL_THRUST);

      expect(shipSpeed(game)).toBeCloseTo(6);
    });

    it("lay a wave waiting for its first move out again for the rocks' speed tuned, as one laid out for it", () => {
      TestBed.configureTestingModule({
        providers: provideSpecWaves(firstWaveAsWall()),
      });
      const game = TestBed.inject(GameService);

      tune("rockSpeed", 2);

      expect(rocksOf(game)).toEqual(rocksOf(anotherGame()));
    });

    it("tune every wave after the one in play", async () => {
      const game = await startedAt(SPEC_WAVE.pebble);
      tune("topSpeed", 6);

      clearToNext(game);
      playFor(game, 1000, FULL_THRUST);

      expect(shipSpeed(game)).toBeCloseTo(6);
    });

    it("go back to tuning.ts's on the field in play at a reset", async () => {
      const game = await startedAt(SPEC_WAVE.pebble);
      const before = rockVelocities(game);
      tune("thrust", 40);
      tune("rockSpeed", 2);

      resetTuning();

      expect(rockVelocities(game)).toEqual(before);
    });
  });
});

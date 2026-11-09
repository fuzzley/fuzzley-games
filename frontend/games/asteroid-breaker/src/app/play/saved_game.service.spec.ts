import { TestBed } from "@angular/core/testing";
import { formatPoints } from "@fz/core/format";
import { NO_INSETS } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";
import { AnnouncerService } from "@fz/ui/announcer";
import { ConfirmService } from "@fz/ui/confirm";
import {
  MemoryStorage,
  provideMemoryStorage,
  setPageVisibility,
} from "@fz/ui/testing";
import type { Rock } from "../../rules/rocks/rocks";
import { STILL } from "../../rules/ship/ship";
import { FIELD_SHORT_SIDE, FIRST_SHIPS } from "../../rules/tuning";
import type { WaveEntry } from "../../rules/waves/waves";
import {
  FRAME_MS,
  SECTOR_WAVES,
  SPEC_WAVE,
  SPEC_WAVES,
  STRAY_WAVES,
  bringStraysHome,
  clearToNext,
  endRun,
  loseShip,
  playFor,
  playToClear,
  playUntil,
  provideSpecWaves,
  shoot,
} from "../../testing/play";
import type { BoardSetting } from "../../view/field/field_metrics";
import { constellationAt } from "../../view/field/specks";
import { TuningService } from "../settings/tuning.service";
import { ProgressService } from "../stats/progress.service";
import { StatsService } from "../stats/stats.service";
import { GAME_WAVES } from "../tokens";
import { GameService } from "./game.service";
import { SAVED_GAME_KEY, SavedGameService } from "./saved_game.service";

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

/** What the player's browser keeps, empty for each test. */
let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  TestBed.configureTestingModule({
    providers: [provideMemoryStorage(storage), ...provideSpecWaves()],
  });
});

/** Stores a game as a player's browser would hold it. */
function store(value: unknown): void {
  storage.setItem(SAVED_GAME_KEY, JSON.stringify(value));
}

/** Returns the game as stored, or null. */
function stored(): Record<string, unknown> | null {
  return JSON.parse(storage.getItem(SAVED_GAME_KEY) ?? "null") as Record<
    string,
    unknown
  > | null;
}

/** Returns the game as it would be stored now, read back from JSON. */
function current(game: GameService): Record<string, unknown> {
  return JSON.parse(JSON.stringify({ version: 1, ...game.saved() })) as Record<
    string,
    unknown
  >;
}

/** Starts the service, as the app does on load, and returns the game. */
function start(): GameService {
  TestBed.inject(SavedGameService);
  TestBed.tick();
  return TestBed.inject(GameService);
}

/**
 * Loads the page again over the same waves, keeping what the browser stored,
 * and starts the service.
 */
function reload(waves: readonly WaveEntry[] = SPEC_WAVES): GameService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideMemoryStorage(storage), ...provideSpecWaves(waves)],
  });
  return start();
}

/** Returns the game with a run's wave started by a first move, and kept. */
async function startedAt(wave: number): Promise<GameService> {
  const game = start();
  await game.startAt(wave);
  game.tick(FRAME_MS, shoot(game));
  TestBed.tick();
  return game;
}

/** Returns the game with the Gift wave's crystal broken, paused, and kept. */
async function brokeSome(): Promise<GameService> {
  const game = await startedAt(SPEC_WAVE.gift);
  playUntil(game, shoot, () => game.score() > 0);
  game.pause();
  TestBed.tick();
  return game;
}

/** Returns the game with a run begun on a wide room, paused, and kept. */
async function pausedWide(): Promise<GameService> {
  const game = start();
  game.setRoom(WIDE, BOARD);
  await game.startAt(SPEC_WAVE.gift);
  game.tick(FRAME_MS, shoot(game));
  playFor(game, 500, STILL);
  game.pause();
  TestBed.tick();
  return game;
}

/** What a rock is and where, as the specs compare rocks. */
type RockPlace = Pick<Rock, "kind" | "size" | "x" | "y">;

/** Returns the wave in play's whole rocks: what each is and where. */
function rocksOf(game: GameService): readonly RockPlace[] {
  return game
    .frame()
    .field.rocks.filter((rock) => rock.live)
    .map(({ kind, size, x, y }) => ({ kind, size, x, y }));
}

/**
 * Returns rocks with their places to a millionth of a unit, so a stretch
 * there and back reads as the same.
 */
function rounded(
  rocks: ReturnType<typeof rocksOf>,
): ReturnType<typeof rocksOf> {
  return rocks.map((rock) => ({
    ...rock,
    x: Number(rock.x.toFixed(6)),
    y: Number(rock.y.toFixed(6)),
  }));
}

describe("SavedGameService", () => {
  describe("keeping", () => {
    it("keeps a run as its wave starts", async () => {
      const game = await startedAt(SPEC_WAVE.pebble);

      expect(stored()).toEqual(current(game));
    });

    it("doesn't write the run at every step", async () => {
      const game = await startedAt(SPEC_WAVE.gift);

      playFor(game, 500, STILL);
      TestBed.tick();

      expect(stored()).not.toEqual(current(game));
    });

    it("doesn't write the run as it scores", async () => {
      const game = await startedAt(SPEC_WAVE.gift);

      playUntil(game, shoot, () => game.score() > 0);
      TestBed.tick();

      expect(stored()).toMatchObject({ score: 0 });
    });

    it("keeps a wave after the first as its first move starts it", () => {
      const game = start();
      clearToNext(game);
      TestBed.tick();

      game.tick(FRAME_MS, shoot(game));
      TestBed.tick();

      expect(stored()).toEqual(current(game));
    });

    it("keeps the run where it stands as it pauses", async () => {
      const game = await startedAt(SPEC_WAVE.gift);
      playFor(game, 500, STILL);

      game.pause();
      TestBed.tick();

      expect(stored()).toEqual(current(game));
    });

    it("keeps the run as a ship is lost", async () => {
      const game = await startedAt(SPEC_WAVE.gift);

      loseShip(game);
      TestBed.tick();

      expect(stored()?.["flying"]).toHaveLength(FIRST_SHIPS - 1);
    });

    it("keeps the run as a stray is brought home", () => {
      TestBed.overrideProvider(GAME_WAVES, { useValue: STRAY_WAVES });
      const game = start();
      game.tick(FRAME_MS, { ...STILL, turn: 1 });
      TestBed.tick();

      bringStraysHome(game, 1);
      TestBed.tick();

      expect(stored()).toMatchObject({ strays: 1, home: game.crew().home });
    });

    it("keeps the run where it stands as the page is hidden", async () => {
      const game = await startedAt(SPEC_WAVE.gift);
      playFor(game, 500, STILL);

      setPageVisibility("hidden");

      expect(stored()).toEqual(current(game));
    });

    it("keeps the run where it stands as the page goes away", async () => {
      const game = await startedAt(SPEC_WAVE.gift);
      playFor(game, 500, STILL);

      window.dispatchEvent(new Event("pagehide"));

      expect(stored()).toEqual(current(game));
    });

    it("keeps a run whose wave was cleared at the start of the next", () => {
      const game = start();

      playToClear(game);
      TestBed.tick();

      expect(stored()).toMatchObject({
        waveId: "gift",
        wave: SPEC_WAVE.gift,
        field: null,
      });
    });

    it("keeps a run gone on to the next wave as that wave not yet begun", () => {
      const game = start();

      clearToNext(game);
      TestBed.tick();

      expect(stored()).toMatchObject({
        waveId: "gift",
        wave: SPEC_WAVE.gift,
        field: null,
      });
    });

    it("forgets a run that has ended", async () => {
      const game = await startedAt(SPEC_WAVE.gift);

      endRun(game);
      TestBed.tick();

      expect(stored()).toBeNull();
    });

    it("forgets a run waiting at the next wave, thrown away for a new one", async () => {
      const game = start();
      clearToNext(game);
      TestBed.tick();

      const starting = game.newGame();
      TestBed.inject(ConfirmService).accept();
      await starting;
      TestBed.tick();

      expect(stored()).toBeNull();
    });

    it("forgets a run thrown away for a new one", async () => {
      const game = await startedAt(SPEC_WAVE.gift);

      const starting = game.newGame();
      TestBed.inject(ConfirmService).accept();
      await starting;
      TestBed.tick();

      expect(stored()).toBeNull();
    });

    it("keeps nothing of a run waiting for its first wave's first move", () => {
      start();

      expect(stored()).toBeNull();
    });
  });

  describe("taking up", () => {
    it("takes up the run kept, paused, its rocks as they were", async () => {
      const before = await brokeSome();
      const kept = {
        wave: SPEC_WAVE.gift,
        score: before.score(),
        ships: before.ships(),
        rocks: rocksOf(before),
      };

      const game = reload();

      expect({
        outcome: game.outcome(),
        wave: game.wave().number,
        score: game.score(),
        ships: game.ships(),
        rocks: rocksOf(game),
      }).toEqual({ ...kept, outcome: "paused" });
    });

    it("takes up a run in Endless, its wave made again from the run's seed, its constellation as it was", async () => {
      const before = await startedAt(SPEC_WAVE.last + 1);
      playFor(before, 500, STILL);
      before.pause();
      TestBed.tick();
      const kept = {
        wave: SPEC_WAVE.last + 1,
        rocks: rocksOf(before),
        constellation: constellationAt(before.run().seed, SPEC_WAVE.last + 1),
      };

      const game = reload();

      expect({
        wave: game.wave().number,
        rocks: rocksOf(game),
        constellation: game.frame().constellation,
      }).toEqual(kept);
    });

    it("takes up a run that has cleared every written wave, from the first, as one that has", async () => {
      const before = await startedAt(SPEC_WAVE.pebble);
      clearToNext(before);
      clearToNext(before);
      clearToNext(before);
      TestBed.tick();

      const game = reload();

      expect(game.clearedAll()).toBe(true);
    });

    it("plays the wave taken up on as it goes on", async () => {
      await brokeSome();
      const game = reload();
      const kept = rocksOf(game);

      game.resume();
      playFor(game, 500, STILL);

      expect(rocksOf(game)).not.toEqual(kept);
    });

    it.each([
      ["cleared", playToClear],
      ["gone on to the next wave", clearToNext],
    ])("takes up a run %s paused, at the next wave", (_, play) => {
      play(start());
      TestBed.tick();

      const game = reload();

      expect({ outcome: game.outcome(), wave: game.wave().number }).toEqual({
        outcome: "paused",
        wave: SPEC_WAVE.gift,
      });
    });

    it("waits for the first move of a wave kept as not yet begun as it goes on", () => {
      clearToNext(start());
      TestBed.tick();
      const game = reload();

      game.resume();

      expect(game.outcome()).toBe("ready");
    });

    it("lays a wave kept as not yet begun out afresh on the board's room", () => {
      clearToNext(start());
      TestBed.tick();
      const game = reload();
      const { field } = game.frame();

      game.setRoom(WIDE, BOARD);

      expect({
        kept: game.frame().field === field,
        wide: game.frame().field.torus.width > FIELD_SHORT_SIDE,
      }).toEqual({ kept: false, wide: true });
    });

    it("keeps the sector of a wave taken up as reached", () => {
      TestBed.overrideProvider(GAME_WAVES, { useValue: SECTOR_WAVES });
      playToClear(start());
      TestBed.tick();

      reload(SECTOR_WAVES);

      expect(TestBed.inject(ProgressService).reached()).toEqual(
        new Set(["near", "far"]),
      );
    });

    it("doesn't give back a ship lost before the page went away", async () => {
      const before = await startedAt(SPEC_WAVE.gift);
      loseShip(before);
      before.pause();
      TestBed.tick();

      const game = reload();

      expect(game.ships()).toBe(FIRST_SHIPS - 1);
    });

    it("takes up the strays brought home, for the result card", () => {
      TestBed.overrideProvider(GAME_WAVES, { useValue: STRAY_WAVES });
      const before = start();
      bringStraysHome(before, 1);
      before.pause();
      TestBed.tick();
      const broughtHome = before.broughtHome();

      const game = reload(STRAY_WAVES);

      expect(game.broughtHome()).toEqual(broughtHome);
    });

    it("takes up a run flown on tuned numbers as none that has cleared every written wave", async () => {
      const before = start();
      TestBed.inject(TuningService).tune({ rockSpeed: 1.5 });
      await before.startAt(SPEC_WAVE.pebble);
      clearToNext(before);
      clearToNext(before);
      clearToNext(before);
      TestBed.tick();

      const game = reload();

      expect(game.clearedAll()).toBe(false);
    });

    it("keeps no records of a run flown on numbers the debug menu tuned", async () => {
      const before = start();
      TestBed.inject(TuningService).tune({ rockSpeed: 1.5 });
      await before.startAt(SPEC_WAVE.gift);
      before.tick(FRAME_MS, shoot(before));
      before.pause();
      TestBed.tick();
      const game = reload();

      game.resume();
      endRun(game);

      expect(TestBed.inject(StatsService).stats().speeds.normal).toMatchObject({
        furthest: 0,
      });
    });

    it("fits the run taken up to the room the board has", async () => {
      await pausedWide();

      const game = reload();

      expect(game.frame().field.torus).toEqual({
        width: FIELD_SHORT_SIDE,
        height: FIELD_SHORT_SIDE,
      });
    });

    it("takes up the rocks where they were once the board has the room it had", async () => {
      const before = await pausedWide();
      const kept = rocksOf(before);
      const game = reload();

      game.setRoom(WIDE, BOARD);

      expect(rounded(rocksOf(game))).toEqual(rounded(kept));
    });

    it("says where the run taken up stands", async () => {
      const before = await brokeSome();
      const score = formatPoints(before.score());

      reload();

      expect(TestBed.inject(AnnouncerService).message()).toBe(
        `Your last run is paused on wave 2, Gift, with a score of ${score} and 3 ships. Press Enter to go on.`,
      );
    });

    it("gives the run taken up an id of its own", async () => {
      await brokeSome();

      const game = reload();

      expect(game.run().id).toBe(2);
    });

    it("gives the run after the one taken up an id of its own too", async () => {
      await brokeSome();
      const game = reload();

      const starting = game.newGame();
      TestBed.inject(ConfirmService).accept();
      await starting;

      expect(game.run().id).toBe(3);
    });

    it("leaves out a run it can't trust", async () => {
      await brokeSome();
      store({ ...stored(), flying: [] });

      const game = reload();

      expect(game.outcome()).toBe("ready");
    });

    it("leaves out a run kept in another shape", async () => {
      await brokeSome();
      store({ ...stored(), version: 2 });

      const game = reload();

      expect(game.outcome()).toBe("ready");
    });
  });
});

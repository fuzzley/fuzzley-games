import { TestBed } from "@angular/core/testing";
import { AnnouncerService } from "@fz/ui/announcer";
import { ConfirmService } from "@fz/ui/confirm";
import { FIRST_LIVES } from "../../rules/tuning";
import {
  SPEC_LEVEL,
  STILL,
  loseBall,
  playFor,
  playToClear,
  playUntil,
  provideSpecLevels,
  travelled,
  under,
} from "../../testing/play";
import { GameService } from "./game.service";
import { SAVED_GAME_KEY, SavedGameService } from "./saved_game.service";

/** Stores a game as a player's browser would hold it. */
function store(value: unknown): void {
  localStorage.setItem(SAVED_GAME_KEY, JSON.stringify(value));
}

/** Returns the game as stored, or null. */
function stored(): Record<string, unknown> | null {
  return JSON.parse(localStorage.getItem(SAVED_GAME_KEY) ?? "null") as Record<
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

/** Loads the page again, keeping what the browser stored, and starts the service. */
function reload(): GameService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: provideSpecLevels() });
  return start();
}

/** Returns the game with its run on the steel level, its first ball served, and kept. */
async function served(): Promise<GameService> {
  const game = start();
  await game.startAt(SPEC_LEVEL.steel);
  game.launch();
  TestBed.tick();
  return game;
}

/** Returns how many of the level in play's bricks are broken. */
function brokenIn(game: GameService): number {
  return game.frame().field.bricks.filter((brick) => brick?.broken).length;
}

/** Returns the game with a blast brick of the Few level broken, its fuse lit, paused, and kept. */
async function brokeSome(): Promise<GameService> {
  const game = start();
  await game.startAt(SPEC_LEVEL.few);
  game.launch();
  playUntil(game, under, () => game.score() > 0);
  game.pause();
  TestBed.tick();
  return game;
}

beforeEach(() => {
  TestBed.configureTestingModule({ providers: provideSpecLevels() });
});

describe("SavedGameService", () => {
  describe("keeping", () => {
    it("keeps a run as its first ball is served", async () => {
      const game = await served();

      expect(stored()).toEqual(current(game));
    });

    it("doesn't write the run at every step", async () => {
      const game = await served();

      playFor(game, 500, STILL);
      TestBed.tick();

      expect(stored()).not.toEqual(current(game));
    });

    it("doesn't write the run as it scores", async () => {
      const game = start();
      await game.startAt(SPEC_LEVEL.few);
      game.launch();
      TestBed.tick();

      playUntil(game, under, () => game.score() > 0);
      TestBed.tick();

      expect(stored()).toMatchObject({ score: 0 });
    });

    it("keeps the run where it stands as it pauses", async () => {
      const game = await served();
      playFor(game, 500, STILL);

      game.pause();
      TestBed.tick();

      expect(stored()).toEqual(current(game));
    });

    it("keeps the run as a ball is served after one is lost", async () => {
      const game = await served();

      loseBall(game);
      playUntil(game, () => STILL, game.serving);
      TestBed.tick();

      expect(stored()).toMatchObject({ lives: FIRST_LIVES - 1 });
    });

    it("keeps the run where it stands as the page goes away", async () => {
      const game = await served();
      playFor(game, 500, STILL);

      window.dispatchEvent(new Event("pagehide"));

      expect(stored()).toEqual(current(game));
    });

    it("keeps a run whose level was cleared at the start of the next", () => {
      const game = start();

      playToClear(game);
      TestBed.tick();

      expect(stored()).toMatchObject({
        levelId: "wide",
        level: SPEC_LEVEL.wide,
        field: null,
      });
    });

    it("forgets a run that has ended", async () => {
      const game = await served();

      for (let life = 0; life < FIRST_LIVES; life++) loseBall(game);
      TestBed.tick();

      expect(stored()).toBeNull();
    });

    it("forgets a run thrown away for a new one", async () => {
      const game = await served();

      const starting = game.newGame();
      TestBed.inject(ConfirmService).accept();
      await starting;
      TestBed.tick();

      expect(stored()).toBeNull();
    });

    it("keeps nothing of a run waiting for its first serve", () => {
      start();

      expect(stored()).toBeNull();
    });
  });

  describe("taking up", () => {
    it("takes up the run kept, paused, its bricks as they were", async () => {
      const before = await brokeSome();
      const broken = before
        .frame()
        .field.bricks.map((brick) => brick?.broken ?? null);
      const score = before.score();

      const game = reload();

      expect({
        outcome: game.outcome(),
        level: game.level().number,
        score: game.score(),
        broken: game.frame().field.bricks.map((brick) => brick?.broken ?? null),
        serving: game.serving(),
      }).toEqual({
        outcome: "paused",
        level: SPEC_LEVEL.few,
        score,
        broken,
        serving: true,
      });
    });

    it("takes up a Custom run's ball at the speed the settings keep", async () => {
      const before = start();
      before.setCustomPercent(200);
      await before.changeSpeed("custom");
      before.launch();
      TestBed.tick();
      const game = reload();
      game.resume();
      game.launch();
      const kept = travelled(game);

      game.setCustomPercent(100);

      expect(kept / travelled(game)).toBeCloseTo(2);
    });

    it("takes up a run kept as its first ball was served, before it scored", async () => {
      await served();

      const game = reload();

      expect(game.outcome()).toBe("paused");
    });

    it("doesn't give back a ball lost before the page went away", async () => {
      const before = await served();
      loseBall(before);
      before.pause();
      TestBed.tick();
      const game = reload();

      game.resume();
      playFor(game, 100, STILL);

      expect(game.run().lives).toBe(FIRST_LIVES - 1);
    });

    it("sets off a blast whose fuse was lit before the page went away", async () => {
      await brokeSome();
      const game = reload();
      const broken = brokenIn(game);

      game.resume();
      playFor(game, 250, STILL);

      expect(brokenIn(game)).toBeGreaterThan(broken);
    });

    it("says where the run taken up stands", async () => {
      await brokeSome();

      reload();

      expect(TestBed.inject(AnnouncerService).message()).toBe(
        "Your last run is paused on level 4, Few, with a score of 100 and 3 lives. Press Enter to go on.",
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
      store({ ...stored(), lives: 0 });

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

import {
  EnvironmentInjector,
  type WritableSignal,
  createEnvironmentInjector,
  runInInjectionContext,
  signal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import {
  MemoryStorage,
  provideMemoryStorage,
  setPageVisibility,
} from "../testing";
import { type KeepSavedOptions, keepSaved } from "./keep_saved";

/** What the specs keep: the lives left in a game under way. */
interface Game {
  /** The lives left, or none once the game has ended. */
  readonly lives: WritableSignal<number | null>;
  /** The moments a write follows, where the spec asks for them. */
  readonly moments: WritableSignal<number>;
}

describe("keepSaved", () => {
  let storage: MemoryStorage;
  let game: Game;

  beforeEach(() => {
    storage = new MemoryStorage();
    TestBed.configureTestingModule({
      providers: [provideMemoryStorage(storage)],
    });
    game = { lives: signal(3), moments: signal(0) };
  });

  /** Stores a value under `key` as JSON, as a browser holds it. */
  function store(value: unknown): void {
    storage.setItem("key", JSON.stringify(value));
  }

  /** Returns what is stored under `key`, read back from JSON. */
  function stored(): unknown {
    return JSON.parse(storage.getItem("key") ?? "null");
  }

  /**
   * Keeps the game's lives under `key` at version 2, taking up the lives
   * kept, and runs the first write.
   */
  function keep(options: Partial<KeepSavedOptions> = {}): void {
    TestBed.runInInjectionContext(() => {
      keepSaved({
        key: "key",
        version: 2,
        save: () => {
          const lives = game.lives();
          return lives === null ? null : { lives };
        },
        restore: (saved) => {
          const lives = saved["lives"];
          if (typeof lives === "number") game.lives.set(lives);
        },
        ...options,
      });
    });
    TestBed.tick();
  }

  /** Keeps the game's lives, written only as its moments change. */
  function keepAtMoments(): void {
    keep({
      track: () => {
        game.moments();
      },
    });
  }

  describe("taking up", () => {
    it("takes up what was kept at its version", () => {
      store({ version: 2, lives: 1 });

      keep();

      expect(game.lives()).toBe(1);
    });

    it("hands what was kept over as stored, its version among its fields", () => {
      store({ version: 2, lives: 1 });
      const restore = vi.fn();

      keep({ restore });

      expect(restore).toHaveBeenCalledExactlyOnceWith({ version: 2, lives: 1 });
    });

    it("takes up nothing where nothing of its version was kept", () => {
      store({ version: 1, lives: 1 });

      keep();

      expect(game.lives()).toBe(3);
    });

    it("writes back the game it took up, not the one it started with", () => {
      store({ version: 2, lives: 1 });

      keep();

      expect(stored()).toEqual({ version: 2, lives: 1 });
    });

    it("must be called in an injection context", () => {
      expect(() => {
        keepSaved({
          key: "key",
          version: 2,
          save: () => null,
          restore: () => undefined,
        });
      }).toThrow();
    });
  });

  describe("writing", () => {
    it("writes the game, with its version beside it", () => {
      keep();

      expect(stored()).toEqual({ version: 2, lives: 3 });
    });

    it("writes again as what it saves changes", () => {
      keep();

      game.lives.set(2);
      TestBed.tick();

      expect(stored()).toEqual({ version: 2, lives: 2 });
    });

    it("forgets what was kept once there is nothing to save", () => {
      store({ version: 2, lives: 1 });
      keep();

      game.lives.set(null);
      TestBed.tick();

      expect(stored()).toBeNull();
    });

    it("writes only as what it tracks changes, when told what to track", () => {
      keepAtMoments();

      game.lives.set(2);
      TestBed.tick();

      expect(stored()).toEqual({ version: 2, lives: 3 });
    });

    it("writes the game where it stands as what it tracks changes", () => {
      keepAtMoments();
      game.lives.set(2);

      game.moments.set(1);
      TestBed.tick();

      expect(stored()).toEqual({ version: 2, lives: 2 });
    });

    it("writes the game where it stands as the page is hidden", () => {
      keepAtMoments();
      game.lives.set(2);

      setPageVisibility("hidden");

      expect(stored()).toEqual({ version: 2, lives: 2 });
    });

    it("stops writing once its injector is destroyed", () => {
      const injector = createEnvironmentInjector(
        [],
        TestBed.inject(EnvironmentInjector),
      );
      runInInjectionContext(injector, () => {
        keepSaved({
          key: "key",
          version: 2,
          save: () => ({ lives: game.lives() }),
          restore: () => undefined,
        });
      });
      TestBed.tick();
      injector.destroy();

      game.lives.set(2);
      TestBed.tick();

      expect(stored()).toEqual({ version: 2, lives: 3 });
    });

    it("writes the game where it stands as the page goes away", () => {
      keepAtMoments();
      game.lives.set(2);

      window.dispatchEvent(new Event("pagehide"));

      expect(stored()).toEqual({ version: 2, lives: 2 });
    });
  });
});

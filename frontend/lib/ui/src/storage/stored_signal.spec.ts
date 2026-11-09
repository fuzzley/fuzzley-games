import type { WritableSignal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { MemoryStorage, provideMemoryStorage } from "../testing";
import type { StoredFields } from "./local_storage.service";
import { storedSignal } from "./stored_signal";

/** What the specs keep: a count of lives. */
interface Lives {
  readonly lives: number;
}

/** The lives a player starts with. */
const FRESH: Lives = { lives: 3 };

/** Returns the lives stored, or a fresh player's. */
function livesFrom(saved: StoredFields | null): Lives {
  const lives = saved?.["lives"];
  return typeof lives === "number" ? { lives } : FRESH;
}

/** Returns a signal of the lives kept under `key` at version 2. */
function storedLives(): WritableSignal<Lives> {
  return TestBed.runInInjectionContext(() =>
    storedSignal({ key: "key", version: 2, read: livesFrom }),
  );
}

/** Returns a signal of a set of names, none to start with, kept under `key` as a list. */
function storedNames(): WritableSignal<ReadonlySet<string>> {
  return TestBed.runInInjectionContext(() =>
    storedSignal({
      key: "key",
      version: 2,
      read: () => new Set<string>(),
      write: (names) => ({ names: [...names] }),
    }),
  );
}

describe("storedSignal", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    TestBed.configureTestingModule({
      providers: [provideMemoryStorage(storage)],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Stores a value under `key` as JSON, as a browser holds it. */
  function store(value: unknown): void {
    storage.setItem("key", JSON.stringify(value));
  }

  /** Returns what is stored under `key`, read back from JSON. */
  function stored(): unknown {
    return JSON.parse(storage.getItem("key") ?? "null");
  }

  describe("reading", () => {
    it("reads what was stored at its version", () => {
      store({ version: 2, lives: 5 });

      expect(storedLives()()).toEqual({ lives: 5 });
    });

    it("reads nothing stored as what a player starts with", () => {
      expect(storedLives()()).toBe(FRESH);
    });

    it("reads an entry of another version as what a player starts with", () => {
      store({ version: 1, lives: 5 });

      expect(storedLives()()).toBe(FRESH);
    });

    it("reads a corrupt entry as what a player starts with", () => {
      storage.setItem("key", "{ not json");
      vi.spyOn(console, "warn").mockImplementation(() => undefined);

      expect(storedLives()()).toBe(FRESH);
    });

    it("must be made in an injection context", () => {
      expect(() =>
        storedSignal({ key: "key", version: 2, read: livesFrom }),
      ).toThrow();
    });
  });

  describe("writing", () => {
    it("holds a value set", () => {
      const lives = storedLives();

      lives.set({ lives: 1 });

      expect(lives()).toEqual({ lives: 1 });
    });

    it("stores a value set, with its version beside it", () => {
      storedLives().set({ lives: 1 });

      expect(stored()).toEqual({ version: 2, lives: 1 });
    });

    it("stores what an update makes of the value", () => {
      storedLives().update(({ lives }) => ({ lives: lives - 1 }));

      expect(stored()).toEqual({ version: 2, lives: 2 });
    });

    it("stores nothing for the value it holds", () => {
      const lives = storedLives();

      lives.set(lives());

      expect(stored()).toBeNull();
    });

    it("stores a value as the fields its write makes of it", () => {
      storedNames().set(new Set(["ada", "bo"]));

      expect(stored()).toEqual({ version: 2, names: ["ada", "bo"] });
    });

    it("refuses a set with no write, which JSON would keep as no fields", () => {
      const names = TestBed.runInInjectionContext(() =>
        // @ts-expect-error A set isn't fields to keep.
        storedSignal({ key: "key", version: 2, read: () => new Set<string>() }),
      );

      names.set(new Set(["ada"]));

      expect(stored()).toEqual({ version: 2 });
    });

    it("refuses a list with no write, which JSON would keep as numbered fields", () => {
      const names = TestBed.runInInjectionContext(() =>
        // @ts-expect-error A list isn't fields to keep.
        storedSignal({ key: "key", version: 2, read: (): string[] => [] }),
      );

      names.set(["ada"]);

      expect(stored()).toEqual({ 0: "ada", version: 2 });
    });

    it("gives the next visit back what it stored", () => {
      storedLives().set({ lives: 1 });
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideMemoryStorage(storage)],
      });

      expect(storedLives()()).toEqual({ lives: 1 });
    });
  });
});

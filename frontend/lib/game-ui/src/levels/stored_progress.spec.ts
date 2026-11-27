import { Injectable } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import type { IdentifiedLevel } from "@fz/core/levels";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { StoredProgress } from "./stored_progress";

/** Three levels made up for the spec, "a" to "c", numbered 1 to 3. */
const LEVELS: readonly IdentifiedLevel[] = ["a", "b", "c"].map((id) => ({
  data: { id },
}));

/** Where the spec's game keeps its progress. */
const PROGRESS_AT = { key: "progress", version: 2 };

/** The spec's game's progress, as its service keeps it. */
@Injectable({ providedIn: "root" })
class Progress extends StoredProgress {
  constructor() {
    super(PROGRESS_AT, LEVELS);
  }
}

/** What the player's browser keeps, empty for each test. */
let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  TestBed.configureTestingModule({
    providers: [provideMemoryStorage(storage)],
  });
});

/** Stores progress as a player's browser would hold it. */
function store(value: unknown): void {
  storage.setItem(PROGRESS_AT.key, JSON.stringify(value));
}

/** Returns the progress stored, as a player's browser holds it, or null. */
function stored(): unknown {
  return JSON.parse(storage.getItem(PROGRESS_AT.key) ?? "null");
}

/** Starts the page again over what the browser keeps. */
function reload(): void {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideMemoryStorage(storage)],
  });
}

describe("StoredProgress", () => {
  it("opens only the first level to a new player", () => {
    const progress = TestBed.inject(Progress);

    expect([1, 2].map((level) => progress.isOpen(level))).toEqual([
      true,
      false,
    ]);
  });

  it("opens the next level once one is cleared", () => {
    const progress = TestBed.inject(Progress);

    progress.recordCleared("a");

    expect([2, 3].map((level) => progress.isOpen(level))).toEqual([
      true,
      false,
    ]);
  });

  it("keeps the levels cleared under the game's key and version, for the next visit", () => {
    TestBed.inject(Progress).recordCleared("b");

    reload();

    expect([[...TestBed.inject(Progress).cleared()], stored()]).toEqual([
      ["b"],
      { version: 2, cleared: ["b"] },
    ]);
  });

  it("stores nothing for a level cleared again", () => {
    const progress = TestBed.inject(Progress);
    progress.recordCleared("b");
    const elsewhere = { version: 2, cleared: [] };
    store(elsewhere);

    progress.recordCleared("b");

    expect(stored()).toEqual(elsewhere);
  });

  it("reads the levels cleared as stored, of the levels the game has", () => {
    store({ version: 2, cleared: ["b", "gone"] });

    expect([...TestBed.inject(Progress).cleared()]).toEqual(["b"]);
  });
});

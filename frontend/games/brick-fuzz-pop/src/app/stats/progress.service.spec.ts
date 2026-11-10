import { TestBed } from "@angular/core/testing";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { ProgressService } from "./progress.service";

/** Where the progress is kept, in its own words, so a rename fails. */
const PROGRESS_KEY = "brick-fuzz-pop-progress";

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
  storage.setItem(PROGRESS_KEY, JSON.stringify(value));
}

/** Returns what is stored, as a player's browser holds it. */
function stored(): unknown {
  return JSON.parse(storage.getItem(PROGRESS_KEY) ?? "null");
}

describe("ProgressService", () => {
  it("opens only the first level to a new player", () => {
    const progress = TestBed.inject(ProgressService);

    expect([1, 2].map((level) => progress.isOpen(level))).toEqual([
      true,
      false,
    ]);
  });

  it("opens the next level once one is cleared", () => {
    const progress = TestBed.inject(ProgressService);

    progress.recordCleared("hello-wall");

    expect([2, 3].map((level) => progress.isOpen(level))).toEqual([
      true,
      false,
    ]);
  });

  it("keeps the levels cleared for the next visit", () => {
    TestBed.inject(ProgressService).recordCleared("stripes");

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideMemoryStorage(storage)],
    });

    expect([...TestBed.inject(ProgressService).cleared()]).toEqual(["stripes"]);
  });

  it("stores nothing for a level cleared again", () => {
    const progress = TestBed.inject(ProgressService);
    progress.recordCleared("stripes");
    const elsewhere = { version: 1, cleared: [] };
    store(elsewhere);

    progress.recordCleared("stripes");

    expect(stored()).toEqual(elsewhere);
  });

  it("reads the levels cleared as stored, of the levels the game has", () => {
    store({ version: 1, cleared: ["pips", "gone"] });

    const progress = TestBed.inject(ProgressService);

    expect([...progress.cleared()]).toEqual(["pips"]);
  });
});

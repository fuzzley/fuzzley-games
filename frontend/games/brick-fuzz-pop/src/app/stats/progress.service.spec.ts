import { TestBed } from "@angular/core/testing";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { ProgressService } from "./progress.service";

// How the progress is kept and read is `@fz/brick-wall/app/stored`'s
// `StoredProgress`, whose spec holds it: this one holds the game's key and
// its levels.

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

describe("ProgressService", () => {
  it("opens the next level once one is cleared", () => {
    const progress = TestBed.inject(ProgressService);

    progress.recordCleared("hello-wall");

    expect([2, 3].map((level) => progress.isOpen(level))).toEqual([
      true,
      false,
    ]);
  });

  it("reads the levels cleared as stored, of the levels the game has", () => {
    store({ version: 1, cleared: ["pips", "gone"] });

    const progress = TestBed.inject(ProgressService);

    expect([...progress.cleared()]).toEqual(["pips"]);
  });
});

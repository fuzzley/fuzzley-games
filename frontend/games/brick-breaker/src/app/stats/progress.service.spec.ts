import { TestBed } from "@angular/core/testing";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { SPEC_LEVEL, provideSpecLevels } from "../../testing/play";
import { PROGRESS_KEY, ProgressService } from "./progress.service";

/** What the player's browser keeps, empty for each test. */
let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  TestBed.configureTestingModule({
    providers: [provideMemoryStorage(storage), ...provideSpecLevels()],
  });
});

/** Stores progress as a player's browser would hold it. */
function store(value: unknown): void {
  storage.setItem(PROGRESS_KEY, JSON.stringify(value));
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

    progress.recordCleared("blasts");

    expect(progress.isOpen(SPEC_LEVEL.wide)).toBe(true);
  });

  it("keeps the levels cleared for the next visit", () => {
    TestBed.inject(ProgressService).recordCleared("steel");

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideMemoryStorage(storage), ...provideSpecLevels()],
    });

    expect(TestBed.inject(ProgressService).cleared()).toEqual(
      new Set(["steel"]),
    );
  });

  it("drops a level stored that the game no longer has", () => {
    store({ version: 1, cleared: ["wide", "gone"] });

    const progress = TestBed.inject(ProgressService);

    expect(progress.cleared()).toEqual(new Set(["wide"]));
  });
});

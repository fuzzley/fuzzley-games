import { TestBed } from "@angular/core/testing";
import { SPEC_LEVEL, provideSpecLevels } from "../../testing/play";
import { PROGRESS_KEY, ProgressService } from "./progress.service";

/** Stores progress as a player's browser would hold it. */
function store(value: unknown): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(value));
}

beforeEach(() => {
  TestBed.configureTestingModule({ providers: provideSpecLevels() });
});

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
    TestBed.configureTestingModule({ providers: provideSpecLevels() });

    expect(TestBed.inject(ProgressService).cleared()).toEqual(
      new Set(["steel"]),
    );
  });

  it("drops a level stored that the game no longer has", () => {
    store({ version: 1, cleared: ["wide", "gone"] });

    const progress = TestBed.inject(ProgressService);

    expect(progress.cleared()).toEqual(new Set(["wide"]));
  });

  it("starts afresh from progress stored in another shape", () => {
    store({ version: 2, cleared: ["wide"] });

    const progress = TestBed.inject(ProgressService);

    expect(progress.cleared()).toEqual(new Set());
  });
});

import { TestBed } from "@angular/core/testing";
import { SECTOR_WAVES, provideSpecWaves } from "../../testing/play";
import { PROGRESS_KEY, ProgressService } from "./progress.service";

/** Returns what is stored, as a player's browser holds it. */
function stored(): unknown {
  return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "null");
}

/** Stores progress as a player's browser would hold it, at the version the service writes. */
function store(progress: object): void {
  localStorage.setItem(
    PROGRESS_KEY,
    JSON.stringify({ version: 1, ...progress }),
  );
}

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: provideSpecWaves(SECTOR_WAVES),
  });
});

describe("ProgressService", () => {
  it("opens the first sector to a new player, and no other", () => {
    const progress = TestBed.inject(ProgressService);

    expect([progress.isOpen("near"), progress.isOpen("far")]).toEqual([
      true,
      false,
    ]);
  });

  it("opens a sector once it is reached", () => {
    const progress = TestBed.inject(ProgressService);

    progress.recordReached("far");

    expect(progress.isOpen("far")).toBe(true);
  });

  it("stores the sectors reached", () => {
    const progress = TestBed.inject(ProgressService);

    progress.recordReached("far");

    expect(stored()).toEqual({ version: 1, reached: ["far"] });
  });

  it("stores nothing for a sector already reached", () => {
    store({ reached: ["far"] });
    const progress = TestBed.inject(ProgressService);
    localStorage.clear();

    progress.recordReached("far");

    expect(stored()).toBeNull();
  });

  it("takes up the sectors stored, dropping any the game no longer has", () => {
    store({ reached: ["far", "gone"] });

    const progress = TestBed.inject(ProgressService);

    expect(progress.reached()).toEqual(new Set(["far"]));
  });
});

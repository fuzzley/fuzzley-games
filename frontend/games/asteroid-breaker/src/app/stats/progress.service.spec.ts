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

  it("opens the sectors a change in a run reached", () => {
    const progress = TestBed.inject(ProgressService);

    progress.record({ reached: ["far", "endless"] });

    expect([progress.isOpen("far"), progress.isOpen("endless")]).toEqual([
      true,
      true,
    ]);
  });

  it("stores the sectors reached, in the order reached", () => {
    const progress = TestBed.inject(ProgressService);
    progress.record({ reached: ["far"] });

    progress.record({ reached: ["far", "endless"] });

    expect(stored()).toEqual({ version: 1, reached: ["far", "endless"] });
  });

  it("stores nothing for a sector already reached", () => {
    store({ reached: ["far"] });
    const progress = TestBed.inject(ProgressService);
    localStorage.clear();

    progress.record({ reached: ["far"] });

    expect(stored()).toBeNull();
  });

  it("takes up Endless reached, as a page loaded again would", () => {
    TestBed.inject(ProgressService).record({ reached: ["endless"] });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: provideSpecWaves(SECTOR_WAVES),
    });

    const progress = TestBed.inject(ProgressService);

    expect(progress.isOpen("endless")).toBe(true);
  });

  it("takes up the sectors stored, dropping any the game no longer has", () => {
    store({ reached: ["far", "gone"] });

    const progress = TestBed.inject(ProgressService);

    expect(progress.reached()).toEqual(new Set(["far"]));
  });
});

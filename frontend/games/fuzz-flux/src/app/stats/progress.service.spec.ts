import { TestBed } from "@angular/core/testing";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { SMALL_LEVELS } from "../../testing/small_levels";
import { GAME_LEVELS } from "../tokens";
import { ProgressService } from "./progress.service";

// How the progress is kept and read is `@fz/game-ui/levels`'
// `StoredProgress`, whose spec holds it: this one holds the game's key and
// its levels.

/** Where the progress is kept, in its own words, so a rename fails. */
const PROGRESS_KEY = "fuzz-flux-progress";

/** Returns the progress, kept in a store, the small levels the game's. */
function progressIn(storage: MemoryStorage): ProgressService {
  TestBed.configureTestingModule({
    providers: [
      provideMemoryStorage(storage),
      { provide: GAME_LEVELS, useValue: SMALL_LEVELS },
    ],
  });
  return TestBed.inject(ProgressService);
}

describe("ProgressService", () => {
  it("opens the next level once one is cleared", () => {
    const progress = progressIn(new MemoryStorage());

    progress.recordCleared("1");

    expect([2, 3].map((level) => progress.isOpen(level))).toEqual([
      true,
      false,
    ]);
  });

  it("reads the levels cleared as stored, of the levels the game has", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ version: 1, cleared: ["2", "99"] }),
    );

    const progress = progressIn(storage);

    expect([...progress.cleared()]).toEqual(["2"]);
  });
});

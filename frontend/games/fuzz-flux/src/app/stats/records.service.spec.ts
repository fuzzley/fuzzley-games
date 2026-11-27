import { TestBed } from "@angular/core/testing";
import { itemAt } from "@fz/core/records";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import type { Level } from "../../rules/levels/level";
import { SMALL_LEVELS } from "../../testing/small_levels";
import { GAME_LEVELS } from "../tokens";
import { RecordsService } from "./records.service";

/** The first of the small levels, whose deals are seeds 1, 2 and 3. */
const LEVEL: Level = itemAt(SMALL_LEVELS, 0).data;

/** Returns the records, kept in a store, the small levels the game's. */
function records(storage = new MemoryStorage()): RecordsService {
  TestBed.configureTestingModule({
    providers: [
      provideMemoryStorage(storage),
      { provide: GAME_LEVELS, useValue: SMALL_LEVELS },
    ],
  });
  return TestBed.inject(RecordsService);
}

/** Returns a store holding the records as a visit before kept them. */
function stored(levels: unknown): MemoryStorage {
  const storage = new MemoryStorage();
  storage.setItem("fuzz-flux-records", JSON.stringify({ levels, version: 1 }));
  return storage;
}

describe("RecordsService", () => {
  it("begins a level on its first deal while it has no record", () => {
    expect(records().nextDeal(LEVEL)).toBe(1);
  });

  it("begins it on the next deal once a move is made on the one before", () => {
    const kept = records();

    kept.dealUsed(LEVEL, 1);

    expect(kept.nextDeal(LEVEL)).toBe(2);
  });

  it("uses up nothing for a move on a deal the level wasn't to begin on next, as after Restart", () => {
    const kept = records();
    kept.dealUsed(LEVEL, 1);

    kept.dealUsed(LEVEL, 1);

    expect(kept.nextDeal(LEVEL)).toBe(2);
  });

  it("begins it on its first deal again after its last", () => {
    const kept = records(stored({ "1": { nextDeal: 2 } }));

    kept.dealUsed(LEVEL, 3);

    expect(kept.nextDeal(LEVEL)).toBe(1);
  });

  it("keeps each level's deal for the next visit", () => {
    const storage = new MemoryStorage();
    records(storage).dealUsed(LEVEL, 1);
    TestBed.resetTestingModule();

    expect(records(storage).nextDeal(LEVEL)).toBe(2);
  });

  it.each([
    ["a level the game no longer has", { "99": { nextDeal: 1 } }],
    ["a count that isn't one", { "1": { nextDeal: -1 } }],
    ["records that aren't a record", "deals"],
  ])("reads %s as no record", (_, levels) => {
    expect(records(stored(levels)).nextDeal(LEVEL)).toBe(1);
  });
});

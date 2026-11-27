import { TestBed } from "@angular/core/testing";
import { itemAt } from "@fz/core/records";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import type { Level } from "../../rules/levels/level";
import { SMALL_LEVELS } from "../../testing/small_levels";
import { GAME_LEVELS } from "../tokens";
import { RecordsService } from "./records.service";

// How a record changes is `rules/run/records`', whose spec holds it: this
// one holds where the records are kept, and what is read back.

/** The first of the small levels, whose deals are seeds 1, 2 and 3. */
const LEVEL: Level = itemAt(SMALL_LEVELS, 0).data;

/** Where the records are kept, in their own words, so a rename fails. */
const RECORDS_KEY = "fuzz-flux-records";

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
  storage.setItem(RECORDS_KEY, JSON.stringify({ levels, version: 1 }));
  return storage;
}

/** Returns the records a store holds, as kept. */
function keptIn(storage: MemoryStorage): unknown {
  return JSON.parse(storage.getItem(RECORDS_KEY) ?? "null");
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

  it("keeps each level's deal for the next visit", () => {
    const storage = new MemoryStorage();
    records(storage).dealUsed(LEVEL, 1);
    TestBed.resetTestingModule();

    expect(records(storage).nextDeal(LEVEL)).toBe(2);
  });

  it("keeps a level cleared, its stars and its moves to spare beside its deal", () => {
    const storage = stored({ "1": { nextDeal: 1 } });

    records(storage).cleared(LEVEL, 2, 3);

    expect(keptIn(storage)).toMatchObject({
      levels: { "1": { nextDeal: 1, stars: 2, spare: 3 } },
    });
  });

  it("reads records that aren't a record as none", () => {
    expect(records(stored("deals")).nextDeal(LEVEL)).toBe(1);
  });
});

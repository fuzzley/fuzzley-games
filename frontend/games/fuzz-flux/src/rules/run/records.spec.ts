import { itemAt } from "@fz/core/records";
import type { Level } from "../levels/level";
import { SMALL_LEVELS } from "../../testing/small_levels";
import {
  type LevelRecords,
  levelRecordsOf,
  nextDealOf,
  withCleared,
  withDealUsed,
} from "./records";

/** The first of the small levels, whose deals are seeds 1, 2 and 3. */
const LEVEL: Level = itemAt(SMALL_LEVELS, 0).data;

/** The ids of the small levels. */
const IDS = SMALL_LEVELS.map(({ data }) => data.id);

/** Records with none of a level's kept yet. */
const NONE: LevelRecords = {};

describe("levelRecordsOf", () => {
  it("reads each level's counts as storage kept them", () => {
    const saved = { "1": { nextDeal: 2, stars: 3, spare: 4 } };

    expect(levelRecordsOf(saved, IDS)).toEqual(saved);
  });

  it("reads a record kept before it counted stars, with its deal alone", () => {
    expect(levelRecordsOf({ "1": { nextDeal: 2 } }, IDS)).toEqual({
      "1": { nextDeal: 2 },
    });
  });

  it.each([
    ["a level the game no longer has", { "99": { nextDeal: 1 } }],
    ["a count that isn't one", { "1": { stars: -1 } }],
    ["records that aren't a record", "deals"],
  ])("reads %s as no record", (_, saved) => {
    expect(levelRecordsOf(saved, IDS)).toEqual({});
  });
});

describe("nextDealOf", () => {
  it("begins a level on its first deal while it has no record", () => {
    expect(nextDealOf(NONE, LEVEL)).toBe(1);
  });

  it("begins it on the deal its record keeps the place of", () => {
    expect(nextDealOf({ "1": { nextDeal: 2 } }, LEVEL)).toBe(3);
  });

  it("begins it among its own deals, whatever place its record keeps", () => {
    expect(nextDealOf({ "1": { nextDeal: 4 } }, LEVEL)).toBe(2);
  });
});

describe("withDealUsed", () => {
  it("begins a level next on the deal after the one a move was made on", () => {
    const records = withDealUsed(NONE, LEVEL, 1);

    expect(nextDealOf(records, LEVEL)).toBe(2);
  });

  it("begins it on its first deal again after its last", () => {
    const records = withDealUsed({ "1": { nextDeal: 2 } }, LEVEL, 3);

    expect(nextDealOf(records, LEVEL)).toBe(1);
  });

  it("uses up nothing for a move on a deal the level wasn't to begin on next, as after Restart", () => {
    const records = withDealUsed({ "1": { nextDeal: 1 } }, LEVEL, 1);

    expect(nextDealOf(records, LEVEL)).toBe(2);
  });

  it("keeps the level's stars and moves to spare", () => {
    const records = withDealUsed({ "1": { stars: 2, spare: 1 } }, LEVEL, 1);

    expect(records).toEqual({ "1": { stars: 2, spare: 1, nextDeal: 1 } });
  });
});

describe("withCleared", () => {
  it("keeps the stars and the moves to spare of a level's first clear", () => {
    expect(withCleared(NONE, LEVEL, 1, 0)).toEqual({
      "1": { stars: 1, spare: 0 },
    });
  });

  it("raises each to a later game's, where it beats them", () => {
    const records = { "1": { nextDeal: 1, stars: 2, spare: 3 } };

    expect(withCleared(records, LEVEL, 3, 2)).toEqual({
      "1": { nextDeal: 1, stars: 3, spare: 3 },
    });
  });

  it("keeps the same records for a game that beats neither", () => {
    const records = { "1": { stars: 3, spare: 4 } };

    expect(withCleared(records, LEVEL, 2, 1)).toBe(records);
  });
});

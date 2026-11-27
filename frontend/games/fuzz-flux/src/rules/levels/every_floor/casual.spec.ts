import { SIM_TIMEOUT_MS } from "@fz/core/testing";
import { DESIGN_SETS } from "../../../testing/design_files";
import { CLEARS_ASKED, REPORT_API, askOf } from "../../../testing/report_api";
import { LEVELS, type LevelEntry } from "../levels";

/**
 * How many points from what a level asks the casual player may clear it,
 * on its deals, in whole times in 100: the design's 4, found on the
 * sketch's table, which rounds them so.
 */
const LEEWAY = 4;

/**
 * Returns how many whole times in 100 the casual player clears a level on
 * its deals, dealt its own moves, in the games `yarn report:levels` plays
 * on each, rounded as the report's table rounds them.
 */
function clearsOf({ number, data }: LevelEntry): number {
  const games = data.deals.flatMap((seed) =>
    REPORT_API.casualGames({ level: number, moves: data.moves, seed }),
  );
  return Math.round(
    (games.filter(({ cleared }) => cleared).length * 100) / games.length,
  );
}

/** Returns what a set of the design's asks of its first level and of its last, or throws for a set that asks nothing. */
function firstAndLastAsks(set: string): { first: number; last: number } {
  const asks = CLEARS_ASKED[set] ?? [];
  const [first] = asks;
  const last = asks.at(-1);
  if (first === undefined || last === undefined) {
    throw new Error(`The set "${set}" asks nothing of its levels.`);
  }
  return { first, last };
}

/** Each set of the design's after the first, beside the set before it. */
const FOLLOWING = DESIGN_SETS.slice(1).map((set, at) => [
  set,
  DESIGN_SETS[at]!,
]);

// The casual player held near each level's ask, on the level's own deals,
// so which of them comes up changes little (docs/fuzz-flux/design.md,
// "Deals and the guarantee" and "The sketch").
describe("every level's floor", { timeout: SIM_TIMEOUT_MS }, () => {
  it.each(LEVELS)(
    `lets the casual player clear level $number, $data.name, within ${String(LEEWAY)} points of what it asks, on its deals`,
    (entry) => {
      const asked = askOf(entry);

      const clears = clearsOf(entry);

      expect(
        Math.abs(clears - asked),
        `${String(clears)} times in 100, where it asks ${String(asked)}`,
      ).toBeLessThanOrEqual(LEEWAY);
    },
  );
});

// Each set's first level easier than the last of the set before
// (docs/fuzz-flux/design.md, "The levels"): its ask higher by more than
// the leeway on both, so with every level within its floor, even a half
// point off it before rounding, the casual player clears it more often.
describe("the sets' asks", () => {
  it.each(FOLLOWING)(
    `ask more of %s's first level than of %s's last, by more than ${String(2 * LEEWAY)} points`,
    (set, before) => {
      const { first } = firstAndLastAsks(set);
      const { last } = firstAndLastAsks(before);

      expect(first - last).toBeGreaterThan(2 * LEEWAY);
    },
  );
});

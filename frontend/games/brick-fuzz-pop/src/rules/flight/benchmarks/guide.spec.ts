import { described, quantile, sortedTimes } from "../../../testing/timing";
import { levelStart } from "../../levels/level";
import { LEVELS, parseLevel } from "../../levels/levels";
import type { RoundStart } from "../../round/round";
import type { Charge } from "../../shot";
import {
  AIM_COUNT,
  GUIDE_PAST_TURN,
  LEAST_DEPTH,
  MOST_DEPTH,
} from "../../tuning";
import { guideOf } from "../guide";

/** How many rounds of guides are timed, after one that warms the code up. */
const ROUNDS = 3;

/** How many aims apart the timed shots are. */
const AIM_STEP = 8;

/** The charges the timed shots take in turn. */
const CHARGES: readonly Charge[] = [0, 1, 2, 3, 4, 5];

/** The most a guide may take at the 99th percentile, in milliseconds: five times the plan's 0.2 ms, as no runner times anything alike twice. */
const MOST_P99_MS = 1;

/** How a round may start: plainly, or with a hot shot, whose charge nothing spends. */
const STARTS = {
  plain: (start: RoundStart): RoundStart => start,
  hot: (start: RoundStart): RoundStart => ({ ...start, boon: "hot" }),
} as const;

describe("guideOf's time", () => {
  it("keeps under its bound at the 99th percentile over the levels' opening walls, plain or hot", () => {
    const openings = LEVELS.flatMap(({ data }) => {
      const level = parseLevel(data);
      return Array.from({ length: MOST_DEPTH - LEAST_DEPTH + 1 }, (_, i) =>
        levelStart(level, LEAST_DEPTH + i),
      );
    });
    const times = { plain: [], hot: [] } as Record<
      keyof typeof STARTS,
      number[]
    >;

    for (let round = 0; round <= ROUNDS; round++) {
      for (const [name, startOf] of Object.entries(STARTS)) {
        for (const opening of openings) {
          const start = startOf(opening);
          for (let aim = 0; aim < AIM_COUNT; aim += AIM_STEP) {
            const charge = CHARGES[(aim / AIM_STEP) % CHARGES.length]!;
            const before = performance.now();
            guideOf(start, { aim, charge }, GUIDE_PAST_TURN);
            const time = performance.now() - before;
            if (round > 0) {
              times[name as keyof typeof STARTS].push(time);
            }
          }
        }
      }
    }
    const all = sortedTimes(Object.values(times).flat());
    console.log(
      `guideOf(): plain ${described(times.plain)}, hot ${described(times.hot)}, over ${String(times.plain.length)} guides each`,
    );

    expect(quantile(all, 0.99)).toBeLessThan(MOST_P99_MS);
  });
});

import { AIM_COUNT } from "@fz/brick-wall/rules/aims";
import { keysOf } from "@fz/core/records";
import { levelOpenings, unflown } from "../../../testing/cast_reference";
import {
  SIM_TIMEOUT_MS,
  described,
  quantile,
  sortedTimes,
} from "../../../testing/timing";
import { FLIGHT_RULES } from "../../tuning";
import type { RoundStart } from "../events";
import { guideOf } from "../guide";

/** How many rounds of guides are timed, after one that warms the code up. */
const ROUNDS = 3;

/** How many aims apart the timed guides are. */
const AIM_STEP = 8;

/** The turn the timed guides run past: the fifth, the farthest the player's setting asks for. */
const TURNS = 5;

/** The most a guide may take at the 99th percentile, in milliseconds: five times the plan's 0.2 ms, as no runner times anything alike twice. */
const MOST_P99_MS = 1;

/** How a round may start: with a plain shot, or a hot one, which leaves holding a floor bounce. */
const SHOTS = {
  plain: (start: RoundStart): RoundStart => start,
  hot: (start: RoundStart): RoundStart => ({ ...start, hot: true }),
} as const;

/** Holds the times guides took, in milliseconds: at walls guided before, plain and hot, and the first at each wall. */
interface GuideTimes {
  readonly plain: number[];
  readonly hot: number[];
  readonly firsts: number[];
}

/** Returns how long a function takes, in milliseconds. */
function timed(run: () => void): number {
  const before = performance.now();
  run();
  return performance.now() - before;
}

/**
 * Times a round of guides into the times given: at each opening, plain and
 * hot, the first at a copy of its wall, then one at every `AIM_STEP`th aim
 * at the wall itself.
 */
function timeRound(openings: readonly RoundStart[], times: GuideTimes): void {
  for (const shot of keysOf(SHOTS)) {
    for (const opening of openings) {
      const start = SHOTS[shot](opening);
      const fresh = unflown(start);
      times.firsts.push(
        timed(() => {
          guideOf(fresh, { aim: 0 }, FLIGHT_RULES, TURNS);
        }),
      );
      for (let aim = 0; aim < AIM_COUNT; aim += AIM_STEP) {
        times[shot].push(
          timed(() => {
            guideOf(start, { aim }, FLIGHT_RULES, TURNS);
          }),
        );
      }
    }
  }
}

/** Returns the times of `ROUNDS` rounds of guides over the levels' openings, after one that warms the code up. */
function timedGuides(): GuideTimes {
  const openings = levelOpenings();
  timeRound(openings, { plain: [], hot: [], firsts: [] });
  const times: GuideTimes = { plain: [], hot: [], firsts: [] };
  for (let round = 0; round < ROUNDS; round++) {
    timeRound(openings, times);
  }
  return times;
}

// A guide at a wall guided before flies through the field fly() keeps for
// it, and is held to the bound. A wall's first guide builds that field,
// once a round as the wall comes down, and is printed, not held, as fly()'s
// first flight at a wall is: its time is the field's building more than
// the guide's.
describe("guideOf's time", { timeout: SIM_TIMEOUT_MS }, () => {
  it("keeps under its bound at the 99th percentile to the fifth turn, over the levels' openings plain and hot", () => {
    const { plain, hot, firsts } = timedGuides();

    console.log(
      `guideOf() to the fifth turn: plain ${described(plain)}, hot ${described(hot)}, over ${String(plain.length)} guides each; a wall's first, its field built, ${described(firsts)}`,
    );

    expect(quantile(sortedTimes([...plain, ...hot]), 0.99)).toBeLessThan(
      MOST_P99_MS,
    );
  });
});

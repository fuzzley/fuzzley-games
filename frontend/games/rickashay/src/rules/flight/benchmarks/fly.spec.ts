import { AIMS } from "@fz/brick-wall/rules/aims";
import { createRandom } from "@fz/core/random";
import { SIM_TIMEOUT_MS, described } from "@fz/core/testing";
import { levelOpenings, unflown } from "../../../testing/cast_reference";
import { TRAIT_RULES } from "../../bricks/trait_rules";
import { FLIGHT_RULES } from "../../tuning";
import { fly } from "../flight";

/** How many flights are timed a round, each from a level's opening at a depth along an aim, drawn from a seed. */
const FLIGHTS = 2000;

/** How many rounds of fly() are timed, after one that warms the code up. */
const ROUNDS = 5;

// Printed, not held to a number, since a runner times nothing alike twice:
// the plan asks for a median of 100 µs or less and a p99 of 2 ms or less.
// A flight at a wall flown before flies through the field kept for it, as
// a guide's flights do; the first at a wall builds it.
describe("fly's time", { timeout: SIM_TIMEOUT_MS }, () => {
  it("is printed at its median and 99th percentile over the levels' openings at aims drawn from a seed", () => {
    const random = createRandom(2026);
    const starts = levelOpenings();
    const shots = Array.from({ length: FLIGHTS }, () => {
      const start = starts[Math.floor(random() * starts.length)];
      const aim = Math.floor(random() * AIMS.length);
      return start === undefined ? [] : [{ start, aim }];
    }).flat();
    const times: number[] = [];
    const firsts: number[] = [];

    for (let round = 0; round <= ROUNDS; round++) {
      for (const { start, aim } of shots) {
        // A copy of its wall, which fly() has never flown at.
        const first = unflown(start);
        let before = performance.now();
        fly(first, { aim }, FLIGHT_RULES, TRAIT_RULES);
        const firstTime = performance.now() - before;
        before = performance.now();
        fly(start, { aim }, FLIGHT_RULES, TRAIT_RULES);
        const time = performance.now() - before;
        if (round > 0) {
          firsts.push(firstTime);
          times.push(time);
        }
      }
    }
    console.log(
      `fly(): ${described(times)} over ${String(times.length)} flights from ${String(starts.length)} openings; the first at a wall, its field built, ${described(firsts)}`,
    );

    expect([times.length, firsts.length]).toEqual([
      FLIGHTS * ROUNDS,
      FLIGHTS * ROUNDS,
    ]);
  });
});

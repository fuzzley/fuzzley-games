import { createRandom } from "@fz/core/random";
import { randomFlight } from "../../../testing/random_flights";
import { SIM_TIMEOUT_MS, described } from "../../../testing/timing";
import { fly } from "../flight";

/** How many seeded flights are timed, each flown once a round. */
const FLIGHTS = 1000;

/** How many rounds of fly() are timed, after one that warms the code up. */
const ROUNDS = 5;

// Printed, not held to a number: CI's runner times nothing alike twice.
describe("fly's time", { timeout: SIM_TIMEOUT_MS }, () => {
  it("is printed at its median and 99th percentile, alone and with mates and friends", () => {
    const random = createRandom(1111);
    const flights = Array.from({ length: FLIGHTS }, () => randomFlight(random));
    const alone: number[] = [];
    const crowded: number[] = [];

    for (let round = 0; round <= ROUNDS; round++) {
      for (const { start, rules } of flights) {
        const before = performance.now();
        fly(start, rules);
        const time = performance.now() - before;
        if (round > 0) {
          (start.mates + start.friends === 0 ? alone : crowded).push(time);
        }
      }
    }
    console.log(
      `fly(): one fuzzball ${described(alone)} over ${String(alone.length)} flights; with mates or friends ${described(crowded)} over ${String(crowded.length)}`,
    );

    expect(alone.length + crowded.length).toBe(FLIGHTS * ROUNDS);
  });
});

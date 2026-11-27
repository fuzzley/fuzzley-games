import { SIM_TIMEOUT_MS, described } from "@fz/core/testing";
import { moveStartOf } from "../../../testing/shown_board";
import { SKETCH_MOVES } from "../../../testing/sketch_moves";
import { timelineOf } from "../build";
import { FEEL } from "../feel";

/** How many times a round the busiest move's timeline is built. */
const BUILDS = 50;

/** How many rounds are timed, after one that warms the code up. */
const ROUNDS = 5;

// Printed, not held to a number, since a runner times nothing alike twice:
// the plan asks for 4 ms or less for the busiest move, two frizzballs
// swapped together on a board 8 by 9.
describe("timelineOf's time", { timeout: SIM_TIMEOUT_MS }, () => {
  it("is printed at its median and 99th percentile for two frizzballs swapped together on a board 8 by 9", () => {
    const fixture = SKETCH_MOVES.twoFrizzballs;
    const start = moveStartOf(fixture);
    const times: number[] = [];

    for (let round = 0; round <= ROUNDS; round++) {
      for (let build = 0; build < BUILDS; build++) {
        const before = performance.now();
        timelineOf(
          fixture.record,
          start,
          FEEL,
          { speed: "normal", motion: "full" },
          null,
        );
        if (round > 0) {
          times.push(performance.now() - before);
        }
      }
    }
    console.log(
      `timelineOf(): ${described(times)} over ${String(times.length)} builds of two frizzballs on a board 8 by 9`,
    );

    expect(times).toHaveLength(BUILDS * ROUNDS);
  });
});

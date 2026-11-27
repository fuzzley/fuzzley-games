import { createRandom } from "@fz/core/random";
import { SIM_TIMEOUT_MS, described } from "@fz/core/testing";
import { DESIGN_SETS, designSet } from "../../../testing/design_files";
import { DESIGN_PARTS, DESIGN_WIND } from "../../../testing/made_up_rules";
import { randomGame } from "../../../testing/random_games";
import { type Level, levelSetOf } from "../../levels/level";
import { play } from "../play";

/** Every level of the four sets, in the order they are played. */
const LEVELS: readonly Level[] = DESIGN_SETS.flatMap(
  (set) => levelSetOf(designSet(set)).levels,
);

/** How many rounds of play() are timed, after one that warms the code up. */
const ROUNDS = 3;

// Printed, not held to a number, since a runner times nothing alike twice:
// the plan asks for a median of 100 µs or less and a p99 of 1 ms or less,
// where the sketch's are 47 µs and 0.41 ms. The moves are on the specs'
// made-up elements and wind, which play every golden game as the sketch
// does, so that every element and the wind's turn take their part.
describe("play's time", { timeout: SIM_TIMEOUT_MS }, () => {
  it("is printed at its median and 99th percentile over a random game on each deal of every level", () => {
    const random = createRandom(2026);
    const moves = LEVELS.flatMap((level) =>
      level.deals.flatMap((seed) =>
        randomGame(level, seed, random, DESIGN_PARTS, DESIGN_WIND),
      ),
    );
    const times: number[] = [];

    for (let round = 0; round <= ROUNDS; round++) {
      for (const { game, from, to } of moves) {
        const before = performance.now();
        play(game, from, to, DESIGN_PARTS, DESIGN_WIND);
        const time = performance.now() - before;
        if (round > 0) {
          times.push(time);
        }
      }
    }
    console.log(
      `play(): ${described(times)} over ${String(moves.length)} moves, a random game on each of ${String(LEVELS.length)} levels' deals`,
    );

    expect(times.length).toBe(moves.length * ROUNDS);
  });
});

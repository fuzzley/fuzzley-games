import { createRandom } from "@fz/core/random";
import { described } from "../../../testing/timing";
import { shotOf } from "../../levels/certificate";
import { levelStart } from "../../levels/level";
import { LEVELS, parseLevel } from "../../levels/levels";
import { playRound } from "../../round/round";
import type { Shot } from "../../shot";
import { AIM_COUNT, LEAST_DEPTH, MOST_CHARGE, MOST_DEPTH } from "../../tuning";

/** How many seeded random shots are timed at each opening wall, each round. */
const SHOTS = 20;

/** How many rounds of shots are timed, after one that warms the code up. */
const ROUNDS = 3;

// Printed, not held to a number: CI's runner times nothing alike twice. The
// plan's budget is a median of 100 µs and a 99th percentile of 2 ms.
describe("playRound's time", () => {
  it("is printed at its median and 99th percentile over the levels' opening walls and seeded random shots", () => {
    const random = createRandom(2026);
    const openings = LEVELS.flatMap(({ data }) => {
      const level = parseLevel(data);
      return Array.from({ length: MOST_DEPTH - LEAST_DEPTH + 1 }, (_, i) => ({
        level,
        start: levelStart(level, LEAST_DEPTH + i),
        shots: Array.from({ length: SHOTS }, () => randomShot(random)),
      }));
    });
    const times: number[] = [];

    for (let round = 0; round <= ROUNDS; round++) {
      for (const { level, start, shots } of openings) {
        for (const shot of shots) {
          const before = performance.now();
          playRound(start, shot, level.boon);
          const time = performance.now() - before;
          if (round > 0) {
            times.push(time);
          }
        }
      }
    }
    console.log(
      `playRound(): ${described(times)} over ${String(times.length)} rounds at ${String(openings.length)} opening walls`,
    );

    expect(times).toHaveLength(openings.length * SHOTS * ROUNDS);
  });
});

/** Returns a shot drawn from a source of numbers: any aim, with any charge. */
function randomShot(random: () => number): Shot {
  return shotOf([
    Math.floor(random() * AIM_COUNT),
    Math.floor(random() * (MOST_CHARGE + 1)),
  ]);
}

import { createRandom } from "@fz/core/random";
import {
  castByScan,
  randomField,
  randomShot,
} from "../../../testing/cast_reference";
import { described } from "../../../testing/timing";
import { cast, castField, createContacts } from "../cast";

/** How many seeded shots are timed, each cast once a round. */
const SHOTS = 2000;

/** How many rounds of cast() are timed, after one that warms the code up, as one round of the scan is. */
const ROUNDS = 10;

// Printed, not held to a number: CI's runner times nothing alike twice.
describe("cast's time", () => {
  it("is printed at its median and 99th percentile, beside a scan of every brick", () => {
    const random = createRandom(1110);
    const shots = Array.from({ length: SHOTS }, () => {
      const shot = randomShot(randomField(random), random);
      const { wall, depth, kinds } = shot.field;
      return { ...shot, cast: castField(wall, depth, kinds) };
    });
    const contacts = createContacts();
    const times: number[] = [];
    const scanTimes: number[] = [];

    for (let round = 0; round <= ROUNDS; round++) {
      for (const shot of shots) {
        const { cast: field, x, y, dx, dy, limit, crosses, passing } = shot;
        const before = performance.now();
        cast(field, x, y, dx, dy, limit, contacts, crosses, passing);
        if (round > 0) {
          times.push(performance.now() - before);
        }
      }
    }
    for (let round = 0; round <= 1; round++) {
      for (const shot of shots) {
        const { field, x, y, dx, dy, limit, crosses, passing } = shot;
        const before = performance.now();
        castByScan(field, x, y, dx, dy, limit, crosses, passing);
        if (round > 0) {
          scanTimes.push(performance.now() - before);
        }
      }
    }
    console.log(
      `cast(): ${described(times)} over ${String(times.length)} casts; a scan of every brick: ${described(scanTimes)}`,
    );

    expect(times).toHaveLength(SHOTS * ROUNDS);
  });
});

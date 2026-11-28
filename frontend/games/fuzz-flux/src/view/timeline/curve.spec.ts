import { itemAt } from "@fz/core/records";
import { curveAt, curveKeys } from "./curve";
import { FEEL } from "./feel";
import { lookAt } from "./looks";
import { frameFor, sampleAt } from "./sample";
import type { Keys, Sampled, Timeline } from "./timeline";

/** Returns where a sprite standing at the board's corner and moved by keys stands at a moment. */
function standsAt(keys: Keys, ms: number): Sampled {
  const timeline: Timeline = {
    pieces: [],
    sprites: [
      {
        drawn: { what: "frame", frame: "button" },
        fromMs: 0,
        untilMs: 1000,
        look: lookAt({ x: 0, y: 0 }),
        keys,
      },
    ],
    effects: [],
    flights: [],
    counts: [],
    dust: [],
    marks: [],
    sounds: [],
    dim: [],
    restMs: 0,
    end: null,
  };
  return itemAt(sampleAt(timeline, FEEL, ms, frameFor(timeline)).sprites, 0);
}

describe("curveKeys", () => {
  const keys = curveKeys({ x: 0, y: 0 }, { x: 4, y: 0 }, 2, 0, 100, FEEL);

  it("flies the whole way, eased in and out, to the place", () => {
    expect([standsAt(keys, 25), standsAt(keys, 100)]).toMatchObject([
      { x: 0.5, y: 0 },
      { x: 4, y: 0, leanX: 0, leanY: 0 },
    ]);
  });

  it("bows to the right of its way by its bend, and rises, most halfway", () => {
    expect(standsAt(keys, 50)).toMatchObject({
      x: 2,
      leanX: 0,
      leanY: 2 * FEEL.curveArc - FEEL.curveRiseSquares,
    });
  });
});

describe("curveAt", () => {
  const from = { x: 0, y: 0 };
  const to = { x: 3, y: -4 };
  const keys = curveKeys(from, to, 1.5, 0, 100, FEEL);

  it.each([0, 20, 50, 70, 100])(
    "stands where the curve's keys take a sprite %i ms into 100",
    (ms) => {
      const sampled = standsAt(keys, ms);

      const at = curveAt(from, to, 1.5, ms / 100, FEEL, {
        x: 0,
        y: 0,
        leanX: 0,
        leanY: 0,
      });

      expect(
        Math.abs(at.x - sampled.x) +
          Math.abs(at.y - sampled.y) +
          Math.abs(at.leanX - sampled.leanX) +
          Math.abs(at.leanY - sampled.leanY),
      ).toBeLessThan(1e-9);
    },
  );
});

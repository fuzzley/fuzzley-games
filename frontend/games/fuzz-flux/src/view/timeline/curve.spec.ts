import { curveKeys } from "./curve";
import { FEEL } from "./feel";
import { lookAt } from "./looks";
import { frameFor, sampleAt } from "./sample";
import type { Keys, Timeline } from "./timeline";

/** Returns where a sprite standing at the board's corner and moved by keys stands at a moment. */
function standsAt(keys: Keys, ms: number): object | undefined {
  const timeline: Timeline = {
    pieces: [],
    sprites: [
      {
        drawn: { what: "frame", frame: "ring" },
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
  return sampleAt(timeline, FEEL, ms, frameFor(timeline)).sprites[0];
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

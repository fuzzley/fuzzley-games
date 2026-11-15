import { PICTURE_TORUS } from "../../testing/field_picture";
import { type WaveRing, farthestCorner, waveRingAt } from "./cleared";
import { WAVE_RING_MS } from "./timing";

/** Returns a record the wave's ring is written into. */
function ring(): WaveRing {
  return { radius: 0, shown: 0 };
}

describe("farthestCorner", () => {
  it.each([
    [0, 0],
    [PICTURE_TORUS.width, PICTURE_TORUS.height],
    [10, 30],
  ])("reaches from (%d, %d) to the field's farthest corner", (x, y) => {
    const { width, height } = PICTURE_TORUS;
    const corners = [
      Math.hypot(x, y),
      Math.hypot(width - x, y),
      Math.hypot(x, height - y),
      Math.hypot(width - x, height - y),
    ];

    expect(farthestCorner(x, y, PICTURE_TORUS)).toBe(Math.max(...corners));
  });
});

describe("waveRingAt", () => {
  it("shows no ring before it starts or once it is gone", () => {
    expect([
      waveRingAt(-1, 60, ring()),
      waveRingAt(WAVE_RING_MS, 60, ring()),
    ]).toEqual([null, null]);
  });

  it("starts the ring small and whole", () => {
    expect(waveRingAt(0, 60, ring())).toEqual({ radius: 1.5, shown: 1 });
  });

  it("crosses evenly toward its reach, three eighths of the way and more halfway through, fading", () => {
    const halfway = waveRingAt(WAVE_RING_MS / 2, 60, ring());

    expect([halfway?.radius, halfway?.shown]).toEqual([
      expect.closeTo(1.5 + 58.5 * 0.625, 9),
      0.75,
    ]);
  });

  it("writes the ring into the record it is given", () => {
    const into = ring();

    expect(waveRingAt(0, 60, into)).toBe(into);
  });
});

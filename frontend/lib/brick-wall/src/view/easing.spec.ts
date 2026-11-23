import {
  FLARE_FROM,
  RING_FROM,
  SWELL,
  type Shift,
  easeOutBack,
  flareScale,
  ringScale,
  shakeOf,
  swellScale,
} from "./easing";
import { SHAKE_CSS_PX, SHAKE_MS } from "./timing";

/** Shares through a flourish's time, a fiftieth apart, from 0 to 1. */
const THROUGH = Array.from({ length: 51 }, (_, i) => i / 50);

describe("easeOutBack", () => {
  it("starts at its start and ends at its end", () => {
    expect([easeOutBack(0), easeOutBack(1)]).toEqual([
      expect.closeTo(0, 9),
      expect.closeTo(1, 9),
    ]);
  });

  it("swings past its end by about a tenth of the way on the way", () => {
    expect(Math.max(...THROUGH.map(easeOutBack))).toBeCloseTo(1.1, 2);
  });
});

describe("swellScale", () => {
  it("swells a struck brick as the strike lands and settles it to its size", () => {
    expect([swellScale(0), swellScale(1)]).toEqual([
      expect.closeTo(1 + SWELL, 9),
      expect.closeTo(1, 9),
    ]);
  });

  it("settles a little under its size first, never swelling further", () => {
    const scales = THROUGH.map(swellScale);

    expect({
      under: Math.min(...scales) < 1,
      further: Math.max(...scales) > 1 + SWELL + 1e-9,
    }).toEqual({ under: true, further: false });
  });
});

describe("flareScale", () => {
  it("grows the boon's look in from small to its size", () => {
    expect([flareScale(0), flareScale(1)]).toEqual([
      expect.closeTo(FLARE_FROM, 9),
      expect.closeTo(1, 9),
    ]);
  });

  it("grows it past its size on the way", () => {
    expect(Math.max(...THROUGH.map(flareScale))).toBeGreaterThan(1);
  });
});

describe("ringScale", () => {
  it("spreads a ring from small to its widest", () => {
    expect([ringScale(0), ringScale(1)]).toEqual([
      expect.closeTo(RING_FROM, 9),
      expect.closeTo(1, 9),
    ]);
  });

  it("spreads it fast first, past halfway at half its time", () => {
    expect(ringScale(0.5)).toBeGreaterThan((RING_FROM + 1) / 2);
  });
});

describe("shakeOf", () => {
  /** Times through a shake, a millisecond apart. */
  const MS = Array.from({ length: SHAKE_MS }, (_, i) => i);

  /** Returns the farthest a shake moves the field, across or up, over some times, at a pixel ratio. */
  function farthest(times: readonly number[], pixelRatio: number): number {
    const shift: Shift = { x: 0, y: 0 };
    return Math.max(
      ...times.map((ms) => {
        shakeOf(ms, pixelRatio, shift);
        return Math.max(Math.abs(shift.x), Math.abs(shift.y));
      }),
    );
  }

  it.each([-1, SHAKE_MS, SHAKE_MS * 3])(
    "rests the field %i ms after the level is lost",
    (since) => {
      const shift: Shift = { x: 5, y: 5 };

      expect(shakeOf(since, 1, shift)).toEqual({ x: 0, y: 0 });
    },
  );

  it("shakes it nearly as far as the shake's size, at the pixel ratio, and no farther", () => {
    const most = farthest(MS, 2);

    expect({
      within: most <= SHAKE_CSS_PX * 2,
      near: most > SHAKE_CSS_PX * 2 * 0.8,
    }).toEqual({ within: true, near: true });
  });

  it("shakes it up and down as far as across", () => {
    const shift: Shift = { x: 0, y: 0 };
    const ups = MS.map((ms) => Math.abs(shakeOf(ms, 1, shift).y));

    expect(Math.max(...ups)).toBeGreaterThan(SHAKE_CSS_PX * 0.8);
  });

  it("shakes it less and less as the shake dies away", () => {
    const third = SHAKE_MS / 3;

    expect(farthest(MS.slice(2 * third), 1)).toBeLessThan(
      farthest(MS.slice(0, third), 1) / 2,
    );
  });

  it("writes into the record it is handed", () => {
    const shift: Shift = { x: 0, y: 0 };

    expect(shakeOf(10, 1, shift)).toBe(shift);
  });
});

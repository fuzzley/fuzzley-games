import { fadeAlpha } from "./math";
import {
  FLARE_FROM,
  MOST_BLINKS_A_SECOND,
  RING_FROM,
  SWELL,
  type Shift,
  blinkShows,
  easeOutBack,
  flareScale,
  ringScale,
  shakeOf,
  swellScale,
} from "./motion";

/** Shares through a flourish's time, a fiftieth apart, from 0 to 1. */
const THROUGH = Array.from({ length: 51 }, (_, i) => i / 50);

/** How long the specs' shake lasts, in milliseconds. */
const LENGTH_MS = 300;

/** How far the specs' shake moves a thing each way as it starts. */
const MOST = 6;

/** Times through the specs' shake, a millisecond apart. */
const MS = Array.from({ length: LENGTH_MS }, (_, i) => i);

/** Returns the farthest a shake moves a thing, across or up, over some times, as far as `most` each way as it starts and dying away in a straight line. */
function farthest(times: readonly number[], most: number): number {
  const shift: Shift = { x: 0, y: 0 };
  return Math.max(
    ...times.map((ms) => {
      shakeOf(ms, LENGTH_MS, most, fadeAlpha, shift);
      return Math.max(Math.abs(shift.x), Math.abs(shift.y));
    }),
  );
}

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
  it("swells a thing struck as the blow lands and settles it to its size", () => {
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
  it("grows a look in from small to its size", () => {
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
  it.each([-1, LENGTH_MS, LENGTH_MS * 3])(
    "rests a thing %i ms after the shake starts",
    (since) => {
      const shift: Shift = { x: 5, y: 5 };

      expect(shakeOf(since, LENGTH_MS, MOST, fadeAlpha, shift)).toEqual({
        x: 0,
        y: 0,
      });
    },
  );

  it("shakes it nearly as far as the most it is handed, and no farther", () => {
    const most = farthest(MS, MOST * 2);

    expect({
      within: most <= MOST * 2,
      near: most > MOST * 2 * 0.8,
    }).toEqual({ within: true, near: true });
  });

  it("shakes it up and down as far as across", () => {
    const shift: Shift = { x: 0, y: 0 };
    const ups = MS.map((ms) =>
      Math.abs(shakeOf(ms, LENGTH_MS, MOST, fadeAlpha, shift).y),
    );

    expect(Math.max(...ups)).toBeGreaterThan(MOST * 0.8);
  });

  it("shakes it less and less as a straight line's fade dies away", () => {
    const third = LENGTH_MS / 3;

    expect(farthest(MS.slice(2 * third), MOST)).toBeLessThan(
      farthest(MS.slice(0, third), MOST) / 2,
    );
  });

  it("shakes it by what the fade it is handed leaves of it, a share through its time", () => {
    const shares: number[] = [];
    const half = (done: number): number => {
      shares.push(done);
      return 0.5;
    };

    const halved = shakeOf(75, LENGTH_MS, MOST, half, { x: 0, y: 0 });
    const whole = shakeOf(75, LENGTH_MS, MOST, () => 1, { x: 0, y: 0 });

    expect({ halved, shares }).toEqual({
      halved: { x: whole.x / 2, y: whole.y / 2 },
      shares: [0.25],
    });
  });

  it("writes into the record it is handed", () => {
    const shift: Shift = { x: 0, y: 0 };

    expect(shakeOf(10, LENGTH_MS, MOST, fadeAlpha, shift)).toBe(shift);
  });
});

describe("blinkShows", () => {
  it.each([0, 499])(
    "shows a cue blinking over 1000 ms %i ms in, in the first half",
    (elapsed) => {
      expect(blinkShows(elapsed, 1000)).toBe(true);
    },
  );

  it.each([500, 999])("hides it %i ms in, in the second half", (elapsed) => {
    expect(blinkShows(elapsed, 1000)).toBe(false);
  });

  it("blinks it again in each period after the first", () => {
    expect([blinkShows(1000, 1000), blinkShows(2600, 1000)]).toEqual([
      true,
      false,
    ]);
  });

  it("blinks it as often as is safe", () => {
    const period = 1000 / MOST_BLINKS_A_SECOND;

    expect([blinkShows(0, period), blinkShows(period / 2, period)]).toEqual([
      true,
      false,
    ]);
  });

  it.each([300, 0, -1000, Number.NaN])(
    "throws for a period of %d ms, which blinks too often",
    (period) => {
      expect(() => blinkShows(0, period)).toThrow(
        new RangeError(
          `A cue blinks 3 times a second at the most, over a period of 1000 / 3 ms or more, not ${String(period)} ms.`,
        ),
      );
    },
  );
});

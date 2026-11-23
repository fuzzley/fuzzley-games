import { MOST_BLINKS_A_SECOND, blinkShows } from "./blink";

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

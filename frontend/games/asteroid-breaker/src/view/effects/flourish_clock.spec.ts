import { FlourishClock } from "./flourish_clock";
import { SLOWED_MS, SLOW_MS, SLOW_PACE } from "./timing";

/** Returns a clock that has seen a first frame at a time. */
function clockAt(time: number): FlourishClock {
  const clock = new FlourishClock();
  clock.at(time);
  return clock;
}

describe("FlourishClock", () => {
  it("keeps the page's time until it is slowed", () => {
    const clock = clockAt(1000);

    expect(clock.at(1100)).toBe(1100);
  });

  it("runs at a third of the page's pace while slowed", () => {
    const clock = clockAt(1000);
    clock.slow();

    expect(clock.at(1000 + SLOW_MS / 2)).toBeCloseTo(
      1000 + (SLOW_MS / 2) * SLOW_PACE,
      9,
    );
  });

  it("runs at its pace again once the slow is over, a frame across its end slowed only up to it", () => {
    const clock = clockAt(1000);
    clock.slow();

    expect(clock.at(1000 + SLOW_MS + 100)).toBeCloseTo(
      1000 + SLOWED_MS + 100,
      9,
    );
  });

  it("ends a slow at once as a new field starts", () => {
    const clock = clockAt(1000);
    clock.slow();
    clock.start();

    expect(clock.at(1100)).toBe(1100);
  });

  it("doesn't slow before its first frame", () => {
    const clock = new FlourishClock();
    clock.slow();
    clock.at(1000);

    expect(clock.at(1100)).toBe(1100);
  });
});

describe("SLOWED_MS", () => {
  it("lasts a third of the slow in the flourishes' time", () => {
    expect(SLOWED_MS).toBeCloseTo(SLOW_MS / 3, 9);
  });
});

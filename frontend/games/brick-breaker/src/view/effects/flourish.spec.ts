import { stepsIn } from "../../rules/stepper";
import {
  GLOW_LEAST,
  POP_SWELL,
  RING_FROM,
  STREAK_RING_FROM,
  countAlpha,
  flourishTime,
  glowAlpha,
  isHolding,
  popScale,
  ringScale,
  shardTint,
  streakRingScale,
} from "./flourish";
import { GLOW_AFTER_MS, GLOW_BRICKS, GLOW_PULSE_MS, HOLD_MS } from "./timing";

describe("the flourishes' curves", () => {
  it("swells a brick that holds a hit at the middle of its pop, and settles it back", () => {
    expect([popScale(0), popScale(0.5), popScale(1)]).toEqual([
      1,
      1 + POP_SWELL,
      expect.closeTo(1),
    ]);
  });

  it("spreads a blast's ring from a share of its widest to all of it", () => {
    expect([ringScale(0), ringScale(1)]).toEqual([RING_FROM, 1]);
  });

  it("spreads a streak's ring from about the ball to its widest, fast, then slowing", () => {
    const scales = [0, 0.5, 1].map(streakRingScale);

    expect({
      scales: [scales[0], scales[2]],
      fast: (scales[1] ?? 0) - STREAK_RING_FROM > (1 - STREAK_RING_FROM) / 2,
    }).toEqual({ scales: [STREAK_RING_FROM, 1], fast: true });
  });

  it("shows a streak's count whole for half its step, then fades it out", () => {
    expect([0, 0.5, 0.75, 1].map(countAlpha)).toEqual([
      1,
      1,
      expect.closeTo(0.5),
      0,
    ]);
  });
});

describe("shardTint", () => {
  it("throws a shard in its brick's color", () => {
    expect(shardTint(0xc06000, 0x000000, 0)).toBe(0xc06000);
  });

  it("dims a shard most of the way to a dark field's color by its end", () => {
    expect(shardTint(0xc06000, 0x000000, 1)).toBe(0x3a1d00);
  });

  it("dims a shard toward a light field, paler", () => {
    expect(shardTint(0x000000, 0xffffff, 1)).toBe(0xb3b3b3);
  });

  it("dims a shard halfway through its flight halfway to its end", () => {
    expect(shardTint(0xc06000, 0x000000, 0.5)).toBe(0x7d3e00);
  });
});

describe("glowAlpha", () => {
  const QUIET = stepsIn(GLOW_AFTER_MS);
  const PULSE = stepsIn(GLOW_PULSE_MS);

  /** Returns the glow of a field needing bricks, steps after its last brick broke at step 100. */
  function glowAfter(
    steps: number,
    needed = GLOW_BRICKS,
    motion = true,
  ): number {
    return glowAlpha({ needed, steps: 100 + steps }, 100, motion);
  }

  it("is dark while a brick broke too lately", () => {
    expect(glowAfter(QUIET - 1)).toBe(0);
  });

  it("starts full once none has broken for long enough", () => {
    expect(glowAfter(QUIET)).toBe(1);
  });

  it("pulses down to its faintest halfway through a pulse, and back", () => {
    expect([glowAfter(QUIET + PULSE / 2), glowAfter(QUIET + PULSE)]).toEqual([
      expect.closeTo(GLOW_LEAST),
      expect.closeTo(1),
    ]);
  });

  it("holds still where motion isn't welcome", () => {
    expect(glowAfter(QUIET + PULSE / 2, GLOW_BRICKS, false)).toBe(1);
  });

  it("is dark while more bricks are needed than may glow", () => {
    expect(glowAfter(QUIET, GLOW_BRICKS + 1)).toBe(0);
  });

  it("is dark once the level needs no more", () => {
    expect(glowAfter(QUIET, 0)).toBe(0);
  });
});

describe("flourishTime", () => {
  it("runs with the scene's time while nothing holds", () => {
    expect(flourishTime(1000, Infinity)).toBe(1000);
  });

  it("stands still from when the last brick's hit held, as long as it holds", () => {
    const times = [0, HOLD_MS / 2, HOLD_MS].map((after) =>
      flourishTime(1000 + after, 1000),
    );

    expect(times).toEqual([1000, 1000, 1000]);
  });

  it("runs on after the hold, as far behind the scene's as it held", () => {
    expect(flourishTime(1000 + HOLD_MS + 50, 1000)).toBe(1050);
  });
});

describe("isHolding", () => {
  it.each([
    [999, false],
    [1000, true],
    [1000 + HOLD_MS - 1, true],
    [1000 + HOLD_MS, false],
  ])("says the hit held at 1000 holds at %i: %s", (time, holding) => {
    expect(isHolding(time, 1000)).toBe(holding);
  });

  it("says nothing holds before the last brick's hit", () => {
    expect(isHolding(1000, Infinity)).toBe(false);
  });
});

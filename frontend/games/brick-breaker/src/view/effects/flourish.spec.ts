import { stepsIn } from "../../rules/stepper";
import {
  GLOW_LEAST,
  POP_SWELL,
  RING_FROM,
  STREAK_RING_FROM,
  countAlpha,
  glowAlpha,
  popScale,
  ringScale,
  shardTint,
  streakRingScale,
} from "./flourish";
import { GLOW_AFTER_MS, GLOW_BRICKS, GLOW_PULSE_MS } from "./timing";

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

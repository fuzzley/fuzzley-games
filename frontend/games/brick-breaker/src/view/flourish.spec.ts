import { stepsIn } from "../rules/stepper";
import {
  GLOW_LEAST,
  POP_SWELL,
  RING_FROM,
  fadeAlpha,
  glowAlpha,
  growScale,
  popScale,
  ringScale,
  shareDone,
} from "./flourish";
import { GLOW_AFTER_MS, GLOW_BRICKS, GLOW_PULSE_MS } from "./timing";

describe("shareDone", () => {
  it.each([
    [1000, 0],
    [1050, 0.5],
    [1100, 1],
    [1200, 1],
    [900, 0],
  ])(
    "is, at %i, %s of the way through a flourish of 100 ms begun at 1000",
    (now, done) => {
      expect(shareDone(1000, now, 100)).toBe(done);
    },
  );
});

describe("the flourishes' curves", () => {
  it("swells a brick that holds a hit at the middle of its pop, and settles it back", () => {
    expect([popScale(0), popScale(0.5), popScale(1)]).toEqual([
      1,
      1 + POP_SWELL,
      expect.closeTo(1),
    ]);
  });

  it("grows a brick back from nothing to its size, quicker at first", () => {
    expect([growScale(0), growScale(0.5), growScale(1)]).toEqual([0, 0.875, 1]);
  });

  it("spreads a blast's ring from a share of its widest to all of it", () => {
    expect([ringScale(0), ringScale(1)]).toEqual([RING_FROM, 1]);
  });

  it("fades from opaque to nothing", () => {
    expect([fadeAlpha(0), fadeAlpha(0.25), fadeAlpha(1)]).toEqual([1, 0.75, 0]);
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

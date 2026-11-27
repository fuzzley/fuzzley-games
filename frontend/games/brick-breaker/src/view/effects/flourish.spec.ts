import { stepsIn } from "../../rules/stepper";
import { COLUMNS } from "../../rules/tuning";
import {
  DROP_IN_HEIGHT,
  GLOW_LEAST,
  POP_SWELL,
  STREAK_RING_FROM,
  countAlpha,
  dropInAlpha,
  dropInHeight,
  flourishTime,
  glowAlpha,
  isHolding,
  meetDepth,
  openingHeight,
  padDip,
  popScale,
  shardTint,
  squashAt,
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

  it("spreads a streak's ring from about the ball to its widest, fast, then slowing", () => {
    const scales = [0, 0.5, 1].map(streakRingScale);

    expect({
      scales: [scales[0], scales[2]],
      fast: (scales[1] ?? 0) - STREAK_RING_FROM > (1 - STREAK_RING_FROM) / 2,
    }).toEqual({ scales: [STREAK_RING_FROM, 1], fast: true });
  });

  it("thins an opening gate from its whole height to nothing, slow at first, then quicker", () => {
    expect([0, 0.5, 1].map(openingHeight)).toEqual([1, 0.75, 0]);
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

describe("a ball's squash and the pad's dip", () => {
  /** Returns how a ball is squashed a share through its meeting with the paddle, across, down and dropped. */
  function squashOf(done: number): readonly number[] {
    const squash = { across: 0, down: 0, drop: 0 };
    squashAt(done, squash);
    return [squash.across, squash.down, squash.drop];
  }

  it("are deepest as the two meet, and gone by their end", () => {
    expect([meetDepth(0), meetDepth(1)]).toEqual([1, 0]);
  });

  it("hold near their deepest a moment, then ease back, halfway at half their time", () => {
    expect([meetDepth(0.1), meetDepth(0.5)]).toEqual([
      expect.closeTo(0.976, 2),
      expect.closeTo(0.5),
    ]);
  });

  it("squash a ball as the kit's still draws it at the deepest, wider and flatter, its middle dropped toward the paddle", () => {
    expect(squashOf(0)).toEqual([
      expect.closeTo(1.28),
      expect.closeTo(0.7),
      0.35,
    ]);
  });

  it("round a ball again by the end, where it was put", () => {
    expect(squashOf(1)).toEqual([1, 1, 0]);
  });

  it("dip the pad a tenth of a unit at the deepest, and raise it again", () => {
    expect([padDip(0), padDip(1)]).toEqual([0.1, 0]);
  });
});

describe("the bricks' drop-in", () => {
  /** Every column, left to right. */
  const EVERY_COLUMN = Array.from({ length: COLUMNS }, (_, column) => column);

  /** Returns how far above its place each column's bricks stand, left to right, a share through the drop-in. */
  function heightsAt(done: number): readonly number[] {
    return EVERY_COLUMN.map((column) => dropInHeight(column, done));
  }

  it("stands every brick two units above its place, unseen, as it starts", () => {
    expect({
      heights: new Set(heightsAt(0)),
      alphas: new Set(EVERY_COLUMN.map((column) => dropInAlpha(column, 0))),
    }).toEqual({ heights: new Set([2]), alphas: new Set([0]) });
  });

  it("drops the first column at once, and the next only after it", () => {
    expect([dropInHeight(0, 0.02), dropInHeight(1, 0.02)]).toEqual([
      expect.closeTo(1.71, 2),
      DROP_IN_HEIGHT,
    ]);
  });

  it.each([0.2, 0.4, 0.6, 0.8])(
    "drops a column after a column, left to right, %f of the way through",
    (done) => {
      const heights = heightsAt(done);

      expect(heights).toEqual([...heights].sort((a, b) => a - b));
    },
  );

  it("has the first columns landed and the last yet to fall halfway through", () => {
    expect([dropInHeight(0, 0.5), dropInHeight(COLUMNS - 1, 0.5)]).toEqual([
      0,
      DROP_IN_HEIGHT,
    ]);
  });

  it("keeps the last column falling till it ends", () => {
    expect(dropInHeight(COLUMNS - 1, 0.99)).toBeGreaterThan(0);
  });

  it("has landed every brick, whole, by its end", () => {
    expect({
      heights: new Set(heightsAt(1)),
      alphas: new Set(EVERY_COLUMN.map((column) => dropInAlpha(column, 1))),
    }).toEqual({ heights: new Set([0]), alphas: new Set([1]) });
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

import { SPEED_INFO } from "../../rules/speed";
import { MAX_STEPS_PER_FRAME, STEP_S } from "../../rules/tuning";
import {
  TAIL_ALPHA,
  TAIL_GAP,
  TAIL_LEAST,
  TAIL_MOST,
  Trail,
  tailAlpha,
  tailLength,
  tailScale,
} from "./tail";

/** Returns a trail that has followed a ball from a place across to another, in steps of a share of a gap. */
function followed(from: number, to: number, share = 0.25): Trail {
  const trail = new Trail();
  for (let x = from; x <= to; x += TAIL_GAP * share) trail.follow(x, 10);
  return trail;
}

/** Returns where across each place a trail keeps lies, newest first. */
function acrossOf(trail: Trail): number[] {
  return Array.from(
    { length: trail.length },
    (_, back) => trail.placeOf(back).x,
  );
}

describe("Trail", () => {
  it("keeps the places a ball passed, a gap apart, newest first, but the one within a gap of it", () => {
    const trail = followed(0, 4 * TAIL_GAP);

    expect(acrossOf(trail)).toEqual([3 * TAIL_GAP, 2 * TAIL_GAP, TAIL_GAP, 0]);
  });

  it("lays a place at each gap a ball went in one frame", () => {
    const trail = new Trail();
    trail.follow(0, 10);

    trail.follow(3 * TAIL_GAP, 10);

    expect(acrossOf(trail)).toEqual([2 * TAIL_GAP, TAIL_GAP, 0]);
  });

  it("lays its places along the ball's way, across and down", () => {
    const trail = new Trail();
    trail.follow(0, 0);

    trail.follow(3.2 * TAIL_GAP * 0.6, 3.2 * TAIL_GAP * 0.8);
    const { x, y } = trail.placeOf(0);

    expect([x, y]).toEqual([
      expect.closeTo(2 * TAIL_GAP * 0.6),
      expect.closeTo(2 * TAIL_GAP * 0.8),
    ]);
  });

  it("keeps the most places a tail may have, letting the oldest go", () => {
    const trail = followed(0, 20 * TAIL_GAP);

    expect({
      length: trail.length,
      oldest: trail.placeOf(TAIL_MOST - 1).x,
    }).toEqual({ length: TAIL_MOST, oldest: (20 - TAIL_MOST) * TAIL_GAP });
  });

  it("keeps nothing of a ball that stands still", () => {
    const trail = new Trail();
    trail.follow(4, 10);

    trail.follow(4, 10);

    expect(trail.length).toBe(0);
  });

  it("starts afresh where a ball jumps, as one served", () => {
    const trail = followed(0, 4 * TAIL_GAP);

    trail.follow(20, 10);
    trail.follow(20 + 2 * TAIL_GAP, 10);

    expect(acrossOf(trail)).toEqual([20 + TAIL_GAP, 20]);
  });

  it("lays a fast ball's way in a long frame, as far as Fast's top speed twice over goes", () => {
    const trail = new Trail();
    trail.follow(0, 10);

    trail.follow(2 * SPEED_INFO.fast.top * MAX_STEPS_PER_FRAME * STEP_S, 10);

    expect(trail.length).toBe(TAIL_MOST);
  });

  it("forgets every place once cleared, and starts where it next follows", () => {
    const trail = followed(0, 4 * TAIL_GAP);

    trail.clear();
    trail.follow(1, 10);
    trail.follow(1 + 2 * TAIL_GAP, 10);

    expect(acrossOf(trail)).toEqual([1 + TAIL_GAP, 1]);
  });

  it.each([-1, 2])("throws for a place %i back of a trail of two", (back) => {
    const trail = followed(0, 2 * TAIL_GAP);

    expect(() => trail.placeOf(back)).toThrow(RangeError);
  });
});

describe("tailLength", () => {
  it.each([
    [0, 0],
    [4, 0],
    [5, 4],
    [9, 4],
    [10, 6],
    [19, 6],
    [20, TAIL_MOST],
    [40, TAIL_MOST],
  ])("gives a streak of %i a tail of %i dots", (streak, dots) => {
    expect(tailLength(streak)).toBe(dots);
  });
});

describe("a tail's dots", () => {
  it("are fainter and smaller from the nearest back", () => {
    const length = 4;
    const dots = Array.from({ length }, (_, dot) => ({
      alpha: tailAlpha(dot, length),
      scale: tailScale(dot, length),
    }));

    expect(dots).toEqual([
      { alpha: TAIL_ALPHA, scale: 1 },
      { alpha: (TAIL_ALPHA * 3) / 4, scale: 1 - (1 - TAIL_LEAST) / 4 },
      { alpha: TAIL_ALPHA / 2, scale: 1 - (1 - TAIL_LEAST) / 2 },
      { alpha: TAIL_ALPHA / 4, scale: 1 - ((1 - TAIL_LEAST) * 3) / 4 },
    ]);
  });
});

import { type Draws, drawIn, nextDraw } from "./draws";

/** Returns the draws of a field seeded with a seed, none drawn yet. */
function drawsOf(seed: number): Draws {
  return { seed, draws: 0 };
}

describe("nextDraw", () => {
  it("keeps the numbers a field draws, which saved games will rely on", () => {
    const field = drawsOf(1);

    const draws = [nextDraw(field), nextDraw(field)].map((n) => n * 2 ** 32);

    expect(draws).toEqual([2197834832, 2224532361]);
  });

  it("counts each draw", () => {
    const field = drawsOf(1);

    nextDraw(field);

    expect(field.draws).toBe(1);
  });
});

describe("drawIn", () => {
  it("draws a number from a span's least up to its most, as the draw's share of the way", () => {
    const span = { least: 2, most: 6 };

    const drawn = drawIn(drawsOf(1), span);

    expect(drawn).toBeCloseTo(2 + 4 * nextDraw(drawsOf(1)));
  });
});

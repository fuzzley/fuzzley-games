import { type Area, circle, ring } from "./shapes";
import { discIn, dotIn, rimIn, symbolLineStyle } from "./symbols";

/** A square 20 a side, its corner at (10, 30). */
const SQUARE: Area = { x: 10, y: 30, width: 20, height: 20 };

describe("symbolLineStyle", () => {
  it.each([
    [1, 2.8],
    [4, 4],
  ])(
    "draws a symbol's lines, in a style %f wide, %f wide: a share of its square, or the style's own width where that is wider",
    (width, wide) => {
      const style = symbolLineStyle(SQUARE, { color: 7, width });

      expect([style.color, style.width]).toEqual([7, expect.closeTo(wide)]);
    },
  );
});

describe("the symbols' shapes", () => {
  it("draw a dot at shares of an area across and down, its radius a share of its width", () => {
    const tall: Area = { x: 10, y: 30, width: 20, height: 40 };

    expect(dotIn(tall, { x: 0.25, y: 0.75 }, 0.1, { color: 7 })).toEqual(
      circle({ x: 15, y: 60 }, 2, { color: 7 }),
    );
  });

  it("draw a disc about a square's middle", () => {
    expect(discIn(SQUARE, 0.4, { color: 7 })).toEqual(
      circle({ x: 20, y: 40 }, 8, { color: 7 }),
    );
  });

  it("draw a rim about a square's middle, in a line's width", () => {
    expect(rimIn(SQUARE, 0.4, { color: 7, width: 3 })).toEqual(
      ring({ x: 20, y: 40 }, 8, { color: 7, width: 3 }),
    );
  });
});

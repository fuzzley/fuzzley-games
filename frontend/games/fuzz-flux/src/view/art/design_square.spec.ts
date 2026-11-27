import { circle } from "@fz/phaser/shapes";
import { billionths } from "../../testing/art_frames";
import { BODY, SQUARE, atLeastAPixel, inPixels, polar } from "./design_square";

describe("polar", () => {
  it.each([
    [0, { x: 2, y: 0 }],
    [Math.PI / 2, { x: 0, y: 2 }],
    [Math.PI, { x: -2, y: 0 }],
  ])(
    "lies at %f radians clockwise from the right, down the screen at a quarter turn",
    (angle, point) => {
      const { x, y } = polar(angle, 2);

      expect({ x: billionths(x), y: billionths(y) }).toEqual(point);
    },
  );
});

describe("inPixels", () => {
  it("draws the design's square a unit across, a body 58% of it", () => {
    const [body] = inPixels(
      [circle({ x: SQUARE / 2, y: 0 }, BODY, { color: 1 })],
      {
        unit: 50,
        pixelRatio: 2,
      },
    );

    expect(body).toEqual(circle({ x: 25, y: 0 }, 14.5, { color: 1 }));
  });
});

describe("atLeastAPixel", () => {
  it.each([
    [3, { unit: 100, pixelRatio: 2 }, 3],
    [1, { unit: 100, pixelRatio: 2 }, 2],
    [1, { unit: 80, pixelRatio: 1.5 }, 2.5],
  ])(
    "keeps %f of the design's units at %o, or widens it to a CSS pixel, %f",
    (units, scale, widened) => {
      expect(atLeastAPixel(units, scale)).toBe(widened);
    },
  );
});

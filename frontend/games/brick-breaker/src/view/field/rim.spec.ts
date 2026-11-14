import { PANEL_GAP_CSS_PX } from "@fz/phaser/layout";
import { rimWidth } from "./rim";

describe("rimWidth", () => {
  it("makes the rim 0.3 of a unit wide, in whole device pixels", () => {
    expect(rimWidth({ unit: 30, wall: 4, pixelRatio: 2 })).toBe(9);
  });

  it("makes it no narrower than the wall the layout leaves", () => {
    expect(rimWidth({ unit: 10, wall: 4, pixelRatio: 2 })).toBe(4);
  });

  it.each([1, 1.25, 2, 3])(
    "keeps it to the wall and half the side panels' gap from it, however large the unit, at %f device pixels to a CSS pixel",
    (pixelRatio) => {
      const wall = Math.ceil(2 * pixelRatio);

      const rim = rimWidth({ unit: 200 * pixelRatio, wall, pixelRatio });

      expect(rim).toBe(wall + Math.floor((PANEL_GAP_CSS_PX * pixelRatio) / 2));
    },
  );
});

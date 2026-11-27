import { FEEL } from "../timeline/feel";
import { markAlpha, markRise, markScale } from "./flourishes";

describe("a wave's mark", () => {
  it("fades in over its first fifth, and out over the rest", () => {
    expect([0, 0.1, 0.2, 0.6, 1].map(markAlpha)).toEqual([0, 0.5, 1, 0.5, 0]);
  });

  it("pops in a third larger, and springs back to its size", () => {
    expect([markScale(0), markScale(1 / 3), markScale(1)]).toEqual([1.3, 1, 1]);
  });

  it("rises the feel's way from its place over its showing", () => {
    expect([markRise(0, FEEL), markRise(1, FEEL)]).toEqual([
      0,
      FEEL.markRiseSquares,
    ]);
  });
});

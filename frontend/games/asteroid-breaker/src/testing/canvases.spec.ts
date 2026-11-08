import type { Shape } from "@fz/dev/layout";
import { NO_INSETS } from "@fz/phaser/insets";
import { boardOf } from "./canvases";

/** Returns a shape of window, in CSS pixels, at a pixel ratio. */
function shape(width: number, height: number, ratio: number): Shape {
  return {
    name: `${String(width)} × ${String(height)}`,
    viewport: { width, height, deviceScaleFactor: ratio },
  };
}

describe("boardOf", () => {
  it("leaves a roomy window's canvas under the bar, with a roomy margin", () => {
    expect(boardOf(shape(1280, 800, 1))).toEqual({
      canvas: { width: 1280, height: 727, pixelRatio: 1, insets: NO_INSETS },
      marginCss: 24,
    });
  });

  it("leaves an upright phone's canvas under its bar, in device pixels", () => {
    expect(boardOf(shape(390, 844, 3))).toEqual({
      canvas: { width: 1170, height: 2352, pixelRatio: 3, insets: NO_INSETS },
      marginCss: 12,
    });
  });

  it("leaves a phone's on its side beside the rail", () => {
    expect(boardOf(shape(844, 390, 2))).toEqual({
      canvas: { width: 1560, height: 780, pixelRatio: 2, insets: NO_INSETS },
      marginCss: 12,
    });
  });
});

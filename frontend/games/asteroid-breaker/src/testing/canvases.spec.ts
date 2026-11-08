import path from "node:path";
import type { Shape } from "@fz/dev/layout";
import { NO_INSETS } from "@fz/phaser/insets";
import { compileStylesheet } from "@fz/style/testing";
import { MARGIN_CSS_PX } from "../view/field/field_metrics";
import { boardOf } from "./canvases";

// The stylesheets that publish the bar's size to the page: the global one on
// `:root`, and the app's own over it on a compact screen.
const ROOMY = path.join(import.meta.dirname, "../app/styles/global.scss");
const COMPACT = path.join(import.meta.dirname, "../app/app.component.scss");

/** The bar's size as the app's stylesheets publish it, in CSS pixels. */
interface BarSize {
  /** Its height across the top or the bottom of the window. */
  readonly height: number;
  /** Its width as a rail down one side of the window. */
  readonly railWidth: number;
}

/** Returns a shape of window, in CSS pixels, at a pixel ratio. */
function shape(width: number, height: number, ratio: number): Shape {
  return {
    name: `${String(width)} × ${String(height)}`,
    viewport: { width, height, deviceScaleFactor: ratio },
  };
}

/**
 * Returns the bar's size a stylesheet of the app publishes for the stage the
 * board fills, through `@fz/game-ui`'s `bar-size()`, compiled as the app's
 * build compiles it.
 */
function barSizeIn(stylesheet: string): BarSize {
  const css = compileStylesheet(stylesheet);
  return {
    height: pixels(css, "--fz-bar-height"),
    railWidth: pixels(css, "--fz-rail-width"),
  };
}

/**
 * Returns the CSS pixels compiled CSS sets a custom property to, failing the
 * spec if it sets none.
 */
function pixels(css: string, property: string): number {
  const value = new RegExp(`${property}:\\s*([\\d.]+)px;`).exec(css)?.[1];
  if (value === undefined) throw new Error(`No ${property} in pixels: ${css}`);
  return Number(value);
}

describe("boardOf", () => {
  it("leaves a roomy window's canvas under the bar, with a roomy margin", () => {
    expect(boardOf(shape(1280, 800, 1))).toEqual({
      canvas: { width: 1280, height: 727, pixelRatio: 1, insets: NO_INSETS },
      marginCss: MARGIN_CSS_PX.roomy,
    });
  });

  it("leaves an upright phone's canvas under its bar, in device pixels", () => {
    expect(boardOf(shape(390, 844, 3))).toEqual({
      canvas: { width: 1170, height: 2352, pixelRatio: 3, insets: NO_INSETS },
      marginCss: MARGIN_CSS_PX.compact,
    });
  });

  it("leaves a phone's on its side beside the rail", () => {
    expect(boardOf(shape(844, 390, 2))).toEqual({
      canvas: { width: 1560, height: 780, pixelRatio: 2, insets: NO_INSETS },
      marginCss: MARGIN_CSS_PX.compact,
    });
  });

  // The sizes are written twice, in `@fz/game-ui`'s Sass, which the app's
  // stylesheets publish to the page, and in `canvases.ts` for the specs, so
  // these keep the two in step.
  describe("as the app's stylesheets size the bar", () => {
    it("takes the bar's height off a roomy window", () => {
      const bar = barSizeIn(ROOMY);

      const { canvas } = boardOf(shape(1280, 800, 1));

      expect(canvas.height).toBe(800 - bar.height);
    });

    it("takes the compact bar's height off an upright phone's window", () => {
      const bar = barSizeIn(COMPACT);

      const { canvas } = boardOf(shape(390, 844, 1));

      expect(canvas.height).toBe(844 - bar.height);
    });

    it("takes the rail's width off a phone's window on its side", () => {
      const bar = barSizeIn(COMPACT);

      const { canvas } = boardOf(shape(844, 390, 1));

      expect(canvas.width).toBe(844 - bar.railWidth);
    });
  });
});

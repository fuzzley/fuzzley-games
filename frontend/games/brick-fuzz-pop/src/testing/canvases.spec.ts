import path from "node:path";
import { compileStylesheet } from "@fz/style/testing";
import { MARGIN_CSS_PX } from "../view/field/field_metrics";
import { CHROME_CSS_PX, boardCanvas, marginInsets } from "./canvases";

// The stylesheets that publish the bar's size: the app's global one, on
// `:root`, and the compact bar's, until the app's own frame publishes it.
const ROOMY = path.join(import.meta.dirname, "../app/styles/global.scss");
const COMPACT = path.join(import.meta.dirname, "compact_bar.scss");

/**
 * Returns the CSS pixels a stylesheet, compiled as the app's build compiles
 * it, sets a custom property to, failing the spec if it sets none.
 */
function pixelsIn(stylesheet: string, property: string): number {
  const css = compileStylesheet(stylesheet);
  const value = new RegExp(`${property}:\\s*([\\d.]+)px;`).exec(css)?.[1];
  if (value === undefined) throw new Error(`No ${property} in pixels: ${css}`);
  return Number(value);
}

describe("boardCanvas", () => {
  it("leaves a roomy window's canvas under the bar, inside a roomy margin", () => {
    expect(boardCanvas(1280, 800)).toEqual({
      width: 1280,
      height: 727,
      pixelRatio: 1,
      insets: marginInsets(MARGIN_CSS_PX.roomy),
    });
  });

  it("leaves an upright phone's canvas over its bar, in device pixels", () => {
    expect(boardCanvas(390, 844, 3)).toEqual({
      width: 1170,
      height: 2352,
      pixelRatio: 3,
      insets: marginInsets(MARGIN_CSS_PX.compact),
    });
  });

  it("leaves a phone's on its side beside the rail", () => {
    expect(boardCanvas(844, 390, 2)).toEqual({
      width: 1560,
      height: 780,
      pixelRatio: 2,
      insets: marginInsets(MARGIN_CSS_PX.compact),
    });
  });

  // The sizes are written twice, in `@fz/game-ui`'s Sass, which the app's
  // stylesheets publish to the page, and in `canvases.ts` for the specs, so
  // these keep the two in step.
  describe("as `@fz/game-ui` sizes the bar", () => {
    it("takes the bar's height the app's global stylesheet publishes off a roomy window", () => {
      expect(CHROME_CSS_PX.roomy).toBe(pixelsIn(ROOMY, "--fz-bar-height"));
    });

    it("takes the rail's width the app's global stylesheet publishes off a phone's window on its side", () => {
      expect(CHROME_CSS_PX.rail).toBe(pixelsIn(ROOMY, "--fz-rail-width"));
    });

    it("takes the compact bar's height off an upright phone's window", () => {
      expect(CHROME_CSS_PX.compact).toBe(pixelsIn(COMPACT, "--fz-bar-height"));
    });
  });
});

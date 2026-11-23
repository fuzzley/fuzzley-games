import path from "node:path";
import { compileStylesheet } from "@fz/style/testing";
import { MARGIN_CSS_PX } from "../view/field_metrics";
import { CHROME_CSS_PX, boardCanvas, marginInsets } from "./canvases";

/**
 * The stylesheet that publishes the bar's size on a roomy screen and a
 * compact one, compiled as a game's build compiles it.
 */
const BAR_SIZE = compileStylesheet(
  path.join(import.meta.dirname, "bar_size.scss"),
);

/**
 * Returns the CSS pixels the bar's stylesheet sets a custom property to
 * under a screen's class, failing the spec if it sets none.
 */
function pixelsIn(screen: string, property: string): number {
  const rule = new RegExp(`\\.${screen}\\s*\\{([^}]*)\\}`).exec(BAR_SIZE)?.[1];
  const value = new RegExp(`${property}:\\s*([\\d.]+)px;`).exec(
    rule ?? "",
  )?.[1];
  if (value === undefined) {
    throw new Error(`No ${property} in pixels for .${screen}: ${BAR_SIZE}`);
  }
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

  // The sizes are written twice, in `@fz/game-ui`'s Sass, which a game's
  // stylesheets publish to the page, and in `canvases.ts` for the specs, so
  // these keep the two in step.
  describe("as `@fz/game-ui` sizes the bar", () => {
    it("takes the bar's height off a roomy window", () => {
      expect(CHROME_CSS_PX.roomy).toBe(pixelsIn("roomy", "--fz-bar-height"));
    });

    it("takes the rail's width off a phone's window on its side", () => {
      expect(CHROME_CSS_PX.rail).toBe(pixelsIn("compact", "--fz-rail-width"));
    });

    it("takes the compact bar's height off an upright phone's window", () => {
      expect(CHROME_CSS_PX.compact).toBe(
        pixelsIn("compact", "--fz-bar-height"),
      );
    });
  });
});

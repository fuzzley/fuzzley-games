import { mixColors } from "@fz/phaser/color";
import { svgOf } from "@fz/phaser/shapes";
import { viewport } from "@fz/phaser/testing/pure";
import { FIELD_HEIGHT } from "../../rules/tuning";
import { fieldMetrics } from "../field/field_metrics";
import { MASK_INKS, backdropStyle } from "./backdrop";
import { FAINT, PLACE_ART, placeTile, tileSide } from "./places";

/** A wide window's field, at 2 device pixels to a CSS pixel. */
const METRICS = fieldMetrics(viewport(1280, 720, 2), FIELD_HEIGHT);

/** Returns the document a CSS `url()` of a `data:` URL holds. */
function documentIn(url: string): string {
  const prefix = 'url("data:image/svg+xml,';
  if (!url.startsWith(prefix) || !url.endsWith('")')) {
    throw new Error(`Not an SVG's url(): ${url.slice(0, 40)}`);
  }
  return decodeURIComponent(url.slice(prefix.length, -2));
}

describe("MASK_INKS", () => {
  it("draws the motifs in white, which a mask shows in full, and the grid as faint", () => {
    expect(MASK_INKS).toEqual({
      motif: 0xffffff,
      faint: mixColors(0xffffff, 0x000000, FAINT),
    });
  });
});

describe("backdropStyle", () => {
  it("writes the field's own tile, at its scale, in the mask's inks, as SVG", () => {
    const style = backdropStyle("workshop", METRICS);

    expect(documentIn(style["--place-tile"])).toBe(
      svgOf(placeTile("workshop", METRICS, MASK_INKS)),
    );
  });

  it("sizes the tile in CSS pixels, as large as the field shows it", () => {
    const style = backdropStyle("garden", METRICS);

    expect(style["--place-size"]).toBe(
      `${String(tileSide(METRICS) / METRICS.pixelRatio)}px`,
    );
  });

  it("lays the tiles from the field's top left corner, as the field lays its own", () => {
    const style = backdropStyle("arcade", METRICS);

    expect(style["--place-at"]).toBe(
      `${String(METRICS.css.x)}px ${String(METRICS.css.y)}px`,
    );
  });

  it("washes it as strongly as its place shows over the page", () => {
    expect(backdropStyle("funfair", METRICS)["--place-wash"]).toBe(
      PLACE_ART.funfair.page,
    );
  });
});

import { svgOf } from "@fz/phaser/shapes";
import type { Place } from "../../rules/levels/levels";
import type { FieldMetrics } from "../field/field_metrics";
import { PLACE_ART, type PlaceInks, placeInks, placeTile } from "./places";

const WHITE = 0xffffff;
const BLACK = 0x000000;

/**
 * The inks a place's tile is drawn in as the page's mask, which shows the
 * color under it as far as each is light: white for the motifs, and the
 * faint ink's share of it for the workshop's grid.
 */
export const MASK_INKS: PlaceInks = placeInks(WHITE, BLACK, 1);

/** The custom properties the board's stylesheet shows a place over the page with. */
export interface BackdropStyle {
  /** The field's own tile, written as SVG, in {@link MASK_INKS}, as a `url()` of a `data:` URL. */
  readonly "--place-tile": string;
  /** How large the tile is, in CSS pixels. */
  readonly "--place-size": string;
  /** Where a tile's top left corner lies: at the field's. */
  readonly "--place-at": string;
  /** How much of the text it takes over the page. */
  readonly "--place-wash": number;
}

/**
 * Returns how the page shows a place past a field laid out so: the tile the
 * scene tiles the field with, at the field's scale, written as SVG for a
 * mask over the text, as large in CSS pixels and set from the field's top
 * left corner, so the page's pattern lies as the field's does, a little
 * stronger.
 */
export function backdropStyle(
  place: Place,
  metrics: FieldMetrics,
): BackdropStyle {
  const tile = placeTile(place, metrics, MASK_INKS);
  const { x, y } = metrics.css;
  return {
    "--place-tile": `url("data:image/svg+xml,${encodeURIComponent(svgOf(tile))}")`,
    "--place-size": `${String(tile.width / metrics.pixelRatio)}px`,
    "--place-at": `${String(x)}px ${String(y)}px`,
    "--place-wash": PLACE_ART[place].page,
  };
}

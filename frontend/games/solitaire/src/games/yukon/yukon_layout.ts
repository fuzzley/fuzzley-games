import { boardLayout } from "../common/board_layout";
import { DEFAULT_YUKON_VARIANT } from "./yukon_rules";
import { TABLEAU_COUNT, yukonZoneSpecs } from "./yukon_zones";

/**
 * The Yukon board: four foundations at the right of the top row, seven columns
 * filling the bottom, and nothing at all at the top left.
 *
 * Any variant would do for reading the zones: it changes the rules, not the
 * grid.
 */
export const YUKON_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: yukonZoneSpecs(DEFAULT_YUKON_VARIANT),
  // The last column is dealt eleven deep, six buried under five face up, and
  // only grows from there.
  designHeightPx: 1077,
});

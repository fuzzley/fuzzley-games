import { TableLayoutSpec } from "@/engine/render/layout/table_layout";
import { boardLayout } from "../common/board_layout";
import { MontanaVariant, ROW_COUNT } from "./montana_rules";
import { boardColumnCount, montanaZoneSpecs } from "./montana_zones";

/**
 * Returns the board a variant lies on: its grid of four rows, with the redeal
 * marker in a column of its own beside it.
 *
 * Nothing fans, so the board needs no `designHeightPx`.
 */
function montanaLayout(variant: MontanaVariant): TableLayoutSpec {
  return boardLayout({
    columns: boardColumnCount(variant),
    rows: ROW_COUNT,
    zones: montanaZoneSpecs(variant),
  });
}

/** The Montana board: four rows of thirteen, the marker a fourteenth column. */
export const MONTANA_LAYOUT = montanaLayout(MontanaVariant.MONTANA);

/**
 * The board Blue Moon and Red Moon share: four rows of fourteen, the Aces in
 * the first column and the marker in a fifteenth.
 */
export const BLUE_MOON_LAYOUT = montanaLayout(MontanaVariant.BLUE_MOON);

import { TableLayoutSpec } from "@/engine/render/layout/table_layout";
import { boardLayout } from "../common/board_layout";
import { CastleVariant, castleRules } from "./castle_rules";
import { BOARD_COLUMN_COUNT, castleZoneSpecs } from "./castle_zones";

/**
 * Returns the board a variant lies on: a wing of rows either side of the
 * foundations, a row of the grid per row of cards.
 *
 * Rows fan sideways, not down, so the board needs no `designHeightPx`.
 */
function castleLayout(variant: CastleVariant): TableLayoutSpec {
  return boardLayout({
    columns: BOARD_COLUMN_COUNT,
    rows: castleRules(variant).rowsPerWing,
    zones: castleZoneSpecs(variant),
  });
}

/**
 * The board Beleaguered Castle, Streets and Alleys and Citadel share: four
 * rows a wing.
 */
export const BELEAGUERED_CASTLE_LAYOUT = castleLayout(
  CastleVariant.BELEAGUERED_CASTLE,
);

/** Fortress's board: five rows a wing. */
export const FORTRESS_LAYOUT = castleLayout(CastleVariant.FORTRESS);

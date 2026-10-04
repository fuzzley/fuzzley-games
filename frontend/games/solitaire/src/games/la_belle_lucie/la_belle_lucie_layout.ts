import { TableLayoutSpec } from "@/engine/render/layout/table_layout";
import { boardLayout } from "../common/board_layout";
import { LaBelleLucieVariant } from "./la_belle_lucie_rules";
import {
  FAN_ROW_PITCH,
  fansPerRow,
  laBelleLucieZoneSpecs,
} from "./la_belle_lucie_zones";

/**
 * Returns the board a variant lies on: the redeal marker and the foundations
 * along the top, and two rows of fans beneath.
 */
function laBelleLucieLayout(variant: LaBelleLucieVariant): TableLayoutSpec {
  return boardLayout({
    columns: fansPerRow(variant),
    rows: 2 + FAN_ROW_PITCH,
    zones: laBelleLucieZoneSpecs(variant),
    // A fan of four in the lower row, with a hovered card open, ends about
    // 1392 from the top of the board.
    designHeightPx: 1397,
  });
}

/**
 * The board La Belle Lucie, The Fan and Shamrocks share: eighteen fans, nine
 * to a row.
 */
export const LA_BELLE_LUCIE_LAYOUT = laBelleLucieLayout(
  LaBelleLucieVariant.LA_BELLE_LUCIE,
);

/** Trefoil's board: sixteen fans, eight to a row. */
export const TREFOIL_LAYOUT = laBelleLucieLayout(LaBelleLucieVariant.TREFOIL);

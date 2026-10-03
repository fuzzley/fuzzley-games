import { TableLayoutSpec } from "@/engine/render/layout/table_layout";
import { boardLayout } from "../common/board_layout";
import { BlackHoleVariant } from "./black_hole_rules";
import { blackHoleBoard, blackHoleZoneSpecs } from "./black_hole_zones";

/** Returns the board a variant lies on. */
function blackHoleLayout(
  variant: BlackHoleVariant,
  designHeightPx: number,
): TableLayoutSpec {
  const { columns, rows } = blackHoleBoard(variant);
  return boardLayout({
    columns,
    rows,
    zones: blackHoleZoneSpecs(variant),
    designHeightPx,
  });
}

/**
 * Black Hole's board: two rows of nine, the hole in the middle of the top
 * row and seventeen fans around it.
 *
 * The fans only shrink, so a lower fan of three, with a hovered card open,
 * is the deepest the board gets: about 1030 from its top.
 */
export const BLACK_HOLE_LAYOUT = blackHoleLayout(
  BlackHoleVariant.BLACK_HOLE,
  1030,
);

/**
 * All in a Row's board: the foundation in the middle of the top row, and
 * thirteen columns beneath, whose four dealt cards end about 970 from the top.
 */
export const ALL_IN_A_ROW_LAYOUT = blackHoleLayout(
  BlackHoleVariant.ALL_IN_A_ROW,
  970,
);

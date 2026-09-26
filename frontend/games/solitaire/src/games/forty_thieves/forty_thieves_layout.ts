import { TableLayoutSpec } from "@/engine/render/layout/table_layout";
import { boardLayout } from "../common/board_layout";
import { FortyThievesVariant } from "./forty_thieves_rules";
import { boardColumnCount, fortyThievesZoneSpecs } from "./forty_thieves_zones";

/**
 * Returns the board a variant lies on: stock, waste and eight foundations along
 * the top, and the columns beneath.
 */
export function fortyThievesLayout(
  variant: FortyThievesVariant,
): TableLayoutSpec {
  let layout = layoutByVariant.get(variant);
  if (!layout) {
    layout = buildLayout(variant);
    layoutByVariant.set(variant, layout);
  }
  return layout;
}

const layoutByVariant = new Map<FortyThievesVariant, TableLayoutSpec>();

function buildLayout(variant: FortyThievesVariant): TableLayoutSpec {
  return boardLayout({
    columns: boardColumnCount(variant),
    rows: 2,
    zones: fortyThievesZoneSpecs(variant),
    // A fourteen-card column reaches about 1364 from the top of the board, and
    // at ten columns or wider this height costs no card size.
    designHeightPx: 1400,
  });
}

/** The board Forty Thieves, Josephine and Rank and File share: ten columns. */
export const FORTY_THIEVES_LAYOUT = fortyThievesLayout(
  FortyThievesVariant.FORTY_THIEVES,
);

/** Maria's board: nine columns centred under a ten-wide top row. */
export const MARIA_LAYOUT = fortyThievesLayout(FortyThievesVariant.MARIA);

/** Limited's board: twelve columns, the widest in the family. */
export const LIMITED_LAYOUT = fortyThievesLayout(FortyThievesVariant.LIMITED);

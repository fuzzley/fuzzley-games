import { ArrangedLayouts } from "@/engine/render/layout/board_layouts";
import { TableLayoutSpec } from "@/engine/render/layout/table_layout";
import { boardLayout } from "../common/board_layout";
import {
  arrangedLayouts,
  pileIdsInRow,
  pilesInRow,
} from "../common/arranged_layouts";
import { FortyThievesVariant } from "./forty_thieves_rules";
import {
  STOCK_PILE_ID,
  WASTE_PILE_ID,
  boardColumnCount,
  fortyThievesZoneSpecs,
} from "./forty_thieves_zones";

/**
 * Returns the board a variant lies on: stock, waste and eight foundations along
 * the top, and the columns beneath.
 */
function fortyThievesLayout(variant: FortyThievesVariant): TableLayoutSpec {
  return boardLayout({
    columns: boardColumnCount(variant),
    rows: 2,
    zones: fortyThievesZoneSpecs(variant),
    // A fourteen-card column reaches about 1291 from the top of the board, and
    // at ten columns or wider this height costs no card size.
    designHeightPx: 1327,
  });
}

/**
 * Returns a variant's board in every arrangement. The stock and waste go with
 * the foundations above the columns or along the bottom, at whichever side the
 * player asks for. On a phone on its side, the foundations stack down one rail
 * and the stock and waste the other.
 *
 * At ten columns or wider the grid with the piles below needs no more height
 * than the grid above has, so it takes no cap.
 */
function fortyThievesArrangedLayouts(
  roomy: TableLayoutSpec,
  variant: FortyThievesVariant,
): ArrangedLayouts {
  const zones = fortyThievesZoneSpecs(variant);
  return arrangedLayouts({
    roomy,
    columns: pileIdsInRow(zones, 1),
    row: pilesInRow(zones, 0),
    side: STOCK_PILE_ID,
    rails: {
      left: pileIdsInRow(zones, 0)
        .filter(
          (pileId) => pileId !== STOCK_PILE_ID && pileId !== WASTE_PILE_ID,
        )
        .map((pileId) => ({ pileId, overlapped: true })),
      right: [{ pileId: STOCK_PILE_ID }, { pileId: WASTE_PILE_ID }],
    },
    // Fourteen face-up cards, which also covers Rank and File's three hidden
    // cards under a run from king to ace.
    longestColumn: { faceDown: 0, faceUp: 14 },
  });
}

/** The board Forty Thieves, Josephine and Rank and File share: ten columns. */
export const FORTY_THIEVES_LAYOUT = fortyThievesLayout(
  FortyThievesVariant.FORTY_THIEVES,
);

/** Forty Thieves's board in every arrangement, as its variants share it. */
export const FORTY_THIEVES_ARRANGED_LAYOUTS = fortyThievesArrangedLayouts(
  FORTY_THIEVES_LAYOUT,
  FortyThievesVariant.FORTY_THIEVES,
);

/** Maria's board: nine columns centred under a ten-wide top row. */
export const MARIA_LAYOUT = fortyThievesLayout(FortyThievesVariant.MARIA);

/** Maria's board in every arrangement. */
export const MARIA_ARRANGED_LAYOUTS = fortyThievesArrangedLayouts(
  MARIA_LAYOUT,
  FortyThievesVariant.MARIA,
);

/** Limited's board: twelve columns. */
export const LIMITED_LAYOUT = fortyThievesLayout(FortyThievesVariant.LIMITED);

/** Limited's board in every arrangement. */
export const LIMITED_ARRANGED_LAYOUTS = fortyThievesArrangedLayouts(
  LIMITED_LAYOUT,
  FortyThievesVariant.LIMITED,
);

/** Lucas's board: thirteen columns, the widest in the family. */
export const LUCAS_LAYOUT = fortyThievesLayout(FortyThievesVariant.LUCAS);

/** Lucas's board in every arrangement. */
export const LUCAS_ARRANGED_LAYOUTS = fortyThievesArrangedLayouts(
  LUCAS_LAYOUT,
  FortyThievesVariant.LUCAS,
);

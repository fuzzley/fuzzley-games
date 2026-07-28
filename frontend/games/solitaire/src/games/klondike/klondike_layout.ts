import { PileLayout } from "@/engine/render/layout/pile_layout";
import {
  SlotPlacement,
  TableLayoutSpec,
} from "@/engine/render/layout/table_layout";
import {
  CARD_HEIGHT_PX,
  CARD_WIDTH_PX,
  HEADER_HEIGHT_PX,
  LAYOUT_GAP_X,
  LAYOUT_GAP_Y,
  LAYOUT_PADDING_X,
  LAYOUT_PADDING_Y,
} from "@/engine/render/layout/card_metrics";
import {
  FOUNDATION_COUNT,
  KlondikeRole,
  STOCK_PILE_ID,
  TABLEAU_COUNT,
  WASTE_PILE_ID,
  foundationPileId,
  tableauPileId,
} from "./klondike_zones";

/** Downward gap below a face-up tableau card before the next card. */
export const TABLEAU_FACE_UP_OFFSET = 45;

/** Downward gap below a face-down tableau card before the next card. */
export const TABLEAU_FACE_DOWN_OFFSET = 18;

/**
 * Extra downward gap opened below the hovered tableau card so the cards fanned
 * on top slide down and reveal more of it.
 */
export const TABLEAU_HOVER_EXPANSION_OFFSET = 15;

/**
 * Horizontal gap between fanned waste cards.
 *
 * Wide enough to clear a card's index corner, so each fanned card shows its own
 * rank and suit rather than a bare sliver of paper. The waste sits in column 1
 * and the foundations start at column 3, so the fan has the whole of column 2
 * to grow into: a three card fan stays clear of the first foundation up to an
 * offset of about 125.
 */
export const WASTE_FAN_OFFSET_X = 55;

/** Maximum number of waste cards to fan (show the edges of) in multi-draw mode. */
export const WASTE_MAX_FAN_CARDS = 3;

/** How a Klondike tableau column arranges its cards. */
export const TABLEAU_PILE_LAYOUT: PileLayout = {
  kind: "fan-down",
  faceUpGap: TABLEAU_FACE_UP_OFFSET,
  faceDownGap: TABLEAU_FACE_DOWN_OFFSET,
  hoverExpansion: TABLEAU_HOVER_EXPANSION_OFFSET,
};

/**
 * How the waste arranges its cards for the given draw mode.
 *
 * Draw 1 turns one card at a time, so there is never more than one to show and
 * fanning would only leave a gap where the second card is not.
 *
 * @param drawCount How many cards a draw turns over.
 */
export function wastePileLayout(drawCount: number): PileLayout {
  return {
    kind: "fan-right",
    gap: WASTE_FAN_OFFSET_X,
    maxVisible: drawCount === 1 ? 1 : WASTE_MAX_FAN_CARDS,
  };
}

/** How the stock and the foundations arrange their cards: squarely. */
export const STACKED_PILE_LAYOUT: PileLayout = { kind: "stacked" };

/**
 * The arrangement a Klondike pile of the given role uses.
 *
 * @param role The part the pile plays.
 * @param drawCount How many cards a draw turns over, which sets the waste fan.
 */
export function klondikePileLayout(
  role: string,
  drawCount: number,
): PileLayout {
  switch (role) {
    case KlondikeRole.TABLEAU:
      return TABLEAU_PILE_LAYOUT;
    case KlondikeRole.WASTE:
      return wastePileLayout(drawCount);
    default:
      return STACKED_PILE_LAYOUT;
  }
}

/**
 * The Klondike board: stock and waste at the left of the top row, foundations
 * at the right of it, and the tableau columns filling the bottom row.
 *
 * Column 2 is deliberately left empty. It is the room the waste fan grows into,
 * which is why the foundations start at column 3 rather than column 2.
 */
export const KLONDIKE_LAYOUT: TableLayoutSpec = {
  columns: TABLEAU_COUNT,
  rows: 2,
  slots: buildSlots(),
  cardSize: { width: CARD_WIDTH_PX, height: CARD_HEIGHT_PX },
  gap: { x: LAYOUT_GAP_X, y: LAYOUT_GAP_Y },
  padding: { x: LAYOUT_PADDING_X, y: LAYOUT_PADDING_Y },
  headerHeightPx: HEADER_HEIGHT_PX,
  // The grid alone needs 819, but a tableau column fans about a card and a half
  // below its row. This is the height the board was authored at, and it is what
  // keeps a long column on screen.
  designHeightPx: 950,
};

function buildSlots(): SlotPlacement[] {
  const slots: SlotPlacement[] = [
    { pileId: STOCK_PILE_ID, column: 0, row: 0 },
    { pileId: WASTE_PILE_ID, column: 1, row: 0 },
  ];
  for (let index = 0; index < FOUNDATION_COUNT; index++) {
    slots.push({ pileId: foundationPileId(index), column: 3 + index, row: 0 });
  }
  for (let index = 0; index < TABLEAU_COUNT; index++) {
    slots.push({ pileId: tableauPileId(index), column: index, row: 1 });
  }
  return slots;
}

import { ArrangedLayouts } from "@/engine/render/layout/board_layouts";
import { CARD_HEIGHT_PX } from "@/engine/render/layout/card_metrics";
import {
  SlotPlacement,
  tableLayout,
} from "@/engine/render/layout/table_layout";
import { boardLayout } from "../common/board_layout";
import {
  PHONE_GAP,
  fannedColumnHeight,
  phoneLayout,
} from "../common/arranged_layouts";
import { tableauPileId } from "../common/pile_ids";
import { PHONE_FAN_FIT } from "../common/pile_layouts";
import { AcesUpSpaces } from "./aces_up_rules";
import {
  BOARD_COLUMN_COUNT,
  DISCARD_PILE_ID,
  STOCK_PILE_ID,
  TABLEAU_COUNT,
  acesUpZoneSpecs,
} from "./aces_up_zones";

/** How tall the board reserves for its columns, in design units. */
const DESIGN_HEIGHT_PX = 977;

/**
 * The Aces Up board: one row of stock, four columns and the discard.
 *
 * Either empty-column rule would do for reading the zones: it changes the
 * rules, not the grid.
 */
export const ACES_UP_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: 1,
  zones: acesUpZoneSpecs(AcesUpSpaces.ANY_CARD),
  // A column dealt all thirteen of its cards with nothing discarded ends about
  // 933 from the top of the board.
  designHeightPx: DESIGN_HEIGHT_PX,
});

/** The columns, left to right. */
const COLUMNS = Array.from({ length: TABLEAU_COUNT }, (_, index) =>
  tableauPileId(index),
);

/**
 * How tall a phone grid keeps the longest column: all thirteen cards a column
 * can be dealt, with nothing discarded.
 */
const PHONE_COLUMN_HEIGHT = fannedColumnHeight(
  { faceDown: 0, faceUp: 13 },
  PHONE_FAN_FIT,
);

/** Places the columns side by side from a grid column, in a grid row. */
function columnsFrom(column: number, row: number): SlotPlacement[] {
  return COLUMNS.map((pileId, index) => ({
    pileId,
    column: column + index,
    row,
  }));
}

/**
 * Places the stock and the discard at either end of a row, hung from the top
 * or stood on the bottom edge.
 */
function atTheEnds(
  columns: number,
  row: number,
  anchor: "top" | "bottom",
): SlotPlacement[] {
  return [
    { pileId: STOCK_PILE_ID, column: 0, row, anchor },
    { pileId: DISCARD_PILE_ID, column: columns - 1, row, anchor },
  ];
}

/**
 * The Aces Up board in every arrangement. On a larger screen and a sideways
 * phone the stock and the discard stand at either side of the columns, at the
 * top or on the bottom edge; an upright phone puts them at either end of a
 * row above the columns or along the bottom edge, so the columns take the
 * whole width. The stock goes on whichever side the player asks for.
 */
export const ACES_UP_ARRANGED_LAYOUTS: ArrangedLayouts = {
  roomy: {
    top: ACES_UP_LAYOUT,
    bottom: tableLayout({
      columns: BOARD_COLUMN_COUNT,
      rows: 1,
      slots: [
        ...columnsFrom(1, 0),
        ...atTheEnds(BOARD_COLUMN_COUNT, 0, "bottom"),
      ],
      designHeightPx: DESIGN_HEIGHT_PX,
    }),
  },
  portrait: {
    top: phoneLayout({
      columns: TABLEAU_COUNT,
      rows: 2,
      slots: [...atTheEnds(TABLEAU_COUNT, 0, "top"), ...columnsFrom(0, 1)],
      innerHeight: CARD_HEIGHT_PX + PHONE_GAP.y + PHONE_COLUMN_HEIGHT,
    }),
    bottom: phoneLayout({
      columns: TABLEAU_COUNT,
      rows: 2,
      slots: [...columnsFrom(0, 0), ...atTheEnds(TABLEAU_COUNT, 0, "bottom")],
      innerHeight: PHONE_COLUMN_HEIGHT + PHONE_GAP.y + CARD_HEIGHT_PX,
    }),
  },
  landscape: {
    top: phoneLayout({
      columns: BOARD_COLUMN_COUNT,
      rows: 1,
      slots: [...columnsFrom(1, 0), ...atTheEnds(BOARD_COLUMN_COUNT, 0, "top")],
      innerHeight: PHONE_COLUMN_HEIGHT,
    }),
    bottom: phoneLayout({
      columns: BOARD_COLUMN_COUNT,
      rows: 1,
      slots: [
        ...columnsFrom(1, 0),
        ...atTheEnds(BOARD_COLUMN_COUNT, 0, "bottom"),
      ],
      innerHeight: PHONE_COLUMN_HEIGHT,
    }),
  },
  columns: COLUMNS,
  side: STOCK_PILE_ID,
};

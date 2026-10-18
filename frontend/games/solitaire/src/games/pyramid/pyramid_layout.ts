import { ArrangedLayouts } from "@/engine/render/layout/board_layouts";
import {
  SlotPlacement,
  tableLayout,
} from "@/engine/render/layout/table_layout";
import { boardLayout } from "../common/board_layout";
import { phoneLayout } from "../common/arranged_layouts";
import {
  BOARD_COLUMN_COUNT,
  BOARD_ROW_COUNT,
  DISCARD_PILE_ID,
  HAND_PILE_ID,
  PYRAMID_ROWS,
  STOCK_PILE_ID,
  WASTE_PILE_ID,
  pyramidPileId,
  pyramidZoneSpecs,
} from "./pyramid_zones";

/** The zones the grids are read from, alike for either number of passes. */
const ZONES = pyramidZoneSpecs(1);

/**
 * The Pyramid board: the pyramid's seven rows, each half a row below the
 * last, with the stock and hand in the top-left corner beside its peak and the
 * waste and discard in the top-right.
 *
 * Either number of passes would do for reading the zones: it changes the
 * rules, not the grid. Nothing fans, so the board needs no `designHeightPx`.
 */
export const PYRAMID_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: BOARD_ROW_COUNT,
  zones: ZONES,
});

/** The pyramid's cards, from its peak down, each row left to right. */
const PYRAMID = Array.from({ length: PYRAMID_ROWS }, (_, row) =>
  Array.from({ length: row + 1 }, (_, index) => pyramidPileId(row, index)),
).flat();

/** Places the pyramid with its base's left edge at a grid column. */
function pyramidFrom(column: number): SlotPlacement[] {
  return PYRAMID_LAYOUT.slots
    .filter((slot) => PYRAMID.includes(slot.pileId))
    .map((slot) => ({ ...slot, column: column + slot.column }));
}

/**
 * Places the stock above the hand at the left of the pyramid's last two rows,
 * and the waste above the discard at its right, in a grid with a column to
 * spare at either side.
 */
const BESIDE_THE_BASE: readonly SlotPlacement[] = [
  { pileId: STOCK_PILE_ID, column: 0, row: BOARD_ROW_COUNT - 2 },
  { pileId: HAND_PILE_ID, column: 0, row: BOARD_ROW_COUNT - 1 },
  {
    pileId: WASTE_PILE_ID,
    column: BOARD_COLUMN_COUNT + 1,
    row: BOARD_ROW_COUNT - 2,
  },
  {
    pileId: DISCARD_PILE_ID,
    column: BOARD_COLUMN_COUNT + 1,
    row: BOARD_ROW_COUNT - 1,
  },
];

/** Places the four piles along a row of their own on the bottom edge. */
const ALONG_THE_BOTTOM: readonly SlotPlacement[] = PYRAMID_LAYOUT.slots
  .filter((slot) => !PYRAMID.includes(slot.pileId))
  .map((slot) => ({ ...slot, row: 0, anchor: "bottom" }));

/**
 * The Pyramid board in every arrangement. With the piles at the top they sit in
 * the corners beside the pyramid's peak, as a larger screen has always had
 * them. With the piles at the bottom, a larger screen and a sideways phone
 * stand them in pairs beside the pyramid's base, which widens the grid by a
 * column at either side but costs no card size, height being what holds those
 * screens; an upright phone puts them in a row of their own along the bottom
 * edge. The stock and hand go on whichever side the player asks for, the waste
 * and discard opposite, and the pyramid keeps its order.
 */
export const PYRAMID_ARRANGED_LAYOUTS: ArrangedLayouts = {
  roomy: {
    top: PYRAMID_LAYOUT,
    bottom: tableLayout({
      columns: BOARD_COLUMN_COUNT + 2,
      rows: BOARD_ROW_COUNT,
      slots: [...pyramidFrom(1), ...BESIDE_THE_BASE],
    }),
  },
  portrait: {
    top: phoneLayout({
      columns: BOARD_COLUMN_COUNT,
      rows: BOARD_ROW_COUNT,
      slots: PYRAMID_LAYOUT.slots,
    }),
    bottom: phoneLayout({
      columns: BOARD_COLUMN_COUNT,
      rows: BOARD_ROW_COUNT + 1,
      slots: [...pyramidFrom(0), ...ALONG_THE_BOTTOM],
    }),
  },
  landscape: {
    top: phoneLayout({
      columns: BOARD_COLUMN_COUNT,
      rows: BOARD_ROW_COUNT,
      slots: PYRAMID_LAYOUT.slots,
    }),
    bottom: phoneLayout({
      columns: BOARD_COLUMN_COUNT + 2,
      rows: BOARD_ROW_COUNT,
      slots: [...pyramidFrom(1), ...BESIDE_THE_BASE],
    }),
  },
  columns: PYRAMID,
  side: STOCK_PILE_ID,
};

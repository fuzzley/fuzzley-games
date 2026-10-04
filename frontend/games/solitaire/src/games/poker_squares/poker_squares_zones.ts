import { ZoneSpec } from "@/engine/tableau/zone";
import { zoneAt } from "@/engine/tableau/zone_builder";
import { HAND_PILE_ID, STOCK_PILE_ID } from "../common/pile_ids";
import { STACKED_PILE_LAYOUT } from "../common/pile_layouts";
import {
  CLOSED_STOCK_PLACEHOLDER,
  PLAIN_PLACEHOLDER,
  stockZone,
} from "../common/zone_presets";
import { HAND_SIZE } from "./poker_hands";
import { PokerSquaresRole, SQUARE_RULE } from "./poker_squares_rules";

/** How many squares each side of the grid has: one full hand. */
export const GRID_SIZE = HAND_SIZE;

/** The grid column the grid's first column sits in, right of the stock. */
export const GRID_COLUMN_OFFSET = 1;

/** How many grid columns the board is wide. */
export const BOARD_COLUMN_COUNT = GRID_COLUMN_OFFSET + GRID_SIZE;

export { HAND_PILE_ID, STOCK_PILE_ID };

/** Returns the stable id of the square at a row and column. */
export function squarePileId(row: number, column: number): string {
  return `square-${row}-${column}`;
}

/**
 * Returns the zones of a Poker Squares board: the stock and, beneath it, the
 * card to place, then the grid row by row.
 */
export function pokerSquaresZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  stockZone({
    id: STOCK_PILE_ID,
    role: PokerSquaresRole.STOCK,
    column: 0,
    row: 0,
    accept: null,
    // The hand refills itself; the stock only shows what is still to come.
    backgroundKey: CLOSED_STOCK_PLACEHOLDER,
  }),
  zoneAt({
    id: HAND_PILE_ID,
    role: PokerSquaresRole.HAND,
    column: 0,
    row: 1,
    accept: null,
    layout: STACKED_PILE_LAYOUT,
    grab: { kind: "top-only" },
    draggable: true,
    face: "always-up",
    backgroundKey: PLAIN_PLACEHOLDER,
  }),
  ...Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
    const row = Math.floor(index / GRID_SIZE);
    const column = index % GRID_SIZE;
    return zoneAt({
      id: squarePileId(row, column),
      role: PokerSquaresRole.CELL,
      column: GRID_COLUMN_OFFSET + column,
      row,
      accept: SQUARE_RULE,
      capacity: 1,
      layout: STACKED_PILE_LAYOUT,
      // A placed card never moves.
      grab: { kind: "none" },
      draggable: false,
      face: "always-up",
      backgroundKey: PLAIN_PLACEHOLDER,
    });
  }),
];

/** Re-exported: the roles live with the rules that use them. */
export { PokerSquaresRole };

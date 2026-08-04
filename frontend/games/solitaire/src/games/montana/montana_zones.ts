import { ZoneSpec } from "@/engine/tableau/zone";
import { zoneAt } from "@/engine/tableau/zone_builder";
import { STACKED_PILE_LAYOUT } from "../common/pile_layouts";
import {
  PLAIN_PLACEHOLDER,
  RECYCLING_STOCK_PLACEHOLDER,
} from "../common/zone_presets";
import {
  COLUMN_COUNT,
  MontanaRole,
  ROW_COUNT,
  montanaCellRule,
} from "./montana_rules";

/** The stable id of the redeal marker. */
export const REDEAL_PILE_ID = "redeal";

/**
 * How many grid columns the board is wide: the thirteen of the grid plus one
 * for the redeal marker beside it.
 *
 * The marker has to live somewhere a player can press, and this game has no
 * stock to put it on — every one of its fifty-two piles is a playing position.
 * A column of its own is the cheapest place that is unmistakably not part of the
 * grid.
 */
export const BOARD_COLUMN_COUNT = COLUMN_COUNT + 1;

/** The stable id of the cell at the given row and column. */
export function cellPileId(row: number, column: number): string {
  return `cell-${row}-${column}`;
}

/**
 * The fifty-three zones of a Montana board.
 *
 * Built cell by cell rather than from the shared row presets, and deliberately:
 * those describe a row of *like* piles, and no two positions in this grid are
 * alike — each accepts only the successor of the card to its left. The grid is
 * the game, so writing it out is saying what the game is.
 */
export function montanaZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = buildZoneSpecs();

function buildZoneSpecs(): readonly ZoneSpec[] {
  const zones: ZoneSpec[] = [];

  for (let row = 0; row < ROW_COUNT; row++) {
    for (let column = 0; column < COLUMN_COUNT; column++) {
      zones.push(
        zoneAt({
          id: cellPileId(row, column),
          role: MontanaRole.CELL,
          column,
          row,
          layout: STACKED_PILE_LAYOUT,
          // The whole grid is single-card positions; a gap is simply an empty
          // one.
          capacity: 1,
          // The neighbour is captured here, where both cells are in hand,
          // rather than parsed out of an id at rule time.
          accept: montanaCellRule(
            column === 0 ? null : cellPileId(row, column - 1),
          ),
          grab: { kind: "top-only" },
          draggable: true,
          // Nothing is ever hidden: the entire position is visible from the
          // deal.
          face: "always-up",
          backgroundKey: PLAIN_PLACEHOLDER,
        }),
      );
    }
  }

  zones.push(
    zoneAt({
      id: REDEAL_PILE_ID,
      role: MontanaRole.REDEAL,
      // Beside the grid rather than in it, on the row a player's eye starts at.
      column: COLUMN_COUNT,
      row: 0,
      layout: STACKED_PILE_LAYOUT,
      // Never a destination and never a source: it is a button that happens to
      // be drawn on the table.
      accept: null,
      grab: { kind: "none" },
      draggable: false,
      face: "always-down",
      backgroundKey: RECYCLING_STOCK_PLACEHOLDER,
      // Pressing the empty slot is the whole point of it.
      emptyIsActionable: true,
    }),
  );

  return zones;
}

/** Re-exported: the roles live with the rules that branch on them. */
export { MontanaRole };

import { ZoneSpec } from "@/engine/tableau/zone";
import { zoneAt } from "@/engine/tableau/zone_builder";
import { STOCK_PILE_ID, WASTE_PILE_ID } from "../common/pile_ids";
import {
  OPEN_COLUMN_LAYOUT,
  STACKED_PILE_LAYOUT,
  wasteFanLayout,
} from "../common/pile_layouts";
import {
  CLOSED_STOCK_PLACEHOLDER,
  PLAIN_PLACEHOLDER,
  RECYCLING_STOCK_PLACEHOLDER,
  columnRow,
  foundationRow,
  recyclePipsPlaceholder,
  stockZone,
  wasteZone,
} from "../common/zone_presets";
import {
  CANFIELD_FOUNDATION_RULE,
  CanfieldRole,
  CanfieldVariant,
  canfieldRules,
  canfieldColumn,
} from "./canfield_rules";

/** The number of columns. */
export const TABLEAU_COUNT = 4;

/** The grid column the first foundation and the first column sit in. */
export const PILE_COLUMN_OFFSET = 3;

/** How many grid columns the board is wide. */
export const BOARD_COLUMN_COUNT = PILE_COLUMN_OFFSET + TABLEAU_COUNT;

/** The stable id of the reserve. */
export const RESERVE_PILE_ID = "reserve";

export { STOCK_PILE_ID, WASTE_PILE_ID };

/** Returns the placeholder an untouched stock shows under a variant. */
export function freshStockPlaceholder(maxRecycles: number): string {
  if (maxRecycles === 0) return CLOSED_STOCK_PLACEHOLDER;
  return Number.isFinite(maxRecycles)
    ? recyclePipsPlaceholder(maxRecycles, maxRecycles)
    : RECYCLING_STOCK_PLACEHOLDER;
}

/**
 * Returns the zones of a board under a variant: stock, waste and foundations
 * along the top, the reserve under the stock, and the columns under the
 * foundations.
 */
export function canfieldZoneSpecs(
  variant: CanfieldVariant,
): readonly ZoneSpec[] {
  const { drawCount, maxRecycles, reserveFaceUp } = canfieldRules(variant);

  return [
    stockZone({
      id: STOCK_PILE_ID,
      role: CanfieldRole.STOCK,
      column: 0,
      row: 0,
      accept: null,
      // How it starts out; the game redraws it as recycles are spent.
      backgroundKey: freshStockPlaceholder(maxRecycles),
      emptyIsActionable: maxRecycles > 0,
    }),
    wasteZone({
      id: WASTE_PILE_ID,
      role: CanfieldRole.WASTE,
      column: 1,
      row: 0,
      accept: null,
      layout: wasteFanLayout(drawCount),
    }),
    ...foundationRow({
      count: 4,
      column: PILE_COLUMN_OFFSET,
      row: 0,
      role: CanfieldRole.FOUNDATION,
      accept: CANFIELD_FOUNDATION_RULE,
    }),
    zoneAt({
      id: RESERVE_PILE_ID,
      role: CanfieldRole.RESERVE,
      column: 0,
      row: 1,
      // Cards only leave the reserve.
      accept: null,
      // Superior Canfield fans its open reserve so every card can be read.
      layout: reserveFaceUp ? OPEN_COLUMN_LAYOUT : STACKED_PILE_LAYOUT,
      grab: { kind: "top-only" },
      draggable: true,
      face: "card",
      backgroundKey: PLAIN_PLACEHOLDER,
    }),
    ...columnRow({
      count: TABLEAU_COUNT,
      column: PILE_COLUMN_OFFSET,
      row: 1,
      role: CanfieldRole.TABLEAU,
      ...canfieldColumn(variant),
      layout: OPEN_COLUMN_LAYOUT,
      face: "always-up",
    }),
  ];
}

/** Re-exported: the roles and variants live with the rules that shape them. */
export { CanfieldRole, CanfieldVariant };

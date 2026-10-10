import { ZoneSpec } from "@/engine/tableau/zones/zone";
import { zoneAt, zoneRow } from "@/engine/tableau/zones/zone_builder";
import {
  HAND_PILE_ID,
  STOCK_PILE_ID,
  foundationPileId,
} from "../common/pile_ids";
import {
  OPEN_COLUMN_LAYOUT,
  STACKED_PILE_LAYOUT,
} from "../common/pile_layouts";
import {
  CLOSED_STOCK_PLACEHOLDER,
  FOUNDATION_PLACEHOLDER,
  PLAIN_PLACEHOLDER,
  stockZone,
} from "../common/zone_presets";
import {
  CalculationRole,
  CalculationVariant,
  FOUNDATION_CAPACITY,
  PILE_COUNT,
  WASTE_RULE,
  foundationRuleAt,
} from "./calculation_rules";

/**
 * The grid column the first foundation sits in, and the first waste pile
 * beneath it: right of the stock and the hand.
 */
export const PILE_COLUMN_OFFSET = 2;

/** How many grid columns the board is wide. */
export const BOARD_COLUMN_COUNT = PILE_COLUMN_OFFSET + PILE_COUNT;

/** Returns the stable id of the waste pile at the given index. */
export function wastePileId(index: number): string {
  return `waste-${index}`;
}

export { HAND_PILE_ID, STOCK_PILE_ID };

/**
 * Returns the zones of a board under a variant: stock, hand and foundations
 * along the top, and a waste pile under each foundation.
 */
export function calculationZoneSpecs(
  variant: CalculationVariant,
): readonly ZoneSpec[] {
  return [
    stockZone({
      id: STOCK_PILE_ID,
      role: CalculationRole.STOCK,
      column: 0,
      row: 0,
      accept: null,
      // No `emptyIsActionable`: the stock is turned only once.
      backgroundKey: CLOSED_STOCK_PLACEHOLDER,
    }),
    zoneAt({
      id: HAND_PILE_ID,
      role: CalculationRole.HAND,
      column: 1,
      row: 0,
      // Filled only by turning the stock, which waits until it is empty.
      accept: null,
      layout: STACKED_PILE_LAYOUT,
      capacity: 1,
      grab: { kind: "top-only" },
      draggable: true,
      face: "always-up",
      backgroundKey: PLAIN_PLACEHOLDER,
    }),
    ...Array.from({ length: PILE_COUNT }, (_, index) =>
      zoneAt({
        id: foundationPileId(index),
        role: CalculationRole.FOUNDATION,
        column: PILE_COLUMN_OFFSET + index,
        row: 0,
        accept: foundationRuleAt(variant, index),
        layout: STACKED_PILE_LAYOUT,
        capacity: FOUNDATION_CAPACITY,
        // A card built is built for good.
        grab: { kind: "none" },
        draggable: false,
        face: "always-up",
        backgroundKey: FOUNDATION_PLACEHOLDER,
      }),
    ),
    ...zoneRow({
      count: PILE_COUNT,
      id: wastePileId,
      column: PILE_COLUMN_OFFSET,
      row: 1,
      role: CalculationRole.WASTE,
      accept: WASTE_RULE,
      layout: OPEN_COLUMN_LAYOUT,
      grab: { kind: "top-only" },
      draggable: true,
      face: "always-up",
      backgroundKey: PLAIN_PLACEHOLDER,
    }),
  ];
}

/** Re-exported: the roles and variants live with the rules that shape them. */
export { CalculationRole, CalculationVariant };

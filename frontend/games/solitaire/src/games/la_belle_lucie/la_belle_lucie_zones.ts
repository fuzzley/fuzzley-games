import { suitFoundation } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";
import { zoneAt } from "@/engine/tableau/zone_builder";
import { tableauPileId } from "../common/pile_ids";
import {
  OPEN_COLUMN_LAYOUT,
  STACKED_PILE_LAYOUT,
} from "../common/pile_layouts";
import {
  CLOSED_STOCK_PLACEHOLDER,
  PLAIN_PLACEHOLDER,
  foundationRow,
  recyclePipsPlaceholder,
} from "../common/zone_presets";
import {
  LaBelleLucieRole,
  LaBelleLucieVariant,
  fanRule,
  laBelleLucieRules,
} from "./la_belle_lucie_rules";

/** The stable id of the redeal marker. */
export const REDEAL_PILE_ID = "redeal";

/**
 * How far apart the two rows of fans are, in grid rows: enough for a fan of
 * four cards to end above the row beneath it, where a whole row would leave a
 * three-card fan overlapping it.
 */
export const FAN_ROW_PITCH = 1.4;

/** Returns how many fans sit in each of the two rows under a variant. */
export function fansPerRow(variant: LaBelleLucieVariant): number {
  return Math.ceil(laBelleLucieRules(variant).fanCount / 2);
}

/**
 * Returns the zones of a board under a variant: the redeal marker at the left
 * of the top row and the foundations at its right, then two rows of fans.
 */
export function laBelleLucieZoneSpecs(
  variant: LaBelleLucieVariant,
): readonly ZoneSpec[] {
  const { fanCount, fanCapacity, maxRedeals } = laBelleLucieRules(variant);
  const perRow = fansPerRow(variant);

  return [
    zoneAt({
      id: REDEAL_PILE_ID,
      role: LaBelleLucieRole.REDEAL,
      column: 0,
      row: 0,
      // Never a destination and never a source: it is a button that happens to
      // be drawn on the table.
      accept: null,
      layout: STACKED_PILE_LAYOUT,
      grab: { kind: "none" },
      draggable: false,
      face: "always-down",
      // How it starts out; the game redraws it as redeals are spent.
      backgroundKey:
        maxRedeals > 0
          ? recyclePipsPlaceholder(maxRedeals, maxRedeals)
          : CLOSED_STOCK_PLACEHOLDER,
      emptyIsActionable: maxRedeals > 0,
    }),
    ...foundationRow({
      count: 4,
      column: perRow - 4,
      row: 0,
      role: LaBelleLucieRole.FOUNDATION,
      accept: suitFoundation,
    }),
    ...Array.from({ length: fanCount }, (_, index) =>
      zoneAt({
        id: tableauPileId(index),
        role: LaBelleLucieRole.TABLEAU,
        column: index % perRow,
        row: 1 + Math.floor(index / perRow) * FAN_ROW_PITCH,
        accept: fanRule(variant),
        capacity: fanCapacity,
        layout: OPEN_COLUMN_LAYOUT,
        grab: { kind: "top-only" },
        draggable: true,
        face: "always-up",
        backgroundKey: PLAIN_PLACEHOLDER,
      }),
    ),
  ];
}

/** Re-exported: the roles and variants live with the rules that shape them. */
export { LaBelleLucieRole, LaBelleLucieVariant };

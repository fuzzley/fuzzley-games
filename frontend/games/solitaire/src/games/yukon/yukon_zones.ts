import { ZoneSpec } from "@/engine/tableau/zones/zone";
import { columnRow, foundationRow } from "../common/zone_presets";
import {
  YukonRole,
  YukonVariant,
  YUKON_FOUNDATION_RULE,
  yukonTableauRule,
} from "./yukon_rules";

/** The number of suit foundation piles. */
export const FOUNDATION_COUNT = 4;

/** The number of tableau columns. */
export const TABLEAU_COUNT = 7;

/** Returns the eleven zones of a Yukon board under a variant. */
export function yukonZoneSpecs(variant: YukonVariant): readonly ZoneSpec[] {
  return [
    ...foundationRow({
      // Klondike's foundation columns, leaving bare the top left, where a
      // stock would be.
      count: FOUNDATION_COUNT,
      column: 3,
      row: 0,
      role: YukonRole.FOUNDATION,
      accept: YUKON_FOUNDATION_RULE,
    }),
    ...columnRow({
      count: TABLEAU_COUNT,
      column: 0,
      row: 1,
      role: YukonRole.TABLEAU,
      accept: yukonTableauRule(variant),
      grab: { kind: "any-face-up" },
    }),
  ];
}

/** Re-exported: the roles and the variants live with the rules they shape. */
export { YukonRole, YukonVariant };

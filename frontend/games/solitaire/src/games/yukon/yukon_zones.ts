import { ZoneSpec } from "@/engine/tableau/zone";
import { memoizeZones } from "@/engine/tableau/zone_builder";
import { columnRow, foundationRow } from "../common/zone_presets";
import { YukonRole, YukonVariant, yukonPlacementRule } from "./yukon_rules";

/** The number of suit foundation piles. */
export const FOUNDATION_COUNT = 4;

/** The number of tableau columns. */
export const TABLEAU_COUNT = 7;

/** Returns the eleven zones of a Yukon board under a variant. */
export const yukonZoneSpecs = memoizeZones(
  (variant: YukonVariant): readonly ZoneSpec[] => [
    ...foundationRow({
      // Klondike's foundation columns, leaving bare the top left, where a
      // stock would be.
      count: FOUNDATION_COUNT,
      column: 3,
      row: 0,
      role: YukonRole.FOUNDATION,
      accept: yukonPlacementRule(YukonRole.FOUNDATION, variant),
    }),
    ...columnRow({
      count: TABLEAU_COUNT,
      column: 0,
      row: 1,
      role: YukonRole.TABLEAU,
      accept: yukonPlacementRule(YukonRole.TABLEAU, variant),
      grab: { kind: "any-face-up" },
    }),
  ],
);

/** Re-exported: the roles and the variants live with the rules they shape. */
export { YukonRole, YukonVariant };

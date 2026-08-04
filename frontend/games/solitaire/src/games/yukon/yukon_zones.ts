import { ZoneSpec } from "@/engine/tableau/zone";
import { memoizeZones } from "@/engine/tableau/zone_builder";
import { columnRow, foundationRow } from "../common/zone_presets";
import { YukonRole, YukonVariant, yukonPlacementRule } from "./yukon_rules";

/** The number of suit foundation piles. */
export const FOUNDATION_COUNT = 4;

/** The number of tableau columns. */
export const TABLEAU_COUNT = 7;

/**
 * The eleven zones of a Yukon board, for the given variant.
 *
 * Memoized per variant, and that matters rather than merely being tidy:
 * {@link TableGame.zoneFor} rebuilds its id index whenever the zone array is a
 * different array, and it is asked once per card per frame. Handing back a new
 * array each time would rebuild the index every frame forever.
 */
export const yukonZoneSpecs = memoizeZones(
  (variant: YukonVariant): readonly ZoneSpec[] => [
    ...foundationRow({
      // Klondike's foundation columns, with the top-left corner left bare on
      // purpose: the gap where a player expects a stock and a waste is how the
      // board says this game has neither.
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
      // The defining rule of the family: any face-up card lifts with everything
      // resting on it, ordered or not. Only the bottom card of the moving stack
      // is checked against the target, so a column can be dismantled from the
      // middle — which is what makes a game with no stock winnable at all.
      grab: { kind: "any-face-up" },
    }),
  ],
);

/** Re-exported: the roles and the variants live with the rules they shape. */
export { YukonRole, YukonVariant };

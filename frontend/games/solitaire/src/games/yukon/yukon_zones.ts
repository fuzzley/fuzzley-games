import { PileLayout } from "@/engine/render/layout/pile_layout";
import { ZoneSpec } from "@/engine/tableau/zone";
import { YukonRole, YukonVariant, yukonPlacementRule } from "./yukon_rules";

/** The number of suit foundation piles. */
export const FOUNDATION_COUNT = 4;

/** The number of tableau columns. */
export const TABLEAU_COUNT = 7;

/** The stable id of the foundation pile at the given index. */
export function foundationPileId(index: number): string {
  return `foundation-${index}`;
}

/** The stable id of the tableau column at the given index. */
export function tableauPileId(index: number): string {
  return `tableau-${index}`;
}

/** Downward gap below a face-up column card before the next one. */
export const TABLEAU_FACE_UP_OFFSET = 45;

/** Downward gap below a face-down column card before the next one. */
export const TABLEAU_FACE_DOWN_OFFSET = 18;

/** Extra downward gap opened below the hovered card. */
export const TABLEAU_HOVER_EXPANSION_OFFSET = 15;

/** How a Yukon column arranges its cards. */
export const TABLEAU_PILE_LAYOUT: PileLayout = {
  kind: "fan-down",
  faceUpGap: TABLEAU_FACE_UP_OFFSET,
  faceDownGap: TABLEAU_FACE_DOWN_OFFSET,
  hoverExpansion: TABLEAU_HOVER_EXPANSION_OFFSET,
};

/** How a foundation arranges its cards: squarely. */
export const STACKED_PILE_LAYOUT: PileLayout = { kind: "stacked" };

/**
 * The eleven zones of a Yukon board, for the given variant.
 *
 * Memoized per variant, and that matters rather than merely being tidy:
 * {@link TableGame.zoneFor} rebuilds its id index whenever the zone array is a
 * different array, and it is asked once per card per frame. Handing back a new
 * array each time would rebuild the index every frame forever.
 *
 * @param variant Which of the three games the columns build by.
 */
export function yukonZoneSpecs(variant: YukonVariant): readonly ZoneSpec[] {
  let zones = zonesByVariant.get(variant);
  if (!zones) {
    zones = buildZoneSpecs(variant);
    zonesByVariant.set(variant, zones);
  }
  return zones;
}

const zonesByVariant = new Map<YukonVariant, readonly ZoneSpec[]>();

function buildZoneSpecs(variant: YukonVariant): readonly ZoneSpec[] {
  const zones: ZoneSpec[] = [];

  for (let index = 0; index < FOUNDATION_COUNT; index++) {
    const id = foundationPileId(index);
    zones.push({
      id,
      role: YukonRole.FOUNDATION,
      // Klondike's foundation columns, with the top-left corner left bare on
      // purpose: the gap where a player expects a stock and a waste is how the
      // board says this game has neither.
      slot: { pileId: id, column: 3 + index, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      accept: yukonPlacementRule(YukonRole.FOUNDATION, variant),
      grab: { kind: "top-only" },
      draggable: true,
      face: "always-up",
      backgroundKey: "card-placeholder-full-border-circle",
    });
  }

  for (let index = 0; index < TABLEAU_COUNT; index++) {
    const id = tableauPileId(index);
    zones.push({
      id,
      role: YukonRole.TABLEAU,
      slot: { pileId: id, column: index, row: 1 },
      layout: TABLEAU_PILE_LAYOUT,
      accept: yukonPlacementRule(YukonRole.TABLEAU, variant),
      // The defining rule of the family: any face-up card lifts with everything
      // resting on it, ordered or not. Only the bottom card of the moving stack
      // is checked against the target, so a column can be dismantled from the
      // middle — which is what makes a game with no stock winnable at all.
      grab: { kind: "any-face-up" },
      draggable: true,
      face: "card",
      backgroundKey: "card-placeholder",
    });
  }

  return zones;
}

/** Re-exported: the roles and the variants live with the rules they shape. */
export { YukonRole, YukonVariant };

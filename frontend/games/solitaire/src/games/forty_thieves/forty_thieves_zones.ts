import { PileLayout } from "@/engine/render/layout/pile_layout";
import { ZoneSpec } from "@/engine/tableau/zone";
import {
  FortyThievesRole,
  FortyThievesVariant,
  fortyThievesGrabRule,
  fortyThievesHidesCards,
  fortyThievesPlacementRule,
} from "./forty_thieves_rules";

/** The number of tableau columns. */
export const TABLEAU_COUNT = 10;

/**
 * The number of foundations: eight, two per suit, because the game is dealt
 * from two decks.
 */
export const FOUNDATION_COUNT = 8;

/** The stable id of the single stock pile. */
export const STOCK_PILE_ID = "stock";

/** The stable id of the single waste pile. */
export const WASTE_PILE_ID = "waste";

/**
 * The grid column the leftmost foundation sits in.
 *
 * Stock, waste, then eight foundations comes to exactly ten slots across a
 * ten-column board — the tidiest top row of any game here. Klondike has to leave
 * a column clear for its waste fan to grow into; this game draws one card at a
 * time, so its waste never fans and the foundations can start immediately after
 * it.
 */
export const FOUNDATION_COLUMN_OFFSET = 2;

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

/** How a column arranges its cards. */
export const TABLEAU_PILE_LAYOUT: PileLayout = {
  kind: "fan-down",
  faceUpGap: TABLEAU_FACE_UP_OFFSET,
  faceDownGap: TABLEAU_FACE_DOWN_OFFSET,
  hoverExpansion: TABLEAU_HOVER_EXPANSION_OFFSET,
};

/** How the stock and the foundations arrange their cards: squarely. */
export const STACKED_PILE_LAYOUT: PileLayout = { kind: "stacked" };

/**
 * How the waste arranges its cards: one at a time.
 *
 * A draw turns a single card, so there is never more than one to show and
 * fanning would only leave a gap where the second card is not — the same
 * reasoning Klondike applies to its own Draw 1 mode.
 */
export const WASTE_PILE_LAYOUT: PileLayout = {
  kind: "fan-right",
  gap: 0,
  maxVisible: 1,
};

/**
 * The twenty zones of a Forty Thieves board, for the given variant.
 *
 * Memoized because the only things that vary are the column grab rule, the
 * column build rule and whether cards are drawn face down — all of which follow
 * the variant, so there are exactly three possible answers. Rebuilding twenty
 * objects every frame to discover that would be wasteful, and caching them
 * cannot go stale for the same reason.
 */
export function fortyThievesZoneSpecs(
  variant: FortyThievesVariant,
): readonly ZoneSpec[] {
  let zones = zonesByVariant.get(variant);
  if (!zones) {
    zones = buildZoneSpecs(variant);
    zonesByVariant.set(variant, zones);
  }
  return zones;
}

const zonesByVariant = new Map<FortyThievesVariant, readonly ZoneSpec[]>();

function buildZoneSpecs(variant: FortyThievesVariant): readonly ZoneSpec[] {
  const zones: ZoneSpec[] = [
    {
      id: STOCK_PILE_ID,
      role: FortyThievesRole.STOCK,
      slot: { pileId: STOCK_PILE_ID, column: 0, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      accept: fortyThievesPlacementRule(FortyThievesRole.STOCK, variant),
      // The top card is clickable — that is what draws — but pressing it must
      // not pick it up.
      grab: { kind: "top-only" },
      draggable: false,
      face: "always-down",
      // Deliberately not the reset placeholder Klondike and Spider use, and
      // deliberately no `emptyIsActionable`: there is no recycle in this
      // family, so an emptied stock is spent for good and should not invite a
      // press that does nothing.
      backgroundKey: "card-placeholder",
    },
    {
      id: WASTE_PILE_ID,
      role: FortyThievesRole.WASTE,
      slot: { pileId: WASTE_PILE_ID, column: 1, row: 0 },
      layout: WASTE_PILE_LAYOUT,
      accept: fortyThievesPlacementRule(FortyThievesRole.WASTE, variant),
      grab: { kind: "top-only" },
      draggable: true,
      face: "always-up",
    },
  ];

  for (let index = 0; index < FOUNDATION_COUNT; index++) {
    const id = foundationPileId(index);
    zones.push({
      id,
      role: FortyThievesRole.FOUNDATION,
      slot: { pileId: id, column: FOUNDATION_COLUMN_OFFSET + index, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      accept: fortyThievesPlacementRule(FortyThievesRole.FOUNDATION, variant),
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
      role: FortyThievesRole.TABLEAU,
      slot: { pileId: id, column: index, row: 1 },
      layout: TABLEAU_PILE_LAYOUT,
      accept: fortyThievesPlacementRule(FortyThievesRole.TABLEAU, variant),
      grab: fortyThievesGrabRule(variant),
      draggable: true,
      // Only Rank and File buries anything; the other two show every card from
      // the deal, so deferring to the card would be the same as always-up.
      face: fortyThievesHidesCards(variant) ? "card" : "always-up",
      backgroundKey: "card-placeholder",
    });
  }

  return zones;
}

/** Re-exported: the roles live with the rules that branch on them. */
export { FortyThievesRole };

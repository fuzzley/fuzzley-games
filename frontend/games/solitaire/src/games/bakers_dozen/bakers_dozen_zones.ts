import { PileLayout } from "@/engine/render/layout/pile_layout";
import { ZoneSpec } from "@/engine/tableau/zone";
import {
  BakersDozenRole,
  bakersDozenPlacementRule,
} from "./bakers_dozen_rules";

/** The number of tableau columns. Thirteen, which is the name of the game. */
export const TABLEAU_COUNT = 13;

/** The number of suit foundation piles. */
export const FOUNDATION_COUNT = 4;

/**
 * The grid column the leftmost foundation sits in.
 *
 * The foundations sit at the right of the top row, as Simple Simon's do and for
 * the same reason: there is no stock to occupy the left of it.
 */
export const FOUNDATION_COLUMN_OFFSET = TABLEAU_COUNT - FOUNDATION_COUNT;

/** The stable id of the foundation pile at the given index. */
export function foundationPileId(index: number): string {
  return `foundation-${index}`;
}

/** The stable id of the tableau column at the given index. */
export function tableauPileId(index: number): string {
  return `tableau-${index}`;
}

/** Downward gap below a column card before the next one. */
export const TABLEAU_CARD_OFFSET = 45;

/** Extra downward gap opened below the hovered card, to say which one it is. */
export const TABLEAU_HOVER_EXPANSION_OFFSET = 15;

/**
 * How a Baker's Dozen column arranges its cards.
 *
 * Both gaps are the same: every card is dealt face up, so there are no
 * face-down cards to pack more tightly.
 */
export const TABLEAU_PILE_LAYOUT: PileLayout = {
  kind: "fan-down",
  faceUpGap: TABLEAU_CARD_OFFSET,
  faceDownGap: TABLEAU_CARD_OFFSET,
  hoverExpansion: TABLEAU_HOVER_EXPANSION_OFFSET,
};

/** How a foundation arranges its cards: squarely. */
export const STACKED_PILE_LAYOUT: PileLayout = { kind: "stacked" };

/** The seventeen zones of a Baker's Dozen board. */
export function bakersDozenZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = buildZoneSpecs();

function buildZoneSpecs(): readonly ZoneSpec[] {
  const zones: ZoneSpec[] = [];

  for (let index = 0; index < FOUNDATION_COUNT; index++) {
    const id = foundationPileId(index);
    zones.push({
      id,
      role: BakersDozenRole.FOUNDATION,
      slot: { pileId: id, column: FOUNDATION_COLUMN_OFFSET + index, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      accept: bakersDozenPlacementRule(BakersDozenRole.FOUNDATION),
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
      role: BakersDozenRole.TABLEAU,
      slot: { pileId: id, column: index, row: 1 },
      layout: TABLEAU_PILE_LAYOUT,
      accept: bakersDozenPlacementRule(BakersDozenRole.TABLEAU),
      // One card at a time. There is nowhere to stage a run — no cells, and no
      // empty column will ever take one — so a multi-card move could not be
      // carried out by any sequence of legal single moves.
      grab: { kind: "top-only" },
      draggable: true,
      // Every card is dealt face up, so nothing is ever turned over.
      face: "always-up",
      backgroundKey: "card-placeholder",
    });
  }

  return zones;
}

/** Re-exported: the roles live with the rules that branch on them. */
export { BakersDozenRole };

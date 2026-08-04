import { PileLayout } from "@/engine/render/layout/pile_layout";
import { isOrderedPair } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";
import { EasthavenRole, easthavenPlacementRule } from "./easthaven_rules";

/** The number of tableau columns. */
export const TABLEAU_COUNT = 7;

/** The number of suit foundation piles. */
export const FOUNDATION_COUNT = 4;

/** The stable id of the single stock pile. */
export const STOCK_PILE_ID = "stock";

/**
 * The grid column the leftmost foundation sits in.
 *
 * The stock alone at the left of the top row and the foundations filling the
 * right of it: Scorpion's and Spiderette's arrangement, which is Klondike's grid
 * with the waste taken out.
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

/** Downward gap below a face-up column card before the next one. */
export const TABLEAU_FACE_UP_OFFSET = 45;

/** Downward gap below a face-down column card before the next one. */
export const TABLEAU_FACE_DOWN_OFFSET = 18;

/** Extra downward gap opened below the hovered card. */
export const TABLEAU_HOVER_EXPANSION_OFFSET = 15;

/** How an Easthaven column arranges its cards. */
export const TABLEAU_PILE_LAYOUT: PileLayout = {
  kind: "fan-down",
  faceUpGap: TABLEAU_FACE_UP_OFFSET,
  faceDownGap: TABLEAU_FACE_DOWN_OFFSET,
  hoverExpansion: TABLEAU_HOVER_EXPANSION_OFFSET,
};

/** How the stock and the foundations arrange their cards: squarely. */
export const STACKED_PILE_LAYOUT: PileLayout = { kind: "stacked" };

/** The twelve zones of an Easthaven board. */
export function easthavenZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = buildZoneSpecs();

function buildZoneSpecs(): readonly ZoneSpec[] {
  const zones: ZoneSpec[] = [
    {
      id: STOCK_PILE_ID,
      role: EasthavenRole.STOCK,
      slot: { pileId: STOCK_PILE_ID, column: 0, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      accept: easthavenPlacementRule(EasthavenRole.STOCK),
      // Clickable, so a press deals a row, but nothing is ever lifted from it.
      grab: { kind: "top-only" },
      draggable: false,
      face: "always-down",
      backgroundKey: "card-placeholder-full-border-reset",
    },
  ];

  for (let index = 0; index < FOUNDATION_COUNT; index++) {
    const id = foundationPileId(index);
    zones.push({
      id,
      role: EasthavenRole.FOUNDATION,
      slot: { pileId: id, column: FOUNDATION_COLUMN_OFFSET + index, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      accept: easthavenPlacementRule(EasthavenRole.FOUNDATION),
      // A real drop target, unlike Spider's and Spiderette's: the player puts
      // cards here one at a time.
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
      role: EasthavenRole.TABLEAU,
      slot: { pileId: id, column: index, row: 1 },
      layout: TABLEAU_PILE_LAYOUT,
      accept: easthavenPlacementRule(EasthavenRole.TABLEAU),
      // An ordered alternating-colour run, which is the same question the build
      // rule asks — so both derive from `isOrderedPair` and cannot drift apart.
      // Stricter than Klondike, which lets a broken pile be dragged as long as
      // its bottom card fits.
      grab: { kind: "run", adjacent: isOrderedPair },
      draggable: true,
      face: "card",
      backgroundKey: "card-placeholder",
    });
  }

  return zones;
}

/** Re-exported: the roles live with the rules that branch on them. */
export { EasthavenRole };

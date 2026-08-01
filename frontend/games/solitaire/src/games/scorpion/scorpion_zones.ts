import { PileLayout } from "@/engine/render/layout/pile_layout";
import { ZoneSpec } from "@/engine/tableau/zone";
import { ScorpionRole, scorpionPlacementRule } from "./scorpion_rules";

/** The number of tableau columns. */
export const TABLEAU_COUNT = 7;

/** The number of completed runs a full game produces: one per suit. */
export const FOUNDATION_COUNT = 4;

/** The stable id of the single stock pile. */
export const STOCK_PILE_ID = "stock";

/** The stable id of the foundation at the given index. */
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

/** How a Scorpion column arranges its cards. */
export const TABLEAU_PILE_LAYOUT: PileLayout = {
  kind: "fan-down",
  faceUpGap: TABLEAU_FACE_UP_OFFSET,
  faceDownGap: TABLEAU_FACE_DOWN_OFFSET,
  hoverExpansion: TABLEAU_HOVER_EXPANSION_OFFSET,
};

/** How the stock and the foundations arrange their cards: squarely. */
export const STACKED_PILE_LAYOUT: PileLayout = { kind: "stacked" };

/**
 * The twelve zones of a Scorpion board.
 *
 * Klondike's grid with the waste taken out: the stock alone at the left of the
 * top row, four foundations at the right of it, and seven columns along the
 * bottom. Seven columns because Scorpion deals seven, and four foundations
 * because one deck completes four runs.
 */
export function scorpionZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = buildZoneSpecs();

function buildZoneSpecs(): readonly ZoneSpec[] {
  const zones: ZoneSpec[] = [
    {
      id: STOCK_PILE_ID,
      role: ScorpionRole.STOCK,
      slot: { pileId: STOCK_PILE_ID, column: 0, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      accept: scorpionPlacementRule(ScorpionRole.STOCK),
      // Clickable, so a press deals, but nothing is ever lifted from it.
      grab: { kind: "top-only" },
      draggable: false,
      face: "always-down",
      // A plain slot rather than Klondike's and Spider's recycle arrow: this
      // stock deals once and is then finished, so there is nothing to come back.
      backgroundKey: "card-placeholder",
    },
  ];

  for (let index = 0; index < FOUNDATION_COUNT; index++) {
    const id = foundationPileId(index);
    zones.push({
      id,
      role: ScorpionRole.FOUNDATION,
      // Column 1 and 2 are left clear, which keeps the top row Klondike's shape.
      slot: { pileId: id, column: 3 + index, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      // Never a drop target: a run arrives here by completing itself, not by
      // being put here.
      accept: scorpionPlacementRule(ScorpionRole.FOUNDATION),
      grab: { kind: "none" },
      draggable: false,
      face: "always-up",
      backgroundKey: "card-placeholder-full-border-circle",
    });
  }

  for (let index = 0; index < TABLEAU_COUNT; index++) {
    const id = tableauPileId(index);
    zones.push({
      id,
      role: ScorpionRole.TABLEAU,
      slot: { pileId: id, column: index, row: 1 },
      layout: TABLEAU_PILE_LAYOUT,
      accept: scorpionPlacementRule(ScorpionRole.TABLEAU),
      // The Yukon rule, and the defining feature of the game: any face-up card
      // lifts with everything resting on it, ordered or not. Only the bottom
      // card of the moving stack is checked against the target, so a player
      // shifts a jumble by digging out the one card underneath it that fits.
      grab: { kind: "any-face-up" },
      draggable: true,
      face: "card",
      backgroundKey: "card-placeholder",
    });
  }

  return zones;
}

/** Re-exported: the roles live with the rules that branch on them. */
export { ScorpionRole };

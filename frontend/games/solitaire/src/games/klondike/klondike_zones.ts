import { PileLayout } from "@/engine/render/layout/pile_layout";
import { ZoneSpec } from "@/engine/tableau/zone";
import { DrawCount } from "./klondike_settings";
import {
  DEFAULT_KLONDIKE_VARIANT,
  KlondikeRole,
  KlondikeVariant,
  klondikeDealsFaceUp,
  klondikeGrabRule,
  klondikePlacementRule,
} from "./klondike_rules";

/** The number of suit foundation piles in a standard Klondike game. */
export const FOUNDATION_COUNT = 4;

/** The number of tableau columns in a standard Klondike game. */
export const TABLEAU_COUNT = 7;

/** The stable id of the single stock pile. */
export const STOCK_PILE_ID = "stock";

/** The stable id of the single waste pile. */
export const WASTE_PILE_ID = "waste";

/**
 * The stable id of the foundation pile at the given index.
 *
 * Both the game model and the render layout derive pile ids through this
 * function so the two can never drift apart.
 */
export function foundationPileId(index: number): string {
  return `foundation-${index}`;
}

/** The stable id of the tableau column at the given index. See {@link foundationPileId}. */
export function tableauPileId(index: number): string {
  return `tableau-${index}`;
}

/** Downward gap below a face-up tableau card before the next card. */
export const TABLEAU_FACE_UP_OFFSET = 45;

/** Downward gap below a face-down tableau card before the next card. */
export const TABLEAU_FACE_DOWN_OFFSET = 18;

/**
 * Extra downward gap opened below the hovered tableau card so the cards fanned
 * on top slide down and reveal more of it.
 */
export const TABLEAU_HOVER_EXPANSION_OFFSET = 15;

/**
 * Horizontal gap between fanned waste cards.
 *
 * Wide enough to clear a card's index corner, so each fanned card shows its own
 * rank and suit rather than a bare sliver of paper. The waste sits in column 1
 * and the foundations start at column 3, so the fan has the whole of column 2
 * to grow into: a three card fan stays clear of the first foundation up to an
 * offset of about 125.
 */
export const WASTE_FAN_OFFSET_X = 55;

/** Maximum number of waste cards to fan (show the edges of) in multi-draw mode. */
export const WASTE_MAX_FAN_CARDS = 3;

/** How a Klondike tableau column arranges its cards. */
export const TABLEAU_PILE_LAYOUT: PileLayout = {
  kind: "fan-down",
  faceUpGap: TABLEAU_FACE_UP_OFFSET,
  faceDownGap: TABLEAU_FACE_DOWN_OFFSET,
  hoverExpansion: TABLEAU_HOVER_EXPANSION_OFFSET,
};

/**
 * How the waste arranges its cards for the given draw mode.
 *
 * Draw 1 turns one card at a time, so there is never more than one to show and
 * fanning would only leave a gap where the second card is not.
 *
 * @param drawCount How many cards a draw turns over.
 */
export function wastePileLayout(drawCount: number): PileLayout {
  return {
    kind: "fan-right",
    gap: WASTE_FAN_OFFSET_X,
    maxVisible: drawCount === 1 ? 1 : WASTE_MAX_FAN_CARDS,
  };
}

/** How the stock and the foundations arrange their cards: squarely. */
export const STACKED_PILE_LAYOUT: PileLayout = { kind: "stacked" };

/**
 * The arrangement a Klondike pile of the given role uses.
 *
 * @param role The part the pile plays.
 * @param drawCount How many cards a draw turns over, which sets the waste fan.
 */
export function klondikePileLayout(
  role: string,
  drawCount: number,
): PileLayout {
  switch (role) {
    case KlondikeRole.TABLEAU:
      return TABLEAU_PILE_LAYOUT;
    case KlondikeRole.WASTE:
      return wastePileLayout(drawCount);
    default:
      return STACKED_PILE_LAYOUT;
  }
}

/**
 * The thirteen zones of a Klondike board, for the given draw mode and variant.
 *
 * Memoized because everything that varies — the waste fan, the column build
 * rule, the column grab rule, whether cards are hidden — follows those two
 * values, so there are exactly six possible answers. Rebuilding thirteen objects
 * every frame to discover that would be wasteful, and caching them cannot go
 * stale for the same reason.
 *
 * The variant defaults, so the many callers that only care about the draw mode —
 * the layout, and every spec written before the family grew — say nothing about
 * it and get the original game.
 */
export function klondikeZoneSpecs(
  drawCount: DrawCount,
  variant: KlondikeVariant = DEFAULT_KLONDIKE_VARIANT,
): readonly ZoneSpec[] {
  const key = `${drawCount}:${variant}`;
  let zones = zonesByKey.get(key);
  if (!zones) {
    zones = buildZoneSpecs(drawCount, variant);
    zonesByKey.set(key, zones);
  }
  return zones;
}

const zonesByKey = new Map<string, readonly ZoneSpec[]>();

function buildZoneSpecs(
  drawCount: DrawCount,
  variant: KlondikeVariant,
): readonly ZoneSpec[] {
  const zones: ZoneSpec[] = [
    {
      id: STOCK_PILE_ID,
      role: KlondikeRole.STOCK,
      slot: { pileId: STOCK_PILE_ID, column: 0, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      accept: klondikePlacementRule(KlondikeRole.STOCK),
      // The top card is clickable — that is what draws — but pressing it must
      // not pick it up.
      grab: { kind: "top-only" },
      draggable: false,
      face: "always-down",
      backgroundKey: "card-placeholder-full-border-reset",
      // Clicking the empty slot recycles the waste.
      emptyIsActionable: true,
    },
    {
      id: WASTE_PILE_ID,
      role: KlondikeRole.WASTE,
      slot: { pileId: WASTE_PILE_ID, column: 1, row: 0 },
      layout: wastePileLayout(drawCount),
      accept: klondikePlacementRule(KlondikeRole.WASTE),
      grab: { kind: "top-only" },
      draggable: true,
      face: "always-up",
      // No placeholder: the waste fans over bare table rather than sitting in a
      // marked slot.
    },
  ];

  for (let index = 0; index < FOUNDATION_COUNT; index++) {
    const id = foundationPileId(index);
    zones.push({
      id,
      role: KlondikeRole.FOUNDATION,
      // Column 2 is left clear for the waste fan to grow into.
      slot: { pileId: id, column: 3 + index, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      accept: klondikePlacementRule(KlondikeRole.FOUNDATION),
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
      role: KlondikeRole.TABLEAU,
      slot: { pileId: id, column: index, row: 1 },
      layout: TABLEAU_PILE_LAYOUT,
      accept: klondikePlacementRule(KlondikeRole.TABLEAU, variant),
      // Klondike itself takes any face-up card, ordered or not: it validates
      // only the bottom card of a moving stack, so a broken run can be dragged
      // as long as that card fits where it lands. Whitehead and Thumb and Pouch
      // take proper runs instead, which the variant table pairs with their
      // build rules.
      grab: klondikeGrabRule(variant),
      draggable: true,
      // Whitehead hides nothing, so deferring to the card would be the same as
      // always-up — but saying it outright is what makes the deal's own
      // face-up flag and the zone agree by construction.
      face: klondikeDealsFaceUp(variant) ? "always-up" : "card",
      backgroundKey: "card-placeholder",
    });
  }

  return zones;
}

/** Re-exported: the roles and variants live with the rules that branch on them. */
export { KlondikeRole, KlondikeVariant };

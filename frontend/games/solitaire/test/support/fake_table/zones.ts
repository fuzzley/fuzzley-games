import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import { PileLayout } from "@/engine/render/layout/pile_layout";
import {
  PlacementRule,
  byEmptiness,
  cardIs,
  descendingAlternatingColor,
  hasRank,
  suitFoundation,
} from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";

/**
 * The parts a pile plays on the fake board.
 *
 * Deliberately the four a solitaire can have rather than any one game's set: a
 * pile cards are drawn from, a pile they are drawn into, piles built up and
 * columns built down. That is the shape the engine has to cope with, so it is
 * the shape it is tested against.
 */
export const FakeRole = {
  /** The face-down pile a press draws from. */
  STOCK: "stock",
  /** The face-up pile drawn cards land on. */
  WASTE: "waste",
  /** A pile built up by suit. */
  FOUNDATION: "foundation",
  /** A column built down, fanned so its cards are individually reachable. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** One of the parts a fake pile can play. */
export type FakeRole = (typeof FakeRole)[keyof typeof FakeRole];

/** The number of foundation piles. */
export const FOUNDATION_COUNT = 4;

/** The number of tableau columns. */
export const TABLEAU_COUNT = 7;

/** The stable id of the single stock pile. */
export const STOCK_PILE_ID = "stock";

/** The stable id of the single waste pile. */
export const WASTE_PILE_ID = "waste";

/** The stable id of the foundation pile at the given index. */
export function foundationPileId(index: number): string {
  return `foundation-${index}`;
}

/** The stable id of the tableau column at the given index. */
export function tableauPileId(index: number): string {
  return `tableau-${index}`;
}

/** Downward gap below a face-up tableau card before the next card. */
export const TABLEAU_FACE_UP_OFFSET = 45;

/** Downward gap below a face-down tableau card before the next card. */
export const TABLEAU_FACE_DOWN_OFFSET = 18;

/** Extra downward gap opened below the hovered tableau card. */
export const TABLEAU_HOVER_EXPANSION_OFFSET = 15;

/** Horizontal gap between fanned waste cards. */
export const WASTE_FAN_OFFSET_X = 55;

/** Maximum number of waste cards to fan. */
export const WASTE_MAX_FAN_CARDS = 3;

/** How a tableau column arranges its cards. */
export const TABLEAU_PILE_LAYOUT: PileLayout = {
  kind: "fan-down",
  faceUpGap: TABLEAU_FACE_UP_OFFSET,
  faceDownGap: TABLEAU_FACE_DOWN_OFFSET,
  hoverExpansion: TABLEAU_HOVER_EXPANSION_OFFSET,
};

/** How the stock and the foundations arrange their cards: squarely. */
export const STACKED_PILE_LAYOUT: PileLayout = { kind: "stacked" };

/**
 * How the waste arranges its cards for the given draw mode.
 *
 * Drawing one card at a time leaves nothing to fan, which is the case that
 * exercises a `maxVisible` of one.
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

/**
 * The arrangement a pile of the given role uses.
 *
 * @param role The part the pile plays.
 * @param drawCount How many cards a draw turns over, which sets the waste fan.
 */
export function fakePileLayout(role: string, drawCount: number): PileLayout {
  switch (role) {
    case FakeRole.TABLEAU:
      return TABLEAU_PILE_LAYOUT;
    case FakeRole.WASTE:
      return wastePileLayout(drawCount);
    default:
      return STACKED_PILE_LAYOUT;
  }
}

/** A column: a King starts an empty one, and the rest build down in colour. */
export const FAKE_TABLEAU_RULE: PlacementRule = byEmptiness(
  cardIs(hasRank(Rank.KING)),
  descendingAlternatingColor,
);

/**
 * What a pile of the given role accepts, or null for the stock and waste, which
 * are never move destinations.
 *
 * @param role The part the destination pile plays.
 */
export function fakePlacementRule(role: string): PlacementRule | null {
  switch (role) {
    case FakeRole.TABLEAU:
      return FAKE_TABLEAU_RULE;
    case FakeRole.FOUNDATION:
      return suitFoundation;
    default:
      return null;
  }
}

/**
 * The thirteen zones of the fake board, for the given draw mode.
 *
 * Stock and waste at the left of the top row, foundations at the right of it,
 * and the columns filling the bottom row. Memoized per draw mode, because the
 * only thing that varies is the waste fan.
 */
export function fakeZoneSpecs(drawCount: number): readonly ZoneSpec[] {
  let zones = zonesByDrawCount.get(drawCount);
  if (!zones) {
    zones = buildZoneSpecs(drawCount);
    zonesByDrawCount.set(drawCount, zones);
  }
  return zones;
}

const zonesByDrawCount = new Map<number, readonly ZoneSpec[]>();

function buildZoneSpecs(drawCount: number): readonly ZoneSpec[] {
  const zones: ZoneSpec[] = [
    {
      id: STOCK_PILE_ID,
      role: FakeRole.STOCK,
      slot: { pileId: STOCK_PILE_ID, column: 0, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      accept: fakePlacementRule(FakeRole.STOCK),
      // Clickable, because that is what draws, but never picked up.
      grab: { kind: "top-only" },
      draggable: false,
      face: "always-down",
      backgroundKey: "card-placeholder-full-border-reset",
      // Pressing the empty slot recycles, so it wants a pointer and a border.
      emptyIsActionable: true,
    },
    {
      id: WASTE_PILE_ID,
      role: FakeRole.WASTE,
      slot: { pileId: WASTE_PILE_ID, column: 1, row: 0 },
      layout: wastePileLayout(drawCount),
      accept: fakePlacementRule(FakeRole.WASTE),
      grab: { kind: "top-only" },
      draggable: true,
      face: "always-up",
      // No placeholder: the waste fans over bare table. This is also what makes
      // the board's background count one fewer than its pile count, which
      // several engine tests depend on.
    },
  ];

  for (let index = 0; index < FOUNDATION_COUNT; index++) {
    const id = foundationPileId(index);
    zones.push({
      id,
      role: FakeRole.FOUNDATION,
      // Column 2 is left clear for the waste fan to grow into.
      slot: { pileId: id, column: 3 + index, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      accept: fakePlacementRule(FakeRole.FOUNDATION),
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
      role: FakeRole.TABLEAU,
      slot: { pileId: id, column: index, row: 1 },
      layout: TABLEAU_PILE_LAYOUT,
      accept: fakePlacementRule(FakeRole.TABLEAU),
      // Any face-up card and whatever rests on it, ordered or not: the laxest
      // of the grab rules, and the one that lets a test lift an arbitrary run.
      grab: { kind: "any-face-up" },
      draggable: true,
      face: "card",
      backgroundKey: "card-placeholder",
    });
  }

  return zones;
}

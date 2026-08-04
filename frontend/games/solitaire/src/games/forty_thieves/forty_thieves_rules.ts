import { PileRole } from "@/engine/core/card/card_pile";
import {
  PlacementRule,
  anyCard,
  byEmptiness,
  descendingAlternatingColor,
  descendingSameSuit,
  isOrderedPair,
  isSameSuitRun,
  suitFoundation,
} from "@/engine/tableau/rules";
import { GrabRule } from "@/engine/tableau/zone";

/** The parts a pile can play in a Forty Thieves game. */
export const FortyThievesRole = {
  /** The face-down draw pile. */
  STOCK: "stock",
  /** The face-up pile of drawn cards. */
  WASTE: "waste",
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A board column, built by whichever rule the variant names. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** One of the parts a Forty Thieves pile can play. */
export type FortyThievesRole =
  (typeof FortyThievesRole)[keyof typeof FortyThievesRole];

/**
 * Which of the Forty Thieves family is being played.
 *
 * All three share a board, a deck, a stock and a foundation, and differ in what
 * a column accepts, what may be lifted from one, and how much of the deal is
 * buried. That is a table of three rows rather than three modules.
 *
 * Numbered rather than named because the settings panel stores an option as a
 * number: making the variant those numbers lets the catalog hand its choice
 * straight to the game instead of keeping a translation table that could drift
 * from the choices it offers.
 */
export const FortyThievesVariant = {
  /** The original: build down in suit, and move one card at a time. */
  FORTY_THIEVES: 0,
  /** Josephine, also called Streets: the same build, but runs may be moved. */
  JOSEPHINE: 1,
  /** Rank and File: build down in alternating colours, and bury three per column. */
  RANK_AND_FILE: 2,
} as const;

/** One of the three games in the Forty Thieves family. */
export type FortyThievesVariant =
  (typeof FortyThievesVariant)[keyof typeof FortyThievesVariant];

/** The variant dealt when nothing says otherwise. */
export const DEFAULT_FORTY_THIEVES_VARIANT: FortyThievesVariant =
  FortyThievesVariant.FORTY_THIEVES;

/** The three things a variant decides, which have to agree with each other. */
interface VariantRules {
  /** What an occupied column accepts. */
  readonly occupied: PlacementRule;
  /** What may be taken from a column. */
  readonly grab: GrabRule;
  /** How many cards of each column the deal buries. */
  readonly buriedPerColumn: number;
}

/**
 * What each variant changes, chosen together in one table.
 *
 * The build rule and the grab rule are stated side by side on purpose: a run
 * that can be lifted under one and not landed under the other is a bug that only
 * shows up mid-drag, and the pairing is the thing a reader has to check. Both
 * derive from the shared adjacency predicates rather than being spelled out
 * twice.
 *
 * Nothing here limits how many cards may move at once. It does not need to:
 * these games have no cells and no reserve, so a run is carried in one piece
 * rather than staged through spare squares the way a FreeCell supermove is, and
 * there is no staging capacity to run out of.
 */
const VARIANT_RULES: Readonly<Record<FortyThievesVariant, VariantRules>> = {
  [FortyThievesVariant.FORTY_THIEVES]: {
    occupied: descendingSameSuit,
    // One card at a time, which is what makes the original as hard as it is:
    // a column is dismantled card by card or not at all.
    grab: { kind: "top-only" },
    buriedPerColumn: 0,
  },
  [FortyThievesVariant.JOSEPHINE]: {
    occupied: descendingSameSuit,
    grab: { kind: "run", adjacent: isSameSuitRun },
    buriedPerColumn: 0,
  },
  [FortyThievesVariant.RANK_AND_FILE]: {
    occupied: descendingAlternatingColor,
    grab: { kind: "run", adjacent: isOrderedPair },
    // The trade for the gentler build: three of every four cards start hidden,
    // so the opening position is largely unknown.
    buriedPerColumn: 3,
  },
};

/**
 * A Forty Thieves column for the given variant: any card starts an empty one,
 * and anything after builds by the variant's rule.
 *
 * Empty columns take anything in all three, which is the family's one piece of
 * generosity — and it is worth a great deal here, because with no cells an empty
 * column is the only place to put a card that has nowhere else to go.
 *
 * @param variant Which of the three games is being played.
 */
export function fortyThievesTableauRule(
  variant: FortyThievesVariant,
): PlacementRule {
  return byEmptiness(anyCard, VARIANT_RULES[variant].occupied);
}

/**
 * What may be taken from a column under `variant`.
 *
 * Read from the same table as the build rule so a column cannot give up a run
 * its neighbours would refuse.
 */
export function fortyThievesGrabRule(variant: FortyThievesVariant): GrabRule {
  return VARIANT_RULES[variant].grab;
}

/** How many cards of each column `variant` deals face down. */
export function fortyThievesBuriedPerColumn(
  variant: FortyThievesVariant,
): number {
  return VARIANT_RULES[variant].buriedPerColumn;
}

/** Whether the variant deals any of its cards face down. */
export function fortyThievesHidesCards(variant: FortyThievesVariant): boolean {
  return VARIANT_RULES[variant].buriedPerColumn > 0;
}

/**
 * A Forty Thieves foundation: the standard Ace-up-by-suit pile, one card at a
 * time.
 *
 * Two decks means two foundations per suit, but no foundation is reserved for a
 * particular suit — the first Ace to arrive claims a pile, and the second Ace of
 * that suit claims another. {@link suitFoundation} already says exactly this, so
 * eight foundations need no rule of their own.
 */
export const FORTY_THIEVES_FOUNDATION_RULE: PlacementRule = suitFoundation;

/**
 * The rule governing what a pile of the given role accepts, or null for the
 * stock and the waste, which are never move destinations at all.
 *
 * @param role The part the destination pile plays.
 * @param variant Which of the three games is being played.
 */
export function fortyThievesPlacementRule(
  role: string,
  variant: FortyThievesVariant,
): PlacementRule | null {
  switch (role) {
    case FortyThievesRole.TABLEAU:
      return fortyThievesTableauRule(variant);
    case FortyThievesRole.FOUNDATION:
      return FORTY_THIEVES_FOUNDATION_RULE;
    default:
      return null;
  }
}

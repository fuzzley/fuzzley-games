import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  anyCard,
  byEmptiness,
  cardIs,
  descendingAlternatingColor,
  descendingDifferentSuit,
  descendingSameColor,
  hasRank,
  isDifferentSuitRun,
  isSameColorRun,
  suitFoundation,
} from "@/engine/tableau/rules";
import { GrabRule } from "@/engine/tableau/zone";

/**
 * The parts a pile can play in a Klondike game.
 *
 * Klondike's own vocabulary, not the engine's: rule checks, scoring, layout and
 * gestures all branch on these, and a different game names different roles.
 */
export const KlondikeRole = {
  /** The face-down draw pile. */
  STOCK: "stock",
  /** The face-up pile of drawn cards. */
  WASTE: "waste",
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A board column built down in alternating colors. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** One of the parts a Klondike pile can play. */
export type KlondikeRole = (typeof KlondikeRole)[keyof typeof KlondikeRole];

/**
 * Which set of column rules a Klondike board is played by.
 *
 * All three share the deal shape, the stock, the foundations, the scoring and
 * the win. They differ in what a column accepts, what may be lifted from one,
 * and — for Whitehead — whether anything is hidden at all. Two lines of rules
 * apiece, so they are variants of this module rather than modules of their own.
 *
 * Numbered rather than named because the settings panel stores an option as a
 * number: making the variant those numbers lets the catalog hand its choice
 * straight to the game instead of keeping a translation table that could drift
 * from the choices it offers.
 */
export const KlondikeVariant = {
  /** The original: build down in alternating colours, Kings into spaces. */
  KLONDIKE: 0,
  /** Whitehead: build down in colour, everything face up, any card into a space. */
  WHITEHEAD: 1,
  /** Thumb and Pouch: build down in any suit but its own, any card into a space. */
  THUMB_AND_POUCH: 2,
} as const;

/** One of the three games in the Klondike family. */
export type KlondikeVariant =
  (typeof KlondikeVariant)[keyof typeof KlondikeVariant];

/** The variant dealt when nothing says otherwise. */
export const DEFAULT_KLONDIKE_VARIANT: KlondikeVariant =
  KlondikeVariant.KLONDIKE;

/** Everything a variant decides, which has to hang together. */
interface VariantRules {
  /** What an empty column accepts. */
  readonly whenEmpty: PlacementRule;
  /** What an occupied column accepts. */
  readonly occupied: PlacementRule;
  /** What may be taken from a column. */
  readonly grab: GrabRule;
  /** Whether the deal shows every card rather than burying most of them. */
  readonly dealsFaceUp: boolean;
}

/**
 * What each variant changes, chosen together in one table.
 *
 * The build rule and the grab rule are stated side by side on purpose: a run
 * that can be lifted under one and not landed under the other is a bug that only
 * shows up mid-drag, and the pairing is the thing a reader has to check.
 *
 * Klondike is the odd one out in taking `any-face-up` rather than a run. That is
 * deliberate and long-standing — a Klondike column gives up a broken pile as
 * long as its bottom card fits where it lands — and the two new variants use
 * proper runs because their build rules are the looser half of the trade.
 */
const VARIANT_RULES: Readonly<Record<KlondikeVariant, VariantRules>> = {
  [KlondikeVariant.KLONDIKE]: {
    whenEmpty: cardIs(hasRank(Rank.KING)),
    occupied: descendingAlternatingColor,
    grab: { kind: "any-face-up" },
    dealsFaceUp: false,
  },
  // Two suits will take a card where alternating colours offer two and a single
  // suit only one — but nothing is hidden and any card opens a space, which
  // more than pays for the stricter build.
  [KlondikeVariant.WHITEHEAD]: {
    whenEmpty: anyCard,
    occupied: descendingSameColor,
    grab: { kind: "run", adjacent: isSameColorRun },
    dealsFaceUp: true,
  },
  // The gentlest of the three: three of the four suits will take a card, and a
  // space takes anything. The deal still buries most of the board.
  [KlondikeVariant.THUMB_AND_POUCH]: {
    whenEmpty: anyCard,
    occupied: descendingDifferentSuit,
    grab: { kind: "run", adjacent: isDifferentSuitRun },
    dealsFaceUp: false,
  },
};

/**
 * A Klondike tableau column for the given variant.
 *
 * @param variant Which of the three games is being played.
 */
export function klondikeTableauRule(
  variant: KlondikeVariant = DEFAULT_KLONDIKE_VARIANT,
): PlacementRule {
  const rules = VARIANT_RULES[variant];
  return byEmptiness(rules.whenEmpty, rules.occupied);
}

/**
 * A Klondike tableau column: a King starts an empty one, and anything after
 * builds down in alternating colors.
 */
export const KLONDIKE_TABLEAU_RULE: PlacementRule = klondikeTableauRule(
  KlondikeVariant.KLONDIKE,
);

/**
 * What may be taken from a column under `variant`.
 *
 * Read from the same table as the build rule so a column cannot give up a run
 * its neighbours would refuse.
 */
export function klondikeGrabRule(
  variant: KlondikeVariant = DEFAULT_KLONDIKE_VARIANT,
): GrabRule {
  return VARIANT_RULES[variant].grab;
}

/** Whether `variant` deals its whole board face up. */
export function klondikeDealsFaceUp(variant: KlondikeVariant): boolean {
  return VARIANT_RULES[variant].dealsFaceUp;
}

/** A Klondike foundation: the standard Ace-up-by-suit pile, one card at a time. */
export const KLONDIKE_FOUNDATION_RULE: PlacementRule = suitFoundation;

/**
 * The rule governing what a pile of the given role accepts, or null for the
 * stock and the waste, which are never move destinations at all.
 *
 * @param role The part the destination pile plays.
 * @param variant Which of the three games is being played.
 */
export function klondikePlacementRule(
  role: string,
  variant: KlondikeVariant = DEFAULT_KLONDIKE_VARIANT,
): PlacementRule | null {
  switch (role) {
    case KlondikeRole.TABLEAU:
      return klondikeTableauRule(variant);
    case KlondikeRole.FOUNDATION:
      return KLONDIKE_FOUNDATION_RULE;
    default:
      return null;
  }
}

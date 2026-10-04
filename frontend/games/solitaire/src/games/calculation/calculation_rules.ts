import { PileRole } from "@/engine/core/card/card_pile";
import { ALL_RANKS, Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  all,
  ascendingAnySuit,
  buildsOn,
  byEmptiness,
  cardIs,
  hasRank,
  singleCardOnly,
} from "@/engine/tableau/rules";

/** The parts a pile can play in a Calculation game. */
export const CalculationRole = {
  /** The face-down cards, turned one at a time into the hand. */
  STOCK: "stock",
  /** The one card turned up and not yet placed. */
  HAND: "hand",
  /** A pile built up by its own interval, regardless of suit. */
  FOUNDATION: "foundation",
  /** One of four piles a turned card may be parked on. */
  WASTE: "waste",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Calculation pile can play. */
export type CalculationRole =
  (typeof CalculationRole)[keyof typeof CalculationRole];

/** Which of the pair is being played. */
export const CalculationVariant = {
  /** Calculation: four foundations, each built by its own interval. */
  CALCULATION: "calculation",
  /** Sir Tommy: four foundations, each built up from an Ace by one. */
  SIR_TOMMY: "sir-tommy",
} as const;

/** Names one of the games played on Calculation's board. */
export type CalculationVariant =
  (typeof CalculationVariant)[keyof typeof CalculationVariant];

/** The variant dealt when nothing says otherwise. */
export const DEFAULT_CALCULATION_VARIANT: CalculationVariant =
  CalculationVariant.CALCULATION;

/** How many foundations and how many waste piles the board has. */
export const PILE_COUNT = 4;

/** How many cards a foundation holds once it reaches its King. */
export const FOUNDATION_CAPACITY = ALL_RANKS.length;

/**
 * Returns the rule for Calculation's foundation that counts in steps of
 * `step`: the card of rank `step` starts it, and each card after is `step`
 * ranks higher in any suit, counting on past the King from the Ace.
 *
 * Every interval visits all thirteen ranks before it reaches the King, so a
 * {@link FOUNDATION_CAPACITY} ends the pile there; the counting alone would
 * carry straight on.
 */
export function calculationFoundationRule(step: number): PlacementRule {
  const startRank: Rank = Rank.ACE + step - 1;
  return all(
    singleCardOnly,
    byEmptiness(
      cardIs(hasRank(startRank)),
      buildsOn(
        (lower, upper) =>
          upper.rank === ALL_RANKS[(lower.rank + step) % ALL_RANKS.length],
      ),
    ),
  );
}

/** A Sir Tommy foundation: any Ace starts it, then up by one in any suit. */
export const SIR_TOMMY_FOUNDATION_RULE: PlacementRule = all(
  singleCardOnly,
  byEmptiness(cardIs(hasRank(Rank.ACE)), ascendingAnySuit),
);

/**
 * Returns the rule for the foundation at `index` under a variant.
 *
 * In Calculation the foundation at index `i` counts in steps of `i + 1`.
 */
export function foundationRuleAt(
  variant: CalculationVariant,
  index: number,
): PlacementRule {
  return variant === CalculationVariant.CALCULATION
    ? calculationFoundationRule(index + 1)
    : SIR_TOMMY_FOUNDATION_RULE;
}

/**
 * A waste pile: any one card, but only the card just turned, so a parked card
 * can leave only for a foundation.
 */
export const WASTE_RULE: PlacementRule = all(
  singleCardOnly,
  (context) => context.sourcePile.role === CalculationRole.HAND,
);

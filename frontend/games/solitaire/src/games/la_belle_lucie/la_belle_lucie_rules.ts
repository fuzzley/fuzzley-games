import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  any,
  ascendingAnySuit,
  byEmptiness,
  cardIs,
  descendingAnySuit,
  descendingSameSuit,
  hasRank,
  never,
} from "@/engine/tableau/rules";

/** The parts a pile can play in a game of the La Belle Lucie family. */
export const LaBelleLucieRole = {
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A fan: a short column whose top card is the only one free. */
  TABLEAU: "tableau",
  /** The marker pressed to redeal, which never holds a card. */
  REDEAL: "redeal",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a pile of the La Belle Lucie family can play. */
export type LaBelleLucieRole =
  (typeof LaBelleLucieRole)[keyof typeof LaBelleLucieRole];

/** Which of the family is being played. */
export const LaBelleLucieVariant = {
  /** La Belle Lucie: fans build down in suit, with two redeals. */
  LA_BELLE_LUCIE: "la-belle-lucie",
  /** The Fan: a King may fill an empty fan, and there is no redeal. */
  THE_FAN: "the-fan",
  /** Shamrocks: fans of at most three build up or down in any suit. */
  SHAMROCKS: "shamrocks",
  /** Trefoil: La Belle Lucie with the Aces dealt to the foundations. */
  TREFOIL: "trefoil",
} as const;

/** Names one of the games in the La Belle Lucie family. */
export type LaBelleLucieVariant =
  (typeof LaBelleLucieVariant)[keyof typeof LaBelleLucieVariant];

/** The variant dealt when nothing says otherwise. */
export const DEFAULT_LA_BELLE_LUCIE_VARIANT: LaBelleLucieVariant =
  LaBelleLucieVariant.LA_BELLE_LUCIE;

/** Says everything that tells one game of the family from another. */
export interface LaBelleLucieVariantRules {
  /** How many fans the deal makes. */
  readonly fanCount: number;
  /** What an empty fan takes. */
  readonly whenEmpty: PlacementRule;
  /** What a fan with cards takes. */
  readonly whenOccupied: PlacementRule;
  /** How many cards a fan may hold, or undefined for no limit. */
  readonly fanCapacity?: number;
  /** How many times the fans may be gathered and dealt again. */
  readonly maxRedeals: number;
  /** Whether the deal lays the Aces on the foundations first. */
  readonly acesStartOnFoundations: boolean;
}

const VARIANT_RULES: Readonly<
  Record<LaBelleLucieVariant, LaBelleLucieVariantRules>
> = {
  [LaBelleLucieVariant.LA_BELLE_LUCIE]: {
    fanCount: 18,
    whenEmpty: never,
    whenOccupied: descendingSameSuit,
    maxRedeals: 2,
    acesStartOnFoundations: false,
  },
  [LaBelleLucieVariant.THE_FAN]: {
    fanCount: 18,
    whenEmpty: cardIs(hasRank(Rank.KING)),
    whenOccupied: descendingSameSuit,
    maxRedeals: 0,
    acesStartOnFoundations: false,
  },
  [LaBelleLucieVariant.SHAMROCKS]: {
    fanCount: 18,
    whenEmpty: never,
    whenOccupied: any(ascendingAnySuit, descendingAnySuit),
    fanCapacity: 3,
    maxRedeals: 0,
    acesStartOnFoundations: false,
  },
  [LaBelleLucieVariant.TREFOIL]: {
    fanCount: 16,
    whenEmpty: never,
    whenOccupied: descendingSameSuit,
    maxRedeals: 2,
    acesStartOnFoundations: true,
  },
};

/** Returns the rules that make a variant the game it is. */
export function laBelleLucieRules(
  variant: LaBelleLucieVariant,
): LaBelleLucieVariantRules {
  return VARIANT_RULES[variant];
}

/** Returns the rule for a fan under a variant. */
export function fanRule(variant: LaBelleLucieVariant): PlacementRule {
  const { whenEmpty, whenOccupied } = VARIANT_RULES[variant];
  return byEmptiness(whenEmpty, whenOccupied);
}

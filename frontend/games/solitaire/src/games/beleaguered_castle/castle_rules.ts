import { PileRole } from "@/engine/core/card/card_pile";
import {
  PlacementRule,
  any,
  anyCard,
  ascendingSameSuit,
  byEmptiness,
  descendingAnySuit,
  descendingSameSuit,
} from "@/engine/tableau/rules";

/** The parts a pile can play in a game of the Beleaguered Castle family. */
export const CastleRole = {
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A row of cards fanned sideways, whose last card is free. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Castle pile can play. */
export type CastleRole = (typeof CastleRole)[keyof typeof CastleRole];

/** Which of the family is being played. */
export const CastleVariant = {
  /** Beleaguered Castle: the Aces start on the foundations. */
  BELEAGUERED_CASTLE: "beleaguered-castle",
  /** Streets and Alleys: the Aces are dealt into the rows. */
  STREETS_AND_ALLEYS: "streets-and-alleys",
  /** Citadel: every card that can go home during the deal does. */
  CITADEL: "citadel",
  /** Fortress: ten rows, built up or down in suit. */
  FORTRESS: "fortress",
} as const;

/** Names one of the games in the Castle family. */
export type CastleVariant = (typeof CastleVariant)[keyof typeof CastleVariant];

/** The variant dealt when nothing says otherwise. */
export const DEFAULT_CASTLE_VARIANT: CastleVariant =
  CastleVariant.BELEAGUERED_CASTLE;

/** Says everything that tells one game of the family from another. */
export interface CastleVariantRules {
  /** How many rows each wing has. */
  readonly rowsPerWing: number;
  /** Whether the deal lays the Aces on the foundations first. */
  readonly acesStartOnFoundations: boolean;
  /** Whether a card dealt that a foundation would take goes there instead. */
  readonly sendsHomeWhileDealing: boolean;
  /** What a row with cards takes. */
  readonly whenOccupied: PlacementRule;
}

const VARIANT_RULES: Readonly<Record<CastleVariant, CastleVariantRules>> = {
  [CastleVariant.BELEAGUERED_CASTLE]: {
    rowsPerWing: 4,
    acesStartOnFoundations: true,
    sendsHomeWhileDealing: false,
    whenOccupied: descendingAnySuit,
  },
  [CastleVariant.STREETS_AND_ALLEYS]: {
    rowsPerWing: 4,
    acesStartOnFoundations: false,
    sendsHomeWhileDealing: false,
    whenOccupied: descendingAnySuit,
  },
  [CastleVariant.CITADEL]: {
    rowsPerWing: 4,
    acesStartOnFoundations: true,
    sendsHomeWhileDealing: true,
    whenOccupied: descendingAnySuit,
  },
  [CastleVariant.FORTRESS]: {
    rowsPerWing: 5,
    acesStartOnFoundations: false,
    sendsHomeWhileDealing: false,
    whenOccupied: any(ascendingSameSuit, descendingSameSuit),
  },
};

/** Returns the rules that make a variant the game it is. */
export function castleRules(variant: CastleVariant): CastleVariantRules {
  return VARIANT_RULES[variant];
}

/**
 * Returns the rule for a row under a variant: any card fills an empty one.
 *
 * One card at a time: the rows grab only their free card, so no stack ever
 * reaches this rule.
 */
export function castleRowRule(variant: CastleVariant): PlacementRule {
  return byEmptiness(anyCard, VARIANT_RULES[variant].whenOccupied);
}

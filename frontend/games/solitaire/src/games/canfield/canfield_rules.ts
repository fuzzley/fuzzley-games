import { PileRole } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  anyCard,
  baseRankFoundation,
  isAnySuitRunWrapping,
  isOrderedPairWrapping,
  isSameSuitRunWrapping,
} from "@/engine/tableau/rules";
import { ColumnRules, runColumn } from "@/engine/tableau/zone";

/** The parts a pile can play in a game of the Canfield family. */
export const CanfieldRole = {
  /** The face-down cards drawn onto the waste. */
  STOCK: "stock",
  /** The face-up cards drawn from the stock. */
  WASTE: "waste",
  /** The thirteen cards dealt aside, whose top card is free. */
  RESERVE: "reserve",
  /** A suit pile built up from the rank the deal chose. */
  FOUNDATION: "foundation",
  /** One of the four columns. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Canfield pile can play. */
export type CanfieldRole = (typeof CanfieldRole)[keyof typeof CanfieldRole];

/** Which of the family is being played. */
export const CanfieldVariant = {
  /** Canfield: the original. */
  CANFIELD: "canfield",
  /** Storehouse: Twos start the foundations, and columns build in suit. */
  STOREHOUSE: "storehouse",
  /** Superior Canfield: the reserve is dealt face up, and spaces wait. */
  SUPERIOR: "superior",
  /** Rainbow: columns build regardless of colour, from a one-pass stock. */
  RAINBOW: "rainbow",
} as const;

/** Names one of the games in the Canfield family. */
export type CanfieldVariant =
  (typeof CanfieldVariant)[keyof typeof CanfieldVariant];

/** The variant dealt when nothing says otherwise. */
export const DEFAULT_CANFIELD_VARIANT: CanfieldVariant =
  CanfieldVariant.CANFIELD;

/** How many cards a draw turns over. */
export type CanfieldDrawCount = 1 | 3;

/** Says everything that tells one game of the family from another. */
export interface CanfieldVariantRules {
  /**
   * Whether `upper` may sit on `lower` in a column, which both the build and
   * the run a player may lift follow.
   */
  readonly adjacent: (lower: PlayingCard, upper: PlayingCard) => boolean;
  /** How many cards a draw turns over. */
  readonly drawCount: CanfieldDrawCount;
  /** How many times the waste may be turned back, which may be Infinity. */
  readonly maxRecycles: number;
  /** Whether the deal starts the foundations with the Twos. */
  readonly twosStartFoundations: boolean;
  /** Whether the reserve is dealt face up and fanned. */
  readonly reserveFaceUp: boolean;
  /** Whether a space is filled from the reserve as soon as it opens. */
  readonly reserveFillsSpaces: boolean;
}

const VARIANT_RULES: Readonly<Record<CanfieldVariant, CanfieldVariantRules>> = {
  [CanfieldVariant.CANFIELD]: {
    adjacent: isOrderedPairWrapping,
    drawCount: 3,
    maxRecycles: Infinity,
    twosStartFoundations: false,
    reserveFaceUp: false,
    reserveFillsSpaces: true,
  },
  [CanfieldVariant.STOREHOUSE]: {
    adjacent: isSameSuitRunWrapping,
    drawCount: 1,
    maxRecycles: 2,
    twosStartFoundations: true,
    reserveFaceUp: false,
    reserveFillsSpaces: true,
  },
  [CanfieldVariant.SUPERIOR]: {
    adjacent: isOrderedPairWrapping,
    drawCount: 3,
    maxRecycles: Infinity,
    twosStartFoundations: false,
    reserveFaceUp: true,
    reserveFillsSpaces: false,
  },
  [CanfieldVariant.RAINBOW]: {
    adjacent: isAnySuitRunWrapping,
    drawCount: 1,
    maxRecycles: 0,
    twosStartFoundations: false,
    reserveFaceUp: false,
    reserveFillsSpaces: true,
  },
};

/** Returns the rules that make a variant the game it is. */
export function canfieldRules(variant: CanfieldVariant): CanfieldVariantRules {
  return VARIANT_RULES[variant];
}

/** A foundation: the rank the deal chose starts it, then up in suit. */
export const CANFIELD_FOUNDATION_RULE: PlacementRule = baseRankFoundation(
  CanfieldRole.FOUNDATION,
);

/**
 * A space a reserve fills: it takes the reserve's top card, or, once the
 * reserve is empty, a card from the waste.
 */
const SPACE_FROM_RESERVE: PlacementRule = (context) => {
  const source = context.sourcePile.role;
  if (source === CanfieldRole.RESERVE) return true;
  return (
    source === CanfieldRole.WASTE &&
    context.board.emptyCount(CanfieldRole.RESERVE) > 0
  );
};

/** Returns what a column accepts under a variant, and the runs lifted off it. */
export function canfieldColumn(variant: CanfieldVariant): ColumnRules {
  const { adjacent, reserveFillsSpaces } = VARIANT_RULES[variant];
  return runColumn({
    adjacent,
    whenEmpty: reserveFillsSpaces ? SPACE_FROM_RESERVE : anyCard,
  });
}

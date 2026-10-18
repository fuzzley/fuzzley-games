import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  all,
  byEmptiness,
  cardIs,
  hasRank,
  never,
  singleCardOnly,
} from "@/engine/tableau/rules/placement";
import {
  ascendingAnySuit,
  descendingAnySuit,
} from "@/engine/tableau/rules/builds";

/** The parts a pile can play in a Bristol game. */
export const BristolRole = {
  /** The face-down cards, dealt three at a time onto the reserves. */
  STOCK: "stock",
  /** One of three piles the stock deals onto; only its top card is free. */
  RESERVE: "reserve",
  /** A pile started by any Ace and built up regardless of suit. */
  FOUNDATION: "foundation",
  /** A fan: a column built down regardless of suit. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Bristol pile can play. */
export type BristolRole = (typeof BristolRole)[keyof typeof BristolRole];

/** Which of the pair is being played. */
export const BristolVariant = {
  /** Bristol: every foundation waits for its Ace. */
  BRISTOL: "bristol",
  /** Belvedere: the deal starts one foundation with an Ace. */
  BELVEDERE: "belvedere",
} as const;

/** Names one of the games played on Bristol's board. */
export type BristolVariant =
  (typeof BristolVariant)[keyof typeof BristolVariant];

/** The variant dealt when nothing says otherwise. */
export const DEFAULT_BRISTOL_VARIANT: BristolVariant = BristolVariant.BRISTOL;

/** A foundation: any Ace starts it, then up by one in any suit. */
export const BRISTOL_FOUNDATION_RULE: PlacementRule = all(
  singleCardOnly,
  byEmptiness(cardIs(hasRank(Rank.ACE)), ascendingAnySuit),
);

/**
 * A fan: builds down in any suit, and an empty one stays empty.
 *
 * `never` for the empty case rather than a null `accept`, which would stop the
 * fan being a drop target even while it holds cards.
 */
export const BRISTOL_TABLEAU_RULE: PlacementRule = byEmptiness(
  never,
  descendingAnySuit,
);

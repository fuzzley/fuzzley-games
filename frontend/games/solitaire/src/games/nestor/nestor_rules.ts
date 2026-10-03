import { PileRole } from "@/engine/core/card/card_pile";
import { PlacementRule } from "@/engine/tableau/rules";
import { pairsWithTop, sameRank } from "../common/pair_removal";

/** The parts a pile can play in a Nestor game. */
export const NestorRole = {
  /** A column whose top card may be paired. */
  TABLEAU: "tableau",
  /** One of the four leftover cards, every one of them free. */
  RESERVE: "reserve",
  /** Where the pairs go. */
  DISCARD: "discard",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Nestor pile can play. */
export type NestorRole = (typeof NestorRole)[keyof typeof NestorRole];

/**
 * A column or reserve: takes a card of the same rank as its top card, which
 * makes a pair the move then discards.
 */
export const NESTOR_PAIR_RULE: PlacementRule = pairsWithTop(sameRank);

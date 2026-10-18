import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  cardIs,
  hasRank,
} from "@/engine/tableau/rules/placement";
import { suitFoundation } from "@/engine/tableau/rules/builds";
import { isOrderedPair } from "@/engine/tableau/rules/adjacency";
import { ColumnRules, runColumn } from "@/engine/tableau/rules/run_column";

/** The parts a pile can play in an Easthaven game. */
export const EasthavenRole = {
  /** The face-down pile that deals a row at a time. */
  STOCK: "stock",
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A board column built down in alternating colors. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts an Easthaven pile can play. */
export type EasthavenRole = (typeof EasthavenRole)[keyof typeof EasthavenRole];

/**
 * An Easthaven column: a King starts an empty one, and anything after builds
 * down in alternating colors.
 *
 * No stack limit applies, since a run moves in one piece rather than through
 * spare cells.
 */
export const EASTHAVEN_COLUMN: ColumnRules = runColumn({
  adjacent: isOrderedPair,
  whenEmpty: cardIs(hasRank(Rank.KING)),
});

/** An Easthaven foundation: the standard Ace-up-by-suit pile, one at a time. */
export const EASTHAVEN_FOUNDATION_RULE: PlacementRule = suitFoundation;

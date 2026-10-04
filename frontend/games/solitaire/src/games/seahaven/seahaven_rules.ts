import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  cardIs,
  cellStagingLimit,
  hasRank,
  singleCardCell,
  suitFoundation,
  isSameSuitRun,
} from "@/engine/tableau/rules";
import { ColumnRules, runColumn } from "@/engine/tableau/zone";

/** The parts a pile can play in a Seahaven Towers game. */
export const SeahavenRole = {
  /** A single-card holding cell, one of the four towers along the top. */
  CELL: "cell",
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A board column built down in a single suit. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Seahaven Towers pile can play. */
export type SeahavenRole = (typeof SeahavenRole)[keyof typeof SeahavenRole];

/**
 * How many cards may be moved at once: `free cells + 1`, as
 * {@link cellStagingLimit} explains.
 */
export const supermoveLimit = cellStagingLimit(SeahavenRole.CELL);

/**
 * A Seahaven column: only a King may start an empty one, anything after builds
 * down in the same suit, and no more may move at once than the cells can
 * actually shuffle around.
 */
export const SEAHAVEN_COLUMN: ColumnRules = runColumn({
  adjacent: isSameSuitRun,
  whenEmpty: cardIs(hasRank(Rank.KING)),
  maxStack: supermoveLimit,
});

/** A cell: one card, any card. */
export const SEAHAVEN_CELL_RULE: PlacementRule = singleCardCell;

/** A Seahaven foundation: the standard Ace-up-by-suit pile. */
export const SEAHAVEN_FOUNDATION_RULE: PlacementRule = suitFoundation;
